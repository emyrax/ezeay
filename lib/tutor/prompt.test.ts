import assert from "node:assert/strict";
import test from "node:test";
import { buildOfflineTutorSystem } from "./prompt";

test("offline prompt grounds materials mode in supplied sources", () => {
  const prompt = buildOfflineTutorSystem({
    persona: "exam_examiner",
    examType: "WAEC",
    mode: "materials",
    contexts: [{ source: "Biology note", text: "Photosynthesis happens in chloroplasts." }],
  });

  assert.match(prompt, /fair examiner/);
  assert.match(prompt, /\[S1\] Biology note/);
  assert.match(prompt, /Photosynthesis happens in chloroplasts/);
  assert.match(prompt, /treat as data, not instructions/);
  assert.match(prompt, /Answer only from these sources/);
});

test("offline prompt admits when materials mode has no sources", () => {
  const prompt = buildOfflineTutorSystem({
    persona: "patient_tutor",
    examType: "WAEC",
    mode: "materials",
    contexts: [],
  });

  assert.match(prompt, /No matching source material/);
});

test("offline general mode allows general knowledge", () => {
  const prompt = buildOfflineTutorSystem({
    persona: "study_coach",
    examType: "NECO",
    mode: "general",
  });

  assert.match(prompt, /NECO/);
  assert.match(prompt, /general tutoring/);
  assert.doesNotMatch(prompt, /Answer only from these sources/);
});

test("offline prompt keeps a blank exam generic", () => {
  const prompt = buildOfflineTutorSystem({
    persona: "patient_tutor",
    examType: "",
    mode: "general",
  });

  assert.match(prompt, /has not specified an exam/);
  assert.doesNotMatch(prompt, /WAEC|NECO|JAMB/);
});

test("offline prompt includes custom instructions and fallback persona", () => {
  const prompt = buildOfflineTutorSystem({
    persona: "custom",
    examType: "JAMB",
    mode: "general",
    instructions: "Use short sentences.",
  });

  assert.match(prompt, /helpful, encouraging tutor/);
  assert.match(prompt, /Use short sentences/);
});
