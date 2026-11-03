import assert from "node:assert/strict";
import test from "node:test";
import { normalizeReelChallenge } from "./challenge";

test("normalizes hook metadata and clamps the correct index", () => {
  const result = normalizeReelChallenge(
    {
      hook: "  Most people learn this backwards.  ",
      hookTone: "misconception",
      challengeType: "vote",
      challengePrompt: "Which path actually works?",
      challengeOptions: ["Active recall", "Re-reading"],
      correctChoiceIndex: 9,
      revealText: "Active recall wins.",
      shareCopy: "Try active recall.",
      xpReward: 100,
    },
    "Memory",
  );

  assert.equal(result.hook, "Most people learn this backwards.");
  assert.equal(result.hookTone, "misconception");
  assert.equal(result.toneLabel, "MYTH CHECK");
  assert.equal(result.challengeType, "vote");
  assert.equal(result.challengeLabel, "COMMUNITY VOTE");
  assert.deepEqual(result.options, ["Active recall", "Re-reading"]);
  assert.equal(result.correctChoiceIndex, 1);
  assert.equal(result.xpReward, 30);
});

test("falls back when challenge options are missing", () => {
  const result = normalizeReelChallenge({ hook: "" }, "Limits");

  assert.ok(result.hook.length > 0);
  assert.ok(result.challengePrompt.length > 0);
  assert.ok(result.options.length >= 2);
  assert.equal(result.correctChoiceIndex, 0);
  assert.equal(result.xpReward, 20);
});
