import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LessonScriptValidationError,
  lessonSourceHash,
  normalizeLessonScript,
} from "../lib/lesson/validateLessonScript";

const NARRATION =
  "Think of a function as a machine that takes an input, applies a consistent rule, and returns exactly one output every single time you use it.";

function slide(
  visual: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { visual, narration: NARRATION, reveal: "fade", ...extra };
}

function titleSlide(): Record<string, unknown> {
  return slide({ kind: "title", text: "Functions", subtitle: "Machines for numbers" });
}

function bulletsSlide(): Record<string, unknown> {
  return slide({ kind: "bullets", items: ["One input", "One output", "A consistent rule"] });
}

function equationSlide(): Record<string, unknown> {
  return slide({ kind: "equation", latex: "f(x) = 2x + 3", caption: "A linear rule" });
}

function diagramSlide(): Record<string, unknown> {
  return slide({
    kind: "diagram",
    nodes: [
      { id: "input", label: "Input", x: 10, y: 50 },
      { id: "rule", label: "Rule", x: 50, y: 50 },
      { id: "output", label: "Output", x: 90, y: 50 },
    ],
    edges: [["input", "rule"], ["rule", "output"]],
  });
}

function calloutSlide(): Record<string, unknown> {
  return slide({ kind: "callout", tone: "key", text: "Every input has exactly one output." });
}

function validSlides(): Record<string, unknown>[] {
  return [titleSlide(), bulletsSlide(), equationSlide(), diagramSlide(), calloutSlide()];
}

test("normalizes a valid lesson and assigns stable slide ids", () => {
  const draft = normalizeLessonScript({ title: "  Functions  ", slides: validSlides() });
  assert.equal(draft.title, "Functions");
  assert.equal(draft.slides.length, 5);
  assert.deepEqual(
    draft.slides.map((entry) => entry.id),
    ["s1", "s2", "s3", "s4", "s5"],
  );
  assert.equal(draft.slides[0].reveal, "fade");
});

test("rejects a lesson with too few valid slides", () => {
  assert.throws(
    () =>
      normalizeLessonScript({
        title: "Functions",
        slides: [titleSlide(), bulletsSlide(), equationSlide()],
      }),
    LessonScriptValidationError,
  );
});

test("drops invalid visuals and reindexes the remaining slides", () => {
  const draft = normalizeLessonScript({
    title: "Functions",
    slides: [...validSlides(), slide({ kind: "video", url: "https://example.com" })],
  });
  assert.equal(draft.slides.length, 5);
  assert.ok(draft.slides.every((entry) => entry.visual.kind !== "video"));
});

test("caps the lesson at eight slides", () => {
  const slides = [
    titleSlide(),
    bulletsSlide(),
    equationSlide(),
    diagramSlide(),
    calloutSlide(),
    bulletsSlide(),
    equationSlide(),
    diagramSlide(),
    calloutSlide(),
    bulletsSlide(),
  ];
  const draft = normalizeLessonScript({ title: "Functions", slides });
  assert.equal(draft.slides.length, 8);
  assert.equal(draft.slides[7].id, "s8");
});

test("clamps diagram coordinates and removes invalid edges", () => {
  const draft = normalizeLessonScript({
    title: "Functions",
    slides: [
      titleSlide(),
      bulletsSlide(),
      slide({
        kind: "diagram",
        nodes: [
          { id: "a", label: "A", x: 150, y: -20 },
          { id: "b", label: "B", x: 50, y: 50 },
        ],
        edges: [["a", "b"], ["b", "missing"], ["a", "a"], ["a", "b"]],
      }),
      calloutSlide(),
      equationSlide(),
    ],
  });
  const visual = draft.slides[2].visual;
  assert.equal(visual.kind, "diagram");
  if (visual.kind !== "diagram") return;
  assert.deepEqual(visual.nodes[0], { id: "a", label: "A", x: 100, y: 0 });
  assert.deepEqual(visual.edges, [["a", "b"]]);
});

test("rejects unsafe LaTeX", () => {
  const draft = normalizeLessonScript({
    title: "Functions",
    slides: [
      titleSlide(),
      bulletsSlide(),
      slide({ kind: "equation", latex: "\\href{javascript:alert(1)}{x}" }),
      diagramSlide(),
      calloutSlide(),
    ],
  });
  assert.equal(draft.slides.length, 4);
  assert.ok(draft.slides.every((entry) => entry.visual.kind !== "equation"));
});

test("drops a slide whose narration is too short", () => {
  assert.throws(
    () =>
      normalizeLessonScript({
        title: "Functions",
        slides: [
          titleSlide(),
          bulletsSlide(),
          equationSlide(),
          slide({ kind: "callout", text: "Short." }, { narration: "Too short to teach." }),
        ],
      }),
    LessonScriptValidationError,
  );
});

test("keeps at most two checkpoints and drops invalid answers", () => {
  const checkpoint = {
    question: "What does a function return?",
    options: ["One output", "Two outputs", "No output"],
    correct: 0,
    explanation: "A function maps each input to exactly one output.",
  };
  const draft = normalizeLessonScript({
    title: "Functions",
    slides: [
      titleSlide(),
      slide({ kind: "bullets", items: ["Input", "Rule"] }, { checkpoint }),
      slide({ kind: "equation", latex: "f(x) = x" }, { checkpoint }),
      slide({ kind: "callout", text: "One output." }, { checkpoint }),
      slide(
        { kind: "callout", text: "Check yourself." },
        { checkpoint: { ...checkpoint, correct: 9 } },
      ),
    ],
  });
  const withCheckpoint = draft.slides.filter((entry) => entry.checkpoint);
  assert.equal(withCheckpoint.length, 2);
  assert.ok(withCheckpoint.every((entry) => entry.checkpoint?.correct === 0));
});

test("falls back to a default title and reveal", () => {
  const draft = normalizeLessonScript({
    slides: [
      titleSlide(),
      bulletsSlide(),
      equationSlide(),
      slide({ kind: "callout", text: "Key idea." }, { reveal: "spin" }),
    ],
  });
  assert.equal(draft.title, "Lesson");
  assert.equal(draft.slides[3].reveal, "fade");
});

test("lessonSourceHash is stable and content sensitive", () => {
  const first = lessonSourceHash("Functions", "A function maps inputs to outputs.");
  const second = lessonSourceHash("Functions", "A function maps inputs to outputs.");
  const third = lessonSourceHash("Functions", "A function maps inputs to one output.");
  assert.equal(first, second);
  assert.notEqual(first, third);
});

test("lessonSourceHash includes optional course context", () => {
  const base = lessonSourceHash("Functions", "Maps inputs.", "Course A");
  const other = lessonSourceHash("Functions", "Maps inputs.", "Course B");
  const empty = lessonSourceHash("Functions", "Maps inputs.");
  assert.notEqual(base, other);
  assert.notEqual(base, empty);
});
