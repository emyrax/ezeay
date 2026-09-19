export type NotesAiAction =
  | "summary"
  | "tags"
  | "flashcards"
  | "quiz"
  | "cheatsheet"
  | "chat";

export type NotesChatMode = "note" | "web";

export interface NotesChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export function buildNotesAiPrompt(input: {
  action: NotesAiAction;
  noteTitle: string;
  noteContent: string;
  question?: string;
  existingTags?: string[];
}): { system: string; jsonShape: unknown } {
  const title = input.noteTitle || "Untitled note";
  const content = input.noteContent.slice(0, 30000);

  const base = `You are Yuinx's AI note assistant. The following is a note titled "${title}":\n\n${content}`;

  switch (input.action) {
    case "summary":
      return {
        system: `${base}\n\nWrite a concise summary (80-150 words) that captures the key points of this note.`,
        jsonShape: { summary: "string" },
      };
    case "tags": {
      const existing = input.existingTags?.length
        ? input.existingTags.join(", ")
        : "none";
      return {
        system: `${base}\n\nSuggest 2-5 short, relevant tags for this note. Existing tags are: ${existing}. Prefer existing tags when they fit; otherwise suggest new concise single-word or two-word tags.\n\nRespond with ONLY a JSON object in the shape {"tags": ["tag1", "tag2"]} — no markdown, no code fences, no explanation.`,
        jsonShape: { tags: ["string"] },
      };
    }
    case "flashcards":
      return {
        system: `${base}\n\nCreate exactly 6 flashcards that help recall the most important concepts from this note.\n\nRespond with ONLY a JSON object in the shape {"flashcards": [{"front": "question", "back": "answer"}]} — no markdown, no code fences, no explanation.`,
        jsonShape: { flashcards: [{ front: "string", back: "string" }] },
      };
    case "quiz":
      return {
        system: `${base}\n\nCreate exactly 5 multiple-choice quiz questions that test understanding of this note. Each question must have exactly 4 options. correctAnswer is the 0-based index of the correct option.\n\nRespond with ONLY a JSON object in the shape {"questions": [{"id": "string", "question": "string", "options": ["a", "b", "c", "d"], "correctAnswer": 0}]} — no markdown, no code fences, no explanation.`,
        jsonShape: {
          questions: [
            { id: "string", question: "string", options: ["string"], correctAnswer: 0 },
          ],
        },
      };
    case "cheatsheet":
      return {
        system: `${base}\n\nCreate a concise one-page cheat sheet in Markdown (headings, bullets, bold keywords) covering the most important ideas from this note, 200-350 words. Return the markdown inside a JSON string.`,
        jsonShape: { cheatsheet: "string" },
      };
    case "chat":
    default:
      return {
        system: `${base}\n\n${input.question ? `Question: ${input.question}` : ""}\nAnswer the question grounded ONLY in the note's content. If the answer is not in the note, say so clearly. Use Markdown for readability.`,
        jsonShape: { answer: "string" },
      };
  }
}

export function buildNotesChatPrompt(input: {
  mode: NotesChatMode;
  noteTitle: string;
  noteContent: string;
  messages: NotesChatHistoryMessage[];
  question: string;
  reasoning: boolean;
  json?: boolean;
}): string {
  const title = input.noteTitle || "Untitled note";

  const contextSection = (() => {
    if (input.mode === "web") {
      const excerpt = input.noteContent.slice(0, 8000);
      return `## Background\nThis is the user's current note, titled "${title}".\n\n${excerpt || "(the note is empty)"}\n\nUse live web search results to answer the question. Prefer current, authoritative sources and cite them inline with links where possible. Tie the answer back to the note when relevant.`;
    }
    const content = input.noteContent.slice(0, 30000);
    return `The following is the note titled "${title}" that the user is working in — treat it as the primary source.\n\n${content || "(the note is empty)"}`;
  })();

  const historySection =
    input.messages.length > 0
      ? `## Conversation so far\n${input.messages
          .slice(-14)
          .map(
            (m) =>
              `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 12000)}`,
          )
          .join("\n")}`
      : "";

  const reasoningInstruction = input.reasoning
    ? "\n- Take your time: reason step by step about the question before writing your final answer, then double-check it against the sources."
    : "";

  const outputInstruction = input.json
    ? '\n\nReply with ONLY a raw JSON object in the shape {"answer": "your full markdown answer here"} — no markdown code fences, no extra keys, no explanation.'
    : "\n\nWrite your complete answer as plain Markdown. Do NOT wrap it in JSON.";

  return [
    `You are Yuinx's AI copilot — a friendly, precise study assistant embedded inside a note. You answer in the user's language, in a clear conversational tone.`,
    contextSection,
    historySection,
    `The user's latest question is:\n${input.question}`,
    `Give a real, complete answer - not a one-liner. Use short paragraphs, bullet lists and bold for key terms. Ground every claim in the provided sources. If you don't know or the sources don't cover it, say so honestly - never invent facts.`,
    reasoningInstruction,
    outputInstruction,
  ]
    .filter((p) => Boolean(p))
    .join("\n\n");
}