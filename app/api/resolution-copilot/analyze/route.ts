import { authOptions } from "@/auth";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";
import type { CopilotAnalysis, CopilotSuggestion } from "@/lib/resolution-copilot";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
const COPILOT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

interface AnalyzeBody {
  title?: string;
  description?: string;
  category?: string;
  suggestions?: CopilotSuggestion[];
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

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function meaningfulWords(value: string) {
  const stopWords = new Set([
    "the", "and", "for", "with", "that", "this", "are", "is", "was", "were", "when", "where",
    "which", "what", "does", "did", "can", "you", "your", "have", "has", "all", "only", "some",
    "issue", "problem", "system", "team", "user", "users", "please", "provide", "share",
  ]);

  return normalizeText(value)
    .split(" ")
    .filter((word) => word.length > 3 && !stopWords.has(word));
}

function questionRepeatsKnownInfo(question: string, knownText: string) {
  const questionWords = meaningfulWords(question);
  if (questionWords.length === 0) return false;

  const known = normalizeText(knownText);
  const overlap = questionWords.filter((word) => known.includes(word)).length;
  return overlap / questionWords.length >= 0.75;
}

function cleanCopilotText(value: string) {
  return value
    .replace(/\s*\(?similar to (?:the )?(?:fix applied in )?ticket #?\d+\)?/gi, "")
    .replace(/\s*\(?using (?:ticket|case) #?\d+ as reference\)?/gi, "")
    .replace(/\bticket #\d+\b/gi, "the related resolved ticket")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as AnalyzeBody;
    const title = body.title?.trim() ?? "";
    const description = body.description?.trim() ?? "";

    if (!title || !description || description.length < 12) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    const suggestions = (body.suggestions ?? []).slice(0, 5);
    const similarTicket = suggestions.find((item) => item.type === "ticket") ?? null;
    const relatedArticle = suggestions.find((item) => item.type === "article") ?? null;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        likelyCauses: ["Needs agent review"],
        questions: ["Where are you seeing this issue?", "Is it affecting all users or only some users?", "When did you first notice it?"],
        suggestedAction: "Collect the affected scope, timing, and error evidence before creating the ticket.",
        confidence: 55,
        similarTicket,
        relatedArticle,
      } satisfies CopilotAnalysis);
    }

    const message = await anthropic.messages.create({
      model: COPILOT_MODEL,
      max_tokens: 700,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: `You are a support intake copilot. Generate a concise diagnostic path for a customer before they create a ticket.

Issue title: ${title}
Description: ${description}
Category: ${body.category ?? "Unknown"}

Known related context:
${suggestions.map((item, index) => `${index + 1}. [${item.type}] ${item.title}
${(item.resolution || item.description || item.content || "").slice(0, 350)}`).join("\n\n") || "No related context."}

Return strict JSON only:
{
  "likelyCauses": ["cause 1", "cause 2", "cause 3"],
  "questions": ["question 1", "question 2"],
  "suggestedAction": "one practical first action",
  "confidence": 0-100
}

Rules for likelyCauses:
- Return only 2 likely causes.
- Each cause must be one short customer-readable line.
- Avoid deep implementation wording unless the customer already used it.
- Do not mention numbered references like "ticket #1" or "similar ticket #2".

Rules for questions:
- Ask only for information that is missing from the title/description.
- Do not repeat facts the customer already provided.
- Ask 0 to 2 questions. Use fewer questions when the issue already has enough context.
- Questions must be answerable by a business/customer user from observation.
- Do not ask the customer to inspect logs, traces, databases, code, Redis, server memory, instrumentation, deployment pipelines, or config files.
- Do not ask for a screenshot or example if the description already includes a concrete example, value mismatch, error text, or attachment-worthy evidence.
- Prefer questions that help reproduce, route, or scope the issue: affected page/report/module, affected users/locations, timing, frequency, expected vs displayed behavior only when not already provided.
- For inventory/warehouse issues, useful missing details are affected SKU/category/warehouse, when it started, and whether the system stock level already shows below threshold.
- Never mention vague references like "ticket #1" or "similar ticket #2". If using related context, describe the pattern without numbered-ticket wording.

Rules for suggestedAction:
- This is shown to the customer as "Try first", so keep it to one short, practical observation or check the customer can do.
- Do not ask for logs, code, database checks, deployment details, or configuration inspection.
- Do not include vague numbered references like "ticket #1"; say "related resolved case" only if needed.`,
        },
      ],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text : "";
    const parsed = parseJsonObject<Omit<CopilotAnalysis, "similarTicket" | "relatedArticle">>(text);

    if (!parsed) {
      throw new Error("Resolution Copilot returned invalid JSON");
    }

    const knownText = `${title} ${description}`;
    const likelyCauses = (parsed.likelyCauses ?? []).map(cleanCopilotText).filter(Boolean).slice(0, 2);
    const questions = (parsed.questions ?? [])
      .map(cleanCopilotText)
      .filter((question) => question && !questionRepeatsKnownInfo(question, knownText))
      .slice(0, 2);
    const suggestedAction = cleanCopilotText(parsed.suggestedAction ?? "") || "Collect key details before creating the ticket.";

    return NextResponse.json({
      likelyCauses,
      questions,
      suggestedAction,
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 60)),
      similarTicket,
      relatedArticle,
    } satisfies CopilotAnalysis);
  } catch (error) {
    console.error("[resolution-copilot/analyze]", error);
    return NextResponse.json({ error: "Failed to analyze issue" }, { status: 500 });
  }
}
