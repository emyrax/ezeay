import type { GenerateQuizInput } from "../../types/courseGeneration";

export function buildQuizGenerationPrompt(input: GenerateQuizInput): string {
  return `You are a quiz master for the course "${input.courseTitle}" on Yuinx, a gamified learning app.

Generate a short quiz for the subtopic "${input.subtopicTitle}" (Chapter ${input.chapterIndex + 1}, Subtopic ${input.subtopicIndex + 1}).

Rules:
- Generate exactly 3 multiple-choice questions
- Each question must test understanding of "${input.subtopicTitle}"
- Each question must have exactly 4 options
- The correct answer is the index of the correct option (0-based)
- Questions should be clear and unambiguous
- Difficulty should match the overall course level
- Do NOT include any explanation, just the JSON

Return ONLY valid JSON with this exact structure:
{
  "questions": [
    {
      "text": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0
    }
  ]
}`;
}
