import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveTicketId } from "@/lib/resolve-ticket";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idOrKey } = await params;
    const ticketId = await resolveTicketId(idOrKey);

    if (!ticketId) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const ticket = await prisma.issue.findUnique({
      where: {
        id: ticketId,
      },
      include: {
        raisedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        attachments: true,
        similarResolutionsFor: {
          include: {
            similarResolved: {
              select: {
                id: true,
                ticketKey: true,
                title: true,
                status: true,
                resolvedAt: true,
              },
            },
          },
          orderBy: {
            similarityScore: "desc",
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const is3SCTeam = ["THREESC_ADMIN", "THREESC_LEAD", "THREESC_AGENT"].includes(currentUser.role);
    if (!is3SCTeam) {
      const membership = await prisma.clientMember.findFirst({
        where: {
          userId: currentUser.id,
          clientId: ticket.client.id,
        },
        select: { id: true },
      });

      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Failed to fetch ticket:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 },
    );
  }
}
