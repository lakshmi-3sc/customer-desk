import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { generateTicketKey } from "@/lib/ticket-key";
import { classifyIssue } from "@/lib/ai/classify-issue";
import { computeSimilarResolutions } from "@/lib/compute-similar-resolutions";
import { calculateSLADeadline } from "@/lib/sla";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, priority, category, projectId, attachments } =
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
    const ticketKey = await generateTicketKey(projectId);
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
        ticketKey,
      },
    });

    // Await AI classification so fields are ready when user lands on the ticket page
    try {
      const result = await classifyIssue(title, description);
      await prisma.issue.update({
        where: { id: ticket.id },
        data: {
          aiCategory: result.category,
          aiPriority: result.priority,
          aiSummary: `${result.reasoning}${result.module ? ` · Module: ${result.module}` : ""}`,
        },
      });
    } catch (e) {
      console.error("AI classify failed:", e);
    }

    // Save attachments if provided
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      await prisma.issueAttachment.createMany({
        data: attachments.map((att: any) => ({
          issueId: ticket.id,
          uploadedBy: session.user.id,
          fileName: att.name,
          fileUrl: `/api/attachments/${ticket.id}/${att.name}`, // Reference to file storage API
          fileSize: att.size,
          fileType: att.type || 'application/octet-stream',
        })),
      });
    }

    // Calculate SLA deadline
    await calculateSLADeadline(ticket.id);

    // Compute similar resolutions in background
    computeSimilarResolutions(ticket.id).catch(e => console.error("Similar resolutions failed:", e));

    return NextResponse.json(
      {
        success: true,
        ticketId: ticket.ticketKey ?? ticket.id,
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
