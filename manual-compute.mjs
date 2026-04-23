import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function wordSimilarity(str1, str2) {
  const words1 = new Set(str1.toLowerCase().match(/\b\w+\b/g) || []);
  const words2 = new Set(str2.toLowerCase().match(/\b\w+\b/g) || []);
  if (words1.size === 0 && words2.size === 0) return 1;
  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = words1.size + words2.size - intersection;
  return intersection / Math.max(union, 1);
}

async function computeSimilarResolutions(ticketId) {
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

    const scored = resolved.map((r) => ({
      id: r.id,
      wordScore: wordSimilarity(ticket.title, r.title),
    }));

    const topSimilar = scored
      .filter((s) => s.wordScore >= 0.2)
      .sort((a, b) => b.wordScore - a.wordScore)
      .slice(0, 3);

    for (const sim of topSimilar) {
      await prisma.similarResolution.upsert({
        where: { issueId_similarResolvedId: { issueId: ticketId, similarResolvedId: sim.id } },
        update: { similarityScore: Math.round(sim.wordScore * 100), method: "word" },
        create: {
          issueId: ticketId,
          similarResolvedId: sim.id,
          similarityScore: Math.round(sim.wordScore * 100),
          method: "word",
        },
      });
    }
    console.log(`✓ Computed ${topSimilar.length} similar resolutions`);
  } catch (error) {
    console.error("[compute-similar-resolutions]", error);
  }
}

// Get the test ticket ID from args
const ticketId = process.argv[2];
if (!ticketId) {
  console.log('Usage: node manual-compute.mjs <ticketId>');
  process.exit(1);
}

await computeSimilarResolutions(ticketId);
await prisma.$disconnect();
