import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId required" }, { status: 400 });
    }

    console.log(`[similar-tickets] Fetching for ticketId: ${ticketId}`);

    // Fetch pre-computed similar resolutions from database
    const similarRecords = await prisma.similarResolution.findMany({
      where: { issueId: ticketId },
      orderBy: { similarityScore: "desc" },
      take: 3,
      include: {
        similarResolved: {
          select: {
            id: true,
            ticketKey: true,
            title: true,
            category: true,
            priority: true,
            resolvedAt: true,
            assignedTo: { select: { name: true } },
          },
        },
      },
    });

    console.log(`[similar-tickets] Found ${similarRecords.length} similar records`);

    // Fetch comments for similar resolved tickets
    const similarIds = similarRecords.map(r => r.similarResolved.id);
    const comments = similarIds.length > 0
      ? await prisma.comment.findMany({
          where: { issueId: { in: similarIds } },
          select: { issueId: true, content: true, author: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        })
      : [];

    console.log(`[similar-tickets] Fetched ${comments.length} comments`);

    const similar = similarRecords.map((record) => {
      const ticketComments = comments
        .filter(c => c.issueId === record.similarResolved.id)
        .slice(0, 2);

      return {
        id: record.similarResolved.id,
        ticketKey: record.similarResolved.ticketKey,
        title: record.similarResolved.title,
        category: record.similarResolved.category,
        priority: record.similarResolved.priority,
        resolvedAt: record.similarResolved.resolvedAt,
        assignedTo: record.similarResolved.assignedTo,
        similarityScore: record.similarityScore,
        method: record.method,
        resolutionHints: ticketComments.map(c => c.content),
      };
    });

    console.log(`[similar-tickets] Returning ${similar.length} results`);
    return NextResponse.json({ similar });
  } catch (error) {
    console.error("[similar-tickets] ERROR:", error);
    return NextResponse.json({ similar: [], error: String(error) });
  }
}
