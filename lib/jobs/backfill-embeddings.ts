/**
 * Backfill embeddings for resolved tickets and published KB articles
 * Uses Anthropic's embedding model to generate 1024-dimensional vectors for pgvector
 *
 * Run with: npx tsx lib/jobs/backfill-embeddings.ts
 */

import { prisma } from "@/lib/prisma";
import { batchGenerateEmbeddings } from "@/lib/embeddings";

const BATCH_SIZE = 10; // Process 10 items at a time (OpenAI batch limit)
const DELAY_BETWEEN_BATCHES = 1000; // 1 second between batches for rate limiting
const EMBEDDING_MODEL = process.env.ANTHROPIC_EMBEDDING_MODEL ?? "claude-3-5-sonnet-20241022";

async function storeIssueEmbedding(id: string, embedding: number[]) {
  const vector = `[${embedding.join(",")}]`;

  await prisma.$executeRaw`
    UPDATE "Issue"
    SET
      embedding = ${vector}::vector,
      "embeddingModel" = ${EMBEDDING_MODEL},
      "embeddingAt" = ${new Date()}
    WHERE id = ${id}
  `;
}

async function storeKnowledgeBaseEmbedding(id: string, embedding: number[]) {
  const vector = `[${embedding.join(",")}]`;

  await prisma.$executeRaw`
    UPDATE "KnowledgeBase"
    SET
      embedding = ${vector}::vector,
      "embeddingModel" = ${EMBEDDING_MODEL},
      "embeddingAt" = ${new Date()}
    WHERE id = ${id}
  `;
}

async function backfillTicketEmbeddings() {
  console.log("🎫 Starting backfill for resolved tickets...");

  let processed = 0;
  let failed = 0;

  try {
    // Get all resolved tickets
    const tickets = await prisma.issue.findMany({
      where: {
        status: "RESOLVED",
      },
      select: {
        id: true,
        title: true,
        description: true,
      },
      orderBy: { resolvedAt: "desc" },
    });

    console.log(`Found ${tickets.length} resolved tickets`);

    if (tickets.length === 0) {
      console.log("No tickets to backfill");
      return;
    }

    // Process in batches
    for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
      const batch = tickets.slice(i, i + BATCH_SIZE);
      const texts = batch.map((t) => `${t.title}. ${t.description}`);

      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(tickets.length / BATCH_SIZE);
      console.log(`\n[${batchNum}/${totalBatches}] Processing ${batch.length} tickets...`);

      try {
        // Generate embeddings for batch
        const embeddings = await batchGenerateEmbeddings(texts);

        // Store embeddings in database
        for (let j = 0; j < batch.length; j++) {
          try {
            await storeIssueEmbedding(batch[j].id, embeddings[j]);
            processed++;
            console.log(
              `  ✓ ${processed}/${tickets.length} - ${batch[j].title.substring(0, 40)}...`
            );
          } catch (err) {
            console.error(
              `  ✗ Failed to store embedding for ticket ${batch[j].id}`
            );
            failed++;
          }
        }

        // Rate limiting
        if (i + BATCH_SIZE < tickets.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_BATCHES)
          );
        }
      } catch (batchErr) {
        console.error(`Batch error:`, batchErr);
        failed += batch.length;
      }
    }

    console.log(`\n✅ Ticket backfill complete: ${processed} processed, ${failed} failed`);
  } catch (err) {
    console.error("Error backfilling ticket embeddings:", err);
    throw err;
  }
}

async function backfillKBEmbeddings() {
  console.log("\n📚 Starting backfill for KB articles...");

  let processed = 0;
  let failed = 0;

  try {
    // Get all published KB articles
    const articles = await prisma.knowledgeBase.findMany({
      where: {
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        content: true,
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`Found ${articles.length} KB articles`);

    if (articles.length === 0) {
      console.log("No articles to backfill");
      return;
    }

    // Process in batches
    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);
      const texts = batch.map((a) => `${a.title}. ${a.content}`);

      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(articles.length / BATCH_SIZE);
      console.log(`\n[${batchNum}/${totalBatches}] Processing ${batch.length} articles...`);

      try {
        // Generate embeddings for batch
        const embeddings = await batchGenerateEmbeddings(texts);

        // Store embeddings in database
        for (let j = 0; j < batch.length; j++) {
          try {
            await storeKnowledgeBaseEmbedding(batch[j].id, embeddings[j]);
            processed++;
            console.log(
              `  ✓ ${processed}/${articles.length} - ${batch[j].title.substring(0, 40)}...`
            );
          } catch (err) {
            console.error(
              `  ✗ Failed to store embedding for article ${batch[j].id}`
            );
            failed++;
          }
        }

        // Rate limiting
        if (i + BATCH_SIZE < articles.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_BATCHES)
          );
        }
      } catch (batchErr) {
        console.error(`Batch error:`, batchErr);
        failed += batch.length;
      }
    }

    console.log(`\n✅ KB backfill complete: ${processed} processed, ${failed} failed`);
  } catch (err) {
    console.error("Error backfilling KB embeddings:", err);
    throw err;
  }
}

async function main() {
  console.log("═".repeat(60));
  console.log("EMBEDDING BACKFILL JOB (Anthropic claude-3-5-sonnet)");
  console.log("═".repeat(60));

  const startTime = Date.now();

  try {
    await backfillTicketEmbeddings();
    await backfillKBEmbeddings();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log("\n" + "═".repeat(60));
    console.log(`✨ Backfill completed successfully in ${duration}s`);
    console.log("═".repeat(60));
  } catch (error) {
    console.error("\n" + "═".repeat(60));
    console.error("❌ Backfill failed:");
    console.error(error);
    console.error("═".repeat(60));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the job
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
