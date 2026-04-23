import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function avgHrs(issues: { createdAt: Date; resolvedAt: Date | null }[]): number | null {
  const valid = issues.filter((i) => i.resolvedAt);
  if (!valid.length) return null;
  const total = valid.reduce(
    (sum, i) => sum + (new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime()) / 3_600_000,
    0
  );
  return Math.round(total / valid.length);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (!role || !["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get("ticketId");
  if (!ticketId) return NextResponse.json({ error: "ticketId required" }, { status: 400 });

  const ticket = await prisma.issue.findUnique({
    where: { id: ticketId },
    select: {
      category: true,
      priority: true,
      title: true,
      assignedToId: true,
      assignedTo: { select: { name: true } },
      createdAt: true,
    },
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const { category, priority, title, assignedToId, assignedTo } = ticket;

  // ── Step 1: Global historical avg for same category + priority ──────────────
  const globalSample = await prisma.issue.findMany({
    where: { category: category as never, priority: priority as never, status: { in: ["RESOLVED", "CLOSED"] }, resolvedAt: { not: null } },
    select: { createdAt: true, resolvedAt: true },
    take: 100,
  });
  const globalAvgHrs = avgHrs(globalSample);

  // ── Step 2: Agent's personal avg for this category ─────────────────────────
  let agentAvgHrs: number | null = null;
  let agentOpenCount = 0;
  let agentCategoryResolved = 0;

  if (assignedToId) {
    const [agentSample, openCount, catResolved] = await Promise.all([
      prisma.issue.findMany({
        where: { assignedToId, status: { in: ["RESOLVED", "CLOSED"] }, resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
        take: 50,
      }),
      prisma.issue.count({
        where: { assignedToId, status: { in: ["OPEN", "IN_PROGRESS", "ACKNOWLEDGED"] } },
      }),
      prisma.issue.count({
        where: { assignedToId, category: category as never, status: { in: ["RESOLVED", "CLOSED"] } },
      }),
    ]);
    agentAvgHrs = avgHrs(agentSample);
    agentOpenCount = openCount;
    agentCategoryResolved = catResolved;
  }

  // ── Step 3: Workload penalty factor ────────────────────────────────────────
  // Each extra open ticket beyond 5 adds ~10% delay
  const workloadPenaltyPct = Math.max(0, (agentOpenCount - 5) * 10);

  // ── Step 4: Weighted baseline before AI ────────────────────────────────────
  // If agent has personal history, weight 70% agent + 30% global; else 100% global
  let baselineHrs: number | null = null;
  if (agentAvgHrs !== null && globalAvgHrs !== null) {
    baselineHrs = Math.round(agentAvgHrs * 0.7 + globalAvgHrs * 0.3);
  } else {
    baselineHrs = agentAvgHrs ?? globalAvgHrs;
  }

  // Apply workload penalty
  const adjustedBaseline = baselineHrs !== null
    ? Math.round(baselineHrs * (1 + workloadPenaltyPct / 100))
    : null;

  // ── Step 5: Claude synthesises final prediction ────────────────────────────
  const prompt = `You are a support operations analyst predicting resolution time for a support ticket.

Ticket:
- Title: ${title}
- Category: ${category.replace(/_/g, " ")}
- Priority: ${priority}
- Assigned to: ${assignedTo?.name ?? "Unassigned"}

Data inputs:
- Global avg resolution time for ${category.replace(/_/g, " ")} / ${priority} tickets: ${globalAvgHrs !== null ? globalAvgHrs + "h" : "insufficient data"}  (based on ${globalSample.length} resolved tickets)
- Agent's personal avg resolution time (all categories): ${agentAvgHrs !== null ? agentAvgHrs + "h" : "no history yet"}
- Agent's resolved tickets in this category: ${agentCategoryResolved}
- Agent's current open ticket count: ${agentOpenCount} (workload penalty applied: +${workloadPenaltyPct}%)
- Weighted baseline estimate (pre-AI): ${adjustedBaseline !== null ? adjustedBaseline + "h" : "insufficient data"}

Priority resolution norms:
- CRITICAL: typically 4–12h
- HIGH: typically 12–48h
- MEDIUM: typically 24–72h
- LOW: typically 48–120h

Using the data above, predict the resolution time. Respond ONLY with valid JSON:
{
  "predictedHrs": <integer>,
  "confidence": "<High | Medium | Low>",
  "confidenceReason": "<one sentence why confidence is High/Medium/Low>",
  "breakdown": "<one sentence explaining the key factors: historical avg, agent expertise, workload>",
  "displayLabel": "<human friendly label e.g. '~2 days', '~6 hours', '3–4 days'>"
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    const cleaned = text.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const ai = JSON.parse(cleaned);

    return NextResponse.json({
      predictedHrs: ai.predictedHrs,
      displayLabel: ai.displayLabel,
      confidence: ai.confidence,
      confidenceReason: ai.confidenceReason,
      breakdown: ai.breakdown,
      inputs: {
        globalAvgHrs,
        globalSampleSize: globalSample.length,
        agentAvgHrs,
        agentOpenCount,
        agentCategoryResolved,
        workloadPenaltyPct,
        adjustedBaseline,
      },
    });
  } catch {
    // Fallback to baseline if Claude fails
    return NextResponse.json({
      predictedHrs: adjustedBaseline,
      displayLabel: adjustedBaseline ? `~${Math.round(adjustedBaseline / 24)} day(s)` : null,
      confidence: "Low",
      confidenceReason: "AI unavailable — using historical average only",
      breakdown: `Based on ${globalSample.length} similar resolved tickets with ${workloadPenaltyPct}% workload adjustment`,
      inputs: { globalAvgHrs, globalSampleSize: globalSample.length, agentAvgHrs, agentOpenCount, agentCategoryResolved, workloadPenaltyPct, adjustedBaseline },
    });
  }
}
