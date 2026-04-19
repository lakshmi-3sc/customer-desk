import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveTicketId } from "@/lib/resolve-ticket";
import type { Server } from "socket.io";

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
    const { assignedToId, status } = body;

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
