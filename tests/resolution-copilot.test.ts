import test from "node:test";
import assert from "node:assert/strict";
import {
  encodeCopilotSummary,
  extractCopilotDiagnostic,
  safeParseCopilotDiagnostic,
  stripCopilotSummary,
  type CopilotDiagnostic,
} from "../lib/resolution-copilot";

const diagnostic: CopilotDiagnostic = {
  likelyCause: "Session store not initialized after restart",
  confidence: 78,
  suggestedAction: "Verify session store readiness before accepting requests.",
  confirmedFacts: ["Planned restart", "Delayed session loss"],
  similarTicket: {
    id: "issue-1",
    type: "ticket",
    title: "User authentication failing intermittently",
    ticketKey: "PP-1048",
  },
  relatedArticle: null,
  suggestedReply: "We are checking the restart and session-store sequence.",
  agentSummary: "Customer confirmed session loss after planned restarts.",
  answers: {
    "When did it start?": "After planned restart",
  },
};

test("resolution copilot diagnostic round-trips inside an existing summary", () => {
  const encoded = encodeCopilotSummary("Thread summary", diagnostic);

  assert.deepEqual(extractCopilotDiagnostic(encoded), diagnostic);
  assert.equal(stripCopilotSummary(encoded), "Thread summary");
});

test("resolution copilot safely rejects incomplete or invalid form payloads", () => {
  assert.equal(safeParseCopilotDiagnostic(null), null);
  assert.equal(safeParseCopilotDiagnostic("not-json"), null);
  assert.equal(safeParseCopilotDiagnostic(JSON.stringify({ likelyCause: "Only one field" })), null);
});

test("resolution copilot encoding does not duplicate old embedded payload", () => {
  const first = encodeCopilotSummary("Summary", diagnostic);
  const second = encodeCopilotSummary(first, {
    ...diagnostic,
    confidence: 91,
  });

  assert.equal(stripCopilotSummary(second), "Summary");
  assert.equal(extractCopilotDiagnostic(second)?.confidence, 91);
  assert.equal((second.match(/\[\[RESOLUTION_COPILOT\]\]/g) ?? []).length, 1);
});
