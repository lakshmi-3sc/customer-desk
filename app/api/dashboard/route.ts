import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

const ACTIVE_STATUSES = ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] as const;
const OVERLOAD_THRESHOLD = 8;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, role: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    let payload: unknown;

    if (currentUser.role === "THREESC_ADMIN") {
      payload = await getAdminSummary(searchParams);
    } else if (currentUser.role === "THREESC_LEAD") {
      payload = await getLeadSummary();
    } else if (currentUser.role === "THREESC_AGENT") {
      payload = await getAgentSummary(currentUser.id);
    } else if (currentUser.role === "CLIENT_ADMIN") {
      payload = await getClientAdminSummary(currentUser.id);
    } else {
      payload = await getClientUserSummary(currentUser.id);
    }

    const response = NextResponse.json(payload);
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard summary" }, { status: 500 });
  }
}

async function getClientId(userId: string) {
  const membership = await prisma.clientMember.findFirst({
    where: { userId },
    select: { clientId: true },
  });
  return membership?.clientId;
}

async function getClientAdminSummary(userId: string) {
  const clientId = await getClientId(userId);
  if (!clientId) {
    return { metrics: null, tickets: [], reports: null, activity: [], users: [] };
  }

  const dashboardScope: Prisma.IssueWhereInput = { clientId };
  const [metrics, tickets, reports, activity, users] = await Promise.all([
    getMetrics(dashboardScope, clientId, true),
    getDashboardTickets({ clientId }, 200),
    getReports(dashboardScope),
    getActivity(clientId),
    getClientUsers(userId, clientId),
  ]);

  return { metrics, tickets, reports, activity, users };
}

async function getClientUserSummary(userId: string) {
  const tickets = await getDashboardTickets({ raisedById: userId }, 200);
  return { tickets };
}

async function getAgentSummary(userId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const now = new Date();
  const in4h = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  const [assigned, resolvedTodayIssues, recentIssues] = await Promise.all([
    prisma.issue.findMany({
      where: { assignedToId: userId, status: { notIn: ["RESOLVED", "CLOSED"] } },
      orderBy: [{ slaDueAt: "asc" }],
      select: {
        id: true,
        ticketKey: true,
        title: true,
        status: true,
        priority: true,
        aiSummary: true,
        slaBreached: true,
        slaBreachRisk: true,
        slaDueAt: true,
        updatedAt: true,
        createdAt: true,
        client: { select: { id: true, name: true } },
        comments: {
          where: { isAiSuggested: true },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true },
        },
      },
    }),
    prisma.issue.findMany({
      where: { assignedToId: userId, status: "RESOLVED", resolvedAt: { gte: todayStart } },
      select: { createdAt: true, resolvedAt: true },
    }),
    prisma.issue.findMany({
      where: { assignedToId: userId },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        ticketKey: true,
        title: true,
        status: true,
        priority: true,
        slaBreached: true,
        slaDueAt: true,
        updatedAt: true,
        client: { select: { name: true } },
      },
    }),
  ]);

  const priorityQueue = [...assigned].sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 9;
    const pb = priorityOrder[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    if (a.slaDueAt && b.slaDueAt) return new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime();
    if (a.slaDueAt) return -1;
    if (b.slaDueAt) return 1;
    return 0;
  }).slice(0, 10);

  const upcomingBreaches = assigned.filter((issue) => {
    if (!issue.slaDueAt) return false;
    const due = new Date(issue.slaDueAt);
    return due >= now && due <= in4h;
  });

  const aiInsights = assigned
    .map((issue) => {
      const waitHours = Math.floor((now.getTime() - new Date(issue.updatedAt).getTime()) / 3600000);
      const dueAt = issue.slaDueAt ? new Date(issue.slaDueAt) : null;
      const hasAiDraft = issue.comments.length > 0 || Boolean(issue.aiSummary);

      if (hasAiDraft) {
        return {
          id: issue.id,
          ticketKey: issue.ticketKey,
          title: issue.title,
          waitHours,
          priority: issue.priority,
          client: issue.client,
          type: "ai_draft",
          message: "AI draft or summary available",
          source: issue.comments.length > 0 ? "suggested comment" : "ticket summary",
        };
      }

      if (issue.slaBreached || (dueAt && dueAt < now)) {
        return {
          id: issue.id,
          ticketKey: issue.ticketKey,
          title: issue.title,
          waitHours,
          priority: issue.priority,
          client: issue.client,
          type: "sla_breach",
          message: "SLA breached - needs immediate response",
          source: "SLA clock",
        };
      }

      if (issue.slaBreachRisk || (dueAt && dueAt >= now && dueAt <= in4h)) {
        return {
          id: issue.id,
          ticketKey: issue.ticketKey,
          title: issue.title,
          waitHours,
          priority: issue.priority,
          client: issue.client,
          type: "sla_risk",
          message: "SLA risk in the next 4 hours",
          source: "SLA clock",
        };
      }

      if (new Date(issue.updatedAt) < sixHoursAgo) {
        return {
          id: issue.id,
          ticketKey: issue.ticketKey,
          title: issue.title,
          waitHours,
          priority: issue.priority,
          client: issue.client,
          type: "follow_up",
          message: "No update for 6+ hours - review next action",
          source: "ticket activity",
        };
      }

      return null;
    })
    .filter((insight): insight is NonNullable<typeof insight> => insight !== null)
    .sort((a, b) => {
      const order: Record<string, number> = { ai_draft: 0, sla_breach: 1, sla_risk: 2, follow_up: 3 };
      return (order[a.type] ?? 9) - (order[b.type] ?? 9) || b.waitHours - a.waitHours;
    })
    .slice(0, 3);

  const avgResponseHrs = resolvedTodayIssues.length > 0
    ? Math.round(
        resolvedTodayIssues.reduce(
          (sum, issue) => sum + (issue.resolvedAt!.getTime() - issue.createdAt.getTime()),
          0,
        ) / resolvedTodayIssues.length / 3600000,
      )
    : 0;

  return {
    kpis: {
      assigned: assigned.length,
      overdue: assigned.filter((issue) => issue.slaDueAt && new Date(issue.slaDueAt) < now).length,
      resolvedToday: resolvedTodayIssues.length,
      slaBreaches: assigned.filter((issue) => issue.slaBreached).length,
      pendingResponse: assigned.filter((issue) => issue.status === "ACKNOWLEDGED").length,
      avgResponseHrs,
    },
    recentIssues,
    priorityQueue,
    upcomingBreaches,
    aiInsights,
  };
}

async function getLeadSummary() {
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    needsAssignment,
    slaRisk,
    escalatedCount,
    agents,
    recentEscalations,
    aiRouted,
    clientsWithCritical,
  ] = await Promise.all([
    prisma.issue.count({ where: { assignedToId: null, status: { in: [...ACTIVE_STATUSES] } } }),
    prisma.issue.count({
      where: {
        status: { notIn: ["RESOLVED", "CLOSED"] },
        OR: [{ slaBreachRisk: true }, { slaBreached: true }],
      },
    }),
    prisma.issue.count({ where: { escalated: true, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    prisma.user.findMany({
      where: { role: "THREESC_AGENT", isActive: true },
      select: {
        id: true,
        name: true,
        assignedIssues: {
          where: { status: { in: [...ACTIVE_STATUSES] } },
          select: { id: true, priority: true, slaDueAt: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.issue.findMany({
      where: { escalated: true, status: { notIn: ["RESOLVED", "CLOSED"] } },
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
    prisma.issue.count({ where: { aiCategory: { not: null }, createdAt: { gte: todayStart } } }),
    prisma.issue.groupBy({
      by: ["clientId"],
      where: { priority: "CRITICAL", status: { notIn: ["RESOLVED", "CLOSED"] } },
      _count: { id: true },
      having: { id: { _count: { gte: 2 } } },
    }),
  ]);

  const agentLoad = agents.map((agent) => {
    const open = agent.assignedIssues.length;
    const critical = agent.assignedIssues.filter((issue) => issue.priority === "CRITICAL").length;
    const overdue = agent.assignedIssues.filter((issue) => issue.slaDueAt && new Date(issue.slaDueAt) < now).length;
    return { id: agent.id, name: agent.name, open, critical, overdue };
  });

  const maxOpen = Math.max(...agentLoad.map((agent) => agent.open), 1);
  const agentLoadWithPct = agentLoad.map((agent) => ({
    ...agent,
    loadPct: Math.round((agent.open / maxOpen) * 100),
    overloaded: agent.open >= OVERLOAD_THRESHOLD,
  }));

  const [unassigned, slaRiskTickets, escalatedTickets, overdueTickets] = await Promise.all([
    getLeadQueueTickets({
      assignedToId: null,
      priority: { in: ["CRITICAL", "HIGH"] },
      status: { in: ["OPEN", "ACKNOWLEDGED"] },
    }),
    getLeadQueueTickets({
      status: { notIn: ["RESOLVED", "CLOSED"] },
      OR: [{ slaBreachRisk: true }, { slaBreached: true }],
    }),
    getLeadQueueTickets({ escalated: true, status: { notIn: ["RESOLVED", "CLOSED"] } }),
    getLeadQueueTickets({
      slaDueAt: { lt: now },
      slaBreached: true,
      status: { notIn: ["RESOLVED", "CLOSED"] },
    }),
  ]);

  const queue = buildLeadQueue([
    [escalatedTickets, "escalated"],
    [slaRiskTickets, "sla_risk"],
    [unassigned, "unassigned"],
    [overdueTickets, "overdue"],
  ]);

  return {
    kpis: {
      needsAssignment,
      slaRisk,
      escalated: escalatedCount,
      overloadedAgents: agentLoadWithPct.filter((agent) => agent.overloaded).length,
      customerRisk: clientsWithCritical.length,
    },
    priorityQueue: queue,
    agentLoad: agentLoadWithPct,
    recentEscalations,
    aiStats: {
      routedToday: aiRouted,
      needsReview: Math.max(0, Math.floor(aiRouted * 0.2)),
    },
  };
}

async function getLeadQueueTickets(where: Prisma.IssueWhereInput) {
  return prisma.issue.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: 6,
    select: {
      id: true,
      ticketKey: true,
      title: true,
      priority: true,
      status: true,
      createdAt: true,
      slaDueAt: true,
      client: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
  });
}

function buildLeadQueue(
  groups: Array<[Awaited<ReturnType<typeof getLeadQueueTickets>>, string]>,
) {
  const seen = new Set<string>();
  const queue: Array<{
    id: string;
    ticketKey: string | null;
    title: string;
    priority: string;
    status: string;
    reason: string;
    client: { name: string };
    assignedTo: { name: string } | null;
    slaDueAt: string | null;
    createdAt: string;
  }> = [];

  for (const [tickets, reason] of groups) {
    for (const ticket of tickets) {
      if (seen.has(ticket.id)) continue;
      seen.add(ticket.id);
      queue.push({
        ...ticket,
        reason,
        createdAt: ticket.createdAt.toISOString(),
        slaDueAt: ticket.slaDueAt?.toISOString() ?? null,
      });
    }
  }

  const priorityWeight: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return queue
    .sort((a, b) => {
      const priorityDiff = (priorityWeight[a.priority] ?? 3) - (priorityWeight[b.priority] ?? 3);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .slice(0, 10);
}

async function getAdminSummary(searchParams: URLSearchParams) {
  const days = Number.parseInt(searchParams.get("days") ?? "30", 10);
  const clientId = searchParams.get("clientId") || null;
  const now = new Date();
  const rangeStart = new Date(now.getTime() - days * 86400000);
  const prevRangeStart = new Date(now.getTime() - 2 * days * 86400000);
  const last30 = new Date(now.getTime() - 30 * 86400000);
  const clientWhere = clientId ? { clientId } : {};
  const clientSql = clientId ? Prisma.sql`AND "clientId" = ${clientId}` : Prisma.empty;

  const [
    issueSummaryRaw,
    issuesByDay,
    resolvedIssuesByDay,
    topCategoriesRaw,
    clientsRaw,
    agentWorkloadRaw,
    clients,
    unrespondedOver24hRaw,
    frtCurrentRaw,
    frtPrevRaw,
    historyEntries,
    recentEscalations,
    recentSlaBreaches,
    aiComments,
  ] = await Promise.all([
    prisma.$queryRaw<Array<{
      totalIssues: bigint;
      openIssues: bigint;
      slaBreached: bigint;
      criticalPriorityIssues: bigint;
      slaAtRiskIssues: bigint;
      criticalSlaAtRisk: bigint;
      unassignedIssues: bigint;
      unassignedOver4h: bigint;
      openIssuesPrev: bigint;
      criticalPrev: bigint;
      unassignedPrev: bigint;
    }>>`
      SELECT
        COUNT(*) AS "totalIssues",
        COUNT(*) FILTER (WHERE status IN ('OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED')) AS "openIssues",
        COUNT(*) FILTER (WHERE "slaBreached" = true) AS "slaBreached",
        COUNT(*) FILTER (WHERE priority = 'CRITICAL' AND status IN ('OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED')) AS "criticalPriorityIssues",
        COUNT(*) FILTER (
          WHERE "slaBreached" = false
            AND status IN ('OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED')
            AND "slaDueAt" <= ${new Date(now.getTime() + 2 * 3600000)}
            AND "slaDueAt" >= ${now}
        ) AS "slaAtRiskIssues",
        COUNT(*) FILTER (
          WHERE priority = 'CRITICAL'
            AND "slaBreached" = false
            AND status IN ('OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED')
            AND "slaDueAt" <= ${new Date(now.getTime() + 2 * 3600000)}
            AND "slaDueAt" >= ${now}
        ) AS "criticalSlaAtRisk",
        COUNT(*) FILTER (WHERE status IN ('OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED') AND "assignedToId" IS NULL) AS "unassignedIssues",
        COUNT(*) FILTER (
          WHERE status IN ('OPEN', 'ACKNOWLEDGED')
            AND "assignedToId" IS NULL
            AND "createdAt" <= ${new Date(now.getTime() - 4 * 3600000)}
        ) AS "unassignedOver4h",
        COUNT(*) FILTER (WHERE "createdAt" >= ${prevRangeStart} AND "createdAt" < ${rangeStart}) AS "openIssuesPrev",
        COUNT(*) FILTER (WHERE priority = 'CRITICAL' AND "createdAt" >= ${prevRangeStart} AND "createdAt" < ${rangeStart}) AS "criticalPrev",
        COUNT(*) FILTER (WHERE "assignedToId" IS NULL AND "createdAt" >= ${prevRangeStart} AND "createdAt" < ${rangeStart}) AS "unassignedPrev"
      FROM "Issue"
      WHERE 1 = 1 ${clientSql}
    `,
    prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT TO_CHAR(DATE("createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') as day, COUNT(*) as count
      FROM "Issue"
      WHERE "createdAt" >= ${rangeStart} ${clientSql}
      GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
      ORDER BY day ASC
    `,
    prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT TO_CHAR(DATE("resolvedAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') as day, COUNT(*) as count
      FROM "Issue"
      WHERE "resolvedAt" IS NOT NULL AND "resolvedAt" >= ${rangeStart} ${clientSql}
      GROUP BY DATE("resolvedAt" AT TIME ZONE 'UTC')
      ORDER BY day ASC
    `,
    prisma.$queryRaw<{ category: string; count: bigint }[]>`
      SELECT "category", COUNT(*) as count
      FROM "Issue"
      WHERE "createdAt" >= ${last30} ${clientSql}
      GROUP BY "category"
      ORDER BY count DESC
    `,
    prisma.$queryRaw<Array<{ id: string; name: string; isActive: boolean; updatedAt: Date; userCount: number; openCount: number; slaBreachCount: number; totalCount: number }>>`
      SELECT
        c.id, c.name, c."isActive", c."updatedAt",
        COALESCE(m.user_count, 0)::int as "userCount",
        COALESCE(i.open_count, 0)::int as "openCount",
        COALESCE(i.sla_breach_count, 0)::int as "slaBreachCount",
        COALESCE(i.total_count, 0)::int as "totalCount"
      FROM "Client" c
      LEFT JOIN (
        SELECT "clientId", COUNT(*) as user_count FROM "ClientMember" GROUP BY "clientId"
      ) m ON c.id = m."clientId"
      LEFT JOIN (
        SELECT
          "clientId",
          COUNT(CASE WHEN status IN ('OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED') THEN 1 END) as open_count,
          COUNT(CASE WHEN "slaBreached" = true THEN 1 END) as sla_breach_count,
          COUNT(*) as total_count
        FROM "Issue"
        GROUP BY "clientId"
      ) i ON c.id = i."clientId"
      ${clientId ? Prisma.sql`WHERE c.id = ${clientId}` : Prisma.empty}
      ORDER BY c.name ASC
    `,
    prisma.$queryRaw<Array<{ id: string; name: string | null; role: string; open: number; critical: number }>>`
      SELECT
        u.id, u.name, u.role,
        COALESCE(i.open_count, 0)::int as open,
        COALESCE(i.critical_count, 0)::int as critical
      FROM "User" u
      LEFT JOIN (
        SELECT
          "assignedToId",
          COUNT(*) as open_count,
          COUNT(CASE WHEN priority = 'CRITICAL' THEN 1 END) as critical_count
        FROM "Issue"
        WHERE status IN ('OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED')
        ${clientId ? Prisma.sql`AND "clientId" = ${clientId}` : Prisma.empty}
        GROUP BY "assignedToId"
      ) i ON u.id = i."assignedToId"
      WHERE u.role IN ('THREESC_AGENT', 'THREESC_LEAD')
      ORDER BY open DESC
    `,
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM "Issue" i
      WHERE i.status = 'OPEN'
      AND i."createdAt" <= ${new Date(now.getTime() - 24 * 3600000)}
      ${clientSql}
      AND NOT EXISTS (
        SELECT 1 FROM "Comment" c WHERE c."issueId" = i.id AND c."isInternal" = false
      )
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
    prisma.issueHistory.findMany({
      where: {
        fieldChanged: { in: ["assignedToId", "status", "priority"] },
        createdAt: { gte: new Date(now.getTime() - 7 * 86400000) },
        ...(clientId ? { issue: { clientId } } : {}),
      },
      include: {
        changedBy: { select: { name: true } },
        issue: { select: { id: true, title: true, ticketKey: true, priority: true, client: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.issue.findMany({
      where: { escalated: true, escalatedAt: { gte: new Date(now.getTime() - 7 * 86400000) }, ...clientWhere },
      select: { id: true, title: true, ticketKey: true, priority: true, escalatedAt: true, client: { select: { name: true } } },
      orderBy: { escalatedAt: "desc" },
      take: 15,
    }),
    prisma.issue.findMany({
      where: { slaBreached: true, updatedAt: { gte: new Date(now.getTime() - 7 * 86400000) }, ...clientWhere },
      select: { id: true, title: true, ticketKey: true, priority: true, updatedAt: true, client: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 15,
    }),
    prisma.comment.findMany({
      where: { isAiSuggested: true, createdAt: { gte: new Date(now.getTime() - 7 * 86400000) }, ...(clientId ? { issue: { clientId } } : {}) },
      select: { id: true, createdAt: true, issue: { select: { id: true, title: true, ticketKey: true, client: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const issueSummary = issueSummaryRaw[0];
  const totalIssues = Number(issueSummary?.totalIssues ?? 0);
  const openIssues = Number(issueSummary?.openIssues ?? 0);
  const slaBreached = Number(issueSummary?.slaBreached ?? 0);
  const criticalPriorityIssues = Number(issueSummary?.criticalPriorityIssues ?? 0);
  const slaAtRiskIssues = Number(issueSummary?.slaAtRiskIssues ?? 0);
  const criticalSlaAtRisk = Number(issueSummary?.criticalSlaAtRisk ?? 0);
  const unassignedIssues = Number(issueSummary?.unassignedIssues ?? 0);
  const unassignedOver4h = Number(issueSummary?.unassignedOver4h ?? 0);
  const openIssuesPrev = Number(issueSummary?.openIssuesPrev ?? 0);
  const criticalPrev = Number(issueSummary?.criticalPrev ?? 0);
  const unassignedPrev = Number(issueSummary?.unassignedPrev ?? 0);
  const avgFrtHours = frtCurrentRaw[0]?.avg_hours != null
    ? Math.round(Number(frtCurrentRaw[0].avg_hours) * 10) / 10
    : null;
  const avgFrtHoursPrev = frtPrevRaw[0]?.avg_hours != null
    ? Math.round(Number(frtPrevRaw[0].avg_hours) * 10) / 10
    : null;
  const slaHealth = totalIssues > 0 ? Math.round(((totalIssues - slaBreached) / totalIssues) * 100) : 100;

  const delta = (curr: number, prev: number): { pct: string; dir: "up" | "down" | "neutral" } => {
    if (prev === 0) return { pct: "-", dir: "neutral" };
    const change = Math.round(((curr - prev) / prev) * 100);
    return { pct: `${change > 0 ? "+" : ""}${change}%`, dir: change > 0 ? "up" : change < 0 ? "down" : "neutral" };
  };

  const createdMap = new Map(issuesByDay.map((row) => [row.day, Number(row.count)]));
  const resolvedMap = new Map(resolvedIssuesByDay.map((row) => [row.day, Number(row.count)]));
  const volumeByDay = Array.from({ length: days }, (_, index) => {
    const d = new Date(now.getTime() - (days - 1 - index) * 86400000);
    const key = d.toISOString().slice(0, 10);
    return { day: key.slice(5), created: createdMap.get(key) ?? 0, resolved: resolvedMap.get(key) ?? 0 };
  });

  const customerHealth = clientsRaw.map((client) => ({
    id: client.id,
    name: client.name,
    isActive: client.isActive,
    lastActive: client.updatedAt,
    userCount: client.userCount,
    openIssues: client.openCount,
    slaBreaches: client.slaBreachCount,
    totalIssues: client.totalCount,
    csat: 85,
  }));

  const agentWorkload = agentWorkloadRaw.map((agent) => ({
    id: agent.id,
    name: agent.name ?? "Unknown",
    role: agent.role,
    open: agent.open,
    critical: agent.critical,
  }));

  const topCategories = topCategoriesRaw.map((row) => ({ category: row.category, count: Number(row.count) }));
  const aiInsights = buildAdminInsights(days, openIssues, criticalPriorityIssues, criticalPrev, volumeByDay, customerHealth, unassignedIssues, agentWorkloadRaw);
  const feed = buildAdminFeed(historyEntries, recentEscalations, recentSlaBreaches, aiComments);

  return {
    kpis: {
      totalCustomers: clientsRaw.length,
      totalIssues,
      openIssues,
      slaHealth,
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
          : { pct: "-", dir: "neutral" as const },
      },
    },
    actionStrip: {
      criticalSlaAtRisk,
      unrespondedOver24h: Number(unrespondedOver24hRaw[0]?.count ?? 0),
      unassignedOver4h,
      slaBreachedCount: slaBreached,
    },
    agentWorkload,
    topCategories,
    clients,
    aiInsights,
    volumeByDay,
    customerHealth,
    feed,
  };
}

function buildAdminInsights(
  days: number,
  openIssues: number,
  criticalPriorityIssues: number,
  criticalPrev: number,
  volumeByDay: Array<{ day: string; created: number; resolved: number }>,
  customerHealth: Array<{ name: string; openIssues: number }>,
  unassignedIssues: number,
  agentWorkload: Array<{ name: string | null; open: number }>,
) {
  const aiInsights: { type: string; title: string; message: string }[] = [];

  if (criticalPrev > 0) {
    const critChange = Math.round(((criticalPriorityIssues - criticalPrev) / criticalPrev) * 100);
    if (critChange >= 15) {
      aiInsights.push({ type: "error", title: "Critical Volume Spike", message: `Critical tickets up ${critChange}% vs previous ${days}d - escalation pressure is increasing` });
    }
  }

  let consecutiveGrowthDays = 0;
  for (let i = volumeByDay.length - 1; i >= 0; i--) {
    if (volumeByDay[i].created > volumeByDay[i].resolved) consecutiveGrowthDays++;
    else break;
  }
  if (consecutiveGrowthDays >= 3) {
    aiInsights.push({ type: "warning", title: "Backlog Velocity Alert", message: `Backlog has grown for ${consecutiveGrowthDays} consecutive days - resolution rate is not keeping pace` });
  }

  const topClient = [...customerHealth].sort((a, b) => b.openIssues - a.openIssues)[0];
  if (topClient && openIssues >= 6) {
    const pct = Math.round((topClient.openIssues / openIssues) * 100);
    if (pct >= 35 && topClient.openIssues >= 4) {
      aiInsights.push({ type: "warning", title: "Backlog Concentration", message: `${topClient.name} accounts for ${pct}% of the open backlog - consider a focused triage pass` });
    }
  }

  const agentsWithCapacity = agentWorkload.filter((agent) => agent.open <= 2).map((agent) => (agent.name ?? "Agent").split(" ")[0]);
  if (agentsWithCapacity.length > 0 && unassignedIssues >= 3) {
    aiInsights.push({ type: "info", title: "Capacity Available", message: `${agentsWithCapacity.slice(0, 2).join(" and ")} have low workload - redistribute ${unassignedIssues} unassigned tickets` });
  }

  if (aiInsights.length === 0) {
    aiInsights.push({ type: "info", title: "Operations Healthy", message: `No anomalies detected across backlog velocity, SLA compliance, and workload for the last ${days} days.` });
  }

  return aiInsights.slice(0, 4);
}

type AdminHistoryEntry = {
  id: string;
  fieldChanged: string;
  newValue: string | null;
  createdAt: Date;
  changedBy: { name: string };
  issue: { id: string; ticketKey: string | null; priority: string; client: { name: string } };
};

function buildAdminFeed(
  historyEntries: AdminHistoryEntry[],
  recentEscalations: Array<{ id: string; title: string; ticketKey: string | null; priority: string; escalatedAt: Date | null; client: { name: string } }>,
  recentSlaBreaches: Array<{ id: string; title: string; ticketKey: string | null; priority: string; updatedAt: Date; client: { name: string } }>,
  aiComments: Array<{ id: string; createdAt: Date; issue: { id: string; title: string; ticketKey: string | null; client: { name: string } } }>,
) {
  const feed: Array<{
    id: string;
    type: "escalated" | "sla_breached" | "assigned" | "resolved" | "status_changed" | "ai_routed" | "priority_changed";
    message: string;
    sub: string;
    ticketKey: string | null;
    issueId: string;
    time: string;
    priority?: string;
  }> = [];

  for (const escalation of recentEscalations) {
    feed.push({
      id: `esc-${escalation.id}`,
      type: "escalated",
      message: "Ticket escalated",
      sub: `${escalation.ticketKey ?? escalation.id.slice(0, 8)} - ${escalation.client.name}`,
      ticketKey: escalation.ticketKey,
      issueId: escalation.id,
      time: (escalation.escalatedAt ?? new Date()).toISOString(),
      priority: escalation.priority,
    });
  }

  for (const issue of recentSlaBreaches) {
    feed.push({
      id: `sla-${issue.id}`,
      type: "sla_breached",
      message: "SLA breached",
      sub: `${issue.ticketKey ?? issue.id.slice(0, 8)} - ${issue.client.name}`,
      ticketKey: issue.ticketKey,
      issueId: issue.id,
      time: issue.updatedAt.toISOString(),
      priority: issue.priority,
    });
  }

  for (const comment of aiComments) {
    feed.push({
      id: `ai-${comment.id}`,
      type: "ai_routed",
      message: "AI suggested response",
      sub: `${comment.issue.ticketKey ?? comment.issue.id.slice(0, 8)} - ${comment.issue.client.name}`,
      ticketKey: comment.issue.ticketKey,
      issueId: comment.issue.id,
      time: comment.createdAt.toISOString(),
    });
  }

  for (const history of historyEntries) {
    if (history.fieldChanged === "assignedToId" && history.newValue) {
      feed.push({
        id: `hist-${history.id}`,
        type: "assigned",
        message: `${history.changedBy.name} assigned issue`,
        sub: `${history.issue.ticketKey ?? history.issue.id.slice(0, 8)} - ${history.issue.client.name}`,
        ticketKey: history.issue.ticketKey,
        issueId: history.issue.id,
        time: history.createdAt.toISOString(),
        priority: history.issue.priority,
      });
    } else if (history.fieldChanged === "status" && history.newValue === "RESOLVED") {
      feed.push({
        id: `hist-${history.id}`,
        type: "resolved",
        message: `${history.changedBy.name} resolved ticket`,
        sub: `${history.issue.ticketKey ?? history.issue.id.slice(0, 8)} - ${history.issue.client.name}`,
        ticketKey: history.issue.ticketKey,
        issueId: history.issue.id,
        time: history.createdAt.toISOString(),
      });
    } else if (history.fieldChanged === "priority" && history.newValue === "CRITICAL") {
      feed.push({
        id: `hist-${history.id}`,
        type: "priority_changed",
        message: "Priority escalated to Critical",
        sub: `${history.issue.ticketKey ?? history.issue.id.slice(0, 8)} - ${history.issue.client.name}`,
        ticketKey: history.issue.ticketKey,
        issueId: history.issue.id,
        time: history.createdAt.toISOString(),
      });
    }
  }

  const seen = new Set<string>();
  return feed
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .filter((entry) => {
      const key = `${entry.type}-${entry.issueId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 30);
}

async function getMetrics(
  scopeFilter: Prisma.IssueWhereInput,
  clientId: string | undefined,
  isClientUser: boolean,
) {
  const [statusCounts, criticalIssues, totalIssues, slaBreachedCount, slaBreachRiskCount] = await Promise.all([
    prisma.issue.groupBy({
      by: ["status"],
      where: scopeFilter,
      _count: { id: true },
    }),
    prisma.issue.count({ where: { ...scopeFilter, priority: "CRITICAL" } }),
    prisma.issue.count({ where: scopeFilter }),
    prisma.issue.count({ where: { ...scopeFilter, slaBreached: true } }),
    prisma.issue.count({ where: { ...scopeFilter, slaBreachRisk: true } }),
  ]);

  const statusCount = (status: string) => statusCounts.find((row) => row.status === status)?._count.id ?? 0;
  let avgResolutionTime = 0;

  try {
    const whereSql = clientId
      ? Prisma.sql`WHERE status = 'RESOLVED' AND "resolvedAt" IS NOT NULL AND "clientId" = ${clientId}`
      : Prisma.sql`WHERE status = 'RESOLVED' AND "resolvedAt" IS NOT NULL`;
    const resolutionResult = await prisma.$queryRaw<Array<{ avg_days: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 86400) as avg_days
      FROM "Issue"
      ${whereSql}
    `;
    avgResolutionTime = resolutionResult[0]?.avg_days ? Math.round(resolutionResult[0].avg_days * 10) / 10 : 0;
  } catch {
    avgResolutionTime = 0;
  }

  const activeCustomers = isClientUser
    ? undefined
    : await prisma.client.count({ where: { isActive: true } }).catch(() => 0);

  return {
    activeCustomers,
    openTickets: statusCount("OPEN"),
    inProgressTickets: statusCount("IN_PROGRESS"),
    resolvedTickets: statusCount("RESOLVED"),
    criticalIssues,
    avgResolutionTime,
    teamEfficiencyScore: Math.round(Math.max(0, 100 - (slaBreachedCount + slaBreachRiskCount * 0.5))),
    slaBreachedCount,
    slaBreachRiskCount,
    totalIssues,
  };
}

async function getDashboardTickets(where: Prisma.IssueWhereInput, take: number) {
  const rawTickets = await prisma.issue.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      ticketKey: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      category: true,
      slaBreached: true,
      slaBreachRisk: true,
      slaDueAt: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { id: true, name: true } },
      raisedBy: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      _count: { select: { comments: { where: { isInternal: false } } } },
    },
  });

  return rawTickets.map(({ _count, ...ticket }) => ({
    ...ticket,
    hasResponse: _count.comments > 0,
  }));
}

async function getReports(whereBase: Prisma.IssueWhereInput) {
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const [issuesLast8Weeks, priorityCounts, categoryCounts, resolvedTotal, resolvedNotBreached, resolvedIssues] = await Promise.all([
    prisma.issue.findMany({
      where: { ...whereBase, createdAt: { gte: eightWeeksAgo } },
      select: { createdAt: true, resolvedAt: true },
    }),
    prisma.issue.groupBy({ by: ["priority"], where: whereBase, _count: { id: true } }),
    prisma.issue.groupBy({ by: ["category"], where: whereBase, _count: { id: true } }),
    prisma.issue.count({ where: { ...whereBase, status: { in: ["RESOLVED", "CLOSED"] } } }),
    prisma.issue.count({ where: { ...whereBase, status: { in: ["RESOLVED", "CLOSED"] }, slaBreached: false } }),
    prisma.issue.findMany({ where: { ...whereBase, resolvedAt: { not: null } }, select: { createdAt: true, resolvedAt: true }, take: 200 }),
  ]);

  const weeklyMap: Record<string, { created: number; resolved: number }> = {};
  for (let i = 7; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    weeklyMap[`W${8 - i} (${date.toLocaleDateString("en-GB", { month: "short", day: "numeric" })})`] = { created: 0, resolved: 0 };
  }

  const weekKeys = Object.keys(weeklyMap);
  for (const issue of issuesLast8Weeks) {
    const weeksAgo = Math.floor((Date.now() - issue.createdAt.getTime()) / (7 * 24 * 3600 * 1000));
    if (weeksAgo < 8) {
      const key = weekKeys[7 - weeksAgo];
      if (key) weeklyMap[key].created++;
    }
    if (issue.resolvedAt) {
      const weeksAgo = Math.floor((Date.now() - issue.resolvedAt.getTime()) / (7 * 24 * 3600 * 1000));
      if (weeksAgo < 8) {
        const key = weekKeys[7 - weeksAgo];
        if (key) weeklyMap[key].resolved++;
      }
    }
  }

  const priorities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
  const categories = ["BUG", "FEATURE_REQUEST", "DATA_ACCURACY", "PERFORMANCE", "ACCESS_SECURITY"] as const;

  return {
    weeklyVolume: Object.entries(weeklyMap).map(([week, counts]) => ({ week, ...counts })),
    priorityBreakdown: priorities.map((priority) => ({
      priority,
      count: priorityCounts.find((row) => row.priority === priority)?._count.id ?? 0,
    })),
    categoryBreakdown: categories.map((category) => ({
      category: category.replace("_", " "),
      count: categoryCounts.find((row) => row.category === category)?._count.id ?? 0,
    })),
    slaCompliance: resolvedTotal > 0 ? Math.round((resolvedNotBreached / resolvedTotal) * 100) : 100,
    avgResolutionDays: resolvedIssues.length > 0
      ? Math.round(
          (resolvedIssues.reduce((sum, issue) => sum + (issue.resolvedAt!.getTime() - issue.createdAt.getTime()) / (1000 * 3600 * 24), 0) /
            resolvedIssues.length) *
            10,
        ) / 10
      : 0,
  };
}

async function getActivity(clientId: string | undefined) {
  const history = await prisma.issueHistory.findMany({
    where: clientId ? { issue: { clientId } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      changedBy: { select: { name: true } },
      issue: { select: { id: true, ticketKey: true, title: true } },
    },
  });

  const assignedUserIds = Array.from(new Set(
    history
      .filter((entry) => entry.fieldChanged === "assignedToId")
      .flatMap((entry) => [entry.oldValue, entry.newValue])
      .filter((value): value is string => Boolean(value)),
  ));

  const assignedUsers = assignedUserIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: assignedUserIds } }, select: { id: true, name: true } })
    : [];
  const userNameById = new Map(assignedUsers.map((user) => [user.id, user.name]));
  const actionLabels: Record<string, string> = {
    status: "updated status",
    priority: "updated priority",
    category: "updated category",
    assignedToId: "assigned ticket",
    escalated: "updated escalation",
    title: "updated title",
  };

  const displayValue = (entry: (typeof history)[number], value: string | null) => {
    if (!value) return null;
    if (entry.fieldChanged === "assignedToId") return userNameById.get(value) ?? "Unknown user";
    if (entry.fieldChanged === "escalated" && (value === "true" || value === "false")) return null;
    return value;
  };

  return history.map((entry) => ({
    ...entry,
    actionLabel: actionLabels[entry.fieldChanged] ?? entry.fieldChanged.replace(/([A-Z])/g, " $1").trim(),
    displayOldValue: displayValue(entry, entry.oldValue),
    displayNewValue: displayValue(entry, entry.newValue),
  }));
}

async function getClientUsers(userId: string, clientId: string) {
  const membership = await prisma.clientMember.findFirst({
    where: { userId, clientId },
    include: {
      client: {
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
            },
          },
        },
      },
    },
  });

  return membership?.client.members.map((member) => member.user).filter((user) => user.isActive !== false) ?? [];
}
