import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveTicketId } from "@/lib/resolve-ticket";
import { createNotification, getStatusChangeRecipients } from "@/lib/notifications";
import { generateEmbedding } from "@/lib/embeddings";
import { getSlaPolicy } from "@/lib/sla";
import type { EmailContext } from "@/lib/notifications";
import type { Server } from "socket.io";
import type { IssuePriority } from "@prisma/client";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Resolve params promise (Next.js 16 requirement)
    const { id: idOrKey } = await params;
    const id = await resolveTicketId(idOrKey);
    if (!id) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    // Get authenticated session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get ticket
    const ticket = await prisma.issue.findUnique({
      where: { id },
      include: { raisedBy: true, assignedTo: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Authorization check - user must be from the same client or be 3SC
    if (!currentUser.role.startsWith("THREESC_")) {
      const userClient = await prisma.clientMember.findFirst({
        where: { userId: currentUser.id },
      });

      if (!userClient || userClient.clientId !== ticket.clientId) {
        return NextResponse.json(
          { error: "Forbidden - not authorized to update this ticket" },
          { status: 403 },
        );
      }
    }

    // Parse request body
    const body = await request.json();
    const { assignedToId, status, priority, category } = body;

    // Prepare update data
    const updateData: any = {};

    // Update assignedToId if provided
    if (assignedToId !== undefined) {
      if (assignedToId === null) {
        updateData.assignedToId = null;
      } else {
        // Verify if assigned user exists
        const assignedUser = await prisma.user.findUnique({
          where: { id: assignedToId },
        });

        if (!assignedUser) {
          return NextResponse.json(
            { error: "Assigned user not found" },
            { status: 404 },
          );
        }

        updateData.assignedToId = assignedToId;
      }
    }

    // Update priority if provided
    if (priority !== undefined) {
      const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
      }
      updateData.priority = priority;

      // If priority changed, recalculate SLA deadline
      if (priority !== ticket.priority) {
        const slaConfig = await getSlaPolicy(priority as IssuePriority);
        const newSlaDueAt = new Date(
          ticket.createdAt.getTime() + slaConfig.resolutionTime * 60 * 60 * 1000
        );
        updateData.slaDueAt = newSlaDueAt;

        // Recalculate breach status
        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        updateData.slaBreached = newSlaDueAt < now;
        updateData.slaBreachRisk = newSlaDueAt < twoHoursFromNow && newSlaDueAt >= now;
      }
    }

    // Update category if provided
    if (category !== undefined) {
      const validCategories = ["FEATURE_REQUEST", "BUG", "DATA_ACCURACY", "PERFORMANCE", "ACCESS_SECURITY"];
      if (!validCategories.includes(category)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      updateData.category = category;
    }

    // Update status if provided
    if (status !== undefined) {
      const validStatuses = [
        "OPEN",
        "ACKNOWLEDGED",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
      ];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = status;

      // If status is RESOLVED, set resolvedAt
      if (status === "RESOLVED" && !ticket.resolvedAt) {
        updateData.resolvedAt = new Date();
      }

      // If status is CLOSED, set closedAt
      if (status === "CLOSED" && !ticket.closedAt) {
        updateData.closedAt = new Date();
      }
    }

    // Update the ticket
    const updatedTicket = await prisma.issue.update({
      where: { id },
      data: updateData,
      include: {
        raisedBy: true,
        assignedTo: true,
        project: true,
      },
    });

    // Create audit history entries for changed fields
    const changedFields: Array<{
      fieldChanged: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];

    if (status !== undefined && status !== ticket.status) {
      changedFields.push({
        fieldChanged: 'status',
        oldValue: ticket.status,
        newValue: status,
      });
    }

    if (priority !== undefined && priority !== ticket.priority) {
      changedFields.push({
        fieldChanged: 'priority',
        oldValue: ticket.priority,
        newValue: priority,
      });
    }

    if (category !== undefined && category !== ticket.category) {
      changedFields.push({
        fieldChanged: 'category',
        oldValue: ticket.category,
        newValue: category,
      });
    }

    if (assignedToId !== undefined && assignedToId !== ticket.assignedToId) {
      changedFields.push({
        fieldChanged: 'assignedToId',
        oldValue: ticket.assignedToId ?? null,
        newValue: assignedToId ?? null,
      });
    }

    // Create IssueHistory records for each changed field
    for (const field of changedFields) {
      await prisma.issueHistory.create({
        data: {
          issueId: id,
          fieldChanged: field.fieldChanged,
          oldValue: field.oldValue,
          newValue: field.newValue,
          changedById: currentUser.id,
        },
      });
    }

    // Generate embedding if ticket was just resolved (async, non-blocking).
    // The pgvector field is Unsupported in Prisma, so check it through raw SQL.
    const shouldGenerateEmbedding =
      status === "RESOLVED" && !(await ticketHasEmbedding(id));

    if (shouldGenerateEmbedding) {
      // Run embedding generation in background without awaiting
      generateAndStoreEmbeddingAsync(id, updatedTicket.title, updatedTicket.description).catch(
        (error) => console.error(`Failed to generate embedding for ticket ${id}:`, error)
      );
    }

    // Build shared email context
    const baseCtx: EmailContext = {
      ticketKey: updatedTicket.ticketKey ?? "",
      ticketId: id,
      ticketTitle: updatedTicket.title,
      ticketPriority: updatedTicket.priority,
      actorName: currentUser.name,
      clientName: updatedTicket.project?.name ?? "",
    };

    // Create notifications for assignment changes
    if (assignedToId !== undefined && assignedToId !== ticket.assignedToId) {
      if (assignedToId !== null) {
        await createNotification(
          assignedToId,
          "ISSUE_ASSIGNED",
          `${currentUser.name} assigned this to you`,
          `${updatedTicket.title} - ${updatedTicket.category}`,
          id,
          baseCtx,
        );
      }
    }

    // Create notifications for status changes
    if (status !== undefined && status !== ticket.status) {
      const statusCtx: EmailContext = {
        ...baseCtx,
        fromStatus: ticket.status,
        toStatus: status,
      };

      if (status === "RESOLVED" || status === "CLOSED") {
        // Notify the client who raised the ticket — they care most about resolution
        if (ticket.raisedById !== currentUser.id) {
          await createNotification(
            ticket.raisedById,
            "ISSUE_RESOLVED",
            `Your ticket has been ${status.toLowerCase()}`,
            `${updatedTicket.title} — ${ticket.status} → ${status}`,
            id,
            statusCtx,
          );
        }
      } else {
        // For other status changes, only notify the assigned agent (if not the one making the change)
        if (updatedTicket.assignedTo && updatedTicket.assignedTo.id !== currentUser.id) {
          await createNotification(
            updatedTicket.assignedTo.id,
            "STATUS_UPDATED",
            `Status changed to ${status.replace(/_/g, " ")}`,
            `${updatedTicket.title} — ${ticket.status} → ${status}`,
            id,
            statusCtx,
          );
        }
      }
    }

    // Broadcast update to all subscribers via Socket.IO
    const io: Server | undefined = (global as any).__socketio;
    if (io) {
      // Notify anyone viewing this specific ticket
      io.to(`ticket:${id}`).emit("ticket:updated", updatedTicket);
      // Notify ticket list subscribers (dashboards)
      io.to("tickets").emit("ticket:updated", updatedTicket);
    }

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: "Failed to update ticket" },
      { status: 500 },
    );
  }
}

async function ticketHasEmbedding(ticketId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ hasEmbedding: boolean }>>`
    SELECT embedding IS NOT NULL AS "hasEmbedding"
    FROM "Issue"
    WHERE id = ${ticketId}
    LIMIT 1
  `;

  return rows[0]?.hasEmbedding ?? false;
}

/**
 * Generate and store embedding for a resolved ticket
 * This is an async function called in the background (non-blocking)
 * Uses Anthropic's embedding model to generate 1024-dimensional vectors for pgvector
 */
async function generateAndStoreEmbeddingAsync(
  ticketId: string,
  title: string,
  description: string
): Promise<void> {
  try {
    // Combine title and description for embedding
    const text = `${title}. ${description}`;

    // Generate embedding using Anthropic API
    const embedding = await generateEmbedding(text);

    const vector = `[${embedding.join(",")}]`;

    await prisma.$executeRaw`
      UPDATE "Issue"
      SET
        embedding = ${vector}::vector,
        "embeddingModel" = ${"claude-3-5-sonnet-20241022"},
        "embeddingAt" = ${new Date()}
      WHERE id = ${ticketId}
    `;

    console.log(`✓ Generated embedding for ticket ${ticketId}`);
  } catch (error) {
    console.error(`✗ Failed to generate embedding for ticket ${ticketId}:`, error);
    // Don't throw - this is a background operation
  }
}
