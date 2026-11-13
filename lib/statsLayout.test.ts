import assert from "node:assert/strict";
import test from "node:test";
import {
  getExploreHubLayout,
  getStatsContentWidth,
  getStatsLayout,
} from "./statsLayout";

test("stats layout shows no rails below the app sidebar breakpoint", () => {
  const layout = getStatsLayout(1023);
  assert.equal(layout.mode, "feed");
  assert.equal(layout.showLeftRail, false);
  assert.equal(layout.showRightRail, false);
});

test("stats layout adds the profile rail at 1024", () => {
  const layout = getStatsLayout(1024);
  assert.equal(getStatsContentWidth(1024), 928);
  assert.equal(layout.mode, "left");
  assert.equal(layout.showLeftRail, true);
  assert.equal(layout.showRightRail, false);
  assert.equal(layout.leftRailWidth, 240);
  assert.equal(layout.feedMaxWidth, 600);
});

test("stats layout widens the profile rail at 1280", () => {
  const layout = getStatsLayout(1280);
  assert.equal(getStatsContentWidth(1280), 1020);
  assert.equal(layout.mode, "left");
  assert.equal(layout.leftRailWidth, 260);
  assert.equal(layout.feedMaxWidth, 660);
});

test("stats layout keeps a single profile rail through 1479", () => {
  const layout = getStatsLayout(1479);
  assert.equal(layout.mode, "left");
  assert.equal(layout.showLeftRail, true);
  assert.equal(layout.showRightRail, false);
});

test("stats layout adds a compact left rail at 1480", () => {
  const layout = getStatsLayout(1480);
  assert.equal(getStatsContentWidth(1480), 1220);
  assert.equal(layout.mode, "leftRight");
  assert.equal(layout.showLeftRail, true);
  assert.equal(layout.leftRailWidth, 220);
  assert.equal(layout.rightRailWidth, 280);
  assert.equal(layout.feedMaxWidth, 600);
});

test("stats layout keeps the compact left rail through 1719", () => {
  const layout = getStatsLayout(1719);
  assert.equal(layout.mode, "leftRight");
  assert.equal(layout.leftRailWidth, 220);
});

test("stats layout switches to the ultra-wide rails at 1720", () => {
  const layout = getStatsLayout(1720);
  assert.equal(getStatsContentWidth(1720), 1460);
  assert.equal(layout.mode, "ultra");
  assert.equal(layout.leftRailWidth, 272);
  assert.equal(layout.rightRailWidth, 320);
  assert.equal(layout.feedMaxWidth, 660);
  assert.equal(layout.gap, 24);
});

test("stats layout borders the feed on tablet widths without rails", () => {
  assert.equal(getStatsLayout(767).bordered, false);
  assert.equal(getStatsLayout(768).bordered, true);
});

test("explore hub hides analytics below the sidebar breakpoint", () => {
  const layout = getExploreHubLayout(1023);
  assert.equal(layout.showAnalytics, false);
  assert.equal(layout.analyticsWidth, 0);
  assert.equal(layout.feedMaxWidth, 680);
});

test("explore hub keeps analytics and a readable feed at 1024", () => {
  const layout = getExploreHubLayout(1024);
  assert.equal(layout.showAnalytics, true);
  assert.equal(layout.analyticsWidth, 220);
  assert.equal(layout.gap, 20);
  assert.equal(layout.feedMaxWidth, 640);
});

test("explore hub keeps the thread feed wider than analytics", () => {
  for (const [width, analyticsWidth, feedMaxWidth] of [
    [1024, 220, 640],
    [1280, 240, 712],
    [1480, 260, 820],
    [1720, 280, 880],
  ] as const) {
    const layout = getExploreHubLayout(width);
    assert.equal(layout.showAnalytics, true);
    assert.equal(layout.analyticsWidth, analyticsWidth);
    assert.equal(layout.feedMaxWidth, feedMaxWidth);
    assert.ok(layout.feedMaxWidth > layout.analyticsWidth);
  }
});

test("explore hub caps the feed width on large screens", () => {
  const layout = getExploreHubLayout(1720);
  assert.equal(layout.analyticsWidth, 280);
  assert.equal(layout.feedMaxWidth, 880);
  assert.equal(layout.gap, 24);
});
