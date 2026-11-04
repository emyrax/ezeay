import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MASCOT_META,
  MASCOT_STAGE_COLORS,
  selectScoreMascotAction,
  selectTierMascotAction,
} from "./actions";

describe("mascot actions", () => {
  it("selects a clip for quiz scores", () => {
    assert.equal(selectScoreMascotAction(100), "mascot_celebrating");
    assert.equal(selectScoreMascotAction(80), "mascot_celebrating");
    assert.equal(selectScoreMascotAction(79), "mascot_jumping");
    assert.equal(selectScoreMascotAction(50), "mascot_jumping");
    assert.equal(selectScoreMascotAction(49), "mascot_disappointed");
  });

  it("selects a clip for chapter tiers", () => {
    assert.equal(selectTierMascotAction("perfect"), "mascot_celebrating");
    assert.equal(selectTierMascotAction("great"), "mascot_celebrating");
    assert.equal(selectTierMascotAction("good"), "mascot_jumping");
    assert.equal(selectTierMascotAction("average"), "mascot_jumping");
    assert.equal(selectTierMascotAction("low"), "mascot_disappointed");
  });

  it("defines metadata for every clip", () => {
    for (const meta of Object.values(MASCOT_META)) {
      assert.ok(meta.aspectRatio > 0);
      assert.equal(typeof meta.opaque, "boolean");
    }
  });

  it("defines stage colors only for opaque clips that need blending", () => {
    assert.equal(MASCOT_STAGE_COLORS.mascot_loading, "#113154");
    assert.equal(MASCOT_STAGE_COLORS.mascot_waving, "#183454");
    assert.equal(MASCOT_STAGE_COLORS.mascot_celebrating, "#133256");
    assert.equal(MASCOT_STAGE_COLORS.mascot_disappointed, "#142D4F");
    assert.equal(MASCOT_STAGE_COLORS.mascot_posing, undefined);

    for (const action of Object.keys(MASCOT_STAGE_COLORS) as Array<
      keyof typeof MASCOT_STAGE_COLORS
    >) {
      assert.equal(MASCOT_META[action].opaque, true);
    }
  });
});
