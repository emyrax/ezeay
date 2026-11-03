import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chapterDisplayNumber,
  formatCount,
  formatRelativeTime,
  threadLessonHref,
} from "./format";

test("formatCount compacts large numbers", () => {
  assert.equal(formatCount(0), "0");
  assert.equal(formatCount(999), "999");
  assert.equal(formatCount(1200), "1.2k");
  assert.equal(formatCount(12000), "12k");
  assert.equal(formatCount(1_500_000), "1.5m");
});

test("formatRelativeTime reports short ages", () => {
  const now = new Date("2026-01-10T12:00:00.000Z").getTime();
  assert.equal(formatRelativeTime("2026-01-10T11:59:30.000Z", now), "now");
  assert.equal(formatRelativeTime("2026-01-10T11:40:00.000Z", now), "20m");
  assert.equal(formatRelativeTime("2026-01-10T09:00:00.000Z", now), "3h");
  assert.equal(formatRelativeTime("2026-01-08T12:00:00.000Z", now), "2d");
  assert.equal(formatRelativeTime("2026-01-02T12:00:00.000Z", now), "1w");
  assert.equal(formatRelativeTime("not-a-date", now), "");
});

test("threadLessonHref uses zero-based lesson indices", () => {
  assert.equal(
    threadLessonHref({ courseId: "course_1", chapterIndex: 2, subtopicIndex: 4 }),
    "/course/course_1/lesson/2/4",
  );
  assert.equal(chapterDisplayNumber(2), 3);
});
