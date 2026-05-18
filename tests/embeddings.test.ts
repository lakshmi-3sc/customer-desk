import test from "node:test";
import assert from "node:assert/strict";
import { cosineSimilarity, rankBySimilarity } from "../lib/embeddings";

test("cosine similarity returns expected scores for matching and orthogonal vectors", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
});

test("cosine similarity rejects mismatched dimensions", () => {
  assert.throws(() => cosineSimilarity([1, 2], [1]), /dimensions/);
});

test("rankBySimilarity sorts valid candidates and skips malformed embeddings", () => {
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = () => {};
  console.warn = () => {};

  let ranked: Array<{ id: string; similarity: number }> = [];
  try {
    ranked = rankBySimilarity([1, 0], [
      { id: "low", embedding: JSON.stringify([0, 1]) },
      { id: "high", embedding: JSON.stringify([1, 0]) },
      { id: "bad-json", embedding: "not-json" },
      { id: "bad-shape", embedding: JSON.stringify([1, 0, 0]) },
    ]);
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }

  assert.deepEqual(ranked.map((item) => item.id), ["high", "low"]);
  assert.equal(ranked[0].similarity, 1);
});
