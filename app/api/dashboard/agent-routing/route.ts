import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const allowed = ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"];
  if (!role || !allowed.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const title = searchParams.get("title") ?? "";

  try {
    // 1. Fetch all active 3SC agents
    const agents = await prisma.user.findMany({
      where: { role: "THREESC_AGENT", isActive: true },
      select: { id: true, name: true, email: true },
    });

    if (!agents.length) return NextResponse.json({ agents: [], best: null });

    // 2. Compute stats per agent in parallel
    const agentStats = await Promise.all(
      agents.map(async (agent) => {
        const [openCount, categoryResolved, allResolved] = await Promise.all([
          prisma.issue.count({
            where: {
              assignedToId: agent.id,
              status: { in: ["OPEN", "IN_PROGRESS", "ACKNOWLEDGED"] },
            },
          }),
          prisma.issue.count({
            where: {
              assignedToId: agent.id,
              category: category as never,
              status: { in: ["RESOLVED", "CLOSED"] },
            },
          }),
          prisma.issue.findMany({
            where: {
              assignedToId: agent.id,
              status: { in: ["RESOLVED", "CLOSED"] },
              resolvedAt: { not: null },
            },
            select: { createdAt: true, resolvedAt: true },
            take: 50,
          }),
        ]);

        const totalResolved = allResolved.length;
        const avgResolutionHrs =
          totalResolved > 0
            ? Math.round(
                allResolved.reduce((sum, i) => {
                  const hrs =
                    (new Date(i.resolvedAt!).getTime() -
                      new Date(i.createdAt).getTime()) /
                    3_600_000;
                  return sum + hrs;
                }, 0) / totalResolved
              )
            : null;

        return {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          openCount,
          totalResolved,
          categoryResolved,
          avgResolutionHrs,
        };
      })
    );

    // 3. Ask Claude to rank agents with reasoning
    const prompt = `You are an intelligent support ticket routing system.

Ticket details:
- Category: ${category.replace(/_/g, " ")}
- Priority: ${priority}
- Title: ${title || "(not provided)"}

Available agents and their stats:
${agentStats
  .map(
    (a, i) =>
      `${i + 1}. ${a.name} (id: ${a.id})
   - Open tickets: ${a.openCount}
   - Resolved in this category (${category.replace(/_/g, " ")}): ${a.categoryResolved}
   - Total resolved: ${a.totalResolved}
   - Avg resolution time: ${a.avgResolutionHrs !== null ? a.avgResolutionHrs + "h" : "unknown"}`
  )
  .join("\n\n")}

Rank all agents from best to worst fit for this ticket. Consider:
- Higher categoryResolved = more expertise with this issue type (most important)
- Lower openCount = more bandwidth available
- Lower avgResolutionHrs = faster resolver
- Agents with 0 category experience can still be assigned if they have bandwidth

Respond ONLY with a valid JSON object:
{
  "ranked": [
    {
      "id": "<agent id>",
      "reason": "<one short sentence why this agent is ranked here>",
      "expertiseLabel": "<one of: Expert | Experienced | Familiar | New>"
    }
  ],
  "summary": "<one sentence overall routing decision reasoning>"
}

expertiseLabel rules (based on categoryResolved):
- Expert: 10+
- Experienced: 4-9
- Familiar: 1-3
- New: 0`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "{}";
    const cleaned = text.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const aiResponse = JSON.parse(cleaned) as {
      ranked: { id: string; reason: string; expertiseLabel: string }[];
      summary: string;
    };

    // 4. Merge AI ranking with stats
    const statsMap = new Map(agentStats.map((a) => [a.id, a]));
    const rankedAgents = aiResponse.ranked
      .map((r) => {
        const stats = statsMap.get(r.id);
        if (!stats) return null;
        const expertiseScore =
          stats.categoryResolved > 0
            ? Math.min(1, stats.categoryResolved / 10)
            : 0;
        const workloadScore = Math.max(0, 1 - stats.openCount / 10);
        const compositeScore = expertiseScore * 0.6 + workloadScore * 0.4;
        return {
          ...stats,
          expertiseScore: Math.round(expertiseScore * 100) / 100,
          workloadScore: Math.round(workloadScore * 100) / 100,
          compositeScore: Math.round(compositeScore * 100) / 100,
          expertiseLabel: r.expertiseLabel,
          aiReason: r.reason,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      agents: rankedAgents,
      best: rankedAgents[0] ?? null,
      aiSummary: aiResponse.summary,
    });
  } catch (err) {
    console.error("[agent-routing]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
