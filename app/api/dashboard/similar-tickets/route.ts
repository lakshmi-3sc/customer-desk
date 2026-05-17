import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessTicket, getAccessUser, is3SCRole } from "@/lib/tenant-access";

type SimilarRecord = {
  similarityScore: number;
  method: string;
  similarResolved: {
    id: string;
    clientId: string | null;
    ticketKey: string | null;
    title: string;
    category: string;
    priority: string;
    resolvedAt: Date | null;
    assignedTo: { name: string } | null;
  };
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await getAccessUser(session);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId required" }, { status: 400 });
    }

    const allowed = await canAccessTicket(currentUser, ticketId);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sourceTicket = await prisma.issue.findUnique({
      where: { id: ticketId },
      select: { clientId: true },
    });

    console.log(`[similar-tickets] Fetching for ticketId: ${ticketId}`);

    // Fetch pre-computed similar resolutions from database
    let similarRecords: SimilarRecord[] = [];
    try {
      similarRecords = await prisma.similarResolution.findMany({
        where: { issueId: ticketId },
        orderBy: { similarityScore: "desc" },
        take: 3,
        include: {
          similarResolved: {
            select: {
              id: true,
              clientId: true,
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
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && err.code === "P2021") {
        console.log(`[similar-tickets] SimilarResolution table doesn't exist yet, skipping`);
        similarRecords = [];
      } else {
        throw err;
      }
    }

    console.log(`[similar-tickets] Found ${similarRecords.length} similar records`);

    if (!is3SCRole(currentUser.role)) {
      similarRecords = similarRecords.filter(
        (record) => record.similarResolved.clientId === sourceTicket?.clientId,
      );
    }

    // Fetch comments for similar resolved tickets
    const similarIds = similarRecords.map(r => r.similarResolved.id);
    const comments = similarIds.length > 0
      ? await prisma.comment.findMany({
          where: {
            issueId: { in: similarIds },
            ...(!is3SCRole(currentUser.role) ? { isInternal: false } : {}),
          },
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
