import { authOptions } from "@/auth";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";
import type { CopilotAnalysis, CopilotDiagnostic } from "@/lib/resolution-copilot";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
const COPILOT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

interface FinalizeBody {
  title?: string;
  description?: string;
  analysis?: CopilotAnalysis;
  answers?: Record<string, string>;
}

function parseJsonObject<T>(value: string): T | null {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(value.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as FinalizeBody;
    const title = body.title?.trim() ?? "";
    const description = body.description?.trim() ?? "";
    const analysis = body.analysis;
    const answers = body.answers ?? {};

    if (!title || !description || !analysis) {
      return NextResponse.json({ error: "Missing diagnostic inputs" }, { status: 400 });
    }

    const confirmedFacts = Object.entries(answers)
      .filter(([, value]) => value.trim())
      .map(([question, answer]) => `${question}: ${answer.trim()}`);

    const fallback: CopilotDiagnostic = {
      likelyCause: analysis.likelyCauses[0] ?? "Needs agent triage",
      confidence: analysis.confidence,
      suggestedAction: analysis.suggestedAction,
      confirmedFacts,
      similarTicket: analysis.similarTicket ?? null,
      relatedArticle: analysis.relatedArticle ?? null,
      suggestedReply: `Hi, we reviewed the details and will start by checking: ${analysis.suggestedAction}`,
      agentSummary: `Customer created this ticket after guided intake. ${confirmedFacts.join("; ")}`,
      answers,
    };

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(fallback);
    }

    const message = await anthropic.messages.create({
      model: COPILOT_MODEL,
      max_tokens: 800,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: `Create a concise support diagnostic handoff.

Ticket title: ${title}
Description: ${description}

Initial likely causes:
${analysis.likelyCauses.map((cause, index) => `${index + 1}. ${cause}`).join("\n")}

Suggested first action: ${analysis.suggestedAction}
Confidence: ${analysis.confidence}

Customer answers:
${confirmedFacts.join("\n") || "No answers provided."}

Similar ticket:
${analysis.similarTicket ? `${analysis.similarTicket.ticketKey ?? analysis.similarTicket.id} - ${analysis.similarTicket.title}` : "None"}

Related article:
${analysis.relatedArticle ? `${analysis.relatedArticle.title}` : "None"}

Return strict JSON only:
{
  "likelyCause": "single most likely cause",
  "confidence": 0-100,
  "suggestedAction": "specific first technical action",
  "confirmedFacts": ["fact 1", "fact 2"],
  "suggestedReply": "short customer-facing first reply",
  "agentSummary": "short internal handoff summary"
}`,
        },
      ],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text : "";
    const parsed = parseJsonObject<Partial<CopilotDiagnostic>>(text);

    return NextResponse.json({
      ...fallback,
      ...parsed,
      confidence: Math.max(0, Math.min(100, Number(parsed?.confidence ?? fallback.confidence) || fallback.confidence)),
      confirmedFacts: parsed?.confirmedFacts?.length ? parsed.confirmedFacts : confirmedFacts,
      similarTicket: analysis.similarTicket ?? null,
      relatedArticle: analysis.relatedArticle ?? null,
      answers,
    } satisfies CopilotDiagnostic);
  } catch (error) {
    console.error("[resolution-copilot/finalize]", error);
    return NextResponse.json({ error: "Failed to finalize diagnostics" }, { status: 500 });
  }
}
