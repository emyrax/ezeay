import { useStudyStore } from "../../store/studyStore";
import { api } from "../../lib/api";

export function buildStudyChatPrompt(input: {
  materialTitle: string;
  includeNotes: boolean;
  contexts: { source: string; text: string }[];
  question: string;
}): string {
  const contextSection =
    input.contexts.length > 0
      ? `## Sources\nUse the passages below to answer. When you draw on a passage, cite it inline as [Source] and finish with a "**Sources:**" line listing the ones you used.\n\n${input.contexts
          .map((c) => `[${c.source}]\n${c.text.slice(0, 6000)}`)
          .join("\n\n")
          .slice(0, 45000)}`
      : `Prefer the study material (titled "${input.materialTitle}") when answering. If you don't know or the provided content doesn't cover it, say so honestly — never invent facts.`;

  return [
    `You are Yuinx's study assistant. Answer the user's question about their study material ("${input.materialTitle}")${
      input.includeNotes ? " and their notes" : ""
    } in a clear, concise, accurate way. Use Markdown with short paragraphs, bullet lists, and bold for key terms. Answer in the user's language.`,
    contextSection,
    `The user's question is:\n${input.question}`,
  ]
    .filter((p) => Boolean(p))
    .join("\n\n");
}

export function buildStudyQuizPrompt(input: {
  title: string;
  content: string;
}): { system: string; jsonShape: unknown } {
  const content = input.content.slice(0, 30000);
  return {
    system: `You are Yuinx's study quiz builder. Create exactly 5 multiple-choice quiz questions that test understanding of the study material titled "${input.title}". Each question must have exactly 4 options, and correctAnswer is the 0-based index of the correct option.\n\nStudy material:\n${content}\n\nRespond with ONLY a JSON object in the shape {"questions": [{"id": "string", "question": "string", "options": ["a", "b", "c", "d"], "correctAnswer": 0}]} — no markdown, no code fences, no explanation.`,
    jsonShape: {
      questions: [
        { id: "string", question: "string", options: ["string"], correctAnswer: 0 },
      ],
    },
  };
}

export function buildStudyFlashcardsPrompt(input: {
  title: string;
  content: string;
}): { system: string; jsonShape: unknown } {
  const content = input.content.slice(0, 30000);
  return {
    system: `You are Yuinx's flashcard builder. Create exactly 8 flashcards that help recall the most important concepts from the study material titled "${input.title}".\n\nStudy material:\n${content}\n\nRespond with ONLY a JSON object in the shape {"flashcards": [{"front": "short prompt", "back": "answer"}]} — no markdown, no code fences, no explanation.`,
    jsonShape: { flashcards: [{ front: "string", back: "string" }] },
  };
}

export function buildStudyCheatsheetPrompt(input: {
  title: string;
  content: string;
}): { system: string; jsonShape: unknown } {
  const content = input.content.slice(0, 30000);
  return {
    system: `You are Yuinx's study assistant. Create a concise one-page cheat sheet in Markdown (headings, bullets, bold keywords) covering the most important ideas from the study material titled "${input.title}", 200-350 words. Return the markdown inside a JSON string.\n\nStudy material:\n${content}`,
    jsonShape: { cheatsheet: "string" },
  };
}

export function buildStudySuggestPrompt(input: {
  title: string;
  content: string;
}): { system: string; jsonShape: unknown } {
  const content = input.content.slice(0, 6000);
  return {
    system: `You are Yuinx's study coach. Help the student retain, stay motivated, and enjoy learning from the study page "${input.title}" below. Create exactly 4 suggestions, one per type: a "mnemonic" (memory trick), an "analogy" (vivid metaphor), a "hook" (short fun story or real-world example), and an "examTip" (exam-answering tip). Each title is a short catchy label; each body is 2-3 sentences. Base everything ONLY on the content below and never invent facts. Answer in the student's language.\n\nStudy page:\n${content}\n\nRespond with ONLY a JSON object in the shape {"suggestions": [{"type": "mnemonic" | "analogy" | "story" | "examTip" | "hook" | "connection", "title": "string", "body": "string"}]} — no markdown, no code fences, no explanation.`,
    jsonShape: {
      suggestions: [{ type: "string", title: "string", body: "string" }],
    },
  };
}

export function materialContentFromBites(
  title: string,
  bites: { title?: string; content?: string }[],
): string {
  if (!bites || bites.length === 0) return "";
  return bites
    .map((b) => `## ${b.title || "Section"}\n${b.content || ""}`)
    .join("\n\n");
}

export async function resolveMaterialContent(
  materialId: string,
  getToken: () => Promise<string | null>,
): Promise<{ title: string; content: string }> {
  const local = useStudyStore.getState().getMaterialById(materialId);

  const localContent = (() => {
    const parts = [
      materialContentFromBites(local?.title || "", local?.bites ?? []),
      local?.extractedContent || "",
      local?.summary || "",
    ].filter((p) => p && p.trim());
    return parts.join("\n\n");
  })();
  if (localContent.trim()) {
    return { title: local?.title || "Study material", content: localContent };
  }

  const token = await getToken();
  if (token) {
    const res = await api.study.content(materialId, token);
    if (res?.content && res.content.trim()) {
      return {
        title: res.title || local?.title || "Study material",
        content: res.content,
      };
    }
  }

  if (local?.extractedContent) {
    return { title: local.title, content: local.extractedContent };
  }

  throw new Error("No material content available for offline generation.");
}