import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { resolveTicketId } from "@/lib/resolve-ticket";
import { extractMentions, findUserByMention, createNotification } from "@/lib/notifications";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: idOrKey } = await params;
    const id = await resolveTicketId(idOrKey);
    if (!id) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const allComments = await prisma.comment.findMany({
      where: {
        issueId: id,
        // Clients cannot see internal notes
        ...(session?.user?.role && ["CLIENT_USER", "CLIENT_ADMIN"].includes(session.user.role)
          ? { isInternal: false }
          : {}),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Build tree: top-level comments with nested replies
    type CommentWithReplies = typeof allComments[0] & { replies: CommentWithReplies[] };
    const map = new Map<string, CommentWithReplies>();
    allComments.forEach((c) => map.set(c.id, { ...c, replies: [] }));

    const roots: CommentWithReplies[] = [];
    map.forEach((c) => {
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.replies.push(c);
      } else {
        roots.push(c);
      }
    });

    return NextResponse.json({ comments: roots });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idOrKey } = await params;
    const id = await resolveTicketId(idOrKey);
    if (!id) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    const { text, parentId, isInternal } = await req.json();
    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 },
      );
    }

    // Verify the ticket exists (already resolved above, just confirm)
    const ticket = await prisma.issue.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // If replying, verify parent comment exists and belongs to this ticket
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.issueId !== id) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
    }

    // Only 3SC team members can post internal notes
    const is3SCTeam = session.user.role && ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(session.user.role);
    const markInternal = isInternal === true && !!is3SCTeam;

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        content: text,
        issueId: id,
        authorId: session.user.id,
        isInternal: markInternal,
        ...(parentId ? { parentId } : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Handle @mention notifications
    const mentions = extractMentions(text);
    for (const mention of mentions) {
      const mentionedUser = await findUserByMention(mention);
      if (!mentionedUser || mentionedUser.id === session.user.id) continue;

      // For internal comments, only notify 3SC team
      if (markInternal && !["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(mentionedUser.role)) {
        continue;
      }

      const messagePreview = text.length > 100 ? text.substring(0, 100) + "..." : text;
      await createNotification(
        mentionedUser.id,
        "NEW_COMMENT",
        `${session.user.name} mentioned you`,
        `"${messagePreview}"`,
        id
      );
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 },
    );
  }
}
