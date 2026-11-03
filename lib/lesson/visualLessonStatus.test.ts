import assert from "node:assert/strict";
import test from "node:test";
import { getVisualLessonMiniState } from "./visualLessonStatus";

test("minimized lesson reports background build progress", () => {
  const state = getVisualLessonMiniState({
    loading: true,
    building: true,
    loadError: null,
    hasSlide: false,
    finished: false,
    buildStatus: "Preparing narration",
  });

  assert.equal(state.tone, "loading");
  assert.equal(state.title, "Building lesson");
  assert.equal(state.detail, "Preparing narration");
});

test("minimized lesson reports ready and completed states", () => {
  const ready = getVisualLessonMiniState({
    loading: false,
    building: false,
    loadError: null,
    hasSlide: true,
    finished: false,
  });
  const complete = getVisualLessonMiniState({
    loading: false,
    building: false,
    loadError: null,
    hasSlide: true,
    finished: true,
  });

  assert.deepEqual(ready, {
    tone: "ready",
    title: "Lesson ready",
    detail: "Tap to continue",
  });
  assert.deepEqual(complete, {
    tone: "complete",
    title: "Lesson completed",
    detail: "Tap to review",
  });
});

test("minimized lesson surfaces load errors", () => {
  const state = getVisualLessonMiniState({
    loading: false,
    building: false,
    loadError: "Network unavailable",
    hasSlide: false,
    finished: false,
  });

  assert.equal(state.tone, "error");
  assert.equal(state.title, "Lesson couldn't load");
});
