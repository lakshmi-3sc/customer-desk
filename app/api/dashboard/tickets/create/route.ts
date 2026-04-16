import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, priority, category, projectId } =
      await req.json();

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 },
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "Project is required" },
        { status: 400 },
      );
    }

    // Get the user's client membership to find their clientId
    const clientMember = await prisma.clientMember.findFirst({
      where: { userId: session.user.id },
    });

    if (!clientMember) {
      return NextResponse.json(
        { error: "User is not associated with a client" },
        { status: 400 },
      );
    }

    // Verify projectId belongs to the user's client
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        clientId: clientMember.clientId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or does not belong to your client" },
        { status: 400 },
      );
    }

    // Create the ticket
    const ticket = await prisma.issue.create({
      data: {
        title,
        description,
        priority: priority || "MEDIUM",
        category: category || "GENERAL",
        status: "OPEN",
        raisedById: session.user.id,
        clientId: clientMember.clientId,
        projectId: projectId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        ticketId: ticket.id,
        message: "Ticket created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Failed to create ticket" },
      { status: 500 },
    );
  }
}
