import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { generateEmbedding, rankBySimilarity } from "@/lib/embeddings";
import { classifyIssue } from "@/lib/ai/classify-issue";
import { Anthropic } from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Candidate {
  id: string;
  type: "ticket" | "article";
  title: string;
  slug?: string;
  content: string;
  category?: string;
  status?: string;
  resolvedAt?: string;
  resolution?: string;
  embedding?: string;
  similarity?: number;
}

interface AIRecommendation {
  category: string;
  priority: string;
  confidence: number;
  reasoning: string;
}

async function getFullTextSearchResults(
  query: string,
  userId: string,
  role: string
): Promise<Candidate[]> {
  const queryLower = query.toLowerCase();

  // Get user's associated clients
  let userClientIds: string[] = [];
  try {
    const clientMembers = await prisma.clientMember.findMany({
      where: { userId },
      select: { clientId: true },
    });
    userClientIds = clientMembers.map((cm) => cm.clientId);
  } catch (err) {
    console.error("[get-client-ids-error]", err);
  }

  // Get resolved tickets - search without complex array filtering
  let resolvedTickets: Candidate[] = [];
  try {
    const allTickets = await prisma.issue.findMany({
      where: {
        status: "RESOLVED",
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        resolvedAt: true,
        clientId: true,
        embedding: true,
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      take: 50,
    });

    // Filter in JavaScript - require match in BOTH title or description (not just one)
    resolvedTickets = allTickets
      .filter((t) => {
        // Check client access - ticket must belong to one of user's clients
        if (t.clientId && userClientIds.length > 0) {
          if (!userClientIds.includes(t.clientId)) {
            return false; // User doesn't have access to this client's tickets
          }
        }

        const titleMatch = t.title.toLowerCase().includes(queryLower);
        const descriptionMatch = t.description.toLowerCase().includes(queryLower);
        // Only return if BOTH title and description contain the query terms OR title has multiple keywords
        return (titleMatch && descriptionMatch) ||
               (titleMatch && queryLower.split(" ").length >= 2 &&
                queryLower.split(" ").some(word => t.description.toLowerCase().includes(word)));
      })
      .map((t) => ({
        id: t.id,
        title: t.title,
        content: t.description,
        type: "ticket",
        status: t.status,
        resolvedAt: t.resolvedAt,
        embedding: t.embedding,
        resolution:
          t.comments && t.comments.length > 0
            ? t.comments[0].content
            : "This ticket has been resolved. Check the ticket details for more information.",
      }))
      .slice(0, 15);
  } catch (err) {
    console.error("[search-tickets-error]", err);
  }

  // Get knowledge base articles - simpler approach
  let articles: Candidate[] = [];
  try {
    const allArticles = await prisma.knowledgeBase.findMany({
      where: {
        isPublished: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        category: true,
        clientId: true,
        isInternal: true,
        embedding: true,
        createdAt: true,
      },
      take: 50,
    });

    // Filter in JavaScript
    articles = allArticles
      .filter((a) => {
        // Check visibility based on role
        if (a.isInternal && role.startsWith("CLIENT")) {
          return false; // Clients can't see internal articles
        }

        // Check clientId access
        if (a.clientId && userClientIds.length > 0) {
          if (!userClientIds.includes(a.clientId)) {
            return false; // User doesn't have access to this client's articles
          }
        }

        // Check content match - require BOTH title and content OR strong title match
        const titleMatch = a.title.toLowerCase().includes(queryLower);
        const contentMatch = a.content.toLowerCase().includes(queryLower);

        return (titleMatch && contentMatch) ||
               (titleMatch && queryLower.split(" ").length >= 2 &&
                queryLower.split(" ").some(word => a.content.toLowerCase().includes(word)));
      })
      .map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        content: a.content,
        type: "article",
        category: a.category,
        embedding: a.embedding,
      }))
      .slice(0, 15);
  } catch (err) {
    console.error("[search-articles-error]", err);
  }

  return [...resolvedTickets, ...articles];
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

  try {
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
  } catch (err) {
    console.error("[claude-ranking-error]", err);
    return candidates;
  }
}

/**
 * Semantic search using pgvector native similarity operator
 * Step 1: Rank keyword-filtered candidates using pgvector <=> operator
 * Step 2: If < 3 results, fallback to semantic-only search on full set
 */
async function semanticRankCandidates(
  query: string,
  candidates: Candidate[],
  userId: string,
  role: string
): Promise<Candidate[]> {
  try {
    const MIN_SIMILARITY = 0.42;

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Get user's client IDs for access control filtering
    const clientMembers = await prisma.clientMember.findMany({
      where: { userId },
      select: { clientId: true },
    });
    const userClientIds = clientMembers.map((cm) => cm.clientId);

    // Step 1: Rank keyword-filtered candidates using pgvector similarity
    let results: Candidate[] = [];
    const candidateIds = candidates.map((c) => c.id);

    if (candidateIds.length > 0) {
      try {
        // Use pgvector native similarity search on filtered candidates
        const rankedTickets = await prisma.$queryRaw<Array<{ id: string; similarity: number }>>`
          SELECT
            id,
            1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
          FROM "Issue"
          WHERE
            id = ANY(${candidateIds}::text[])
            AND embedding IS NOT NULL
          ORDER BY similarity DESC
          LIMIT 5
        `;

        // Convert results back to Candidate format
        for (const ranked of rankedTickets) {
          if (ranked.similarity >= MIN_SIMILARITY) {
            const candidate = candidates.find((c) => c.id === ranked.id);
            if (candidate) {
              results.push({ ...candidate, similarity: ranked.similarity });
            }
          }
        }
      } catch (queryErr) {
        console.error("[pgvector-query-error]", queryErr);
        // Fallback to original candidates if pgvector query fails
        results = candidates.slice(0, 3);
      }
    }

    // Step 2: Fallback if < 3 results (semantic-only on full set)
    if (results.length < 3) {
      try {
        // Fetch all resolved tickets with embeddings
        const allTickets = await prisma.$queryRaw<Array<{ id: string; title: string; description: string; status: string; resolvedAt: string | null; clientId: string; similarity: number }>>`
          SELECT
            id,
            title,
            description,
            status,
            "resolvedAt",
            "clientId",
            1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
          FROM "Issue"
          WHERE
            status = 'RESOLVED'
            AND embedding IS NOT NULL
          ORDER BY similarity DESC
          LIMIT 20
        `;

        // Fetch all published KB articles with embeddings
        const allArticles = await prisma.$queryRaw<Array<{ id: string; slug: string; title: string; content: string; category: string | null; clientId: string | null; similarity: number }>>`
          SELECT
            id,
            slug,
            title,
            content,
            category,
            "clientId",
            1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
          FROM "KnowledgeBase"
          WHERE
            "isPublished" = true
            AND embedding IS NOT NULL
            ${role.startsWith("CLIENT") ? "AND \"isInternal\" = false" : ""}
          ORDER BY similarity DESC
          LIMIT 20
        `;

        // Filter by access control
        const filteredAllCandidates: Candidate[] = [
          ...allTickets
            .filter(
              (t) =>
                !t.clientId ||
                userClientIds.length === 0 ||
                userClientIds.includes(t.clientId)
            )
            .map((t) => ({
              id: t.id,
              title: t.title,
              content: t.description,
              type: "ticket" as const,
              status: t.status,
              resolvedAt: t.resolvedAt,
              similarity: t.similarity,
              embedding: undefined,
            })),
          ...allArticles
            .filter(
              (a) =>
                !a.clientId ||
                userClientIds.length === 0 ||
                userClientIds.includes(a.clientId)
            )
            .map((a) => ({
              id: a.id,
              title: a.title,
              content: a.content,
              slug: a.slug,
              type: "article" as const,
              category: a.category,
              similarity: a.similarity,
              embedding: undefined,
            })),
        ];

        // Add top results from full search to existing results
        for (const candidate of filteredAllCandidates) {
          if (candidate.similarity! < MIN_SIMILARITY) continue;
          if (!results.find((ex) => ex.id === candidate.id) && results.length < 3) {
            results.push(candidate);
          }
        }
      } catch (fallbackErr) {
        console.error("[pgvector-fallback-error]", fallbackErr);
      }
    }

    return results.slice(0, 5); // Return top 5 for Claude ranking
  } catch (err) {
    console.error("[semantic-ranking-error]", err);
    return candidates; // Return original if semantic ranking fails
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const session = await getServerSession(authOptions);

    // Debug logging
    if (!session?.user) {
      console.warn("[ticket-suggestions] Session missing or invalid", {
        hasSession: !!session,
        hasUser: !!session?.user,
        query: query.substring(0, 20),
      });
    }

    if (!session?.user || !query || query.length < 2) {
      return NextResponse.json({
        tickets: [],
        articles: [],
        aiSuggestion: null,
      });
    }

    const sessionUser = session.user as { id?: string; role?: string };
    const userId = sessionUser.id;
    const role = sessionUser.role || "";

    if (!userId) {
      return NextResponse.json({
        tickets: [],
        articles: [],
        aiSuggestion: null,
      });
    }

    // Step 1: Full-text search (keyword filtering) - lenient approach
    const candidates = await getFullTextSearchResults(query, userId, role);

    let ranked: Candidate[] = [];

    // Step 2: Semantic ranking with pgvector (hybrid + fallback)
    // Always try semantic search - even if keyword filtering returns 0 results
    ranked = await semanticRankCandidates(query, candidates, userId, role);

    // Step 3: Claude ranking for final ordering (if we have candidates)
    if (ranked.length > 0) {
      ranked = await rankResultsWithClaude(query, ranked);
    }

    // Step 4: Separate and limit results
    const tickets = ranked
      .filter((r) => r.type === "ticket")
      .slice(0, 3)
      .map((t) => ({
        id: t.id,
        type: "ticket",
        title: t.title,
        status: t.status,
        resolvedAt: t.resolvedAt,
        description: t.content,
        resolution: t.resolution,
      }));

    const articles = ranked
      .filter((r) => r.type === "article")
      .slice(0, 2)
      .map((a) => ({
        id: a.id,
        type: "article",
        slug: a.slug,
        title: a.title,
        category: a.category,
        content: a.content,
      }));

    // Step 5: AI classification (non-blocking, async in background)
    let aiSuggestion: AIRecommendation | null = null;
    try {
      const classification = await classifyIssue(query, query);
      if (classification) {
        aiSuggestion = {
          category: classification.category,
          priority: classification.priority,
          confidence: 0.85, // Default confidence
          reasoning: classification.reasoning || "Based on ticket analysis",
        };
      }
    } catch (aiErr) {
      console.error("[ai-classification-error]", aiErr);
      // Continue without AI suggestion
    }

    return NextResponse.json({ tickets, articles, aiSuggestion });
  } catch (error) {
    console.error("[ticket-suggestions]", error);
    return NextResponse.json({
      tickets: [],
      articles: [],
      aiSuggestion: null,
    });
  }
}
