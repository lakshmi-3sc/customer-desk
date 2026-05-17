import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
export {
  encodeSmartAssignSummary,
  extractSmartAssignSummary,
  stripSmartAssignSummary,
} from "@/lib/smart-assign-codec";
export type { SmartAssignAgent, SmartAssignSnapshot } from "@/lib/smart-assign-codec";
import type { SmartAssignAgent, SmartAssignSnapshot } from "@/lib/smart-assign-codec";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function computeSmartAssign(category: string, priority: string, title: string): Promise<SmartAssignSnapshot> {
  const agents = await prisma.user.findMany({
    where: { role: "THREESC_AGENT", isActive: true },
    select: { id: true, name: true, email: true },
  });

  if (!agents.length) {
    return { agents: [], best: null, aiSummary: "" };
  }

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
              allResolved.reduce((sum, issue) => {
                const hrs =
                  (new Date(issue.resolvedAt!).getTime() -
                    new Date(issue.createdAt).getTime()) /
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

  const prompt = `You are an intelligent support ticket routing system.

Ticket details:
- Category: ${category.replace(/_/g, " ")}
- Priority: ${priority}
- Title: ${title || "(not provided)"}

Available agents and their stats:
${agentStats
  .map(
    (agent, index) =>
      `${index + 1}. ${agent.name} (id: ${agent.id})
   - Open tickets: ${agent.openCount}
   - Resolved in this category (${category.replace(/_/g, " ")}): ${agent.categoryResolved}
   - Total resolved: ${agent.totalResolved}
   - Avg resolution time: ${agent.avgResolutionHrs !== null ? `${agent.avgResolutionHrs}h` : "unknown"}`
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

  const statsMap = new Map(agentStats.map((agent) => [agent.id, agent]));
  const rankedAgents = aiResponse.ranked
    .map((ranked) => {
      const stats = statsMap.get(ranked.id);
      if (!stats) return null;
      const expertiseScore =
        stats.categoryResolved > 0 ? Math.min(1, stats.categoryResolved / 10) : 0;
      const workloadScore = Math.max(0, 1 - stats.openCount / 10);
      const compositeScore = expertiseScore * 0.6 + workloadScore * 0.4;
      return {
        ...stats,
        expertiseScore: Math.round(expertiseScore * 100) / 100,
        workloadScore: Math.round(workloadScore * 100) / 100,
        compositeScore: Math.round(compositeScore * 100) / 100,
        expertiseLabel: ranked.expertiseLabel,
        aiReason: ranked.reason,
      };
    })
    .filter((agent): agent is SmartAssignAgent => Boolean(agent));

  return {
    agents: rankedAgents,
    best: rankedAgents[0] ?? null,
    aiSummary: aiResponse.summary,
  };
}
