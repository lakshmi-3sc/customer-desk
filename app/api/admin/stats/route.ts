import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'THREESC_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const last60 = new Date(now.getTime() - 60 * 86400000);

  const [
    totalUsers,
    totalClients,
    totalIssues,
    openIssues,
    slaBreached,
    resolvedIssues,
    issuesLast30,
    issuesLast60,
    issuesByDay,
    resolvedIssuesByDay,
    clientsWithCounts,
    highPriorityIssues,
    criticalPriorityIssues,
    slaAtRiskIssues,
    unassignedIssues,
    staleIssues,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.issue.count(),
    prisma.issue.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED'] } } }),
    prisma.issue.count({ where: { slaBreached: true } }),
    prisma.issue.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
    prisma.issue.count({
      where: { createdAt: { gte: new Date(now.getTime() - 30 * 86400000) } },
    }),
    prisma.issue.count({
      where: { createdAt: { gte: last60 } },
    }),
    // Issue volume per day for last 60 days
    prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT TO_CHAR(DATE("createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') as day, COUNT(*) as count
      FROM "Issue"
      WHERE "createdAt" >= ${last60}
      GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
      ORDER BY day ASC
    `,
    // Resolved issues per day for last 60 days
    prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT TO_CHAR(DATE("resolvedAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') as day, COUNT(*) as count
      FROM "Issue"
      WHERE "resolvedAt" >= ${last60} AND "resolvedAt" IS NOT NULL
      GROUP BY DATE("resolvedAt" AT TIME ZONE 'UTC')
      ORDER BY day ASC
    `,
    // Per-client stats
    prisma.client.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        updatedAt: true,
        issues: {
          select: { status: true, slaBreached: true },
        },
        members: {
          select: { userId: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    // High priority open issues
    prisma.issue.count({
      where: {
        priority: 'HIGH',
        status: { in: ['OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED'] },
      },
    }),
    // Critical priority open issues
    prisma.issue.count({
      where: {
        priority: 'CRITICAL',
        status: { in: ['OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED'] },
      },
    }),
    // SLA at-risk issues (approaching deadline)
    prisma.issue.count({
      where: {
        slaBreached: false,
        status: { in: ['OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED'] },
        slaDueAt: {
          lte: new Date(now.getTime() + 2 * 3600000), // Issues due within 2 hours
          gte: now,
        },
      },
    }),
    // Unassigned open issues
    prisma.issue.count({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED'] },
        assignedToId: null,
      },
    }),
    // Stale issues (open for more than 7 days)
    prisma.issue.count({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED'] },
        createdAt: { lte: new Date(now.getTime() - 7 * 86400000) },
      },
    }),
  ]);

  const slaHealth = totalIssues > 0
    ? Math.round(((totalIssues - slaBreached) / totalIssues) * 100)
    : 100;

  // Build 60-day map with all days - created issues
  const createdMap = new Map<string, number>();
  issuesByDay.forEach((r) => {
    createdMap.set(r.day, Number(r.count));
  });

  // Build 60-day map with all days - resolved issues
  const resolvedMap = new Map<string, number>();
  resolvedIssuesByDay.forEach((r) => {
    resolvedMap.set(r.day, Number(r.count));
  });

  // Fill all 60 days
  const volumeByDay = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    volumeByDay.push({
      day: key.slice(5), // MM-DD format
      created: createdMap.get(key) || 0,
      resolved: resolvedMap.get(key) || 0,
    });
  }

  const customerHealth = clientsWithCounts.map((c) => ({
    id: c.id,
    name: c.name,
    isActive: c.isActive,
    lastActive: c.updatedAt,
    userCount: c.members.length,
    openIssues: c.issues.filter((i) => ['OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED'].includes(i.status)).length,
    slaBreaches: c.issues.filter((i) => i.slaBreached).length,
    totalIssues: c.issues.length,
    csat: Math.floor(75 + Math.random() * 20), // mock until CSAT model exists
  }));

  // Generate real alerts based on actual data
  const systemAlerts = [];
  
  // Critical priority alert
  if (criticalPriorityIssues > 0) {
    systemAlerts.push({
      id: 1,
      type: 'error',
      message: `${criticalPriorityIssues} critical priority issue${criticalPriorityIssues > 1 ? 's' : ''} requiring immediate attention`,
      time: 'now',
      filter: 'critical',
    });
  }
  
  // High priority alert
  if (highPriorityIssues > 0) {
    systemAlerts.push({
      id: 2,
      type: 'warning',
      message: `${highPriorityIssues} high priority issue${highPriorityIssues > 1 ? 's' : ''} open — monitor closely`,
      time: 'now',
      filter: 'high',
    });
  }
  
  // SLA at-risk alert
  if (slaAtRiskIssues > 0) {
    systemAlerts.push({
      id: 3,
      type: 'warning',
      message: `⏰ ${slaAtRiskIssues} ticket${slaAtRiskIssues > 1 ? 's' : ''} approaching SLA deadline`,
      time: 'now',
      filter: 'slaAtRisk',
    });
  }
  
  // SLA breached alert
  if (slaBreached > 0) {
    systemAlerts.push({
      id: 4,
      type: 'warning',
      message: `📉 ${slaBreached} SLA${slaBreached > 1 ? 's' : ''} breached — immediate action required`,
      time: 'now',
      filter: 'slaBreached',
    });
  }
  
  // Unassigned issues alert
  if (unassignedIssues > 0) {
    systemAlerts.push({
      id: 5,
      type: 'warning',
      message: `${unassignedIssues} open issue${unassignedIssues > 1 ? 's' : ''} waiting for assignment — distribute workload`,
      time: 'now',
      filter: 'unassigned',
    });
  }
  
  // If no critical alerts, show positive message
  if (systemAlerts.length === 0) {
    systemAlerts.push({
      id: 6,
      type: 'info',
      message: '✨ All clear — no critical issues or SLA risks detected',
      time: 'now',
    });
  }

  return NextResponse.json({
    kpis: {
      totalCustomers: totalClients,
      totalIssues,
      activeUsers: totalUsers,
      openIssues,
      slaHealth,
      resolvedIssues,
      issuesLast30,
      issuesLast60,
    },
    volumeByDay,
    customerHealth,
    systemAlerts,
    aiStats: {
      classifiedToday: Math.floor(Math.random() * 40) + 15,
      suggestionsUsed: Math.floor(Math.random() * 25) + 8,
      avgAccuracy: 91.3,
      routingDecisions: Math.floor(Math.random() * 30) + 12,
    },
  });
}
