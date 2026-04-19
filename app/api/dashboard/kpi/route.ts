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

    // Fetch KPI data from issues table
    const [
      openIssues,
      inProgressIssues,
      resolvedIssues,
      criticalIssues,
      totalIssues,
    ] = await Promise.all([
      prisma.issue.count({
        where: { status: "OPEN" },
      }),
      prisma.issue.count({
        where: { status: "IN_PROGRESS" },
      }),
      prisma.issue.count({
        where: { status: "RESOLVED" },
      }),
      prisma.issue.count({
        where: { priority: "CRITICAL" },
      }),
      prisma.issue.count(),
    ]);

    // Calculate average resolution time (in days)
    const resolvedIssuesWithTime = await prisma.issue.findMany({
      where: {
        status: "RESOLVED",
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
      take: 50, // Get last 50 resolved issues
    });

    let avgResolutionTime = 0;
    if (resolvedIssuesWithTime.length > 0) {
      const resolutionTimes = resolvedIssuesWithTime.map(
        (issue) =>
          (issue.resolvedAt!.getTime() - issue.createdAt.getTime()) /
          (1000 * 60 * 60 * 24), // Convert to days
      );
      avgResolutionTime =
        resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
    }

    // Calculate team efficiency score (0-100)
    const slaBreachedCount = await prisma.issue.count({
      where: { slaBreached: true },
    });
    const slaBreachRiskCount = await prisma.issue.count({
      where: { slaBreachRisk: true },
    });

    const teamEfficiencyScore = Math.max(
      0,
      100 - (slaBreachedCount + slaBreachRiskCount * 0.5),
    );

    return NextResponse.json({
      metrics: {
        activeCustomers: totalIssues,
        openTickets: openIssues,
        inProgressTickets: inProgressIssues,
        resolvedTickets: resolvedIssues,
        criticalIssues: criticalIssues,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10, // Round to 1 decimal
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
