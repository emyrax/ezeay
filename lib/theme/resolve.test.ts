import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveThemeMode } from "./resolve";

test("resolveThemeMode returns explicit modes as-is", () => {
  assert.equal(resolveThemeMode("dark", "light"), "dark");
  assert.equal(resolveThemeMode("light", "dark"), "light");
});

test("resolveThemeMode follows the system scheme", () => {
  assert.equal(resolveThemeMode("system", "light"), "light");
  assert.equal(resolveThemeMode("system", "dark"), "dark");
});

test("resolveThemeMode defaults to dark when the system scheme is unknown", () => {
  assert.equal(resolveThemeMode("system", null), "dark");
  assert.equal(resolveThemeMode("system", undefined), "dark");
});
