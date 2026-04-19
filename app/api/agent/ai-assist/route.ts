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

  // Generate a contextual suggested reply based on category + status
  const CATEGORY_TEMPLATES: Record<string, string> = {
    BUG: `Thank you for reporting this issue. We have investigated the problem with "${issue.title}" and our team is actively working on a fix. We will keep you updated on the progress and expected resolution time. If you experience any additional issues in the meantime, please don't hesitate to reach out.`,
    FEATURE_REQUEST: `Thank you for your feature suggestion regarding "${issue.title}". We have logged this request and it will be reviewed by our product team in the next planning cycle. We appreciate you taking the time to help us improve the platform.`,
    DELIVERY: `We apologise for the delay with "${issue.title}". Our delivery team has been notified and is prioritising resolution. You should see an update within the next business day. We will provide a progress notification as soon as this is resolved.`,
    BILLING: `Thank you for reaching out about your billing inquiry: "${issue.title}". Our accounts team has reviewed your case and will be in touch with a resolution within 1 business day. We apologise for any inconvenience caused.`,
    GENERAL: `Thank you for contacting our support team about "${issue.title}". We have reviewed your request and our team is looking into this. We will provide an update within 4 business hours.`,
    TECHNICAL: `Thank you for reporting the technical issue: "${issue.title}". Our engineering team has been notified and is investigating the root cause. We will provide a status update within 2 hours and aim to resolve this within the agreed SLA timeframe.`,
  };

  const suggestedReply = CATEGORY_TEMPLATES[issue.category] ?? CATEGORY_TEMPLATES["GENERAL"];

  // Predict resolution time based on category + priority
  const RESOLUTION_HOURS: Record<string, Record<string, number>> = {
    CRITICAL: { BUG: 4, TECHNICAL: 4, DELIVERY: 6, BILLING: 8, GENERAL: 8, FEATURE_REQUEST: 24 },
    HIGH: { BUG: 8, TECHNICAL: 8, DELIVERY: 12, BILLING: 16, GENERAL: 12, FEATURE_REQUEST: 48 },
    MEDIUM: { BUG: 24, TECHNICAL: 24, DELIVERY: 48, BILLING: 24, GENERAL: 24, FEATURE_REQUEST: 120 },
    LOW: { BUG: 48, TECHNICAL: 72, DELIVERY: 72, BILLING: 48, GENERAL: 72, FEATURE_REQUEST: 240 },
  };

  const predictedHrs = RESOLUTION_HOURS[issue.priority]?.[issue.category] ?? 24;
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
