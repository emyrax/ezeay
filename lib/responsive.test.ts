import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getBreakpoint,
  getCarouselTranslate,
  getContentWidth,
  getExploreLayout,
  getFloatingTabBarInset,
  getGridColumns,
  getGutter,
  getReelStageLayout,
  getThreadsLayout,
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

test("getThreadsLayout switches between mobile, two-pane, three-pane, and ultra-wide", () => {
  assert.deepEqual(getThreadsLayout(375), {
    mode: "mobile",
    showSidebar: false,
    sidebarExpanded: false,
    showLeftRail: false,
    showRightRail: false,
    sidebarWidth: 0,
    feedMaxWidth: undefined,
    leftRailWidth: 0,
    railWidth: 0,
    gap: 0,
  });
  assert.deepEqual(getThreadsLayout(1024), {
    mode: "twoPane",
    showSidebar: true,
    sidebarExpanded: false,
    showLeftRail: false,
    showRightRail: false,
    sidebarWidth: 96,
    feedMaxWidth: 680,
    leftRailWidth: 0,
    railWidth: 0,
    gap: 0,
  });
  assert.deepEqual(getThreadsLayout(1280), {
    mode: "threePane",
    showSidebar: true,
    sidebarExpanded: true,
    showLeftRail: false,
    showRightRail: true,
    sidebarWidth: 260,
    feedMaxWidth: 640,
    leftRailWidth: 0,
    railWidth: 300,
    gap: 20,
  });
  assert.deepEqual(getThreadsLayout(1719), getThreadsLayout(1280));
  assert.deepEqual(getThreadsLayout(1720), {
    mode: "ultraWide",
    showSidebar: true,
    sidebarExpanded: true,
    showLeftRail: true,
    showRightRail: true,
    sidebarWidth: 260,
    feedMaxWidth: 660,
    leftRailWidth: 272,
    railWidth: 320,
    gap: 24,
  });
  assert.deepEqual(getThreadsLayout(1920), getThreadsLayout(1720));
});

test("getGutter scales with the breakpoint", () => {
  assert.equal(getGutter("phone"), 16);
  assert.equal(getGutter("tablet"), 24);
  assert.equal(getGutter("laptop"), 32);
});

test("getFloatingTabBarInset clears the floating tab bar", () => {
  assert.equal(getFloatingTabBarInset(0), 110);
  assert.equal(getFloatingTabBarInset(34), 144);
  assert.equal(getFloatingTabBarInset(34, 8), 140);
});

test("getReelStageLayout flags compact and very short stages", () => {
  assert.deepEqual(getReelStageLayout(0), {
    compact: false,
    veryShort: false,
  });
  assert.deepEqual(getReelStageLayout(559), {
    compact: true,
    veryShort: false,
  });
  assert.deepEqual(getReelStageLayout(429), {
    compact: true,
    veryShort: true,
  });
  assert.deepEqual(getReelStageLayout(560), {
    compact: false,
    veryShort: false,
  });
});

test("getCarouselTranslate moves one panel per index", () => {
  assert.equal(getCarouselTranslate(0, 960), -0);
  assert.equal(getCarouselTranslate(1, 960), -960);
  assert.equal(getCarouselTranslate(2, 960), -1920);
  assert.equal(getCarouselTranslate(-1, 960), -0);
  assert.equal(getCarouselTranslate(2, 0), -0);
});
