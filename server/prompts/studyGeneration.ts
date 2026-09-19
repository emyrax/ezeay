export function buildStudyCheatsheetPrompt(content: string): string {
  return `You are a study coach for Yuinx, a gamified learning app. Create a concise one-page cheat sheet from the study material below.

Study content:
${content.slice(0, 30000)}

Rules:
- Use Markdown (headings, bullet lists, bold for keywords)
- Cover the most important concepts, formulas, definitions, and facts
- Keep it skimmable: short lines, tight bullets, no fluff
- Target length: 250-450 words
- Do NOT include markdown code fences. Return raw Markdown.`;
}

export function buildFlashcardsPrompt(content: string): string {
  return `You are a flashcard creator for Yuinx, a gamified learning app.
Based on the study content below, create 8-12 high-quality flashcards that test understanding and recall of the key concepts.

Study content:
${content.slice(0, 30000)}

Rules:
- Each flashcard has a short "front" prompt and a clear "back" answer
- Cover distinct concepts; avoid overlap between cards
- Front should be self-contained (no context from other cards)
- Back should be a sentence or a short list, not an essay
- Return ONLY valid JSON with this exact structure:
{
  "flashcards": [
    { "front": "Question or prompt?", "back": "Answer." }
  ]
}

Do NOT include any markdown code fences. Return raw JSON only.`;
}