import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MASCOT_META,
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
});
