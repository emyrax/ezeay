import { GoogleGenAI } from "@google/genai";
import type { Chapter, Question } from "../types/chapter";
import { generateText } from "./providers/generateText";

const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.0-flash-exp-image-generation";
const EMBEDDING_MODEL = "text-embedding-004";

export function initGemini(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

export async function generateTextWithFile(
  ai: GoogleGenAI,
  prompt: string,
  file: { base64: string; mimeType: string },
): Promise<string> {
  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: file.mimeType, data: file.base64 } },
          { text: prompt },
        ],
      },
    ],
  });

  const text = response.text;
  if (!text) {
    const reason = response.candidates?.[0]?.finishReason ?? "unknown";
    const msg = response.promptFeedback?.blockReason
      ? `Prompt blocked: ${response.promptFeedback.blockReason}`
      : `Empty response from Gemini (finishReason: ${reason})`;
    throw new Error(msg);
  }

  return text.trim();
}

export async function generateEmbedding(
  ai: GoogleGenAI,
  text: string,
): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });

  const embedding = response.embeddings?.[0]?.values;
  if (!embedding || embedding.length === 0) {
    throw new Error("Empty embedding from Gemini");
  }

  return embedding;
}

export async function generateJsonContent<T>(
  modelRef: string,
  prompt: string,
  apiKey?: string,
): Promise<T> {
  const text = await generateText({ modelRef, prompt, json: true, apiKey });
  try {
    return parseJsonish<T>(text);
  } catch {
    const retryText = await generateText({
      modelRef,
      prompt: `${prompt}\n\nYour previous response did not parse as valid JSON. Return ONLY raw, valid JSON now — no markdown, no code fences, no surrounding explanation.`,
      json: true,
      apiKey,
    });
    try {
      return parseJsonish<T>(retryText);
    } catch {
      throw new Error(
        `AI returned no parseable JSON (${modelRef}). Please try again or switch to a more reliable model.`,
      );
    }
  }
}

export async function generateCourseContent(
  modelRef: string,
  prompt: string,
  apiKey?: string,
): Promise<{ courseTitle: string; courseDescription: string; chapters: Chapter[]; thumbnailPrompt: string }> {
  const parsed = await generateJsonContent<{
    courseTitle: string;
    courseDescription: string;
    chapters: Chapter[];
    thumbnailPrompt: string;
  }>(modelRef, prompt, apiKey);

  if (!parsed.courseTitle || !parsed.courseDescription) {
    throw new Error("AI returned invalid course title or description");
  }

  if (
    !parsed.chapters ||
    !Array.isArray(parsed.chapters) ||
    parsed.chapters.length < 8
  ) {
    throw new Error("AI returned invalid chapter structure");
  }

  return {
    courseTitle: parsed.courseTitle,
    courseDescription: parsed.courseDescription,
    chapters: parsed.chapters.slice(0, 10) as Chapter[],
    thumbnailPrompt: parsed.thumbnailPrompt || "",
  };
}

export async function generateQuizQuestions(
  modelRef: string,
  prompt: string,
  apiKey?: string,
): Promise<Question[]> {
  const parsed = await generateJsonContent<{ questions: Question[] }>(
    modelRef,
    prompt,
    apiKey,
  );

  if (
    !parsed.questions ||
    !Array.isArray(parsed.questions) ||
    parsed.questions.length === 0
  ) {
    throw new Error("AI returned invalid quiz structure");
  }

  return parsed.questions.slice(0, 5);
}

export interface GeminiBounty {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  rewardXP: number;
  rewardCoins: number;
  completionCondition: string;
  courseId: string | null;
  courseTitle: string | null;
}

export async function generateDailyBounties(
  modelRef: string,
  prompt: string,
  apiKey?: string,
): Promise<GeminiBounty[] | null> {
  try {
    const parsed = await generateJsonContent<unknown[]>(modelRef, prompt, apiKey);

    if (!Array.isArray(parsed) || parsed.length !== 3) return null;

    const cleaned = parsed.filter(validateBounty);
    if (cleaned.length !== 3) return null;

    return cleaned as GeminiBounty[];
  } catch {
    return null;
  }
}

export async function generateThumbnailImage(
  ai: GoogleGenAI,
  prompt: string,
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: prompt,
      config: { responseModalities: ["IMAGE", "TEXT"] },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      const inlineData = part.inlineData;
      if (inlineData?.data) {
        return {
          base64: inlineData.data,
          mimeType: inlineData.mimeType ?? "image/png",
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^```[a-zA-Z]*\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

function findBalancedJson(raw: string): string {
  const openStack: { char: string; index: number }[] = [];
  const candidates = new Map<number, string>();
  let inString = false;
  let escape = false;

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === "\\") {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{" || c === "[") {
      openStack.push({ char: c, index: i });
      continue;
    }
    if (c === "}" || c === "]") {
      const last = openStack.pop();
      if (!last) continue;
      const open = last.char;
      const close = c;
      const pairs = open === "{" ? "}" : "]";
      if (close !== pairs) continue;
      if (openStack.length === 0) {
        const block = raw.slice(last.index, i + 1);
        candidates.set(last.index, block);
      }
    }
  }

  for (const block of candidates.values()) {
    try {
      JSON.parse(block);
      return block;
    } catch {
      const withoutTrailingComma = block.replace(/,\s*([\]}])/g, "$1");
      try {
        JSON.parse(withoutTrailingComma);
        return withoutTrailingComma;
      } catch {
        // keep scanning
      }
    }
  }

  const cleaned = raw.replace(/,\s*([}\]])/g, "$1").trim();
  const firstOpen = cleaned.indexOf("{") === -1 ? cleaned.indexOf("[") : cleaned.indexOf("{");
  const lastClose = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (firstOpen !== -1 && lastClose > firstOpen) {
    return cleaned.slice(firstOpen, lastClose + 1);
  }
  return "";
}

function parseJsonish<T>(raw: string): T {
  const stripped = stripMarkdown(raw);
  if (stripped) {
    try {
      return JSON.parse(stripped) as T;
    } catch {
      // fall through to resilient extraction
    }
  }
  const block = findBalancedJson(raw);
  if (!block) {
    throw new Error("AI returned no parseable JSON");
  }
  try {
    return JSON.parse(block) as T;
  } catch {
    const cleaned = block.replace(/,\s*([\]}])/g, "$1");
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new Error("AI returned no parseable JSON");
    }
  }
}

function validateBounty(b: unknown): b is GeminiBounty {
  if (!b || typeof b !== "object") return false;
  const o = b as Record<string, unknown>;
  return (
    typeof o.title === "string" &&
    typeof o.description === "string" &&
    ["easy", "medium", "hard"].includes(o.difficulty as string) &&
    typeof o.rewardXP === "number" &&
    o.rewardXP >= 1 &&
    o.rewardXP <= 9 &&
    typeof o.rewardCoins === "number" &&
    o.rewardCoins >= 1 &&
    o.rewardCoins <= 5 &&
    typeof o.completionCondition === "string"
  );
}
