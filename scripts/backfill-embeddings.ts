import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/embeddings";

async function backfillEmbeddings() {
  console.log("🔄 Starting embeddings backfill for resolved tickets...\n");

  if (!process.env.VOYAGE_API_KEY) {
    console.error("❌ VOYAGE_API_KEY not set in .env.local");
    console.error("Get free key from: https://voyageai.com (free tier: 50K tokens/month)");
    process.exit(1);
  }

  try {
    // Fetch resolved tickets using raw SQL (embedding is Unsupported type)
    console.log("📥 Fetching resolved tickets without embeddings...");
    const tickets = await prisma.$queryRaw<Array<{id: string; title: string; description: string}>>`
      SELECT id, title, description
      FROM "Issue"
      WHERE status = 'RESOLVED'
      AND embedding IS NULL
      LIMIT 100
    `;

    if (tickets.length === 0) {
      console.log("✅ No tickets to embed - all resolved tickets already have embeddings!\n");
      return;
    }

    console.log(`Found ${tickets.length} resolved tickets to embed\n`);

    let embedded = 0;
    let failed = 0;

    // Embed each ticket
    for (const ticket of tickets) {
      try {
        const text = `${ticket.title}\n${ticket.description}`;
        console.log(`  📍 Embedding: "${ticket.title.substring(0, 50)}..."`);

        const embedding = await generateEmbedding(text);

        // Store embedding using raw SQL (pgvector native type)
        // Format: '[0.1, 0.2, ...]'::vector
        await prisma.$executeRaw`
          UPDATE "Issue"
          SET embedding = ${JSON.stringify(embedding)}::vector
          WHERE id = ${ticket.id}
        `;

        embedded++;
        console.log(`     ✅ Embedded (1024D)`);
      } catch (err) {
        failed++;
        console.error(`     ❌ Failed:`, err);
      }

      // Respect Voyage AI free tier: 3 RPM = 1 request per 20 seconds
      // Add payment method to Voyage AI dashboard to unlock full limits
      await new Promise((resolve) => setTimeout(resolve, 21000));
    }

    console.log(`\n✅ Backfill complete!`);
    console.log(`   • Embedded: ${embedded}`);
    console.log(`   • Failed: ${failed}`);
    console.log(`\n💡 Run this script again to embed more batches of 100`);
  } catch (error) {
    console.error("❌ Backfill failed:", error);
    process.exit(1);
  }
}

backfillEmbeddings().then(() => {
  console.log("\n🎉 Done!");
  process.exit(0);
});
