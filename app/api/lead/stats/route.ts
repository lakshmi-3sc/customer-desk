import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "THREESC_LEAD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const now = new Date();

  const [totalOpen, slaBreaches, resolvedToday, escalated, agents, recentEscalations, aiRouted] =
    await Promise.all([
      prisma.issue.count({
        where: { status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } },
      }),
      prisma.issue.count({
        where: { slaBreached: true, status: { notIn: ["RESOLVED", "CLOSED"] } },
      }),
      prisma.issue.count({
        where: { status: "RESOLVED", resolvedAt: { gte: todayStart } },
      }),
      prisma.issue.count({
        where: { escalated: true, status: { notIn: ["RESOLVED", "CLOSED"] } },
      }),
      prisma.user.findMany({
        where: { role: "THREESC_AGENT", isActive: true },
        select: {
          id: true,
          name: true,
          assignedIssues: {
            select: {
              id: true,
              status: true,
              slaDueAt: true,
              resolvedAt: true,
              createdAt: true,
              priority: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.issue.findMany({
        where: { escalated: true },
        orderBy: { escalatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          ticketKey: true,
          title: true,
          priority: true,
          escalatedAt: true,
          assignedTo: { select: { name: true } },
          client: { select: { name: true } },
        },
      }),
      prisma.issue.count({
        where: { aiCategory: { not: null }, createdAt: { gte: todayStart } },
      }),
    ]);

  const agentStats = agents.map((agent) => {
    const active = agent.assignedIssues.filter((i) =>
      ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"].includes(i.status)
    );
    const overdue = active.filter((i) => i.slaDueAt && new Date(i.slaDueAt) < now).length;
    const resolvedByAgent = agent.assignedIssues.filter(
      (i) => i.resolvedAt && i.status === "RESOLVED"
    );
    const resolvedTodayCount = resolvedByAgent.filter(
      (i) => new Date(i.resolvedAt!) >= todayStart
    ).length;
    // Average resolution time in hours for this agent's resolved issues
    let avgResponseHrs = 0;
    if (resolvedByAgent.length > 0) {
      const totalMs = resolvedByAgent.reduce((sum, i) => {
        return sum + (new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime());
      }, 0);
      avgResponseHrs = Math.round(totalMs / resolvedByAgent.length / 3600000);
    }
    return {
      id: agent.id,
      name: agent.name,
      assigned: active.length,
      overdue,
      resolvedToday: resolvedTodayCount,
      avgResponseHrs,
    };
  });

  // Issues by customer + priority for chart
  const byCustomerPriority = await prisma.issue.groupBy({
    by: ["clientId", "priority"],
    where: { status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } },
    _count: { id: true },
  });
  const clientIds = [...new Set(byCustomerPriority.map((r) => r.clientId))];
  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true },
  });
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const chartData = byCustomerPriority.reduce<
    Record<string, Record<string, number>>
  >((acc, row) => {
    const name = clientMap[row.clientId] ?? row.clientId;
    if (!acc[name]) acc[name] = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    acc[name][row.priority] = row._count.id;
    return acc;
  }, {});

  // Calculate actual average resolution time in hours across all resolved issues
  const resolvedWithTimes = await prisma.issue.findMany({
    where: { status: "RESOLVED", resolvedAt: { not: null } },
    select: { createdAt: true, resolvedAt: true },
    orderBy: { resolvedAt: "desc" },
    take: 100,
  });
  let avgResolutionHrs = 0;
  if (resolvedWithTimes.length > 0) {
    const totalMs = resolvedWithTimes.reduce(
      (sum, i) => sum + (i.resolvedAt!.getTime() - i.createdAt.getTime()),
      0
    );
    avgResolutionHrs = Math.round(totalMs / resolvedWithTimes.length / 3600000);
  }

  return NextResponse.json({
    kpis: { totalOpen, slaBreaches, resolvedToday, escalated, csatScore: 88, avgResolutionHrs },
    agentStats,
    recentEscalations,
    chartData: Object.entries(chartData).map(([name, v]) => ({ name, ...v })),
    aiStats: {
      routedToday: aiRouted,
      needsReview: Math.max(0, Math.floor(aiRouted * 0.2)),
    },
  });
}
