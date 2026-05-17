export const SMART_ASSIGN_START = "[[SMART_ASSIGN]]";
export const SMART_ASSIGN_END = "[[/SMART_ASSIGN]]";

export interface SmartAssignAgent {
  id: string;
  name: string;
  email: string;
  openCount: number;
  totalResolved: number;
  categoryResolved: number;
  expertiseScore: number;
  workloadScore: number;
  compositeScore: number;
  expertiseLabel: string;
  avgResolutionHrs: number | null;
  aiReason: string;
}

export interface SmartAssignSnapshot {
  best: SmartAssignAgent | null;
  agents: SmartAssignAgent[];
  aiSummary: string;
}

export function encodeSmartAssignSummary(
  existingSummary: string | null | undefined,
  snapshot: SmartAssignSnapshot
) {
  const plainSummary = stripSmartAssignSummary(existingSummary ?? "").trim();
  const encoded = `${SMART_ASSIGN_START}${JSON.stringify(snapshot)}${SMART_ASSIGN_END}`;
  return plainSummary ? `${plainSummary}\n\n${encoded}` : encoded;
}

export function extractSmartAssignSummary(summary: string | null | undefined): SmartAssignSnapshot | null {
  if (!summary) return null;

  const start = summary.indexOf(SMART_ASSIGN_START);
  const end = summary.indexOf(SMART_ASSIGN_END);
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(summary.slice(start + SMART_ASSIGN_START.length, end)) as SmartAssignSnapshot;
  } catch {
    return null;
  }
}

export function stripSmartAssignSummary(summary: string | null | undefined) {
  if (!summary) return "";
  const start = summary.indexOf(SMART_ASSIGN_START);
  const end = summary.indexOf(SMART_ASSIGN_END);
  if (start === -1 || end === -1 || end <= start) return summary;

  return `${summary.slice(0, start)}${summary.slice(end + SMART_ASSIGN_END.length)}`.trim();
}
