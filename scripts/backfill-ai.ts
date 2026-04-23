/**
 * Backfill AI classification for all tickets that are missing aiCategory.
 * Run: npx tsx scripts/backfill-ai.ts
 */
import { prisma } from "@/lib/prisma";
import { classifyIssue } from "@/lib/ai/classify-issue";

async function main() {
  const tickets = await prisma.issue.findMany({
    where: { aiCategory: null },
    select: { id: true, ticketKey: true, title: true, description: true },
  });

  console.log(`Found ${tickets.length} ticket(s) without AI classification`);

  for (const t of tickets) {
    if (!t.title || !t.description) { console.log(`  Skipping ${t.ticketKey} — no content`); continue; }
    try {
      const result = await classifyIssue(t.title, t.description);
      await prisma.issue.update({
        where: { id: t.id },
        data: {
          aiCategory: result.category,
          aiPriority: result.priority,
          aiSummary: `${result.reasoning}${result.module ? ` · Module: ${result.module}` : ""}`,
        },
      });
      console.log(`  ✓ ${t.ticketKey} → ${result.category} / ${result.priority}`);
    } catch (e) {
      console.error(`  ✗ ${t.ticketKey}:`, e);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
