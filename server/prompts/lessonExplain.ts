import type { LessonExplainAction, LessonSlide } from "../../types/lesson";

export interface LessonExplainPromptInput {
  lessonTitle: string;
  slide: LessonSlide;
  action: LessonExplainAction;
}

const ACTION_TASKS: Record<LessonExplainAction, string> = {
  simplify:
    "Explain the same idea in simpler language. Use short sentences and one everyday analogy.",
  example:
    "Walk through one concrete example step by step. Show the numbers or the situation, then state the result.",
  why:
    "Explain why this idea matters. Give one real-world use and connect it to what the learner already knows.",
};

function visualForPrompt(slide: LessonSlide): string {
  return JSON.stringify(slide.visual, (key, value) =>
    key === "svg" ? undefined : value,
  );
}

export function buildLessonExplainPrompt(
  input: LessonExplainPromptInput,
): string {
  return `You are a patient tutor inside Yuinx, a gamified learning app.
A learner paused an animated lesson and asked for extra help.

Lesson: "${input.lessonTitle}"
Slide narration: "${input.slide.narration}"
Slide visual (JSON): ${visualForPrompt(input.slide)}

Task: ${ACTION_TASKS[input.action]}

Rules:
- Write 60 to 120 words in the second person.
- Use plain, spoken language. No markdown, headings, bullet lists, links, or code fences.
- Do not repeat the narration word for word.
- Stay strictly on this slide's idea.
- End with one short sentence that helps the learner continue the lesson.

Return only the explanation text.`;
}
