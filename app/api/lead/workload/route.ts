import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

const CAPACITY_MAX = 10;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    !["THREESC_LEAD", "THREESC_ADMIN"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const agents = await prisma.user.findMany({
    where: { role: "THREESC_AGENT", isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      assignedIssues: {
        where: { status: { notIn: ["RESOLVED", "CLOSED"] } },
        select: {
          id: true,
          ticketKey: true,
          title: true,
          priority: true,
          status: true,
          slaDueAt: true,
          slaBreached: true,
          slaBreachRisk: true,
          createdAt: true,
          updatedAt: true,
          escalated: true,
          client: { select: { id: true, name: true } },
        },
        orderBy: [{ priority: "asc" }, { slaDueAt: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  const agentWorkload = agents.map((agent) => {
    const issues = agent.assignedIssues;
    const assigned = issues.length;
    const overdue = issues.filter(
      (i) => i.slaDueAt && new Date(i.slaDueAt) < now
    ).length;
    const critical = issues.filter((i) => i.priority === "CRITICAL").length;
    const slaRisk = issues.filter(
      (i) =>
        i.slaBreachRisk ||
        (i.slaDueAt &&
          new Date(i.slaDueAt) < twoHoursFromNow &&
          new Date(i.slaDueAt) >= now)
    ).length;

    const capacityPct = Math.min(100, Math.round((assigned / CAPACITY_MAX) * 100));
    const status: "available" | "busy" | "overloaded" =
      assigned >= CAPACITY_MAX
        ? "overloaded"
        : assigned >= 6
        ? "busy"
        : "available";

    return {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      assigned,
      overdue,
      critical,
      slaRisk,
      capacityPct,
      capacityMax: CAPACITY_MAX,
      status,
      issues: issues.map((i) => ({
        id: i.id,
        ticketKey: i.ticketKey,
        title: i.title,
        priority: i.priority,
        status: i.status,
        slaDueAt: i.slaDueAt?.toISOString() ?? null,
        slaBreached: i.slaBreached,
        slaBreachRisk: i.slaBreachRisk,
        escalated: i.escalated,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
        client: i.client,
        isOverdue: i.slaDueAt ? new Date(i.slaDueAt) < now : false,
        isSlaRisk:
          i.slaBreachRisk ||
          (i.slaDueAt
            ? new Date(i.slaDueAt) < twoHoursFromNow &&
              new Date(i.slaDueAt) >= now
            : false),
      })),
    };
  });

  return NextResponse.json({ agents: agentWorkload });
}
