import assert from "node:assert/strict";
import { test } from "node:test";
import type { LessonAudioClip, LessonSlide } from "../../types/lesson";
import {
  activeNarrationSentenceIndex,
  activeNarrationWordIndex,
  buildNarrationWordTimings,
  clampSlideIndex,
  equationAspectRatio,
  estimateNarrationDurationMs,
  findAudioClip,
  formatTimecode,
  hasAudioForSlide,
  isAudioComplete,
  narrationEndAction,
  narrationScrollTarget,
  prepareEquationSvg,
  splitNarrationSentences,
  splitNarrationWords,
} from "./player";

const audio: LessonAudioClip[] = [
  { slideId: "s1", url: "https://example.com/s1.mp3", durationMs: 1200 },
  { slideId: "s2", url: "", durationMs: 900 },
];

const checkpointSlide: Pick<LessonSlide, "checkpoint"> = {
  checkpoint: {
    question: "What is 2 + 2?",
    options: ["3", "4"],
    correct: 1,
    explanation: "Four.",
  },
};

test("clampSlideIndex keeps indexes inside the slide range", () => {
  assert.equal(clampSlideIndex(-3, 5), 0);
  assert.equal(clampSlideIndex(2.4, 5), 2);
  assert.equal(clampSlideIndex(9, 5), 4);
  assert.equal(clampSlideIndex(Number.NaN, 5), 0);
  assert.equal(clampSlideIndex(1, 0), 0);
});

test("audio helpers ignore clips without a url", () => {
  assert.equal(hasAudioForSlide(audio, "s1"), true);
  assert.equal(hasAudioForSlide(audio, "s2"), false);
  assert.equal(hasAudioForSlide(audio, "s3"), false);
  assert.deepEqual(findAudioClip(audio, "s1"), audio[0]);
  assert.equal(findAudioClip(audio, "s2"), null);
});

test("isAudioComplete requires every slide to have narration", () => {
  assert.equal(isAudioComplete([], []), false);
  assert.equal(isAudioComplete([{ id: "s1" }], audio), true);
  assert.equal(
    isAudioComplete([{ id: "s1" }, { id: "s2" }], audio),
    false,
  );
});

test("formatTimecode renders minute and second timecodes", () => {
  assert.equal(formatTimecode(0), "0:00");
  assert.equal(formatTimecode(-100), "0:00");
  assert.equal(formatTimecode(999), "0:00");
  assert.equal(formatTimecode(61_000), "1:01");
  assert.equal(formatTimecode(125_500), "2:05");
  assert.equal(formatTimecode(Number.NaN), "0:00");
});

test("narrationEndAction prioritizes checkpoints and finishes the deck", () => {
  assert.equal(narrationEndAction(checkpointSlide, true), "checkpoint");
  assert.equal(narrationEndAction(checkpointSlide, false), "checkpoint");
  assert.equal(narrationEndAction({}, false), "advance");
  assert.equal(narrationEndAction({}, true), "finish");
});

test("splitNarrationSentences keeps punctuation and trims whitespace", () => {
  assert.deepEqual(
    splitNarrationSentences("  First idea. Second idea! Third?  "),
    ["First idea.", "Second idea!", "Third?"],
  );
  assert.deepEqual(splitNarrationSentences("A single thought"), [
    "A single thought",
  ]);
  assert.deepEqual(splitNarrationSentences("   "), []);
});

test("activeNarrationSentenceIndex maps playback progress to a sentence", () => {
  const sentences = ["First.", "Second sentence.", "Final."];

  assert.equal(activeNarrationSentenceIndex(sentences, 0), 0);
  assert.equal(activeNarrationSentenceIndex(sentences, 0.3), 1);
  assert.equal(activeNarrationSentenceIndex(sentences, 1), 2);
  assert.equal(activeNarrationSentenceIndex(sentences, 2), 2);
  assert.equal(activeNarrationSentenceIndex(sentences, -1), 0);
  assert.equal(activeNarrationSentenceIndex(sentences, Number.NaN), 0);
  assert.equal(activeNarrationSentenceIndex([], 0.5), -1);
});

test("splitNarrationWords preserves punctuation and trims whitespace", () => {
  assert.deepEqual(splitNarrationWords("  Cells divide, then grow.  "), [
    "Cells",
    "divide,",
    "then",
    "grow.",
  ]);
  assert.deepEqual(splitNarrationWords("   "), []);
});

test("buildNarrationWordTimings normalizes word timings to a full clip", () => {
  const timings = buildNarrationWordTimings(
    "A short pause, then a much longer explanation.",
  );

  assert.equal(timings.length, 8);
  assert.equal(timings[0].word, "A");
  assert.equal(timings[0].start, 0);
  assert.equal(timings[timings.length - 1].end, 1);

  for (let index = 0; index < timings.length; index += 1) {
    assert.ok(timings[index].start < timings[index].end);
    if (index > 0) {
      assert.equal(timings[index].start, timings[index - 1].end);
    }
  }

  assert.deepEqual(buildNarrationWordTimings("   "), []);
});

test("buildNarrationWordTimings gives punctuation extra pause time", () => {
  const withPause = buildNarrationWordTimings("Wait. Go");
  const withoutPause = buildNarrationWordTimings("Wait Go");
  const pauseDuration = withPause[0].end - withPause[0].start;
  const plainDuration = withoutPause[0].end - withoutPause[0].start;

  assert.ok(pauseDuration > plainDuration);
});

test("activeNarrationWordIndex maps progress to the active word", () => {
  const timings = buildNarrationWordTimings("One two three four.");

  assert.equal(activeNarrationWordIndex(timings, -1), 0);
  assert.equal(activeNarrationWordIndex(timings, Number.NaN), 0);
  assert.equal(activeNarrationWordIndex(timings, 0), 0);
  assert.equal(activeNarrationWordIndex(timings, timings[2].start), 2);
  assert.equal(activeNarrationWordIndex(timings, 1), timings.length - 1);
  assert.equal(activeNarrationWordIndex(timings, 4), timings.length - 1);
  assert.equal(activeNarrationWordIndex([], 0.5), -1);
});

test("estimateNarrationDurationMs scales with words and punctuation", () => {
  assert.equal(estimateNarrationDurationMs("   "), 0);
  assert.ok(estimateNarrationDurationMs("One two.") >= 2400);
  assert.ok(
    estimateNarrationDurationMs(
      "One two three four five six seven eight nine ten.",
    ) > estimateNarrationDurationMs("One two."),
  );
});

test("narrationScrollTarget leaves a visible word alone", () => {
  assert.equal(
    narrationScrollTarget({
      wordTop: 300,
      wordHeight: 40,
      scrollOffset: 0,
      viewportHeight: 600,
      contentHeight: 2000,
    }),
    null,
  );
});

test("narrationScrollTarget follows a word below the safe area", () => {
  const target = narrationScrollTarget({
    wordTop: 1200,
    wordHeight: 40,
    scrollOffset: 0,
    viewportHeight: 600,
    contentHeight: 2400,
  });

  assert.equal(typeof target, "number");
  assert.ok((target ?? 0) > 0);
  assert.ok((target ?? 0) < 1200);
});

test("narrationScrollTarget scrolls back up for a word above the safe area", () => {
  assert.equal(
    narrationScrollTarget({
      wordTop: 700,
      wordHeight: 40,
      scrollOffset: 1000,
      viewportHeight: 600,
      contentHeight: 2400,
    }),
    472,
  );
});

test("narrationScrollTarget clamps to the available scroll range", () => {
  assert.equal(
    narrationScrollTarget({
      wordTop: 2300,
      wordHeight: 40,
      scrollOffset: 0,
      viewportHeight: 600,
      contentHeight: 2400,
    }),
    1800,
  );
  assert.equal(
    narrationScrollTarget({
      wordTop: 10,
      wordHeight: 40,
      scrollOffset: 1000,
      viewportHeight: 600,
      contentHeight: 2400,
    }),
    0,
  );
});

test("narrationScrollTarget skips short content and invalid metrics", () => {
  assert.equal(
    narrationScrollTarget({
      wordTop: 200,
      wordHeight: 40,
      scrollOffset: 0,
      viewportHeight: 600,
      contentHeight: 500,
    }),
    null,
  );
  assert.equal(
    narrationScrollTarget({
      wordTop: Number.NaN,
      wordHeight: 40,
      scrollOffset: 0,
      viewportHeight: 600,
      contentHeight: 2400,
    }),
    null,
  );
});

test("prepareEquationSvg strips fixed dimensions and theme colors", () => {
  const svg =
    '<svg width="12ex" height="4ex" style="vertical-align: -1ex" role="img" focusable="false" viewBox="0 0 100 40"><defs><path id="p" fill="currentColor"/></defs><use href="#p"/></svg>';
  const prepared = prepareEquationSvg(svg, "#111827");

  assert.doesNotMatch(prepared, /width="12ex"/);
  assert.doesNotMatch(prepared, /height="4ex"/);
  assert.doesNotMatch(prepared, /style=/);
  assert.doesNotMatch(prepared, /role=/);
  assert.doesNotMatch(prepared, /focusable=/);
  assert.match(prepared, /viewBox="0 0 100 40"/);
  assert.match(prepared, /fill="#111827"/);
  assert.doesNotMatch(prepared, /currentColor/);
});

test("prepareEquationSvg falls back when the color is blank", () => {
  assert.match(
    prepareEquationSvg('<svg viewBox="0 0 1 1"><path fill="currentColor"/></svg>', "  "),
    /fill="#000000"/,
  );
});

test("equationAspectRatio reads valid viewBox dimensions", () => {
  assert.equal(equationAspectRatio('<svg viewBox="0 0 120 60">'), 2);
  assert.equal(equationAspectRatio('<svg viewBox="0,0,90,30">'), 3);
  assert.equal(equationAspectRatio('<svg viewBox="0 0 0 30">'), null);
  assert.equal(equationAspectRatio('<svg width="10">'), null);
  assert.equal(equationAspectRatio('<svg viewBox="0 0 nope 30">'), null);
});
