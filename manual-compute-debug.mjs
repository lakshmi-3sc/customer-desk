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

(async () => {
  try {
    // Get CRVO-1021
    const newTicket = await prisma.issue.findFirst({
      where: { ticketKey: 'CRVO-1021' },
      select: { id: true, title: true, clientId: true, category: true }
    });

    console.log(`Ticket: ${newTicket.title}`);
    console.log(`Category: ${newTicket.category}\n`);

    // Get resolved tickets in same category
    const resolved = await prisma.issue.findMany({
      where: {
        clientId: newTicket.clientId,
        status: { in: ["RESOLVED", "CLOSED"] },
        id: { not: newTicket.id },
        category: newTicket.category
      },
      select: { id: true, ticketKey: true, title: true },
      take: 50
    });

    console.log(`Found ${resolved.length} resolved BUG tickets\n`);

    // Calculate similarity
    const scored = resolved.map((r) => ({
      id: r.id,
      ticketKey: r.ticketKey,
      title: r.title,
      wordScore: wordSimilarity(newTicket.title, r.title),
    }));

    scored.sort((a, b) => b.wordScore - a.wordScore);
    
    console.log('Top matches:');
    scored.slice(0, 5).forEach(s => {
      console.log(`  ${Math.round(s.wordScore * 100)}% - ${s.ticketKey}: ${s.title.substring(0,40)}`);
    });

    // Check which ones would be stored
    const matches = scored.filter(s => s.wordScore >= 0.4).slice(0, 3);
    console.log(`\nHigh confidence (>=40%): ${matches.length}`);
    matches.forEach(m => console.log(`  ✓ ${m.ticketKey}`));

    // Store them
    for (const sim of matches) {
      await prisma.similarResolution.upsert({
        where: { issueId_similarResolvedId: { issueId: newTicket.id, similarResolvedId: sim.id } },
        update: { similarityScore: Math.round(sim.wordScore * 100), method: "word" },
        create: {
          issueId: newTicket.id,
          similarResolvedId: sim.id,
          similarityScore: Math.round(sim.wordScore * 100),
          method: "word",
        },
      });
    }

    console.log(`\n✓ Stored ${matches.length} similar resolutions`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
