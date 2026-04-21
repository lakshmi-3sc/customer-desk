import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { classifyIssue } from "@/lib/ai/classify-issue";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, projectId } = body;

  if (!title || !description) {
    return NextResponse.json(
      { error: "Title and description are required" },
      { status: 400 },
    );
  }

  // Get client ID from session user
  const member = await prisma.clientMember.findFirst({
    where: { userId: session.user.id },
  });

  if (!member) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // ── Claude AI Classification ──────────────────────────────
  const classification = await classifyIssue(title, description);

  // Get SLA policy for priority
  const slaPolicy = await prisma.slaPolicy.findUnique({
    where: { priority: classification.priority as any },
  });

  const slaDueAt = slaPolicy
    ? new Date(Date.now() + slaPolicy.resolutionTime * 60 * 60 * 1000)
    : null;

  // Create issue with AI classification
  const issue = await prisma.issue.create({
    data: {
      title,
      description,
      category: classification.category as any,
      priority: classification.priority as any,
      status: "OPEN",
      clientId: member.clientId,
      projectId: projectId ?? null,
      raisedById: session.user.id,
      aiCategory: classification.category,
      aiPriority: classification.priority,
      aiSummary: classification.reasoning,
      slaDueAt,
    },
  });

  return NextResponse.json({
    issue,
    aiClassification: classification,
  });
}
