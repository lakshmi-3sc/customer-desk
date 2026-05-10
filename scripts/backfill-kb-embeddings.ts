import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/embeddings";

async function backfillKBEmbeddings() {
  console.log("🔄 Starting embeddings backfill for KB articles...\n");

  if (!process.env.VOYAGE_API_KEY) {
    console.error("❌ VOYAGE_API_KEY not set in .env.local");
    process.exit(1);
  }

  try {
    // Fetch published KB articles without embeddings
    console.log("📥 Fetching KB articles without embeddings...");
    const articles = await prisma.$queryRaw<Array<{id: string; title: string; content: string}>>`
      SELECT id, title, content
      FROM "KnowledgeBase"
      WHERE "isPublished" = true
      AND embedding IS NULL
      LIMIT 100
    `;

    if (articles.length === 0) {
      console.log("✅ No KB articles to embed - all published articles already have embeddings!\n");
      return;
    }

    console.log(`Found ${articles.length} KB articles to embed\n`);

    let embedded = 0;
    let failed = 0;

    // Embed each KB article
    for (const article of articles) {
      try {
        const text = `${article.title}\n${article.content}`;
        console.log(`  📍 Embedding: "${article.title.substring(0, 50)}..."`);

        const embedding = await generateEmbedding(text);

        // Store embedding using raw SQL (pgvector native type)
        await prisma.$executeRaw`
          UPDATE "KnowledgeBase"
          SET embedding = ${JSON.stringify(embedding)}::vector
          WHERE id = ${article.id}
        `;

        embedded++;
        console.log(`     ✅ Embedded (1024D)`);
      } catch (err) {
        failed++;
        console.error(`     ❌ Failed:`, err);
      }

      // Respect Voyage AI free tier: 3 RPM = 1 request per 20 seconds
      await new Promise((resolve) => setTimeout(resolve, 21000));
    }

    console.log(`\n✅ KB backfill complete!`);
    console.log(`   • Embedded: ${embedded}`);
    console.log(`   • Failed: ${failed}`);
    console.log(`\n💡 Run this script again to embed more batches of 100`);
  } catch (error) {
    console.error("❌ KB backfill failed:", error);
    process.exit(1);
  }
}

backfillKBEmbeddings().then(() => {
  console.log("\n🎉 Done!");
  process.exit(0);
});
