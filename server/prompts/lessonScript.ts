export interface LessonScriptPromptInput {
  courseTitle: string;
  chapterTitle: string;
  chapterDescription: string;
  difficulty: string;
  subtopicTitle: string;
  subtopicContent: string;
  learnerContext?: string;
  slideCount?: number;
}

export function buildLessonScriptPrompt(input: LessonScriptPromptInput): string {
  const slideCount = Math.min(8, Math.max(5, Math.round(input.slideCount ?? 6)));
  const learnerBlock = input.learnerContext
    ? `
Learner context:
"${input.learnerContext}"

Use the learner context only to choose examples, analogies, and pacing. Do not mention the context directly.
`
    : "";

  return `You are a teacher and storyboard artist for Yuinx, a gamified learning app.
Write a short animated whiteboard lesson that will be narrated by a voice actor.

Course: "${input.courseTitle}"
Chapter: "${input.chapterTitle}" — ${input.chapterDescription}
Difficulty: "${input.difficulty}"
Subtopic: "${input.subtopicTitle}"
Source material:
"""
${input.subtopicContent}
"""
${learnerBlock}
Lesson rules:
- Produce exactly ${slideCount} slides.
- Slide 1 must be a title slide that names the subtopic and hooks the learner.
- Every other slide teaches exactly one idea. Do not cram multiple concepts into one slide.
- Narration is spoken language, 45 to 80 words per slide, written in the second person.
- Never read the slide text verbatim. Add explanation, intuition, or an example.
- Narration must stand alone: a learner listening without looking should still understand.
- Use a concrete example or analogy in at least one slide.
- The final slide must recap the key idea and may include the checkpoint.
- Add exactly one checkpoint on a slide after the first. It must test the main idea, not trivia.
- Do not use markdown, HTML, code fences, links, or image URLs.
- Keep bullets short (maximum 10 words each).

Visual rules:
- Choose one visual kind per slide: "title", "bullets", "equation", "diagram", or "callout".
- "equation": put the math in LaTeX in "latex" without $ delimiters. Never use \\href, \\url, \\style, \\class, \\require, or \\includegraphics.
- "diagram": 2 to 6 nodes. Node ids are lowercase letters, numbers, "_" or "-". x and y are percentages from 0 to 100. Every edge must reference two existing node ids.
- "callout": use tone "key", "tip", or "warn" for one important takeaway.
- Use "write" for definitions, "draw" for diagrams/equations, "fade" for bullets/recaps.

Return ONLY valid JSON with this exact shape:
{
  "title": "Lesson title (maximum 8 words)",
  "slides": [
    {
      "visual": {
        "kind": "title",
        "text": "Slide heading",
        "subtitle": "Optional supporting line"
      },
      "narration": "Spoken narration of 45 to 80 words.",
      "reveal": "fade"
    },
    {
      "visual": {
        "kind": "equation",
        "latex": "x^2 + 6x + 5 = 0",
        "caption": "Optional caption"
      },
      "narration": "Spoken narration of 45 to 80 words.",
      "reveal": "draw"
    },
    {
      "visual": {
        "kind": "diagram",
        "nodes": [
          { "id": "input", "label": "Input", "x": 15, "y": 50 },
          { "id": "process", "label": "Process", "x": 50, "y": 50 },
          { "id": "output", "label": "Output", "x": 85, "y": 50 }
        ],
        "edges": [["input", "process"], ["process", "output"]],
        "caption": "Optional caption"
      },
      "narration": "Spoken narration of 45 to 80 words.",
      "reveal": "draw",
      "checkpoint": {
        "question": "A question that checks the main idea",
        "options": ["First option", "Second option", "Third option"],
        "correct": 0,
        "explanation": "Why the correct answer is right."
      }
    }
  ]
}`;
}
