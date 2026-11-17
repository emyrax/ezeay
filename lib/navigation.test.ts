import assert from "node:assert/strict";
import { test } from "node:test";
import { isCoachRoute, isTabBarHidden } from "./navigation";

test("isTabBarHidden hides the bar on coach idle and chat", () => {
  assert.equal(isTabBarHidden(["(tabs)", "coach", "idle"]), true);
  assert.equal(isTabBarHidden(["(tabs)", "coach", "chat"]), true);
});

test("isTabBarHidden matches nested children of a hidden route", () => {
  assert.equal(isTabBarHidden(["(tabs)", "coach", "chat", "history"]), true);
});

test("isTabBarHidden does not match partial route names", () => {
  assert.equal(isTabBarHidden(["(tabs)", "coach", "idle2"]), false);
  assert.equal(isTabBarHidden(["(tabs)", "coach", "chatter"]), false);
});

test("isTabBarHidden keeps the bar on the coach home and tab screens", () => {
  assert.equal(isTabBarHidden(["(tabs)", "coach"]), false);
  assert.equal(isTabBarHidden(["(tabs)"]), false);
  assert.equal(isTabBarHidden(["(tabs)", "index"]), false);
  assert.equal(isTabBarHidden(["(tabs)", "profile"]), false);
  assert.equal(isTabBarHidden(["(tabs)", "quests"]), false);
  assert.equal(isTabBarHidden(["(tabs)", "explore"]), false);
});

test("isTabBarHidden ignores routes outside the tabs group", () => {
  assert.equal(isTabBarHidden(["(notes)", "note-1"]), false);
  assert.equal(isTabBarHidden([]), false);
});

test("isCoachRoute detects any coach route inside the tabs group", () => {
  assert.equal(isCoachRoute(["(tabs)", "coach"]), true);
  assert.equal(isCoachRoute(["(tabs)", "coach", "idle"]), true);
  assert.equal(isCoachRoute(["(tabs)", "coach", "chat"]), true);
  assert.equal(isCoachRoute(["(tabs)", "profile"]), false);
  assert.equal(isCoachRoute(["(notes)", "coach"]), false);
  assert.equal(isCoachRoute([]), false);
});
