import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "THREESC_LEAD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

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
          client: { select: { name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
    orderBy: { name: "asc" },
  });

  const agentWorkload = agents.map((agent) => {
    const overdue = agent.assignedIssues.filter(
      (i) => i.slaDueAt && new Date(i.slaDueAt) < now
    ).length;
    return {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      assigned: agent.assignedIssues.length,
      overdue,
      issues: agent.assignedIssues,
    };
  });

  return NextResponse.json({ agents: agentWorkload });
}
