import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { appendTranscript } from "./appendTranscript";

describe("appendTranscript", () => {
  it("returns the existing text when the transcript is empty", () => {
    assert.equal(appendTranscript("Learn Python", "   "), "Learn Python");
  });

  it("returns the transcript when there is no existing text", () => {
    assert.equal(appendTranscript("", "  Learn Python  "), "Learn Python");
    assert.equal(appendTranscript("   ", "Learn Python"), "Learn Python");
  });

  it("adds a single space between existing and new text", () => {
    assert.equal(
      appendTranscript("Learn Python", "and build a game"),
      "Learn Python and build a game",
    );
  });

  it("preserves existing trailing whitespace", () => {
    assert.equal(
      appendTranscript("Learn Python\n", "and build a game"),
      "Learn Python\nand build a game",
    );
    assert.equal(
      appendTranscript("Learn Python ", "and build a game"),
      "Learn Python and build a game",
    );
  });
});
