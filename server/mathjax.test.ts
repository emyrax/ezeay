import { test } from "node:test";
import assert from "node:assert/strict";
import { latexToSvg, MathRenderError } from "./math/mathjax";

test("renders LaTeX as an SVG", () => {
  const svg = latexToSvg("x^2 + 6x + 5 = 0");
  assert.match(svg, /^<svg/);
  assert.match(svg, /<\/svg>$/);
  assert.ok(svg.length > 200);
  assert.ok(!/<script/i.test(svg));
  assert.ok(!/javascript:/i.test(svg));
  assert.ok(!/xlink:href/.test(svg));
  assert.match(svg, /href="#/);
});

test("caches repeated equations", () => {
  const first = latexToSvg("\\frac{1}{2}");
  const second = latexToSvg("\\frac{1}{2}");
  assert.equal(first, second);
  assert.match(first, /<defs/);
});

test("rejects unsafe LaTeX", () => {
  assert.throws(
    () => latexToSvg("\\href{https://example.com}{x}"),
    MathRenderError,
  );
  assert.throws(
    () => latexToSvg("\\includegraphics{secret.png}"),
    MathRenderError,
  );
  assert.throws(() => latexToSvg("\\input{/etc/passwd}"), MathRenderError);
});

test("rejects empty and oversized equations", () => {
  assert.throws(() => latexToSvg(""), MathRenderError);
  assert.throws(() => latexToSvg("x".repeat(401)), MathRenderError);
});
