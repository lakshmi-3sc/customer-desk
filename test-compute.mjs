import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: `${__dirname}/.env` });

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function wordSimilarity(str1, str2) {
  const words1 = new Set(str1.toLowerCase().match(/\b\w+\b/g) || []);
  const words2 = new Set(str2.toLowerCase().match(/\b\w+\b/g) || []);
  if (words1.size === 0 && words2.size === 0) return 1;
  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = words1.size + words2.size - intersection;
  return intersection / Math.max(union, 1);
}

async function checkSemanticSimilarity(currentTitle, resolvedTitle) {
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [{
        role: "user",
        content: `Do these two support tickets describe the same or very similar technical issue? Answer only "yes" or "no".

Current: "${currentTitle}"
Resolved: "${resolvedTitle}"`
      }]
    });
    
    const response = message.content[0].type === "text" ? message.content[0].text.toLowerCase() : "";
    return response.includes("yes");
  } catch (e) {
    console.error(`Semantic check error: ${e.message}`);
    return false;
  }
}

(async () => {
  try {
    const ticketId = process.argv[2];
    if (!ticketId) {
      console.log('Usage: node test-compute.mjs <ticketId>');
      process.exit(1);
    }

    const ticket = await prisma.issue.findUnique({
      where: { id: ticketId },
      select: { title: true, clientId: true, category: true }
    });

    if (!ticket) {
      console.log('Ticket not found');
      process.exit(1);
    }

    console.log(`Testing computation for: "${ticket.title}"\n`);

    const resolved = await prisma.issue.findMany({
      where: {
        clientId: ticket.clientId,
        status: { in: ["RESOLVED", "CLOSED"] },
        id: { not: ticketId },
        category: ticket.category
      },
      select: { id: true, title: true },
      take: 50
    });

    console.log(`Resolved ${ticket.category} tickets: ${resolved.length}\n`);

    const scored = resolved.map((r) => ({
      id: r.id,
      title: r.title,
      wordScore: wordSimilarity(ticket.title, r.title)
    }));

    const borderline = scored.filter((s) => s.wordScore >= 0.2 && s.wordScore < 0.4);

    if (borderline.length === 0) {
      console.log('No borderline matches found');
    } else {
      console.log(`Borderline matches (20-40%): ${borderline.length}`);
      for (const b of borderline.slice(0, 3)) {
        console.log(`\n${Math.round(b.wordScore * 100)}% - "${b.title}"`);
        const isSim = await checkSemanticSimilarity(ticket.title, b.title);
        console.log(`  → Claude says: ${isSim ? '✓ SIMILAR' : '✗ NOT SIMILAR'}`);
      }
    }

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
