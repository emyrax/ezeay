import assert from "node:assert/strict";
import test from "node:test";
import {
  buildXIntentUrl,
  deriveResourceContent,
  inferResourceType,
  truncate,
} from "./resourceComposer";

test("inferResourceType detects notes, images, audio, PDFs, text, and other files", () => {
  assert.equal(inferResourceType({ hasFile: false }), "text");
  assert.equal(inferResourceType({ hasFile: true, mimeType: "image/png" }), "image");
  assert.equal(inferResourceType({ hasFile: true, fileName: "lecture.m4a" }), "audio");
  assert.equal(inferResourceType({ hasFile: true, fileName: "notes.PDF" }), "pdf");
  assert.equal(inferResourceType({ hasFile: true, fileName: "notes.md" }), "text");
  assert.equal(
    inferResourceType({ hasFile: true, fileName: "deck.pptx" }),
    "other",
  );
});

test("deriveResourceContent builds a title, summary, and hook from the caption", () => {
  const content = deriveResourceContent(
    "  Euler's formula connects five constants. It is useful for signals.  ",
  );
  assert.equal(content.title, "Euler's formula connects five constants");
  assert.equal(content.summary, "Euler's formula connects five constants. It is useful for signals.");
  assert.equal(content.hook, "Euler's formula connects five constants");
});

test("deriveResourceContent falls back to the attachment name", () => {
  const content = deriveResourceContent("", "linear_algebra_notes.pdf");
  assert.equal(content.title, "linear algebra notes");
  assert.equal(content.hook, "linear algebra notes");
  assert.match(content.summary, /linear algebra notes/);
});

test("deriveResourceContent truncates long captions", () => {
  const content = deriveResourceContent("x".repeat(400));
  assert.equal(content.title.length, 80);
  assert.equal(content.summary.length, 300);
  assert.equal(content.hook.length, 140);
});

test("buildXIntentUrl encodes the caption and link", () => {
  const url = buildXIntentUrl("Great notes & tips", "https://yuinx.app/threads/abc");
  assert.match(url, /^https:\/\/x\.com\/intent\/post\?/);
  const params = new URL(url).searchParams;
  assert.equal(params.get("text"), "Great notes & tips\n\nhttps://yuinx.app/threads/abc");
});

test("truncate keeps short strings and ellipsizes long ones", () => {
  assert.equal(truncate("short", 10), "short");
  assert.equal(truncate("abcdefghij", 5), "abcd…");
});
