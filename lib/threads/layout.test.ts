import assert from "node:assert/strict";
import test from "node:test";
import {
  getThreadCardMetrics,
  getThreadFeedChrome,
  getThreadTier,
} from "./layout";

test("getThreadTier resolves every size boundary", () => {
  assert.equal(getThreadTier(320), "xs");
  assert.equal(getThreadTier(359), "xs");
  assert.equal(getThreadTier(360), "sm");
  assert.equal(getThreadTier(379), "sm");
  assert.equal(getThreadTier(380), "md");
  assert.equal(getThreadTier(639), "md");
  assert.equal(getThreadTier(640), "lg");
  assert.equal(getThreadTier(1024), "lg");
});

test("getThreadTier falls back to the default phone tier for bad input", () => {
  assert.equal(getThreadTier(0), "md");
  assert.equal(getThreadTier(-1), "md");
  assert.equal(getThreadTier(Number.NaN), "md");
  assert.equal(getThreadTier(Number.POSITIVE_INFINITY), "md");
});

test("feed chrome tightens on small phones", () => {
  const xs = getThreadFeedChrome(320);
  assert.equal(xs.compact, true);
  assert.equal(xs.gutter, 12);
  assert.equal(xs.titleSize, 20);
  assert.equal(xs.composeSize, 36);
  assert.equal(xs.chipHeight, 30);
  assert.equal(xs.tabHeight, 30);
  assert.equal(xs.listBottomGap, 16);

  const sm = getThreadFeedChrome(375);
  assert.equal(sm.compact, true);
  assert.equal(sm.titleSize, 22);
  assert.equal(sm.chipHeight, 32);
});

test("feed chrome hides the subtitle and tightens spacing on short screens", () => {
  const base = getThreadFeedChrome(320);
  const short = getThreadFeedChrome(320, 568);

  assert.equal(base.showSubtitle, true);
  assert.equal(short.showSubtitle, false);
  assert.ok(short.headerPadTop <= base.headerPadTop);
  assert.ok(short.headerPadBottom <= base.headerPadBottom);
  assert.ok(short.tabPadTop <= base.tabPadTop);
  assert.ok(short.tabPadBottom <= base.tabPadBottom);
  assert.ok(short.listTop <= base.listTop);

  const boundary = getThreadFeedChrome(320, 640);
  assert.equal(boundary.showSubtitle, true);
  assert.deepEqual(boundary, base);
});

test("feed chrome treats missing or invalid heights as tall screens", () => {
  const base = getThreadFeedChrome(390);

  for (const height of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(getThreadFeedChrome(390, height), base);
  }
});

test("feed chrome keeps regular sizing from 380 up and expands the gutter at 640", () => {
  const md = getThreadFeedChrome(390);
  assert.equal(md.compact, false);
  assert.equal(md.gutter, 16);
  assert.equal(md.titleSize, 26);
  assert.equal(md.chipHeight, 34);
  assert.equal(md.listBottomGap, 24);

  const lg = getThreadFeedChrome(768);
  assert.equal(lg.tier, "lg");
  assert.equal(lg.gutter, 24);
  assert.equal(lg.titleSize, 26);
});

test("card metrics scale with the phone tier", () => {
  const xs = getThreadCardMetrics(320);
  assert.equal(xs.padding, 10);
  assert.equal(xs.avatar, 34);
  assert.equal(xs.showExamBadge, false);
  assert.equal(xs.showActionLabels, false);
  assert.equal(xs.imageMaxHeight, 130);
  assert.equal(xs.actionHeight, 30);

  const sm = getThreadCardMetrics(375);
  assert.equal(sm.padding, 12);
  assert.equal(sm.avatar, 38);
  assert.equal(sm.showActionLabels, false);

  const md = getThreadCardMetrics(390);
  assert.equal(md.padding, 14);
  assert.equal(md.avatar, 42);
  assert.equal(md.showExamBadge, true);
  assert.equal(md.showActionLabels, true);
  assert.equal(md.imageMaxHeight, 170);

  const lg = getThreadCardMetrics(1024);
  assert.deepEqual(lg, { ...md, tier: "lg" });
});

test("card metrics fall back safely and keep every numeric value usable", () => {
  for (const width of [0, Number.NaN, -50]) {
    const metrics = getThreadCardMetrics(width);
    assert.equal(metrics.tier, "md");
    assert.equal(metrics.compact, false);
  }

  for (const width of [320, 375, 390, 768]) {
    const metrics = getThreadCardMetrics(width);
    for (const [key, value] of Object.entries(metrics)) {
      if (typeof value === "number") {
        assert.ok(Number.isFinite(value) && value > 0, `${key} must be positive at ${width}`);
      }
    }
  }
});
