import type { GenerateQuizInput } from "../../types/courseGeneration";

export function buildQuizGenerationPrompt(input: GenerateQuizInput): string {
  const details = input.subtopicDetails.trim().slice(0, 6000);

  return `You are a quiz master for the course "${input.courseTitle}" on Yuinx, a gamified learning app.

Generate a quiz for the subtopic "${input.subtopicTitle}" (Chapter ${input.chapterIndex + 1}, Subtopic ${input.subtopicIndex + 1}).

Subtopic material:
"""
${details}
"""

Rules:
- Generate exactly 5 multiple-choice questions
- Base every question ONLY on the subtopic material above
- Each question must have exactly 4 options
- The correct answer is the 0-based index of the correct option
- Questions should be clear and unambiguous
- Every question must include a short explanation of why the answer is correct
- Do NOT include markdown or code fences

Return ONLY valid JSON with this exact structure:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "A short explanation."
    }
  ]
}`;
}
