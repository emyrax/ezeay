export function buildCourseGenerationPrompt(input: {
  prompt: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  weeks: number;
  learningGoals?: string[];
  learnerContext?: string;
}): string {
  const learnerBlock = input.learnerContext
    ? `
Learner profile (use this to personalize the whole course):
"${input.learnerContext}"

Personalization rules:
- Adapt chapter examples, problems, and references to the learner's course of study, level/year, department, and work context where relevant
- Match difficulty pacing to the learner's stated level
- Where the learner profile is empty or generic, follow the standard difficulty rules
`
    : "";

  return `You are a curriculum designer for Yuinx, a gamified learning app.

Based on this user request, generate a complete course:

User's learning goal: "${input.prompt}"
Learner's interests/goals: "${(input.learningGoals ?? []).join(", ") || "Not specified"}"
Category: "${input.category}"
Difficulty: "${input.difficulty}"
Duration: ${input.weeks} weeks
${learnerBlock}
First, create a compelling course title (catchy, clear, 5-8 words) and an engaging course description (2-3 sentences explaining what the learner will achieve).

Rules for content:
- Generate exactly 8 to 10 chapters
- Each chapter must have a clear, descriptive title
- Each chapter must have a 1-2 sentence description
- Each chapter must have 3 to 5 subtopics
- Each subtopic must have a title and 2-3 sentences of learning content
- Difficulty "${input.difficulty}" should be reflected in the content depth
- The course should be completable within ${input.weeks} weeks
- Chapter order should follow a logical learning progression

Also generate a detailed thumbnail prompt following these guidelines:
- "Fantasy RPG card art style"
- "Bold neon colors on dark gradient background (#0f0f1a to #1a1a2e)"
- "Centered heroic subject representing ${input.category} category"
- "Glowing border and floating particles"
- "Badges for category and difficulty"
- "16:9 aspect ratio, 1280x720"
- Category: "${input.category}", accent color matching category

Return ONLY valid JSON with this exact structure:
{
  "courseTitle": "Compelling Course Title (5-8 words)",
  "courseDescription": "2-3 sentence engaging description of what the learner will gain from this course.",
  "chapters": [
    {
      "title": "Chapter title here",
      "description": "Brief description of what this chapter covers",
      "order": 1,
      "subtopics": [
        {
          "title": "Subtopic title",
          "content": "2-3 sentences of learning content explaining this subtopic",
          "order": 1
        }
      ]
    }
  ],
  "thumbnailPrompt": "Detailed image generation prompt following the thumbnail style guidelines above"
}`;
}

export function buildThumbnailGenerationPrompt(
  thumbnailPrompt: string,
): string {
  return `${thumbnailPrompt}

IMPORTANT: Return ONLY the generated image. No text. No markdown. No JSON.`;
}
