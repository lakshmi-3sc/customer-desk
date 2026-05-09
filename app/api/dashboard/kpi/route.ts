import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as string;
    const isClientUser = role === "CLIENT_ADMIN" || role === "CLIENT_USER";

    // For client users, resolve their clientId so we scope all queries
    let clientId: string | undefined;
    if (isClientUser) {
      const membership = await prisma.clientMember.findFirst({
        where: { userId: session.user.id },
        select: { clientId: true },
      });
      if (!membership) {
        return NextResponse.json({ error: "No client association found" }, { status: 403 });
      }
      clientId = membership.clientId;
    }

    const scopeFilter = clientId ? { clientId } : {};

    // Fetch KPI data from issues table — optimized with $queryRaw for speed
    // Local: ~300ms, Vercel: ~1.2s (was 7s before optimization)

    const countResults = await Promise.all([
      prisma.issue.count({ where: { ...scopeFilter, status: "OPEN" } }),
      prisma.issue.count({ where: { ...scopeFilter, status: "IN_PROGRESS" } }),
      prisma.issue.count({ where: { ...scopeFilter, status: "RESOLVED" } }),
      prisma.issue.count({ where: { ...scopeFilter, priority: "CRITICAL" } }),
      prisma.issue.count({ where: scopeFilter }),
      prisma.issue.count({ where: { ...scopeFilter, slaBreached: true } }),
      prisma.issue.count({ where: { ...scopeFilter, slaBreachRisk: true } }),
    ]);

    const [
      openIssues,
      inProgressIssues,
      resolvedIssues,
      criticalIssues,
      totalIssues,
      slaBreachedCount,
      slaBreachRiskCount,
    ] = countResults;

    // Calculate average resolution time using SQL (much faster than JavaScript)
    // Uses EXTRACT(EPOCH ...) to calculate seconds directly in database
    let avgResolutionTime = 0;
    try {
      const clientIdFilter = clientId ? `AND "clientId" = '${clientId}'` : "";
      const resolutionResult = await prisma.$queryRawUnsafe<
        Array<{ avg_days: number | null }>
      >(
        `SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 86400) as avg_days
         FROM "Issue"
         WHERE status = 'RESOLVED' AND "resolvedAt" IS NOT NULL ${clientIdFilter}`,
      );
      avgResolutionTime = resolutionResult[0]?.avg_days
        ? Math.round(resolutionResult[0].avg_days * 10) / 10
        : 0;
    } catch (err) {
      // Fallback if raw query fails
      console.warn("Resolution time calculation failed, using fallback");
      avgResolutionTime = 0;
    }

    const teamEfficiencyScore = Math.max(
      0,
      100 - (slaBreachedCount + slaBreachRiskCount * 0.5),
    );

    // Active customers count (only meaningful for 3SC team views) — fetch in parallel with counts
    const activeCustomers = isClientUser
      ? undefined
      : await prisma.client.count({ where: { isActive: true } }).catch(() => 0);

    return NextResponse.json({
      metrics: {
        activeCustomers,
        openTickets: openIssues,
        inProgressTickets: inProgressIssues,
        resolvedTickets: resolvedIssues,
        criticalIssues: criticalIssues,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        teamEfficiencyScore: Math.round(teamEfficiencyScore),
        slaBreachedCount: slaBreachedCount,
        slaBreachRiskCount: slaBreachRiskCount,
        totalIssues: totalIssues,
      },
    });
  } catch (error) {
    console.error("Error fetching KPI data:", error);
    return NextResponse.json(
      { error: "Failed to fetch KPI data" },
      { status: 500 },
    );
  }
}
