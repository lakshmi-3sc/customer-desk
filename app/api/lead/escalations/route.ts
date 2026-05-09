import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveTicketId } from "@/lib/resolve-ticket";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !["THREESC_LEAD", "THREESC_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const issues = await prisma.issue.findMany({
    where: { escalated: true, status: { notIn: ["RESOLVED", "CLOSED"] } },
    orderBy: { escalatedAt: "desc" },
    select: {
      id: true,
      ticketKey: true,
      title: true,
      priority: true,
      status: true,
      escalatedAt: true,
      slaDueAt: true,
      slaBreached: true,
      assignedTo: { select: { id: true, name: true } },
      escalatedTo: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      raisedBy: { select: { name: true } },
      history: {
        where: { fieldChanged: "escalated" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { newValue: true, changedBy: { select: { name: true } } },
      },
    },
  });

  // Attach escalation reason from history
  const result = issues.map((issue) => ({
    ...issue,
    escalationReason: issue.history[0]?.newValue ?? null,
    escalatedByName: issue.history[0]?.changedBy?.name ?? null,
    isAutoEscalated: issue.history[0]?.changedBy?.name === null ||
      issue.history[0]?.newValue?.startsWith("CRITICAL") ||
      issue.history[0]?.newValue?.startsWith("HIGH") ||
      issue.history[0]?.newValue?.startsWith("SLA") ||
      issue.history[0]?.newValue?.startsWith("Ticket stuck") ||
      issue.history[0]?.newValue?.startsWith("Systemic"),
    history: undefined,
  }));

  return NextResponse.json({ issues: result });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !["THREESC_LEAD", "THREESC_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { action, issueId: rawId, note } = body;

  // Resolve ticket key or ID
  const issueId = rawId?.length > 20 ? rawId : await resolveTicketId(rawId);
  if (!issueId) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  // De-escalate
  if (action === "deescalate") {
    await prisma.issue.update({
      where: { id: issueId },
      data: { escalated: false, escalatedAt: null, escalatedToId: null },
    });
    await prisma.issueHistory.create({
      data: {
        issueId,
        changedById: session.user.id,
        fieldChanged: "escalated",
        oldValue: "true",
        newValue: note ? `De-escalated: ${note}` : "De-escalated by lead",
      },
    });
    return NextResponse.json({ success: true });
  }

  // Manual escalate
  await prisma.issue.update({
    where: { id: issueId },
    data: { escalated: true, escalatedAt: new Date(), escalatedToId: session.user.id },
  });

  await prisma.issueHistory.create({
    data: {
      issueId,
      changedById: session.user.id,
      fieldChanged: "escalated",
      oldValue: "false",
      newValue: note ? `Manual escalation: ${note}` : "Manually escalated by lead",
    },
  });

  if (note) {
    await prisma.comment.create({
      data: {
        issueId,
        authorId: session.user.id,
        content: `🚨 Escalated: ${note}`,
        isInternal: true,
      },
    });
  }

  return NextResponse.json({ success: true });
}
