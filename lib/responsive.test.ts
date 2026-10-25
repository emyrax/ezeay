import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getBreakpoint,
  getCarouselTranslate,
  getContentWidth,
  getExploreLayout,
  getGridColumns,
  getGutter,
} from "./responsive";

test("getBreakpoint resolves every breakpoint boundary", () => {
  assert.equal(getBreakpoint(0), "phone");
  assert.equal(getBreakpoint(639), "phone");
  assert.equal(getBreakpoint(640), "tablet");
  assert.equal(getBreakpoint(1023), "tablet");
  assert.equal(getBreakpoint(1024), "laptop");
  assert.equal(getBreakpoint(1439), "laptop");
  assert.equal(getBreakpoint(1440), "desktop");
});

test("getContentWidth returns undefined for the full variant", () => {
  assert.equal(getContentWidth("reading"), 760);
  assert.equal(getContentWidth("standard"), 960);
  assert.equal(getContentWidth("wide"), 1200);
  assert.equal(getContentWidth("full"), undefined);
});

test("getGridColumns clamps between 1 and max", () => {
  assert.equal(getGridColumns(0, 220), 1);
  assert.equal(getGridColumns(375, 220), 1);
  assert.equal(getGridColumns(768, 220), 3);
  assert.equal(getGridColumns(1200, 220), 4);
  assert.equal(getGridColumns(1920, 220, 12, 6), 6);
});

test("quests grid resolves columns for measured widths", () => {
  assert.equal(getGridColumns(390, 320, 16, 3), 1);
  assert.equal(getGridColumns(768, 320, 16, 3), 2);
  assert.equal(getGridColumns(1024, 320, 16, 3), 3);
  assert.equal(getGridColumns(1440, 320, 16, 3), 3);
  assert.equal(getGridColumns(1920, 320, 16, 3), 3);
});

test("getExploreLayout enables the panel only on laptop and desktop", () => {
  assert.deepEqual(getExploreLayout("phone"), {
    showPanel: false,
    stageMaxWidth: 0,
    panelWidth: 0,
    gap: 0,
    contentMaxWidth: 0,
  });
  assert.equal(getExploreLayout("tablet").showPanel, false);
  assert.equal(getExploreLayout("tablet").stageMaxWidth, 600);
  assert.deepEqual(getExploreLayout("laptop"), {
    showPanel: true,
    stageMaxWidth: 520,
    panelWidth: 300,
    gap: 20,
    contentMaxWidth: 960,
  });
  assert.deepEqual(getExploreLayout("desktop"), {
    showPanel: true,
    stageMaxWidth: 600,
    panelWidth: 360,
    gap: 28,
    contentMaxWidth: 1200,
  });
});

test("getGutter scales with the breakpoint", () => {
  assert.equal(getGutter("phone"), 16);
  assert.equal(getGutter("tablet"), 24);
  assert.equal(getGutter("laptop"), 32);
});

test("getCarouselTranslate moves one panel per index", () => {
  assert.equal(getCarouselTranslate(0, 960), -0);
  assert.equal(getCarouselTranslate(1, 960), -960);
  assert.equal(getCarouselTranslate(2, 960), -1920);
  assert.equal(getCarouselTranslate(-1, 960), -0);
  assert.equal(getCarouselTranslate(2, 0), -0);
});
