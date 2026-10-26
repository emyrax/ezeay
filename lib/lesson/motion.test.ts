import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LESSON_MOTION_DEFAULT,
  getLessonMotionPreset,
  getWordRevealDelay,
  isLessonMotionStyle,
  splitMotionWords,
} from "./motion";

test("isLessonMotionStyle accepts only supported styles", () => {
  assert.equal(isLessonMotionStyle("calm"), true);
  assert.equal(isLessonMotionStyle("kinetic"), true);
  assert.equal(isLessonMotionStyle("playful"), true);
  assert.equal(isLessonMotionStyle("cinematic"), false);
  assert.equal(isLessonMotionStyle(null), false);
  assert.equal(isLessonMotionStyle(3), false);
});

test("getLessonMotionPreset returns stable style presets", () => {
  const calm = getLessonMotionPreset("calm", false);
  const kinetic = getLessonMotionPreset("kinetic", false);
  const playful = getLessonMotionPreset("playful", false);

  assert.equal(calm.style, "calm");
  assert.equal(calm.drawDiagram, false);
  assert.equal(calm.ambient, false);
  assert.equal(calm.wordReveal, false);
  assert.equal(kinetic.style, LESSON_MOTION_DEFAULT);
  assert.equal(kinetic.drawDiagram, true);
  assert.equal(kinetic.ambient, true);
  assert.equal(kinetic.wordReveal, true);
  assert.equal(playful.confetti, true);
  assert.ok(playful.duration > kinetic.duration);
});

test("reduced motion disables non-essential effects", () => {
  const reduced = getLessonMotionPreset("playful", true);

  assert.equal(reduced.enabled, false);
  assert.equal(reduced.duration, 0);
  assert.equal(reduced.stagger, 0);
  assert.equal(reduced.distance, 0);
  assert.equal(reduced.scaleFrom, 1);
  assert.equal(reduced.drawDiagram, false);
  assert.equal(reduced.sweep, false);
  assert.equal(reduced.equalizer, false);
  assert.equal(reduced.confetti, false);
  assert.equal(reduced.ambient, false);
  assert.equal(reduced.wordReveal, false);
});

test("splitMotionWords keeps punctuation and drops extra whitespace", () => {
  assert.deepEqual(splitMotionWords("  Learn   faster,  together. "), [
    "Learn",
    "faster,",
    "together.",
  ]);
  assert.deepEqual(splitMotionWords("   "), []);
});

test("getWordRevealDelay staggers words with a readable floor", () => {
  assert.equal(getWordRevealDelay(0, 75), 0);
  assert.equal(getWordRevealDelay(2, 75), 68);
  assert.equal(getWordRevealDelay(5, 0), 90);
  assert.equal(getWordRevealDelay(-2, 75), 0);
});
