import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Simple string similarity: count matching words
function wordSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().match(/\b\w+\b/g) || []);
  const words2 = new Set(str2.toLowerCase().match(/\b\w+\b/g) || []);
  if (words1.size === 0 && words2.size === 0) return 1;
  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = words1.size + words2.size - intersection;
  return intersection / Math.max(union, 1);
}

// Claude checks semantic similarity for borderline cases
async function checkSemanticSimilarity(
  currentTitle: string,
  resolvedTitle: string
): Promise<boolean> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: `Do these two support tickets describe the same or very similar technical issue? Answer only "yes" or "no".

Current: "${currentTitle}"
Resolved: "${resolvedTitle}"`,
        },
      ],
    });

    const response = message.content[0].type === "text" ? message.content[0].text.toLowerCase() : "";
    return response.includes("yes");
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (!role || !["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(role)) {
      return NextResponse.json({ similar: [] });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");
    const clientId = searchParams.get("clientId");
    const category = searchParams.get("category");

    if (!ticketId || !clientId) {
      return NextResponse.json({ error: "ticketId and clientId required" }, { status: 400 });
    }

    const currentTicket = await prisma.issue.findUnique({
      where: { id: ticketId },
      select: { title: true },
    });

    if (!currentTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Fetch resolved tickets from same client + category
    const resolvedTickets = await prisma.issue.findMany({
      where: {
        clientId,
        status: { in: ["RESOLVED", "CLOSED"] },
        id: { not: ticketId },
        ...(category && { category: category as never }),
      },
      select: {
        id: true,
        ticketKey: true,
        title: true,
        category: true,
        priority: true,
        resolvedAt: true,
        assignedTo: { select: { name: true } },
      },
      orderBy: { resolvedAt: "desc" },
      take: 50,
    });

    // ── STEP 1: Word-based filtering ──────────────────────────────────────
    const wordScored = resolvedTickets.map((ticket) => ({
      ...ticket,
      wordScore: wordSimilarity(currentTicket.title, ticket.title),
    }));

    // High confidence matches (word score >= 0.4)
    const highConfidence = wordScored
      .filter((t) => t.wordScore >= 0.4)
      .map((t) => ({ ...t, similarityScore: Math.round(t.wordScore * 100), method: "word" as const }))
      .sort((a, b) => b.wordScore - a.wordScore)
      .slice(0, 3);

    // Borderline matches (0.2 <= word score < 0.4) for AI semantic check
    const borderline = wordScored.filter((t) => t.wordScore >= 0.2 && t.wordScore < 0.4);

    // ── STEP 2: Claude semantic check for borderline cases ─────────────────
    const semanticMatches = [];
    for (const ticket of borderline.slice(0, 5)) {
      // Check max 5 borderline cases to limit API calls
      const isSemanticallySimular = await checkSemanticSimilarity(
        currentTicket.title,
        ticket.title
      );
      if (isSemanticallySimular) {
        semanticMatches.push({
          ...ticket,
          similarityScore: Math.round(ticket.wordScore * 100) + 10, // Boost score slightly
          method: "semantic" as const,
        });
      }
    }

    // ── STEP 3: Combine and return top 3 ──────────────────────────────────
    const combined = [
      ...highConfidence,
      ...semanticMatches.sort((a, b) => b.similarityScore - a.similarityScore),
    ]
      .slice(0, 3)
      .map(({ wordScore, ...rest }) => rest); // Remove internal wordScore

    return NextResponse.json({ similar: combined });
  } catch (error) {
    console.error("[similar-resolutions]", error);
    return NextResponse.json({ similar: [] });
  }
}
