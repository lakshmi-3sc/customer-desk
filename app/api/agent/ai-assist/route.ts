import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !["THREESC_AGENT", "THREESC_LEAD", "THREESC_ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const issueId = req.nextUrl.searchParams.get("issueId");
  if (!issueId) return NextResponse.json({ error: "issueId required" }, { status: 400 });

  const issue = await prisma.issue.findFirst({
    where: { OR: [{ id: issueId }, { ticketKey: issueId }] },
    select: {
      id: true, title: true, description: true, category: true, priority: true,
      status: true, createdAt: true, updatedAt: true,
      client: { select: { name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        take: 10,
        select: { content: true, isInternal: true, author: { select: { name: true } } },
      },
    },
  });

  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Find similar resolved issues by category
  const similarIssues = await prisma.issue.findMany({
    where: {
      category: issue.category,
      status: { in: ["RESOLVED", "CLOSED"] },
      id: { not: issue.id },
    },
    orderBy: { resolvedAt: "desc" },
    take: 3,
    select: {
      id: true, ticketKey: true, title: true, resolvedAt: true,
      client: { select: { name: true } },
    },
  });

  // Build thread summary from comments
  const threadLines = issue.comments
    .filter((c) => !c.isInternal)
    .map((c) => `${c.author.name}: ${c.content}`)
    .join("\n");

  const threadSummary = threadLines.length > 0
    ? `Thread with ${issue.comments.filter((c) => !c.isInternal).length} message(s). Last message from ${issue.comments[issue.comments.length - 1]?.author?.name ?? "unknown"}.`
    : "No customer messages yet.";

  const suggestedReply = `Reviewing your ${issue.category.toLowerCase().replace(/_/g, " ")} ticket. Please see the similar resolved tickets below for reference.`;

  const predictedHrs = 24;
  const createdHoursAgo = Math.floor((Date.now() - new Date(issue.createdAt).getTime()) / 3600000);
  const remainingHrs = Math.max(0, predictedHrs - createdHoursAgo);

  return NextResponse.json({
    suggestedReply,
    threadSummary,
    predictedResolutionHrs: predictedHrs,
    estimatedRemainingHrs: remainingHrs,
    similarIssues: similarIssues.map((s) => ({
      id: s.id,
      ticketKey: s.ticketKey,
      title: s.title,
      clientName: s.client.name,
      resolvedAt: s.resolvedAt,
    })),
  });
}
