import test from "node:test";
import assert from "node:assert/strict";
import { chunkText, cosineSimilarity } from "./rag";

test("chunkText returns no chunks for empty text", () => {
  assert.deepEqual(chunkText("   \n\n  "), []);
});

test("chunkText keeps short text as one chunk", () => {
  assert.deepEqual(chunkText("The mitochondria is the powerhouse of the cell."), [
    "The mitochondria is the powerhouse of the cell.",
  ]);
});

test("chunkText splits long text into bounded overlapping chunks", () => {
  const text = "a".repeat(4000);
  const chunks = chunkText(text, 1500, 150);
  assert.ok(chunks.length >= 3);
  assert.ok(chunks.every((chunk) => chunk.length <= 1500));
  assert.ok(chunks.join("").length >= text.length);
});

test("chunkText groups paragraphs under the limit", () => {
  const chunks = chunkText("first paragraph\n\nsecond paragraph");
  assert.deepEqual(chunks, ["first paragraph\n\nsecond paragraph"]);
});

test("cosineSimilarity handles identical, orthogonal, and empty vectors", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([0, 0], [1, 0]), 0);
  assert.equal(cosineSimilarity([], [1]), 0);
});
