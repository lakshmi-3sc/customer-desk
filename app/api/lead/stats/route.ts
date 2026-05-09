import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

const OVERLOAD_THRESHOLD = 8; // agent considered overloaded above this many open tickets

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !["THREESC_LEAD", "THREESC_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // ─── Parallel base queries ────────────────────────────────────────────
  const [
    needsAssignment,
    slaRisk,
    escalatedCount,
    agents,
    recentEscalations,
    aiRouted,
    clientsWithCritical,
  ] = await Promise.all([
    // Unassigned open tickets
    prisma.issue.count({
      where: { assignedToId: null, status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } },
    }),
    // SLA at risk (breach imminent or already breached)
    prisma.issue.count({
      where: {
        status: { notIn: ["RESOLVED", "CLOSED"] },
        OR: [{ slaBreachRisk: true }, { slaBreached: true }],
      },
    }),
    // Active escalations
    prisma.issue.count({
      where: { escalated: true, status: { notIn: ["RESOLVED", "CLOSED"] } },
    }),
    // All agents with their tickets
    prisma.user.findMany({
      where: { role: "THREESC_AGENT", isActive: true },
      select: {
        id: true,
        name: true,
        assignedIssues: {
          where: { status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } },
          select: {
            id: true,
            status: true,
            priority: true,
            slaDueAt: true,
            createdAt: true,
            resolvedAt: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    // Recent escalations
    prisma.issue.findMany({
      where: { escalated: true, status: { notIn: ["RESOLVED", "CLOSED"] } },
      orderBy: { escalatedAt: "desc" },
      take: 5,
      select: {
        id: true, ticketKey: true, title: true, priority: true, escalatedAt: true,
        assignedTo: { select: { name: true } },
        client: { select: { name: true } },
      },
    }),
    // AI routed today
    prisma.issue.count({
      where: { aiCategory: { not: null }, createdAt: { gte: todayStart } },
    }),
    // Clients with 2+ open CRITICAL tickets (customer risk)
    prisma.issue.groupBy({
      by: ["clientId"],
      where: { priority: "CRITICAL", status: { notIn: ["RESOLVED", "CLOSED"] } },
      _count: { id: true },
      having: { id: { _count: { gte: 2 } } },
    }),
  ]);

  // ─── Agent load balancer ──────────────────────────────────────────────
  const agentLoad = agents.map((agent) => {
    const open = agent.assignedIssues.length;
    const critical = agent.assignedIssues.filter((i) => i.priority === "CRITICAL").length;
    const overdue = agent.assignedIssues.filter(
      (i) => i.slaDueAt && new Date(i.slaDueAt) < now
    ).length;
    return { id: agent.id, name: agent.name, open, critical, overdue };
  });

  const maxOpen = Math.max(...agentLoad.map((a) => a.open), 1);
  const agentLoadWithPct = agentLoad.map((a) => ({
    ...a,
    loadPct: Math.round((a.open / maxOpen) * 100),
    overloaded: a.open >= OVERLOAD_THRESHOLD,
  }));

  const overloadedAgents = agentLoadWithPct.filter((a) => a.overloaded).length;

  // ─── Priority queue ───────────────────────────────────────────────────
  const [unassigned, slaRiskTickets, escalatedTickets, overdueTickets] = await Promise.all([
    prisma.issue.findMany({
      where: {
        assignedToId: null,
        priority: { in: ["CRITICAL", "HIGH"] },
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: 6,
      select: {
        id: true, ticketKey: true, title: true, priority: true, status: true,
        createdAt: true, slaDueAt: true,
        client: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.issue.findMany({
      where: {
        status: { notIn: ["RESOLVED", "CLOSED"] },
        OR: [{ slaBreachRisk: true }, { slaBreached: true }],
      },
      orderBy: { slaDueAt: "asc" },
      take: 6,
      select: {
        id: true, ticketKey: true, title: true, priority: true, status: true,
        createdAt: true, slaDueAt: true, slaBreached: true,
        client: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.issue.findMany({
      where: { escalated: true, status: { notIn: ["RESOLVED", "CLOSED"] } },
      orderBy: { escalatedAt: "desc" },
      take: 6,
      select: {
        id: true, ticketKey: true, title: true, priority: true, status: true,
        createdAt: true, slaDueAt: true, escalatedAt: true,
        client: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.issue.findMany({
      where: {
        slaDueAt: { lt: now },
        slaBreached: true,
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
      orderBy: { slaDueAt: "asc" },
      take: 6,
      select: {
        id: true, ticketKey: true, title: true, priority: true, status: true,
        createdAt: true, slaDueAt: true,
        client: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    }),
  ]);

  // Merge and deduplicate, assign primary reason
  const seen = new Set<string>();
  const queue: {
    id: string; ticketKey: string | null; title: string; priority: string;
    status: string; reason: string; client: { name: string };
    assignedTo: { name: string } | null; slaDueAt: string | null; createdAt: string;
  }[] = [];

  const addToQueue = (tickets: typeof unassigned, reason: string) => {
    for (const t of tickets) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      queue.push({
        ...t,
        reason,
        createdAt: t.createdAt.toISOString(),
        slaDueAt: t.slaDueAt?.toISOString() ?? null,
      });
    }
  };

  addToQueue(escalatedTickets as any, "escalated");
  addToQueue(slaRiskTickets as any, "sla_risk");
  addToQueue(unassigned as any, "unassigned");
  addToQueue(overdueTickets as any, "overdue");

  // Sort by priority weight then createdAt
  const priorityWeight = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  queue.sort((a, b) => {
    const pw = (priorityWeight[a.priority as keyof typeof priorityWeight] ?? 3) -
               (priorityWeight[b.priority as keyof typeof priorityWeight] ?? 3);
    if (pw !== 0) return pw;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return NextResponse.json({
    kpis: {
      needsAssignment,
      slaRisk,
      escalated: escalatedCount,
      overloadedAgents,
      customerRisk: clientsWithCritical.length,
    },
    priorityQueue: queue.slice(0, 10),
    agentLoad: agentLoadWithPct,
    recentEscalations,
    aiStats: {
      routedToday: aiRouted,
      needsReview: Math.max(0, Math.floor(aiRouted * 0.2)),
    },
  });
}
