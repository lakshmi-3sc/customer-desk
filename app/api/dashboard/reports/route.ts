import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Determine client filter
    let clientId: string | undefined;
    if (!currentUser.role.startsWith("THREESC_")) {
      const membership = await prisma.clientMember.findFirst({
        where: { userId: currentUser.id },
      });
      if (membership) clientId = membership.clientId;
    }

    const whereBase = clientId ? { clientId } : {};

    // Weekly volume — last 8 weeks
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const issuesLast8Weeks = await prisma.issue.findMany({
      where: { ...whereBase, createdAt: { gte: eightWeeksAgo } },
      select: { createdAt: true, status: true, resolvedAt: true },
    });

    // Build weekly buckets
    const weeklyMap: Record<string, { created: number; resolved: number }> = {};
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const weekLabel = `W${8 - i} (${d.toLocaleDateString("en-GB", { month: "short", day: "numeric" })})`;
      weeklyMap[weekLabel] = { created: 0, resolved: 0 };
    }

    const weekKeys = Object.keys(weeklyMap);
    issuesLast8Weeks.forEach((issue) => {
      const msAgo = Date.now() - new Date(issue.createdAt).getTime();
      const weeksAgo = Math.floor(msAgo / (7 * 24 * 3600 * 1000));
      if (weeksAgo < 8) {
        const key = weekKeys[7 - weeksAgo];
        if (key) weeklyMap[key].created++;
      }
      if (issue.resolvedAt) {
        const msAgoR = Date.now() - new Date(issue.resolvedAt).getTime();
        const weeksAgoR = Math.floor(msAgoR / (7 * 24 * 3600 * 1000));
        if (weeksAgoR < 8) {
          const key = weekKeys[7 - weeksAgoR];
          if (key) weeklyMap[key].resolved++;
        }
      }
    });

    const weeklyVolume = Object.entries(weeklyMap).map(([week, counts]) => ({
      week,
      ...counts,
    }));

    // Priority breakdown
    const priorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
    const priorityCounts = await Promise.all(
      priorities.map((p) =>
        prisma.issue.count({ where: { ...whereBase, priority: p } })
      )
    );
    const priorityBreakdown = priorities.map((p, i) => ({
      priority: p,
      count: priorityCounts[i],
    }));

    // Category breakdown
    const categories = ["BUG", "FEATURE_REQUEST", "DATA_ACCURACY", "PERFORMANCE", "ACCESS_SECURITY"] as const;
    const categoryCounts = await Promise.all(
      categories.map((c) =>
        prisma.issue.count({ where: { ...whereBase, category: c } })
      )
    );
    const categoryBreakdown = categories.map((c, i) => ({
      category: c.replace("_", " "),
      count: categoryCounts[i],
    }));

    // SLA compliance (resolved/closed issues: how many were NOT breached)
    const [resolvedTotal, resolvedNotBreached] = await Promise.all([
      prisma.issue.count({ where: { ...whereBase, status: { in: ["RESOLVED", "CLOSED"] } } }),
      prisma.issue.count({ where: { ...whereBase, status: { in: ["RESOLVED", "CLOSED"] }, slaBreached: false } }),
    ]);

    const slaCompliance =
      resolvedTotal > 0 ? Math.round((resolvedNotBreached / resolvedTotal) * 100) : 100;

    // Avg resolution time
    const resolvedIssues = await prisma.issue.findMany({
      where: { ...whereBase, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
      take: 200,
    });
    const avgResolutionDays =
      resolvedIssues.length > 0
        ? Math.round(
            (resolvedIssues.reduce((sum, i) => {
              const diff = new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime();
              return sum + diff / (1000 * 3600 * 24);
            }, 0) /
              resolvedIssues.length) *
              10
          ) / 10
        : 0;

    return NextResponse.json({
      weeklyVolume,
      priorityBreakdown,
      categoryBreakdown,
      slaCompliance,
      avgResolutionDays,
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
