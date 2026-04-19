import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET escalated issues
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "THREESC_LEAD") {
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
    },
  });

  return NextResponse.json({ issues });
}

// POST: manually escalate an issue
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "THREESC_LEAD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { issueId, note } = await req.json();
  if (!issueId) return NextResponse.json({ error: "issueId required" }, { status: 400 });

  const issue = await prisma.issue.update({
    where: { id: issueId },
    data: {
      escalated: true,
      escalatedAt: new Date(),
      escalatedToId: session.user.id,
    },
  });

  await prisma.issueHistory.create({
    data: {
      issueId,
      changedById: session.user.id,
      fieldChanged: "escalated",
      oldValue: "false",
      newValue: "true",
    },
  });

  if (note) {
    await prisma.comment.create({
      data: {
        issueId,
        authorId: session.user.id,
        content: `[ESCALATION] ${note}`,
        isInternal: true,
      },
    });
  }

  return NextResponse.json({ issue });
}
