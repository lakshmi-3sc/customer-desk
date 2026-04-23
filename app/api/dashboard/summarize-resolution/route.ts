import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId required" }, { status: 400 });
    }

    // Fetch ticket with all comments
    const ticket = await prisma.issue.findUnique({
      where: { id: ticketId },
      select: {
        title: true,
        description: true,
        status: true,
        comments: {
          select: {
            content: true,
            author: { select: { name: true } },
            createdAt: true,
            parentId: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Build conversation thread
    const conversation = ticket.comments
      .map((c) => `${c.author.name}: ${c.content}`)
      .join("\n\n");

    if (!conversation) {
      return NextResponse.json({
        summary: "No comments or discussion on this ticket.",
      });
    }

    // Use Claude to summarize the threaded communication
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `Summarize this support ticket resolution conversation in 3-4 concise sentences. Focus on: what was the problem, what was the root cause, and how was it fixed.

Ticket: "${ticket.title}"

Conversation:
${conversation}

Provide a brief, clear summary:`,
        },
      ],
    });

    const summary =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ summary: summary.trim() });
  } catch (error) {
    console.error("[summarize-resolution]", error);
    return NextResponse.json({
      summary: "Summary unavailable",
      error: String(error),
    });
  }
}
