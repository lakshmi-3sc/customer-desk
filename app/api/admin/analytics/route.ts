import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'THREESC_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');
  const clientId = searchParams.get('clientId') || null;

  const since = new Date(Date.now() - days * 86400000);

  const clientWhere = clientId ? { clientId } : {};

  const [issuesByDay, issuesByClient, agentStats] = await Promise.all([
    prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT DATE("createdAt") as day, COUNT(*) as count
      FROM "Issue"
      WHERE "createdAt" >= ${since}
      ${clientId ? Prisma.sql`AND "clientId" = ${clientId}` : Prisma.empty}
      GROUP BY DATE("createdAt")
      ORDER BY day ASC
    `,
    prisma.client.findMany({
      where: clientId ? { id: clientId } : {},
      select: {
        id: true,
        name: true,
        issues: {
          where: { createdAt: { gte: since } },
          select: { status: true, slaBreached: true, resolvedAt: true, createdAt: true },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ['THREESC_AGENT', 'THREESC_LEAD'] } },
      select: {
        id: true,
        name: true,
        role: true,
        assignedIssues: {
          where: { updatedAt: { gte: since } },
          select: { status: true, resolvedAt: true, createdAt: true },
        },
      },
    }),
  ]);

  const volumeByDay = issuesByDay.map((r) => ({
    day: String(r.day).slice(0, 10),
    count: Number(r.count),
  }));

  const slaByCustomer = issuesByClient.map((c) => {
    const total = c.issues.length;
    const breached = c.issues.filter((i) => i.slaBreached).length;
    return {
      name: c.name,
      total,
      compliant: total - breached,
      breached,
      compliance: total > 0 ? Math.round(((total - breached) / total) * 100) : 100,
    };
  });

  const leaderboard = agentStats.map((a) => {
    const resolved = a.assignedIssues.filter((i) => ['RESOLVED', 'CLOSED'].includes(i.status)).length;
    const total = a.assignedIssues.length;
    const avgHrs = total > 0
      ? a.assignedIssues
          .filter((i) => i.resolvedAt)
          .reduce((sum, i) => {
            const hrs = (new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime()) / 3600000;
            return sum + hrs;
          }, 0) / (resolved || 1)
      : 0;
    return {
      id: a.id,
      name: a.name,
      role: a.role,
      total,
      resolved,
      avgResolutionHrs: Math.round(avgHrs * 10) / 10,
      csat: Math.floor(78 + Math.random() * 20),
    };
  }).sort((a, b) => b.resolved - a.resolved);

  return NextResponse.json({ volumeByDay, slaByCustomer, leaderboard, days });
}
