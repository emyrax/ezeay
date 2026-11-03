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

Retention metadata for each subtopic:
Every subtopic must include retention-ready fields for the Explore feed:
- hook: 1 punchy line that creates curiosity or reveals a misconception (max 15 words)
- hookTone: one of "curious" | "challenge" | "misconception" | "fast-win"
- challengeType: one of "prediction" | "vote" | "multiple-choice" | "misconception"
- challengePrompt: a short question or prompt relevant to the subtopic concept (max 20 words)
- challengeOptions: array of 2-4 short answer choices (5 words max each)
- correctChoiceIndex: 0-based index of the correct/best choice
- revealText: 1-2 sentence explanation of why the correct choice is right
- shareCopy: 1 shareable insight sentence a learner would want to send to a friend
- xpReward: integer between 10 and 30

Hook design rules:
- Create tension, trigger curiosity, surface a misconception, or frame a clear win
- Never just restate the subtopic title
- Make the learner want to answer immediately

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
          "order": 1,
          "hook": "Short punchy hook line that creates curiosity",
          "hookTone": "curious",
          "challengeType": "multiple-choice",
          "challengePrompt": "Which approach leads to faster mastery?",
          "challengeOptions": ["Spaced repetition", "Marathon sessions", "Passive reading", "Highlighters only"],
          "correctChoiceIndex": 0,
          "revealText": "Spaced repetition triggers stronger memory consolidation each session.",
          "shareCopy": "Spacing your learning beats cramming by 2x — every time.",
          "xpReward": 20
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

export function buildResourceChallengePrompt(input: {
  title: string;
  summary: string;
  resourceType: string;
}): string {
  return `You are a learning challenge designer for Yuinx, a gamified learning app.

A user has shared a study resource. Generate retention metadata for the Explore feed.

Resource title: "${input.title}"
Resource type: "${input.resourceType}"
Summary: "${input.summary}"

Generate a hook and micro-challenge for this resource.

Rules:
- hook: 1 punchy line that creates curiosity about the resource (max 15 words)
- hookTone: one of "curious" | "challenge" | "misconception" | "fast-win"
- challengeType: one of "prediction" | "vote" | "multiple-choice" | "misconception"
- challengePrompt: a short question relevant to the resource (max 20 words)
- challengeOptions: 2-4 short answer options (5 words max each)
- correctChoiceIndex: 0-based index of the correct/best answer
- revealText: 1-2 sentences explaining the correct choice
- shareCopy: 1 shareable insight sentence

Return ONLY valid JSON:
{
  "hook": "...",
  "hookTone": "curious",
  "challengeType": "multiple-choice",
  "challengePrompt": "...",
  "challengeOptions": ["Option A", "Option B", "Option C"],
  "correctChoiceIndex": 0,
  "revealText": "...",
  "shareCopy": "..."
}`;
}
