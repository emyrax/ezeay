import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  selectMascotSource,
  type MascotSourceContext,
} from "./selectSource";

function context(
  overrides: Partial<MascotSourceContext> = {},
): MascotSourceContext {
  return {
    isWeb: true,
    hasWebSources: true,
    inView: true,
    network: "fast",
    reducedMotion: false,
    motion: "auto",
    animationFailed: false,
    ...overrides,
  };
}

describe("selectMascotSource", () => {
  it("uses native assets on native and when no web variants exist", () => {
    assert.equal(selectMascotSource(context({ isWeb: false })), "native");
    assert.equal(selectMascotSource(context({ hasWebSources: false })), "native");
  });

  it("animates only when web, visible, fast and motion is allowed", () => {
    assert.equal(selectMascotSource(context()), "animated");
  });

  it("falls back to the poster offscreen", () => {
    assert.equal(selectMascotSource(context({ inView: false })), "poster");
  });

  it("falls back to the poster on slow or save-data connections", () => {
    assert.equal(selectMascotSource(context({ network: "slow" })), "poster");
  });

  it("respects reduced motion and explicit static requests", () => {
    assert.equal(selectMascotSource(context({ reducedMotion: true })), "poster");
    assert.equal(selectMascotSource(context({ motion: "static" })), "poster");
  });

  it("keeps the poster when the animation failed to load", () => {
    assert.equal(
      selectMascotSource(context({ animationFailed: true })),
      "poster",
    );
  });
});
