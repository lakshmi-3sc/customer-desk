import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { IssueCategory, IssuePriority, Prisma } from "@prisma/client";
import { generateTicketKey } from "@/lib/ticket-key";
import { classifyIssue } from "@/lib/ai/classify-issue";
import { computeSimilarResolutions } from "@/lib/compute-similar-resolutions";
import { calculateSLADeadline } from "@/lib/sla";
import { sendEmail } from "@/lib/email";
import { ticketCreatedEmail } from "@/lib/email-templates";
import { uploadFilesToSupabase } from "@/lib/file-upload";
import { encodeCopilotSummary, safeParseCopilotDiagnostic } from "@/lib/resolution-copilot";

interface CreateAttachmentInput {
  name: string;
  size: number;
  type: string;
  fileUrl: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse FormData instead of JSON
    const formData = await req.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const priority = formData.get("priority") as string;
    const category = formData.get("category") as string;
    const aiPriority = formData.get("aiPriority") as string | null;
    const aiCategory = formData.get("aiCategory") as string | null;
    const projectId = formData.get("projectId") as string;
    const diagnostic = safeParseCopilotDiagnostic(formData.get("diagnostics"));
    const files = formData.getAll("files") as File[];

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
    const issuePriority = Object.values(IssuePriority).includes(priority as IssuePriority)
      ? (priority as IssuePriority)
      : IssuePriority.MEDIUM;
    const issueCategory = Object.values(IssueCategory).includes(category as IssueCategory)
      ? (category as IssueCategory)
      : IssueCategory.BUG;
    const submittedAiPriority = Object.values(IssuePriority).includes(aiPriority as IssuePriority)
      ? (aiPriority as IssuePriority)
      : null;
    const submittedAiCategory = Object.values(IssueCategory).includes(aiCategory as IssueCategory)
      ? (aiCategory as IssueCategory)
      : null;

    let ticket = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const ticketKey = await generateTicketKey(projectId);
      try {
        ticket = await prisma.issue.create({
          data: {
            title,
            description,
            priority: issuePriority,
            category: issueCategory,
            status: "OPEN",
            raisedById: session.user.id,
            clientId: clientMember.clientId,
            projectId: projectId,
            ticketKey,
            aiPriority: submittedAiPriority,
            aiCategory: submittedAiCategory,
          },
        });
        break;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          attempt < 2
        ) {
          continue;
        }
        throw error;
      }
    }

    if (!ticket) {
      throw new Error("Unable to create a unique ticket key");
    }

    // Await AI classification so fields are ready when user lands on the ticket page
    try {
      const result = await classifyIssue(title, description);
      const summary = `${result.reasoning}${result.module ? ` · Module: ${result.module}` : ""}`;
      await prisma.issue.update({
        where: { id: ticket.id },
        data: {
          aiCategory: submittedAiCategory ?? result.category,
          aiPriority: submittedAiPriority ?? result.priority,
          aiSummary: diagnostic ? encodeCopilotSummary(summary, diagnostic) : summary,
        },
      });
    } catch (e) {
      console.error("AI classify failed:", e);
      if (diagnostic) {
        await prisma.issue.update({
          where: { id: ticket.id },
          data: { aiSummary: encodeCopilotSummary(null, diagnostic) },
        });
      }
    }

    // Upload and save attachments if provided
    if (files && files.length > 0) {
      console.log(`📎 Processing ${files.length} attachments for ticket ${ticket.id}`);
      try {
        // Upload files to Supabase Storage
        console.log("Uploading files to Supabase...");
        const uploadedFiles = await uploadFilesToSupabase(files, ticket.id);
        console.log(`✅ Uploaded ${uploadedFiles.length} files:`, uploadedFiles);

        // Save file references to database
        console.log("Saving attachment records to database...");
        await prisma.issueAttachment.createMany({
          data: uploadedFiles.map((file) => ({
            issueId: ticket.id,
            uploadedBy: session.user.id,
            fileName: file.name,
            fileUrl: file.url, // URL from Supabase Storage
            fileSize: file.size,
            fileType: file.type,
          })),
        });
        console.log("✅ Attachment records saved successfully");
      } catch (uploadError) {
        console.error("❌ File upload failed:", uploadError);
        console.error("Error details:", uploadError instanceof Error ? uploadError.message : uploadError);
        // Continue with ticket creation even if attachments fail
        // Attachments will be retried or user can upload separately
      }
    }

    // Calculate SLA deadline
    await calculateSLADeadline(ticket.id);

    // Compute similar resolutions in background
    computeSimilarResolutions(ticket.id).catch(e => console.error("Similar resolutions failed:", e));

    // Notify all 3SC agents/leads/admins about the new ticket (background)
    notifyInternalTeamOfNewTicket({
      ticketKey: ticket.ticketKey ?? ticket.id,
      ticketId: ticket.id,
      title: ticket.title,
      priority: ticket.priority,
      category: ticket.category,
      projectName: project.name,
      raisedByName: session.user.name ?? session.user.email ?? "Customer",
      clientId: clientMember.clientId,
    }).catch(e => console.error("New ticket email failed:", e));

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
      {
        error: "Failed to create ticket",
        detail: process.env.NODE_ENV !== "production"
          ? String(error instanceof Error ? error.message : error)
          : undefined,
      },
      { status: 500 },
    );
  }
}

async function notifyInternalTeamOfNewTicket(params: {
  ticketKey: string;
  ticketId: string;
  title: string;
  priority: string;
  category: string;
  projectName: string;
  raisedByName: string;
  clientId: string;
}) {
  const client = await prisma.client.findUnique({
    where: { id: params.clientId },
    select: { name: true },
  });

  const template = ticketCreatedEmail({
    ticketKey: params.ticketKey,
    ticketId: params.ticketId,
    title: params.title,
    priority: params.priority,
    category: params.category,
    project: params.projectName,
    raisedBy: params.raisedByName,
    clientName: client?.name ?? params.clientId,
  });

  const internalUsers = await prisma.user.findMany({
    where: {
      role: { in: ["THREESC_ADMIN", "THREESC_LEAD"] },
      isActive: true,
    },
    select: { email: true },
  });

  await Promise.all(
    internalUsers.map((u) => sendEmail({ to: u.email, ...template }))
  );
}
