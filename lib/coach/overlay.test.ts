import assert from "node:assert/strict";
import test from "node:test";
import { getCoachOverlayMode } from "./overlay";

test("mobile uses a bottom sheet", () => {
  assert.equal(
    getCoachOverlayMode({ width: 390, isWeb: false, preference: "auto" }),
    "sheet",
  );
});

test("narrow web uses a bottom sheet", () => {
  assert.equal(
    getCoachOverlayMode({ width: 800, isWeb: true, preference: "auto" }),
    "sheet",
  );
});

test("large web uses a centered popup", () => {
  assert.equal(
    getCoachOverlayMode({ width: 1280, isWeb: true, preference: "auto" }),
    "popup",
  );
});

test("large web history uses a side panel", () => {
  assert.equal(
    getCoachOverlayMode({ width: 1280, isWeb: true, preference: "panel" }),
    "panel",
  );
});

test("mobile never uses a side panel", () => {
  assert.equal(
    getCoachOverlayMode({ width: 390, isWeb: false, preference: "panel" }),
    "sheet",
  );
});

test("explicit sheet wins on large web", () => {
  assert.equal(
    getCoachOverlayMode({ width: 1280, isWeb: true, preference: "sheet" }),
    "sheet",
  );
});
