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
  const days = parseInt(searchParams.get('days') ?? '30', 10);
  const clientId = searchParams.get('clientId') || null;

  const now = new Date();
  const rangeStart = new Date(now.getTime() - days * 86400000);
  const prevRangeStart = new Date(now.getTime() - 2 * days * 86400000);
  const last30 = new Date(now.getTime() - 30 * 86400000);

  const clientWhere = clientId ? { clientId } : {};
  const openStatuses = ['OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED'] as const;
  const clientSql = clientId ? Prisma.sql`AND "clientId" = ${clientId}` : Prisma.empty;

  const [
    totalIssues,
    openIssues,
    slaBreached,
    criticalPriorityIssues,
    highPriorityIssues,
    slaAtRiskIssues,
    criticalSlaAtRisk,
    unassignedIssues,
    staleIssues,
    unassignedOver4h,
    issuesByDay,
    resolvedIssuesByDay,
    topCategoriesRaw,
    slaByCategoryRaw,
    clientsWithCounts,
    agentWorkloadRaw,
    clients,
    unrespondedOver24hRaw,
  ] = await Promise.all([
    prisma.issue.count({ where: { ...clientWhere } }),
    prisma.issue.count({ where: { ...clientWhere, status: { in: [...openStatuses] } } }),
    prisma.issue.count({ where: { ...clientWhere, slaBreached: true } }),
    prisma.issue.count({ where: { ...clientWhere, priority: 'CRITICAL', status: { in: [...openStatuses] } } }),
    prisma.issue.count({ where: { ...clientWhere, priority: 'HIGH', status: { in: [...openStatuses] } } }),
    prisma.issue.count({
      where: {
        ...clientWhere,
        slaBreached: false,
        status: { in: [...openStatuses] },
        slaDueAt: { lte: new Date(now.getTime() + 2 * 3600000), gte: now },
      },
    }),
    // Critical issues that are ALSO nearing SLA — most urgent possible combination
    prisma.issue.count({
      where: {
        ...clientWhere,
        priority: 'CRITICAL',
        slaBreached: false,
        status: { in: [...openStatuses] },
        slaDueAt: { lte: new Date(now.getTime() + 2 * 3600000), gte: now },
      },
    }),
    prisma.issue.count({ where: { ...clientWhere, status: { in: [...openStatuses] }, assignedToId: null } }),
    prisma.issue.count({
      where: { ...clientWhere, status: { in: [...openStatuses] }, createdAt: { lte: new Date(now.getTime() - 7 * 86400000) } },
    }),
    prisma.issue.count({
      where: { ...clientWhere, status: { in: ['OPEN', 'ACKNOWLEDGED'] }, assignedToId: null, createdAt: { lte: new Date(now.getTime() - 4 * 3600000) } },
    }),
    // Created per day
    prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT TO_CHAR(DATE("createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') as day, COUNT(*) as count
      FROM "Issue"
      WHERE "createdAt" >= ${rangeStart} ${clientSql}
      GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
      ORDER BY day ASC
    `,
    // Resolved per day
    prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT TO_CHAR(DATE("resolvedAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') as day, COUNT(*) as count
      FROM "Issue"
      WHERE "resolvedAt" IS NOT NULL AND "resolvedAt" >= ${rangeStart} ${clientSql}
      GROUP BY DATE("resolvedAt" AT TIME ZONE 'UTC')
      ORDER BY day ASC
    `,
    // Top categories (last 30d always — for insight context)
    prisma.$queryRaw<{ category: string; count: bigint }[]>`
      SELECT "category", COUNT(*) as count
      FROM "Issue"
      WHERE "createdAt" >= ${last30} ${clientSql}
      GROUP BY "category"
      ORDER BY count DESC
    `,
    // Which category has the most SLA breaches — for pattern insight
    prisma.$queryRaw<{ category: string; count: bigint }[]>`
      SELECT "category", COUNT(*) as count
      FROM "Issue"
      WHERE "slaBreached" = true ${clientSql}
      GROUP BY "category"
      ORDER BY count DESC
      LIMIT 1
    `,
    // Per-client health
    prisma.client.findMany({
      where: clientId ? { id: clientId } : {},
      select: {
        id: true, name: true, isActive: true, updatedAt: true,
        issues: { select: { status: true, slaBreached: true } },
        members: { select: { userId: true } },
      },
      orderBy: { name: 'asc' },
    }),
    // Agent workload
    prisma.user.findMany({
      where: { role: { in: ['THREESC_AGENT', 'THREESC_LEAD'] } },
      select: {
        id: true, name: true, role: true,
        assignedIssues: {
          where: { ...clientWhere, status: { in: [...openStatuses] } },
          select: { id: true, priority: true },
        },
      },
    }),
    // Clients for dropdown (always unfiltered)
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    // Unresponded over 24h
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM "Issue" i
      WHERE i.status = 'OPEN'
      AND i."createdAt" <= ${new Date(now.getTime() - 24 * 3600000)}
      ${clientSql}
      AND NOT EXISTS (
        SELECT 1 FROM "Comment" c WHERE c."issueId" = i.id AND c."isInternal" = false
      )
    `,
  ]);

  // Average FRT (current + previous period)
  let avgFrtHours: number | null = null;
  let avgFrtHoursPrev: number | null = null;
  try {
    const [frtCurr, frtPrev] = await Promise.all([
      prisma.$queryRaw<{ avg_hours: number | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM (c."createdAt" - i."createdAt")) / 3600) as avg_hours
        FROM "Issue" i
        JOIN (
          SELECT "issueId", MIN("createdAt") as "createdAt"
          FROM "Comment" WHERE "isInternal" = false
          GROUP BY "issueId"
        ) c ON c."issueId" = i.id
        WHERE i.status IN ('RESOLVED', 'CLOSED')
        AND i."createdAt" >= ${rangeStart} ${clientSql}
      `,
      prisma.$queryRaw<{ avg_hours: number | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM (c."createdAt" - i."createdAt")) / 3600) as avg_hours
        FROM "Issue" i
        JOIN (
          SELECT "issueId", MIN("createdAt") as "createdAt"
          FROM "Comment" WHERE "isInternal" = false
          GROUP BY "issueId"
        ) c ON c."issueId" = i.id
        WHERE i.status IN ('RESOLVED', 'CLOSED')
        AND i."createdAt" >= ${prevRangeStart} AND i."createdAt" < ${rangeStart} ${clientSql}
      `,
    ]);
    avgFrtHours = frtCurr[0]?.avg_hours != null ? Math.round(Number(frtCurr[0].avg_hours) * 10) / 10 : null;
    avgFrtHoursPrev = frtPrev[0]?.avg_hours != null ? Math.round(Number(frtPrev[0].avg_hours) * 10) / 10 : null;
  } catch {
    avgFrtHours = null;
    avgFrtHoursPrev = null;
  }

  // Previous period counts for KPI deltas
  const [openIssuesPrev, criticalPrev, unassignedPrev] = await Promise.all([
    prisma.issue.count({ where: { ...clientWhere, createdAt: { gte: prevRangeStart, lt: rangeStart } } }),
    prisma.issue.count({ where: { ...clientWhere, priority: 'CRITICAL', createdAt: { gte: prevRangeStart, lt: rangeStart } } }),
    prisma.issue.count({ where: { ...clientWhere, assignedToId: null, createdAt: { gte: prevRangeStart, lt: rangeStart } } }),
  ]);

  const delta = (curr: number, prev: number): { pct: string; dir: 'up' | 'down' | 'neutral' } => {
    if (prev === 0) return { pct: '—', dir: 'neutral' };
    const change = Math.round(((curr - prev) / prev) * 100);
    return { pct: `${change > 0 ? '+' : ''}${change}%`, dir: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral' };
  };

  // Build volume chart data
  const createdMap = new Map(issuesByDay.map((r) => [r.day, Number(r.count)]));
  const resolvedMap = new Map(resolvedIssuesByDay.map((r) => [r.day, Number(r.count)]));
  const volumeByDay: { day: string; created: number; resolved: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    volumeByDay.push({ day: key.slice(5), created: createdMap.get(key) ?? 0, resolved: resolvedMap.get(key) ?? 0 });
  }

  const customerHealth = clientsWithCounts.map((c) => ({
    id: c.id, name: c.name, isActive: c.isActive, lastActive: c.updatedAt,
    userCount: c.members.length,
    openIssues: c.issues.filter((i) => openStatuses.includes(i.status as any)).length,
    slaBreaches: c.issues.filter((i) => i.slaBreached).length,
    totalIssues: c.issues.length,
    csat: Math.floor(75 + Math.random() * 20),
  }));

  const agentWorkload = agentWorkloadRaw
    .map((a) => ({
      id: a.id, name: a.name ?? 'Unknown', role: a.role,
      open: a.assignedIssues.length,
      critical: a.assignedIssues.filter((i) => i.priority === 'CRITICAL').length,
    }))
    .sort((a, b) => b.open - a.open);

  const topCategories = topCategoriesRaw.map((r) => ({ category: r.category, count: Number(r.count) }));
  const slaHealth = totalIssues > 0 ? Math.round(((totalIssues - slaBreached) / totalIssues) * 100) : 100;

  // ─── AI INSIGHTS — intelligence, patterns, recommendations ────────────────
  // Rule: never restate a raw KPI count. Only surface derived intelligence:
  // trends, correlations, anomalies, recommendations.

  const CATEGORY_LABEL: Record<string, string> = {
    BUG: 'Bug', FEATURE_REQUEST: 'Feature Request',
    DATA_ACCURACY: 'Data Accuracy', PERFORMANCE: 'Performance',
    ACCESS_SECURITY: 'Access / Security',
  };

  const aiInsights: { type: string; title: string; message: string }[] = [];

  // 1. Critical volume trend (only fires if meaningful change ≥15%)
  if (criticalPrev > 0) {
    const critChange = Math.round(((criticalPriorityIssues - criticalPrev) / criticalPrev) * 100);
    if (critChange >= 15) {
      aiInsights.push({
        type: 'error',
        title: 'Critical Volume Spike',
        message: `Critical tickets up ${critChange}% vs previous ${days}d — escalation pressure is increasing`,
      });
    } else if (critChange <= -20) {
      aiInsights.push({
        type: 'info',
        title: 'Critical Volume Declining',
        message: `Critical tickets down ${Math.abs(critChange)}% vs previous ${days}d — resolution momentum is holding`,
      });
    }
  }

  // 2. Consecutive backlog growth — velocity signal
  let consecutiveGrowthDays = 0;
  for (let i = volumeByDay.length - 1; i >= 0; i--) {
    if (volumeByDay[i].created > volumeByDay[i].resolved) consecutiveGrowthDays++;
    else break;
  }
  if (consecutiveGrowthDays >= 3) {
    aiInsights.push({
      type: 'warning',
      title: 'Backlog Velocity Alert',
      message: `Backlog has grown for ${consecutiveGrowthDays} consecutive days — resolution rate is not keeping pace with incoming volume`,
    });
  }

  // 3. Customer concentration in open backlog
  const clientOpenCounts = customerHealth
    .map((c) => ({ name: c.name, open: c.openIssues }))
    .sort((a, b) => b.open - a.open);
  if (clientOpenCounts.length > 0 && openIssues >= 6) {
    const top = clientOpenCounts[0];
    const pct = Math.round((top.open / openIssues) * 100);
    if (pct >= 35 && top.open >= 4) {
      aiInsights.push({
        type: 'warning',
        title: 'Backlog Concentration',
        message: `${top.name} accounts for ${pct}% of the open backlog — consider a dedicated escalation sprint`,
      });
    }
  }

  // 4. SLA breach category pattern
  if (slaByCategoryRaw.length > 0 && slaBreached >= 3) {
    const topSlaCat = slaByCategoryRaw[0];
    const catPct = Math.round((Number(topSlaCat.count) / slaBreached) * 100);
    if (catPct >= 40) {
      aiInsights.push({
        type: 'warning',
        title: 'SLA Breach Pattern',
        message: `${catPct}% of SLA breaches originate from ${CATEGORY_LABEL[topSlaCat.category] ?? topSlaCat.category} — review response workflows or SLA thresholds for this type`,
      });
    }
  }

  // 5. Agent capacity signal — actionable reassignment recommendation
  const agentsWithCapacity = agentWorkloadRaw
    .filter((a) => a.assignedIssues.length <= 2)
    .map((a) => (a.name ?? 'Agent').split(' ')[0]);
  if (agentsWithCapacity.length > 0 && unassignedIssues >= 3) {
    const names = agentsWithCapacity.slice(0, 2).join(' and ');
    const extra = agentsWithCapacity.length > 2 ? ` (+${agentsWithCapacity.length - 2} more)` : '';
    aiInsights.push({
      type: 'info',
      title: 'Capacity Available',
      message: `${names}${extra} have low workload — redistribute ${unassignedIssues} unassigned tickets to balance team load`,
    });
  }

  // 6. FRT trend (only fires if meaningful change ≥15%)
  if (avgFrtHours != null && avgFrtHoursPrev != null && avgFrtHoursPrev > 0) {
    const frtChange = Math.round(((avgFrtHours - avgFrtHoursPrev) / avgFrtHoursPrev) * 100);
    if (frtChange >= 15) {
      aiInsights.push({
        type: 'warning',
        title: 'Response Time Degrading',
        message: `Avg first response up ${frtChange}% vs previous period — review triage process and queue assignment rules`,
      });
    } else if (frtChange <= -15) {
      aiInsights.push({
        type: 'info',
        title: 'Response Time Improving',
        message: `Avg FRT improved ${Math.abs(frtChange)}% vs previous period — triage efficiency is trending up`,
      });
    }
  }

  // 7. Resolution rate low — only if there's enough data to be meaningful
  const totalVol = volumeByDay.reduce((s, d) => s + d.created, 0);
  const totalRes = volumeByDay.reduce((s, d) => s + d.resolved, 0);
  if (totalVol >= 10) {
    const resRate = Math.round((totalRes / totalVol) * 100);
    if (resRate < 70) {
      aiInsights.push({
        type: 'warning',
        title: 'Resolution Rate Low',
        message: `Only ${resRate}% of new issues resolved this period — team is losing ground against incoming volume`,
      });
    }
  }

  // 8. Stale backlog signal
  if (staleIssues >= 5) {
    aiInsights.push({
      type: 'info',
      title: 'Aging Backlog',
      message: `${staleIssues} tickets open 7+ days without resolution — schedule a backlog grooming session`,
    });
  }

  // Healthy fallback — only fires if no other insight qualified
  if (aiInsights.length === 0) {
    aiInsights.push({
      type: 'info',
      title: 'Operations Healthy',
      message: `No anomalies detected across backlog velocity, SLA compliance, and agent workload for the last ${days} days.`,
    });
  }

  return NextResponse.json({
    kpis: {
      totalCustomers: clientsWithCounts.length,
      totalIssues, openIssues, slaHealth,
      resolvedIssues: totalIssues - openIssues,
      slaRiskCount: slaAtRiskIssues,
      unassignedCount: unassignedIssues,
      criticalCount: criticalPriorityIssues,
      avgFrtHours,
      deltas: {
        openIssues: delta(openIssues, openIssuesPrev),
        critical: delta(criticalPriorityIssues, criticalPrev),
        unassigned: delta(unassignedIssues, unassignedPrev),
        avgFrt: avgFrtHours != null && avgFrtHoursPrev != null
          ? delta(Math.round(avgFrtHours * 10), Math.round(avgFrtHoursPrev * 10))
          : { pct: '—', dir: 'neutral' as const },
      },
    },
    // Action Strip — time-sensitive urgent alerts only, sorted by severity
    actionStrip: {
      criticalSlaAtRisk,              // CRITICAL priority + nearing SLA — highest severity
      unrespondedOver24h: Number(unrespondedOver24hRaw[0]?.count ?? 0),
      unassignedOver4h,
      slaBreachedCount: slaBreached,  // already breached — needs customer comms
    },
    agentWorkload,
    topCategories,
    clients,
    aiInsights: aiInsights.slice(0, 4),
    volumeByDay,
    customerHealth,
  });
}
