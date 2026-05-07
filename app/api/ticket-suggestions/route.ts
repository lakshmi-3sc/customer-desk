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
  resolution?: string;
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
  let resolvedTickets: any[] = [];
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
  let articles: any[] = [];
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const session = await getServerSession(authOptions);

    if (!session?.user || !query || query.length < 2) {
      return NextResponse.json({ tickets: [], articles: [] });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role || "";

    // Step 1: Full-text search
    const candidates = await getFullTextSearchResults(query, userId, role);

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
        slug: (a as any).slug,
        title: a.title,
        category: a.category,
        content: a.content,
      }));

    return NextResponse.json({ tickets, articles });
  } catch (error) {
    console.error("[ticket-suggestions]", error);
    return NextResponse.json({ tickets: [], articles: [] });
  }
}
