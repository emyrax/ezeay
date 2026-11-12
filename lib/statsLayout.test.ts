import assert from "node:assert/strict";
import test from "node:test";
import { getStatsContentWidth, getStatsLayout } from "./statsLayout";

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
