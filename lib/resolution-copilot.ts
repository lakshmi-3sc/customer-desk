export const RESOLUTION_COPILOT_START = "[[RESOLUTION_COPILOT]]";
export const RESOLUTION_COPILOT_END = "[[/RESOLUTION_COPILOT]]";

export interface CopilotSuggestion {
  id: string;
  type: "ticket" | "article";
  title: string;
  ticketKey?: string | null;
  slug?: string | null;
  description?: string;
  content?: string;
  resolution?: string;
}

export interface CopilotAnalysis {
  likelyCauses: string[];
  questions: string[];
  suggestedAction: string;
  confidence: number;
  similarTicket?: CopilotSuggestion | null;
  relatedArticle?: CopilotSuggestion | null;
}

export interface CopilotDiagnostic {
  likelyCause: string;
  confidence: number;
  suggestedAction: string;
  confirmedFacts: string[];
  similarTicket?: CopilotSuggestion | null;
  relatedArticle?: CopilotSuggestion | null;
  suggestedReply: string;
  agentSummary: string;
  answers: Record<string, string>;
}

export function encodeCopilotSummary(
  existingSummary: string | null | undefined,
  diagnostic: CopilotDiagnostic
): string {
  const plainSummary = stripCopilotSummary(existingSummary ?? "").trim();
  const encoded = `${RESOLUTION_COPILOT_START}${JSON.stringify(diagnostic)}${RESOLUTION_COPILOT_END}`;
  return plainSummary ? `${plainSummary}\n\n${encoded}` : encoded;
}

export function extractCopilotDiagnostic(summary: string | null | undefined): CopilotDiagnostic | null {
  if (!summary) return null;

  const start = summary.indexOf(RESOLUTION_COPILOT_START);
  const end = summary.indexOf(RESOLUTION_COPILOT_END);
  if (start === -1 || end === -1 || end <= start) return null;

  const raw = summary.slice(start + RESOLUTION_COPILOT_START.length, end);
  try {
    return JSON.parse(raw) as CopilotDiagnostic;
  } catch {
    return null;
  }
}

export function stripCopilotSummary(summary: string | null | undefined): string {
  if (!summary) return "";
  const start = summary.indexOf(RESOLUTION_COPILOT_START);
  const end = summary.indexOf(RESOLUTION_COPILOT_END);
  if (start === -1 || end === -1 || end <= start) return summary;

  return `${summary.slice(0, start)}${summary.slice(end + RESOLUTION_COPILOT_END.length)}`.trim();
}

export function safeParseCopilotDiagnostic(value: FormDataEntryValue | null): CopilotDiagnostic | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value) as CopilotDiagnostic;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.likelyCause || !parsed.suggestedAction || !parsed.suggestedReply) return null;
    return parsed;
  } catch {
    return null;
  }
}
