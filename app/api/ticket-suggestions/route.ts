import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
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
  createdAt: string;
}

async function getFullTextSearchResults(
  query: string,
  clientId: string
): Promise<Candidate[]> {
  // Get resolved tickets
  const resolvedTickets = await prisma.$queryRaw`
    SELECT
      id,
      title,
      description as content,
      'ticket' as type,
      status,
      "resolvedAt",
      "createdAt"
    FROM "Issue"
    WHERE
      "clientId" = ${clientId}
      AND status = 'RESOLVED'
      AND (
        to_tsvector('english', title) @@ plainto_tsquery('english', ${query})
        OR to_tsvector('english', description) @@ plainto_tsquery('english', ${query})
      )
    ORDER BY "resolvedAt" DESC
    LIMIT 15
  `;

  // Get knowledge base articles
  const articles = await prisma.$queryRaw`
    SELECT
      id,
      title,
      content,
      'article' as type,
      category,
      NULL as status,
      NULL as "resolvedAt",
      "createdAt"
    FROM "KnowledgeBase"
    WHERE
      "isPublished" = true
      AND (
        to_tsvector('english', title) @@ plainto_tsquery('english', ${query})
        OR to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
      )
    ORDER BY "createdAt" DESC
    LIMIT 15
  `;

  return [...(resolvedTickets as Candidate[]), ...(articles as Candidate[])];
}

async function rankResultsWithClaude(
  query: string,
  candidates: Candidate[]
): Promise<Candidate[]> {
  if (candidates.length === 0) return [];

  const formattedCandidates = candidates
    .map(
      (c, i) =>
        `${i + 1}. [${c.type.toUpperCase()}] "${c.title}"
Category: ${c.category || c.status || "General"}
Preview: ${c.content.substring(0, 100)}...`
    )
    .join("\n\n");

  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `User is creating a support ticket with this query: "${query}"

Rank these similar tickets and articles by relevance (most relevant first). Consider:
- Title matching the query intent
- Content relevance to the problem
- How recently resolved (for tickets)
- Practical usefulness

Return ONLY the ranked numbers (1-indexed) separated by commas, nothing else.
Example output: "1,3,2,4,5"

Results to rank:
${formattedCandidates}`,
      },
    ],
  });

  const rankingText =
    message.content[0].type === "text" ? message.content[0].text.trim() : "";

  const rankedIndices = rankingText
    .split(",")
    .map((n) => parseInt(n.trim()) - 1)
    .filter((i) => i >= 0 && i < candidates.length);

  return rankedIndices.map((i) => candidates[i]);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const session = await getServerSession(authOptions);

    if (!session?.user || !query || query.length < 2) {
      return NextResponse.json({ tickets: [], articles: [] });
    }

    const clientId =
      (session.user as any).clientId || (session.user as any).id;

    // Step 1: Full-text search (fast, free)
    const candidates = await getFullTextSearchResults(query, clientId);

    if (candidates.length === 0) {
      return NextResponse.json({ tickets: [], articles: [] });
    }

    // Step 2: Claude ranks them (semantic understanding)
    const ranked = await rankResultsWithClaude(query, candidates);

    // Step 3: Separate and limit results
    const tickets = ranked
      .filter((r) => r.type === "ticket")
      .slice(0, 3)
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        resolvedAt: t.resolvedAt,
      }));

    const articles = ranked
      .filter((r) => r.type === "article")
      .slice(0, 2)
      .map((a) => ({
        id: a.id,
        title: a.title,
        category: a.category,
      }));

    return NextResponse.json({ tickets, articles });
  } catch (error) {
    console.error("[ticket-suggestions]", error);
    return NextResponse.json({ tickets: [], articles: [] });
  }
}
