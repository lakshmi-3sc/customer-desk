import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ticketId } = await request.json();
    if (!ticketId) {
      return NextResponse.json({ error: "ticketId required" }, { status: 400 });
    }

    // Check if summary already exists
    const existing = await prisma.issue.findUnique({
      where: { id: ticketId },
      select: { conversationSummary: true, comments: { select: { content: true, author: { select: { name: true } }, createdAt: true } } }
    });

    if (existing?.conversationSummary) {
      return NextResponse.json({ summary: existing.conversationSummary, cached: true });
    }

    if (!existing?.comments || existing.comments.length === 0) {
      return NextResponse.json({ summary: "No comments to summarize.", cached: false });
    }

    // Build conversation
    const conversation = existing.comments
      .map((c) => `${c.author.name}: ${c.content}`)
      .join("\n\n");

    // Generate summary using Claude
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Summarize this support ticket discussion thread in the following format:

## Thread Summary

**Issue:** [Brief description of what the problem was]

**Resolution:** [What was done to fix it]

**Status:** [Current status and any follow-up actions]

Thread:
${conversation}

Format your response exactly as shown above with markdown headers and bold fields.`,
        },
      ],
    });

    const summary = message.content[0].type === "text" ? message.content[0].text.trim() : "";

    // Save summary to DB with proper error handling
    try {
      await prisma.issue.update({
        where: { id: ticketId },
        data: { conversationSummary: summary }
      });
    } catch (dbError) {
      console.error("[summarize-conversation-save-error]", dbError);
      // Still return the summary even if save fails
    }

    return NextResponse.json({ summary, cached: false });
  } catch (error) {
    console.error("[summarize-conversation]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
