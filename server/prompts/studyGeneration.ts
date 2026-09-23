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

export function buildStudySuggestPrompt(content: string, title: string): string {
  return `You are a study coach for Yuinx, a gamified learning app. Help the student retain, stay motivated, and enjoy learning from the study page below. Create exactly 4 suggestions, one per type, in this order: a "mnemonic" (a memory trick), an "analogy" (a vivid metaphor), a "hook" (a short fun story or real-world example), and an "examTip" (an exam-answering tip).

Study page title: ${title}

Study page:
${content.slice(0, 6000)}

Rules:
- Each "title" is a short catchy label (max 6 words)
- Each "body" is 2-3 sentences
- Base everything ONLY on the content above; never invent facts
- Answer in the student's language
- Return ONLY valid JSON with this exact structure:
{
  "suggestions": [
    { "type": "mnemonic", "title": "...", "body": "..." },
    { "type": "analogy", "title": "...", "body": "..." },
    { "type": "hook", "title": "...", "body": "..." },
    { "type": "examTip", "title": "...", "body": "..." }
  ]
}

Do NOT include any markdown code fences. Return raw JSON only.`;
}