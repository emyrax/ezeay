import assert from "node:assert/strict";
import { test } from "node:test";
import type { LessonAudioClip, LessonSlide } from "../../types/lesson";
import {
  clampSlideIndex,
  equationAspectRatio,
  findAudioClip,
  formatTimecode,
  hasAudioForSlide,
  isAudioComplete,
  narrationEndAction,
  prepareEquationSvg,
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
