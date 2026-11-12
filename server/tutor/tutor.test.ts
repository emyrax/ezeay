import test from "node:test";
import assert from "node:assert/strict";
import { buildStudyPlan } from "./plan";
import {
  buildTutorJsonPrompt,
  buildTutorQuizPrompt,
  buildTutorSystemPrompt,
} from "./prompts";
import {
  deriveTitle,
  isIsoDate,
  isUuid,
  normalizeMode,
  normalizePersona,
  sanitizeExamType,
  sanitizeHistory,
  sanitizeInstructions,
  sanitizeMaterialIds,
  sanitizeMessage,
  sanitizeNoteTexts,
  sanitizeTopic,
} from "./sanitize";

test("normalizePersona migrates legacy values and falls back to patient_tutor", () => {
  assert.equal(normalizePersona("exam_examiner"), "exam_examiner");
  assert.equal(normalizePersona("waec_examiner"), "exam_examiner");
  assert.equal(normalizePersona("custom"), "custom");
  assert.equal(normalizePersona("unknown"), "patient_tutor");
  assert.equal(normalizePersona(null), "patient_tutor");
});

test("sanitizeExamType trims and caps free-text exams", () => {
  assert.equal(sanitizeExamType("  KCSE  "), "KCSE");
  assert.equal(sanitizeExamType("  university   entrance "), "university entrance");
  assert.equal(sanitizeExamType(""), "");
  assert.equal(sanitizeExamType(null), "");
  assert.equal(sanitizeExamType("x".repeat(80)).length, 40);
});

test("normalizeMode falls back to materials", () => {
  assert.equal(normalizeMode("general"), "general");
  assert.equal(normalizeMode("materials"), "materials");
  assert.equal(normalizeMode("other"), "materials");
});

test("sanitizeMessage trims, rejects empty, and caps length", () => {
  assert.equal(sanitizeMessage("  hello  "), "hello");
  assert.equal(sanitizeMessage("   "), null);
  assert.equal(sanitizeMessage(42), null);
  assert.equal(sanitizeMessage("x".repeat(9000))?.length, 8000);
});

test("sanitizeTopic collapses whitespace and enforces bounds", () => {
  assert.equal(sanitizeTopic("  Chemical   bonding  "), "Chemical bonding");
  assert.equal(sanitizeTopic("ab"), null);
  assert.equal(sanitizeTopic("   "), null);
  assert.equal(sanitizeTopic(null), null);
  assert.equal(sanitizeTopic("x".repeat(300))?.length, 200);
});

test("sanitizeInstructions caps at 1500 characters", () => {
  assert.equal(sanitizeInstructions("  be kind  "), "be kind");
  assert.equal(sanitizeInstructions(undefined), "");
  assert.equal(sanitizeInstructions("x".repeat(2000)).length, 1500);
});

test("sanitizeMaterialIds dedupes and caps the list", () => {
  const ids = sanitizeMaterialIds([
    "a",
    "a",
    "b",
    "",
    null,
    42,
    ...Array.from({ length: 30 }, (_, index) => `id-${index}`),
  ]);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids[0], "a");
  assert.equal(ids[1], "b");
  assert.ok(ids.length <= 20);
});

test("sanitizeNoteTexts keeps valid notes and defaults the title", () => {
  const notes = sanitizeNoteTexts([
    { content: "  cell biology  " },
    { title: "  ", content: "x" },
    { title: "empty", content: "   " },
    null,
  ]);
  assert.equal(notes.length, 2);
  assert.equal(notes[0].title, "Note");
  assert.equal(notes[1].title, "Note");
  assert.equal(notes[0].content, "  cell biology  ");
});

test("sanitizeHistory drops invalid entries and keeps the last 14", () => {
  const history = sanitizeHistory([
    { role: "system", content: "ignore" },
    { role: "user", content: "one" },
    ...Array.from({ length: 20 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: `m${index}`,
    })),
  ]);
  assert.equal(history.length, 14);
  assert.equal(history[history.length - 1].content, "m19");
});

test("deriveTitle normalizes whitespace and caps length", () => {
  assert.equal(deriveTitle("  hello   world  "), "hello world");
  assert.equal(deriveTitle(""), "New chat");
  assert.equal(deriveTitle("x".repeat(80)).length, 60);
  assert.ok(deriveTitle("x".repeat(80)).endsWith("..."));
});

test("date and uuid validators reject malformed input", () => {
  assert.equal(isIsoDate("2026-05-12"), true);
  assert.equal(isIsoDate("2026-02-30"), false);
  assert.equal(isIsoDate("12/05/2026"), false);
  assert.equal(isUuid("6f9619ff-8b86-d011-b42d-00c04fc964ff"), true);
  assert.equal(isUuid("not-a-uuid"), false);
});

test("tutor prompt grounds materials mode in the provided sources", () => {
  const prompt = buildTutorSystemPrompt({
    persona: "exam_examiner",
    mode: "materials",
    instructions: "Use short examples.",
    examType: "WAEC",
    contexts: [
      {
        id: "c1",
        title: "Photosynthesis notes",
        content: "Plants use sunlight to make food.",
        sourceType: "material",
        sourceId: "m1",
      },
    ],
    history: [{ role: "user", content: "What is photosynthesis?" }],
    question: "Explain it simply.",
  });
  assert.match(prompt, /Answer ONLY from the sources/);
  assert.match(prompt, /\[S1\] Photosynthesis notes/);
  assert.match(prompt, /Use short examples\./);
  assert.match(prompt, /What is photosynthesis\?/);
  assert.match(prompt, /Explain it simply\./);
});

test("tutor prompt admits when no material matches", () => {
  const prompt = buildTutorSystemPrompt({
    persona: "patient_tutor",
    mode: "materials",
    instructions: "",
    examType: "WAEC",
    contexts: [],
    history: [],
    question: "What is osmosis?",
  });
  assert.match(prompt, /could not find the answer in their uploaded materials/);
  assert.doesNotMatch(prompt, /Answer ONLY from the sources/);
});

test("tutor prompt allows general knowledge outside materials mode", () => {
  const prompt = buildTutorSystemPrompt({
    persona: "study_coach",
    mode: "general",
    instructions: "",
    examType: "JAMB",
    contexts: [],
    history: [],
    question: "How should I revise?",
  });
  assert.match(prompt, /general tutoring/);
  assert.match(prompt, /JAMB/);
  assert.doesNotMatch(prompt, /Answer ONLY from the sources/);
});

test("tutor prompt keeps a blank exam generic", () => {
  const prompt = buildTutorSystemPrompt({
    persona: "patient_tutor",
    mode: "general",
    instructions: "",
    examType: "",
    contexts: [],
    history: [],
    question: "How should I study?",
  });
  assert.match(prompt, /has not specified an exam/);
  assert.doesNotMatch(prompt, /WAEC|NECO|JAMB/);
});

test("tutor JSON prompt requests the expected shape", () => {
  const prompt = buildTutorJsonPrompt("system text");
  assert.match(prompt, /"answer"/);
  assert.match(prompt, /"citations"/);
  assert.match(prompt, /raw JSON only/);
});

test("tutor quiz prompt requests five questions and grounds notes", () => {
  const prompt = buildTutorQuizPrompt({
    topic: "Chemical bonding",
    examType: "WAEC",
    persona: "exam_examiner",
    mode: "materials",
    noteTexts: [{ title: "Bonding note", content: "Ionic bonds transfer electrons." }],
  });
  assert.match(prompt, /exactly 5 multiple-choice questions/);
  assert.match(prompt, /Chemical bonding/);
  assert.match(prompt, /fair examiner/);
  assert.match(prompt, /\[N1\] Bonding note/);
  assert.match(prompt, /Ionic bonds transfer electrons/);
  assert.match(prompt, /"correctAnswer":0/);
});

test("tutor quiz prompt falls back to general knowledge without notes", () => {
  const prompt = buildTutorQuizPrompt({
    topic: "Photosynthesis",
    examType: "NECO",
    persona: "patient_tutor",
    mode: "general",
    noteTexts: [],
  });
  assert.match(prompt, /general knowledge quiz/);
  assert.doesNotMatch(prompt, /Missing notes/);
});

test("buildStudyPlan schedules study days before the exam", () => {
  const plan = buildStudyPlan(
    {
      examType: "WAEC",
      examDate: "2026-06-01",
      subjects: ["Maths", "English"],
      daysPerWeek: 5,
      minutesPerDay: 45,
      timezone: "Africa/Lagos",
    },
    new Date("2026-05-01T12:00:00Z"),
  );
  assert.equal(plan.examType, "WAEC");
  assert.ok(plan.slots.length > 0);
  assert.ok(plan.slots.every((slot) => slot.minutes === 45));
  assert.ok(plan.slots.every((slot) => slot.date < "2026-06-01"));
  assert.equal(plan.slots[0].subject, "Maths");
  assert.equal(plan.slots[1].subject, "English");
  assert.deepEqual([...new Set(plan.slots.map((slot) => slot.subject))], [
    "Maths",
    "English",
  ]);
  for (let index = 1; index < plan.slots.length; index++) {
    assert.ok(plan.slots[index].date > plan.slots[index - 1].date);
  }
});

test("buildStudyPlan falls back to a generic study subject", () => {
  const plan = buildStudyPlan(
    {
      examType: "WAEC",
      examDate: "2026-05-10",
      subjects: [],
      daysPerWeek: 7,
      minutesPerDay: 30,
      timezone: "Africa/Lagos",
    },
    new Date("2026-05-01T12:00:00Z"),
  );
  assert.ok(plan.slots.length > 0);
  assert.ok(plan.slots.every((slot) => slot.subject === "Study"));
});
