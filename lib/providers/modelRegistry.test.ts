import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getFallbackModelRefs,
  isModelAllowed,
  parseModelRef,
} from "./modelRegistry";

describe("getFallbackModelRefs", () => {
  it("returns allowed sibling models for the same provider", () => {
    const fallbacks = getFallbackModelRefs("gemini::gemini-2.5-flash");

    assert.ok(fallbacks.length > 0);
    assert.ok(fallbacks.every((ref) => parseModelRef(ref)?.provider === "gemini"));
    assert.ok(fallbacks.every((ref) => isModelAllowed(ref)));
    assert.ok(!fallbacks.includes("gemini::gemini-2.5-flash"));
  });

  it("does not cross providers", () => {
    const fallbacks = getFallbackModelRefs("openai::gpt-5");

    assert.ok(fallbacks.length > 0);
    assert.ok(fallbacks.every((ref) => parseModelRef(ref)?.provider === "openai"));
  });

  it("returns no fallback for offline or invalid refs", () => {
    assert.deepEqual(getFallbackModelRefs("offline::gemma-e2b"), []);
    assert.deepEqual(getFallbackModelRefs("not-a-model"), []);
  });

  it("respects the max argument", () => {
    assert.equal(getFallbackModelRefs("gemini::gemini-2.5-flash", 2).length, 2);
    assert.equal(getFallbackModelRefs("gemini::gemini-2.5-flash", 0).length, 0);
  });
});
