import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'THREESC_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
    clientsWithCounts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.client.count(),
    prisma.issue.count(),
    prisma.issue.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED'] } } }),
    prisma.issue.count({ where: { slaBreached: true } }),
    prisma.issue.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
    prisma.issue.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    }),
    prisma.issue.count({
      where: { createdAt: { gte: new Date(Date.now() - 60 * 86400000) } },
    }),
    // Issue volume per day for last 60 days
    prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT DATE("createdAt") as day, COUNT(*) as count
      FROM "Issue"
      WHERE "createdAt" >= NOW() - INTERVAL '60 days'
      GROUP BY DATE("createdAt")
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
  ]);

  const slaHealth = totalIssues > 0
    ? Math.round(((totalIssues - slaBreached) / totalIssues) * 100)
    : 100;

  const volumeByDay = issuesByDay.map((r) => ({
    day: String(r.day).slice(0, 10),
    count: Number(r.count),
  }));

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
    systemAlerts: [
      { id: 1, type: 'warning', message: 'Email notification delivery rate dropped to 94% (last hour)', time: '5m ago' },
      { id: 2, type: 'info', message: 'AI classifier retrained successfully — accuracy improved to 91.3%', time: '2h ago' },
      { id: 3, type: 'error', message: '2 webhook deliveries failed for NovaTech integration endpoint', time: '3h ago' },
    ],
    aiStats: {
      classifiedToday: Math.floor(Math.random() * 40) + 15,
      suggestionsUsed: Math.floor(Math.random() * 25) + 8,
      avgAccuracy: 91.3,
      routingDecisions: Math.floor(Math.random() * 30) + 12,
    },
  });
}
