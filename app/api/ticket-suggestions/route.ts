import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { generateEmbedding } from "@/lib/embeddings";
import { classifyIssue } from "@/lib/ai/classify-issue";
import { Anthropic } from "@anthropic-ai/sdk";
import { Prisma } from "@prisma/client";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
const RERANK_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

interface Candidate {
  id: string;
  type: "ticket" | "article";
  title: string;
  ticketKey?: string | null;
  slug?: string | null;
  content: string;
  category?: string | null;
  status?: string;
  resolvedAt?: Date | string | null;
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

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function uniqueCandidates(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.type}:${candidate.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getUserClientIds(userId: string): Promise<string[]> {
  const clientMembers = await prisma.clientMember.findMany({
    where: { userId },
    select: { clientId: true },
  });

  return clientMembers.map((cm) => cm.clientId);
}

async function getLatestVisibleResolutionMap(
  issueIds: string[],
  role: string
): Promise<Map<string, string>> {
  if (issueIds.length === 0) return new Map();

  const comments = await prisma.comment.findMany({
    where: {
      issueId: { in: issueIds },
      ...(role.startsWith("CLIENT") ? { isInternal: false } : {}),
    },
    select: {
      issueId: true,
      content: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const resolutionByIssueId = new Map<string, string>();
  for (const comment of comments) {
    const content = comment.content.trim();
    if (content && !resolutionByIssueId.has(comment.issueId)) {
      resolutionByIssueId.set(comment.issueId, content);
    }
  }

  return resolutionByIssueId;
}

async function getExactMatchResults(
  query: string,
  userId: string,
  role: string
): Promise<Candidate[]> {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 12) return [];

  try {
    const userClientIds = await getUserClientIds(userId);
    const tickets = await prisma.issue.findMany({
      where: {
        status: "RESOLVED",
        OR: [
          { title: { equals: query, mode: "insensitive" } },
          { description: { equals: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        ticketKey: true,
        title: true,
        description: true,
        status: true,
        resolvedAt: true,
        clientId: true,
        comments: {
          where: role.startsWith("CLIENT") ? { isInternal: false } : undefined,
          select: {
            content: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      take: 5,
    });

    return tickets
      .filter((ticket) => {
        if (ticket.clientId && userClientIds.length > 0 && !userClientIds.includes(ticket.clientId)) {
          return false;
        }

        const normalizedTitle = normalizeSearchText(ticket.title);
        const normalizedDescription = normalizeSearchText(ticket.description);

        return (
          normalizedTitle === normalizedQuery ||
          normalizedDescription === normalizedQuery ||
          (normalizedQuery.length >= 24 && normalizedDescription.includes(normalizedQuery))
        );
      })
      .map((ticket) => ({
        id: ticket.id,
        ticketKey: ticket.ticketKey,
        title: ticket.title,
        content: ticket.description,
        type: "ticket" as const,
        status: ticket.status,
        resolvedAt: ticket.resolvedAt,
        resolution: ticket.comments[0]?.content,
        similarity: 1,
      }));
  } catch (err) {
    console.error("[exact-match-error]", err);
    return [];
  }
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
    userClientIds = await getUserClientIds(userId);
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
        ticketKey: true,
        title: true,
        description: true,
        status: true,
        resolvedAt: true,
        clientId: true,
        comments: {
          where: role.startsWith("CLIENT") ? { isInternal: false } : undefined,
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
        ticketKey: t.ticketKey,
        title: t.title,
        content: t.description,
        type: "ticket" as const,
        status: t.status,
        resolvedAt: t.resolvedAt,
        resolution: t.comments[0]?.content,
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
        title: true,
        content: true,
        category: true,
        clientId: true,
        isInternal: true,
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
        slug: a.id,
        title: a.title,
        content: a.content,
        type: "article" as const,
        category: a.category,
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
      model: RERANK_MODEL,
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
        const allTickets = await prisma.$queryRaw<Array<{ id: string; ticketKey: string | null; title: string; description: string; status: string; resolvedAt: string | null; clientId: string; similarity: number }>>`
          SELECT
            id,
            "ticketKey",
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
            id AS slug,
            title,
            content,
            category,
            "clientId",
            1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
          FROM "KnowledgeBase"
          WHERE
            "isPublished" = true
            AND embedding IS NOT NULL
            ${role.startsWith("CLIENT") ? Prisma.sql`AND "isInternal" = false` : Prisma.empty}
          ORDER BY similarity DESC
          LIMIT 20
        `;

        const visibleTickets = allTickets.filter(
          (t) =>
            !t.clientId ||
            userClientIds.length === 0 ||
            userClientIds.includes(t.clientId)
        );
        const resolutionByTicketId = await getLatestVisibleResolutionMap(
          visibleTickets.map((ticket) => ticket.id),
          role
        );

        // Filter by access control
        const filteredAllCandidates: Candidate[] = [
          ...visibleTickets
            .map((t) => ({
              id: t.id,
              ticketKey: t.ticketKey,
              title: t.title,
              content: t.description,
              type: "ticket" as const,
              status: t.status,
              resolvedAt: t.resolvedAt,
              resolution: resolutionByTicketId.get(t.id),
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

    // Step 1: Exact duplicate check - no embedding/API call needed for obvious repeats.
    const exactMatches = await getExactMatchResults(query, userId, role);

    // Step 2: Full-text search (keyword filtering) - still local and cheap.
    const keywordMatches = exactMatches.length > 0
      ? []
      : await getFullTextSearchResults(query, userId, role);
    const candidates = uniqueCandidates([...exactMatches, ...keywordMatches]);

    let ranked: Candidate[] = [];

    // Step 3: Semantic ranking with pgvector only when local matching is not confident enough.
    // Use Voyage AI for semantic search (recommended by Anthropic, free tier available).
    if (exactMatches.length > 0) {
      ranked = exactMatches.slice(0, 5);
    } else if (candidates.length >= 3) {
      ranked = candidates.slice(0, 5);
    } else {
      try {
        if (process.env.VOYAGE_API_KEY) {
          ranked = await semanticRankCandidates(query, candidates, userId, role);
        } else {
          // Fallback to keyword-only results (Claude will rank them)
          console.warn("[ticket-suggestions] VOYAGE_API_KEY not set, using keyword-only search");
          ranked = candidates.slice(0, 5);
        }
      } catch (err) {
        console.warn("[ticket-suggestions] Semantic search failed, falling back to keyword results:", err);
        ranked = candidates.slice(0, 5);
      }
    }

    // Step 4: Claude ranking for final ordering (skip for exact duplicates to save tokens)
    if (ranked.length > 0 && exactMatches.length === 0) {
      try {
        ranked = await rankResultsWithClaude(query, ranked);
      } catch (err) {
        console.warn("[ticket-suggestions] Claude ranking failed, using unranked results:", err);
        // Continue with unranked results
      }
    }

    // Step 5: Separate and limit results
    const tickets = ranked
      .filter((r) => r.type === "ticket")
      .slice(0, 3)
      .map((t) => ({
        id: t.id,
        type: "ticket",
        ticketKey: t.ticketKey,
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

    // Step 6: AI classification (skip for exact duplicates; the existing ticket already explains it)
    let aiSuggestion: AIRecommendation | null = null;
    if (exactMatches.length === 0) {
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
