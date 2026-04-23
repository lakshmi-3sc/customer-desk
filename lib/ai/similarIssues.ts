import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getResolvedIssuesSummary(): Promise<string> {
  const issues = await prisma.issue.findMany({
    where: { status: { in: ["RESOLVED", "CLOSED"] } },
    select: { id: true, ticketKey: true, title: true },
    orderBy: { resolvedAt: "desc" },
    take: 100,
  });
  return issues
    .map((i) => `${i.ticketKey ?? i.id}: ${i.title}`)
    .join("\n");
}

export async function findSimilarIssues(title: string, description: string) {
  try {
    const summary = await getResolvedIssuesSummary();
    if (!summary) return { similarIssues: [], likelySelfResolvable: false };

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `A user is raising a new support ticket on a Supply Network Planning SaaS:

Title: ${title}
Description: ${description}

Here are past resolved issues from our database:
${summary}

Which 2-3 past issues are most similar to this new one?
Respond ONLY with JSON:
{
  "similarIssues": [
    {
      "ticketKey": "ISS-006",
      "title": "...",
      "similarity": "high/medium",
      "reason": "one sentence why this is similar"
    }
  ],
  "likelySelfResolvable": false
}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const cleaned = text.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(cleaned);
  } catch {
    return { similarIssues: [], likelySelfResolvable: false };
  }
}
