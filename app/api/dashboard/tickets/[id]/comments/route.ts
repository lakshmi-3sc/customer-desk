import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { resolveTicketId } from "@/lib/resolve-ticket";
import { extractMentions, findUserByMention, createNotification, isUserMentionable } from "@/lib/notifications";
import { uploadFilesToSupabase } from "@/lib/file-upload";
import { canAccessTicket, getAccessUser, is3SCRole } from "@/lib/tenant-access";
import type { EmailContext } from "@/lib/notifications";
import type { Server } from "socket.io";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await getAccessUser(session);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id: idOrKey } = await params;
    const id = await resolveTicketId(idOrKey);
    if (!id) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    const allowed = await canAccessTicket(currentUser, id);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allComments = await prisma.comment.findMany({
      where: {
        issueId: id,
        // Clients cannot see internal notes
        ...(!is3SCRole(currentUser.role) ? { isInternal: false } : {}),
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

    // Parse FormData to get text and files
    const formData = await req.formData();
    const text = formData.get("text") as string;
    const parentId = formData.get("parentId") as string | null;
    const isInternal = formData.get("isInternal") === "true";
    const files = formData.getAll("files") as File[];

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 },
      );
    }

    // Verify the ticket exists and fetch needed fields for notifications
    const ticket = await prisma.issue.findUnique({
      where: { id },
      include: {
        raisedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const currentUser = await getAccessUser(session);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const allowed = await canAccessTicket(currentUser, id);
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If replying, verify parent comment exists and belongs to this ticket
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.issueId !== id) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
    }

    // Only 3SC team members can post internal notes
    const is3SCTeam = is3SCRole(currentUser.role);
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

    // Handle @mention notifications with client-aware filtering
    const mentions = extractMentions(text);
    const commentPreview = text.length > 150 ? text.substring(0, 150) + "…" : text;

    const notifiedUserIds = new Set<string>();

    // Notify @mentioned users
    for (const mention of mentions) {
      const mentionedUser = await findUserByMention(mention);
      if (!mentionedUser || mentionedUser.id === session.user.id) continue;

      const isMentionable = await isUserMentionable(mentionedUser.id, session.user.id, id);
      if (!isMentionable) continue;

      // For internal comments, only notify 3SC team
      if (markInternal && !["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(mentionedUser.role)) {
        continue;
      }

      notifiedUserIds.add(mentionedUser.id);
      const mentionCtx: EmailContext = {
        ticketKey: ticket.ticketKey ?? "",
        ticketId: id,
        ticketTitle: ticket.title,
        ticketPriority: ticket.priority,
        actorName: session.user.name ?? "Someone",
        commentPreview,
        isMention: true,
      };

      await createNotification(
        mentionedUser.id,
        "NEW_COMMENT",
        `${session.user.name} mentioned you`,
        `"${commentPreview}"`,
        id,
        mentionCtx,
      );
    }

    // Also notify ticket raiser and assigned agent (if not already mentioned)
    const recipientsToNotify: string[] = [];

    if (ticket.raisedBy?.id && ticket.raisedBy.id !== session.user.id && !notifiedUserIds.has(ticket.raisedBy.id)) {
      recipientsToNotify.push(ticket.raisedBy.id);
    }

    if (ticket.assignedTo?.id && ticket.assignedTo.id !== session.user.id && !notifiedUserIds.has(ticket.assignedTo.id)) {
      recipientsToNotify.push(ticket.assignedTo.id);
    }

    // Send comment notifications to relevant stakeholders
    for (const userId of recipientsToNotify) {
      const commentCtx: EmailContext = {
        ticketKey: ticket.ticketKey ?? "",
        ticketId: id,
        ticketTitle: ticket.title,
        ticketPriority: ticket.priority,
        actorName: session.user.name ?? "Someone",
        commentPreview,
        isMention: false,
      };

      await createNotification(
        userId,
        "NEW_COMMENT",
        `${session.user.name} commented on`,
        `"${commentPreview}"`,
        id,
        commentCtx,
      );
    }

    // Upload and save attachments if provided
    if (files && files.length > 0) {
      try {
        // Upload files to Supabase Storage
        const uploadedFiles = await uploadFilesToSupabase(files, id);

        // Save file references to database
        await prisma.issueAttachment.createMany({
          data: uploadedFiles.map((file) => ({
            issueId: id,
            uploadedBy: session.user.id,
            fileName: file.name,
            fileUrl: file.url, // URL from Supabase Storage
            fileSize: file.size,
            fileType: file.type,
          })),
        });
      } catch (uploadError) {
        console.error("File upload failed:", uploadError);
        // Continue with comment creation even if attachments fail
        // Attachments will be retried or user can upload separately
      }
    }

    // Broadcast the new comment to all users viewing this ticket via Socket.io
    const io = (globalThis as { __socketio?: Server }).__socketio;
    if (io) {
      io.to(`ticket:${id}`).emit("comment:added", comment);
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
