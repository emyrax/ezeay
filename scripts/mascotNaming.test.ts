import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidActionName,
  toSnakeCaseAction,
  uniqueActionName,
} from "./mascotNaming";

test("normalizes vision labels to mascot snake_case", () => {
  assert.equal(toSnakeCaseAction("Mascot Jumping!"), "mascot_jumping");
  assert.equal(toSnakeCaseAction("energy-wielding mascot"), "mascot_energy_wielding_mascot");
  assert.equal(toSnakeCaseAction("  celebrating  "), "mascot_celebrating");
});

test("rejects empty labels", () => {
  assert.equal(toSnakeCaseAction(""), "");
  assert.equal(toSnakeCaseAction("!!!"), "");
});

test("validates strict action names", () => {
  assert.equal(isValidActionName("mascot_jumping"), true);
  assert.equal(isValidActionName("mascot_jumping_2"), true);
  assert.equal(isValidActionName("mascot_jumping2"), true);
  assert.equal(isValidActionName("Mascot_jumping"), false);
  assert.equal(isValidActionName("mascot-jumping"), false);
  assert.equal(isValidActionName("mascot__jumping"), false);
});

test("deduplicates action names with numeric suffixes", () => {
  const used = new Set<string>(["mascot_jumping"]);
  assert.equal(uniqueActionName("mascot_jumping", used), "mascot_jumping_2");
  used.add("mascot_jumping_2");
  assert.equal(uniqueActionName("mascot_jumping", used), "mascot_jumping_3");
  assert.equal(uniqueActionName("mascot_waving", used), "mascot_waving");
});
