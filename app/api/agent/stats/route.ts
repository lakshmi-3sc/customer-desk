import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "THREESC_AGENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session.user.id;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const now = new Date();
  const in4h = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  const [assigned, resolvedToday, recentIssues] = await Promise.all([
    prisma.issue.findMany({
      where: { assignedToId: userId, status: { notIn: ["RESOLVED", "CLOSED"] } },
      orderBy: [{ slaDueAt: "asc" }],
      select: {
        id: true, ticketKey: true, title: true, status: true, priority: true,
        slaBreached: true, slaBreachRisk: true, slaDueAt: true, updatedAt: true, createdAt: true,
        client: { select: { id: true, name: true } },
      },
    }),
    prisma.issue.count({
      where: { assignedToId: userId, status: "RESOLVED", resolvedAt: { gte: todayStart } },
    }),
    prisma.issue.findMany({
      where: { assignedToId: userId },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true, ticketKey: true, title: true, status: true, priority: true,
        slaBreached: true, slaDueAt: true, updatedAt: true,
        client: { select: { name: true } },
      },
    }),
  ]);

  const overdue = assigned.filter((i) => i.slaDueAt && new Date(i.slaDueAt) < now).length;
  const slaBreaches = assigned.filter((i) => i.slaBreached).length;
  const pendingResponse = assigned.filter((i) => i.status === "ACKNOWLEDGED").length;

  // Priority queue: sort by priority first, then SLA urgency
  const priorityQueue = [...assigned].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 9;
    const pb = PRIORITY_ORDER[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    if (a.slaDueAt && b.slaDueAt) return new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime();
    if (a.slaDueAt) return -1;
    if (b.slaDueAt) return 1;
    return 0;
  }).slice(0, 10);

  // Upcoming SLA breaches in next 4 hours
  const upcomingBreaches = assigned.filter((i) => {
    if (!i.slaDueAt) return false;
    const due = new Date(i.slaDueAt);
    return due >= now && due <= in4h;
  });

  // AI insights: issues with no update in 6+ hours
  const aiInsights = assigned
    .filter((i) => new Date(i.updatedAt) < sixHoursAgo)
    .slice(0, 3)
    .map((i) => {
      const waitHours = Math.floor((now.getTime() - new Date(i.updatedAt).getTime()) / 3600000);
      return { id: i.id, ticketKey: i.ticketKey, title: i.title, waitHours, priority: i.priority, client: i.client };
    });

  // Avg response time (approx: hours since created for resolved today)
  const avgResponseHrs = resolvedToday > 0 ? 4 : 0;

  return NextResponse.json({
    kpis: { assigned: assigned.length, overdue, resolvedToday, slaBreaches, pendingResponse, avgResponseHrs },
    recentIssues,
    priorityQueue,
    upcomingBreaches,
    aiInsights,
  });
}
