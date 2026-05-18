import test from "node:test";
import assert from "node:assert/strict";
import { SLA_DEFAULTS, calculateTimeRemaining } from "../lib/sla";

test("SLA defaults match configured priority expectations", () => {
  assert.deepEqual(SLA_DEFAULTS.CRITICAL, { responseTime: 1, resolutionTime: 4 });
  assert.deepEqual(SLA_DEFAULTS.HIGH, { responseTime: 4, resolutionTime: 24 });
  assert.deepEqual(SLA_DEFAULTS.MEDIUM, { responseTime: 8, resolutionTime: 72 });
  assert.deepEqual(SLA_DEFAULTS.LOW, { responseTime: 24, resolutionTime: 168 });
});

test("calculateTimeRemaining reports no SLA, at-risk, healthy, and breached states", () => {
  assert.equal(calculateTimeRemaining(null).status, "no-sla");

  const soon = new Date(Date.now() + 60 * 60 * 1000);
  assert.equal(calculateTimeRemaining(soon).status, "at-risk");

  const later = new Date(Date.now() + 3 * 60 * 60 * 1000);
  assert.equal(calculateTimeRemaining(later).status, "healthy");

  const past = new Date(Date.now() - 60 * 60 * 1000);
  const breached = calculateTimeRemaining(past);
  assert.equal(breached.status, "breached");
  assert.match(breached.displayText, /Breached by/);
});
