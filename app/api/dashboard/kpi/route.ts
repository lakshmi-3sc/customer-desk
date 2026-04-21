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

    // Fetch KPI data from issues table
    const [
      openIssues,
      inProgressIssues,
      resolvedIssues,
      criticalIssues,
      totalIssues,
    ] = await Promise.all([
      prisma.issue.count({ where: { ...scopeFilter, status: "OPEN" } }),
      prisma.issue.count({ where: { ...scopeFilter, status: "IN_PROGRESS" } }),
      prisma.issue.count({ where: { ...scopeFilter, status: "RESOLVED" } }),
      prisma.issue.count({ where: { ...scopeFilter, priority: "CRITICAL" } }),
      prisma.issue.count({ where: scopeFilter }),
    ]);

    // Calculate average resolution time (in days) — last 50 resolved, most recent first
    const resolvedIssuesWithTime = await prisma.issue.findMany({
      where: { ...scopeFilter, status: "RESOLVED", resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
      orderBy: { resolvedAt: "desc" },
      take: 50,
    });

    let avgResolutionTime = 0;
    if (resolvedIssuesWithTime.length > 0) {
      const resolutionTimes = resolvedIssuesWithTime.map(
        (issue) =>
          (issue.resolvedAt!.getTime() - issue.createdAt.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      avgResolutionTime =
        resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
    }

    // Calculate team efficiency score (0-100) based on scoped issues
    const [slaBreachedCount, slaBreachRiskCount] = await Promise.all([
      prisma.issue.count({ where: { ...scopeFilter, slaBreached: true } }),
      prisma.issue.count({ where: { ...scopeFilter, slaBreachRisk: true } }),
    ]);

    const teamEfficiencyScore = Math.max(
      0,
      100 - (slaBreachedCount + slaBreachRiskCount * 0.5),
    );

    // Active customers count (only meaningful for 3SC team views)
    const activeCustomers = isClientUser
      ? undefined
      : await prisma.client.count({ where: { isActive: true } });

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
