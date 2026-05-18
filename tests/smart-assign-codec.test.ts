import test from "node:test";
import assert from "node:assert/strict";
import {
  encodeSmartAssignSummary,
  extractSmartAssignSummary,
  stripSmartAssignSummary,
  type SmartAssignSnapshot,
} from "../lib/smart-assign-codec";

const snapshot: SmartAssignSnapshot = {
  best: {
    id: "agent-1",
    name: "Ravi Kumar",
    email: "ravi@3sc.com",
    openCount: 4,
    totalResolved: 18,
    categoryResolved: 7,
    expertiseScore: 92,
    workloadScore: 76,
    compositeScore: 86,
    expertiseLabel: "Expert",
    avgResolutionHrs: 12,
    aiReason: "Strong category experience with manageable workload.",
  },
  agents: [],
  aiSummary: "Route to Ravi for fastest resolution.",
};

test("smart assign snapshot is encoded, extracted, and stripped without losing human summary", () => {
  const encoded = encodeSmartAssignSummary("Existing ticket summary", snapshot);

  assert.deepEqual(extractSmartAssignSummary(encoded), snapshot);
  assert.equal(stripSmartAssignSummary(encoded), "Existing ticket summary");
});

test("smart assign encoding replaces an older embedded snapshot", () => {
  const first = encodeSmartAssignSummary("Summary", snapshot);
  const updated = encodeSmartAssignSummary(first, {
    ...snapshot,
    aiSummary: "Updated recommendation.",
  });

  assert.equal(stripSmartAssignSummary(updated), "Summary");
  assert.equal(extractSmartAssignSummary(updated)?.aiSummary, "Updated recommendation.");
  assert.equal((updated.match(/\[\[SMART_ASSIGN\]\]/g) ?? []).length, 1);
});

test("invalid smart assign payloads fail safely", () => {
  assert.equal(extractSmartAssignSummary(null), null);
  assert.equal(extractSmartAssignSummary("[[SMART_ASSIGN]]not-json[[/SMART_ASSIGN]]"), null);
  assert.equal(stripSmartAssignSummary(undefined), "");
});
