import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function wordSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().match(/\b\w+\b/g) || []);
  const words2 = new Set(str2.toLowerCase().match(/\b\w+\b/g) || []);
  if (words1.size === 0 && words2.size === 0) return 1;
  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = words1.size + words2.size - intersection;
  return intersection / Math.max(union, 1);
}

async function checkSemanticSimilarity(
  currentTitle: string,
  resolvedTitle: string
): Promise<boolean> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: `Do these two support tickets describe the same or very similar technical issue? Answer only "yes" or "no".

Current: "${currentTitle}"
Resolved: "${resolvedTitle}"`,
        },
      ],
    });

    const response = message.content[0].type === "text" ? message.content[0].text.toLowerCase() : "";
    return response.includes("yes");
  } catch {
    return false;
  }
}

export async function computeSimilarResolutions(ticketId: string) {
  try {
    const ticket = await prisma.issue.findUnique({
      where: { id: ticketId },
      select: { title: true, clientId: true, category: true },
    });

    if (!ticket) return;

    const resolved = await prisma.issue.findMany({
      where: {
        clientId: ticket.clientId,
        status: { in: ["RESOLVED", "CLOSED"] },
        id: { not: ticketId },
        category: ticket.category,
      },
      select: { id: true, title: true },
      take: 50,
    });

    const similarities: { id: string; score: number; method: "word" | "semantic" }[] = [];

    // Step 1: Word-based scoring
    const scored = resolved.map((r) => ({
      id: r.id,
      title: r.title,
      wordScore: wordSimilarity(ticket.title, r.title),
    }));

    // High confidence (word score >= 35%) - add directly
    for (const s of scored.filter((s) => s.wordScore >= 0.35)) {
      similarities.push({
        id: s.id,
        score: Math.round(s.wordScore * 100),
        method: "word",
      });
    }

    // Step 2: Semantic check for borderline (25-35% word score)
    const borderline = scored.filter((s) => s.wordScore >= 0.25 && s.wordScore < 0.35).slice(0, 5);
    for (const b of borderline) {
      const isSemanticallySimular = await checkSemanticSimilarity(ticket.title, b.title);
      if (isSemanticallySimular) {
        similarities.push({
          id: b.id,
          score: Math.round(b.wordScore * 100) + 10,
          method: "semantic",
        });
      }
    }

    // Sort by score and keep top 3
    const topSimilar = similarities.sort((a, b) => b.score - a.score).slice(0, 3);

    // Store in DB
    for (const sim of topSimilar) {
      await prisma.similarResolution.upsert({
        where: { issueId_similarResolvedId: { issueId: ticketId, similarResolvedId: sim.id } },
        update: { similarityScore: sim.score, method: sim.method },
        create: {
          issueId: ticketId,
          similarResolvedId: sim.id,
          similarityScore: sim.score,
          method: sim.method,
        },
      });
    }
  } catch (error) {
    console.error("[compute-similar-resolutions]", error);
  }
}
