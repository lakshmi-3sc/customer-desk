import { prisma } from "@/lib/prisma";
import { Anthropic } from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Candidate {
  id: string;
  type: "ticket" | "article";
  title: string;
  content: string;
  category?: string;
  status?: string;
  resolvedAt?: string;
}

async function testSearch() {
  try {
    const query = "production planning";
    const queryLower = query.toLowerCase();

    // Get candidates
    const tickets = await prisma.$queryRaw`
      SELECT
        id, title, description as content, 'ticket' as type, status, "resolvedAt", "createdAt"
      FROM "Issue"
      WHERE status = 'RESOLVED' AND (LOWER(title) LIKE ${`%${queryLower}%`} OR LOWER(description) LIKE ${`%${queryLower}%`})
      LIMIT 3
    `;

    const articles = await prisma.$queryRaw`
      SELECT
        id, title, content, 'article' as type, category, NULL as status, NULL as "resolvedAt", "createdAt"
      FROM "KnowledgeBase"
      WHERE "isPublished" = true AND (LOWER(title) LIKE ${`%${queryLower}%`} OR LOWER(content) LIKE ${`%${queryLower}%`})
      LIMIT 2
    `;

    const candidates = [...(tickets as any[]), ...(articles as any[])] as Candidate[];
    
    console.log(`\nFound ${candidates.length} candidates for "${query}"\n`);
    candidates.forEach((c) => console.log(`- [${c.type}] ${c.title}`));

    // Rank with Claude
    if (candidates.length > 0) {
      const formatted = candidates
        .map((c, i) => `${i + 1}. [${c.type.toUpperCase()}] "${c.title}"\nPreview: ${c.content.substring(0, 100)}...`)
        .join("\n\n");

      const msg = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `User query: "${query}"\n\nRank by relevance (most first). Return ONLY comma-separated numbers:\n${formatted}`
        }]
      });

      const ranking = (msg.content[0] as any).text.trim();
      console.log(`\nClaude ranking: ${ranking}`);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testSearch();
