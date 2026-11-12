import type { Express, Request, Response } from "express";
import type { GoogleGenAI } from "@google/genai";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import {
  tutorConversations,
  tutorMessages,
  tutorPreferences,
} from "../../db/schema";
import * as schema from "../../db/schema";
import { getModelOption, parseModelRef } from "../../lib/providers/modelRegistry";
import type {
  TutorCitation,
  TutorConversation,
  TutorMessage,
  TutorMode,
  TutorPersona,
} from "../../types/tutor";
import type { Question } from "../../types/chapter";
import type { KnowledgeChunk } from "../rag";
import { collectContexts } from "./context";
import { buildStudyPlan } from "./plan";
import {
  buildTutorJsonPrompt,
  buildTutorQuizPrompt,
  buildTutorSystemPrompt,
} from "./prompts";
import {
  deriveTitle,
  isIsoDate,
  isUuid,
  normalizeMode,
  normalizePersona,
  sanitizeExamType,
  sanitizeHistory,
  sanitizeInstructions,
  sanitizeMaterialIds,
  sanitizeMessage,
  sanitizeNoteTexts,
  sanitizeTopic,
  type TutorHistoryEntry,
} from "./sanitize";

export type TutorDb = NeonHttpDatabase<typeof schema>;

export interface TutorRouteDeps {
  db: TutorDb;
  verifyClerkToken: (authHeader: string | undefined) => Promise<{ sub: string }>;
  aiRequestOptions: (req: Request) => { modelRef: string; apiKey?: string };
  sendRouteError: (res: Response, err: unknown, label?: string) => void;
  generateJsonContent: <T>(
    modelRef: string,
    prompt: string,
    apiKey?: string,
  ) => Promise<T>;
  generateQuizQuestions: (
    modelRef: string,
    prompt: string,
    apiKey?: string,
  ) => Promise<Question[]>;
  getGemini: (apiKey?: string) => GoogleGenAI;
  embed: (text: string) => Promise<number[]>;
  searchKnowledgeChunks: (
    userId: string,
    queryEmbedding: number[],
    sourceTypes: string[],
    sourceIds?: string[],
    limit?: number,
  ) => Promise<KnowledgeChunk[]>;
}

const DEFAULT_DAILY_LIMIT = 30;

type ConversationRow = typeof tutorConversations.$inferSelect;
type MessageRow = typeof tutorMessages.$inferSelect;

function toConversation(row: ConversationRow): TutorConversation {
  return {
    id: row.id,
    title: row.title,
    persona: normalizePersona(row.persona),
    mode: row.mode as TutorMode,
    agentProfileId: row.agentProfileId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMessage(row: MessageRow): TutorMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role === "user" ? "user" : "assistant",
    kind:
      row.kind === "quiz" || row.kind === "plan" ? row.kind : "chat",
    content: row.content,
    citations: Array.isArray(row.citations) ? row.citations : [],
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    model: row.model,
    createdAt: row.createdAt.toISOString(),
  };
}

function sanitizeCitations(value: unknown): TutorCitation[] {
  if (!Array.isArray(value)) return [];
  const out: TutorCitation[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (typeof entry.quote !== "string" || typeof entry.source !== "string") continue;
    const quote = entry.quote.trim();
    const source = entry.source.trim();
    if (!quote || !source) continue;
    out.push({ quote: quote.slice(0, 500), source: source.slice(0, 200) });
    if (out.length >= 6) break;
  }
  return out;
}

async function loadPreferences(deps: TutorRouteDeps, userId: string) {
  const [row] = await deps.db
    .select()
    .from(tutorPreferences)
    .where(eq(tutorPreferences.userId, userId))
    .limit(1);
  return {
    persona: normalizePersona(row?.persona),
    instructions: row?.instructions ?? "",
    examType: row?.examType ?? "",
    examDate: row?.examDate ?? null,
    locale: row?.locale ?? "en-NG",
    dailyMessageLimit: row?.dailyMessageLimit ?? DEFAULT_DAILY_LIMIT,
  };
}

async function savePreferences(
  deps: TutorRouteDeps,
  userId: string,
  input: {
    persona: TutorPersona;
    instructions: string;
    examType: string;
    examDate: string | null;
    locale: string;
    dailyMessageLimit: number;
  },
): Promise<void> {
  await deps.db
    .insert(tutorPreferences)
    .values({ userId, ...input, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: tutorPreferences.userId,
      set: { ...input, updatedAt: new Date() },
    });
}

async function requireConversation(
  deps: TutorRouteDeps,
  userId: string,
  id: string,
): Promise<ConversationRow | null> {
  const [row] = await deps.db
    .select()
    .from(tutorConversations)
    .where(
      and(
        eq(tutorConversations.id, id),
        eq(tutorConversations.userId, userId),
        isNull(tutorConversations.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function countMessagesToday(
  deps: TutorRouteDeps,
  userId: string,
): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const [row] = await deps.db
    .select({ total: count() })
    .from(tutorMessages)
    .where(
      and(
        eq(tutorMessages.userId, userId),
        eq(tutorMessages.role, "user"),
        gte(tutorMessages.createdAt, start),
      ),
    );
  return Number(row?.total ?? 0);
}

function toGeminiContents(
  history: TutorHistoryEntry[],
  question: string,
): { role: "user" | "model"; parts: { text: string }[] }[] {
  const merged: { role: "user" | "model"; content: string }[] = [];
  for (const entry of [
    ...history.map((item) => ({
      role: entryRole(item.role),
      content: item.content,
    })),
    { role: "user" as const, content: question },
  ]) {
    const last = merged[merged.length - 1];
    if (last && last.role === entry.role) {
      last.content = `${last.content}\n\n${entry.content}`;
    } else {
      merged.push({ ...entry });
    }
  }
  if (merged.length === 0 || merged[0].role !== "user") {
    merged.unshift({ role: "user", content: "(conversation start)" });
  }
  return merged.map((entry) => ({
    role: entry.role,
    parts: [{ text: entry.content }],
  }));
}

function entryRole(role: "user" | "assistant"): "user" | "model" {
  return role === "user" ? "user" : "model";
}

export function registerTutorRoutes(app: Express, deps: TutorRouteDeps): void {
  app.get("/api/tutor/conversations", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const rows = await deps.db
        .select()
        .from(tutorConversations)
        .where(
          and(
            eq(tutorConversations.userId, claims.sub),
            isNull(tutorConversations.deletedAt),
          ),
        )
        .orderBy(desc(tutorConversations.updatedAt))
        .limit(50);
      res.json({ conversations: rows.map(toConversation) });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] GET /api/tutor/conversations failed");
    }
  });

  app.post("/api/tutor/conversations", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const title =
        typeof req.body?.title === "string" && req.body.title.trim()
          ? req.body.title.trim().slice(0, 120)
          : "New chat";
      const persona = normalizePersona(req.body?.persona);
      const mode = normalizeMode(req.body?.mode);
      const [row] = await deps.db
        .insert(tutorConversations)
        .values({ userId: claims.sub, title, persona, mode })
        .returning();
      res.status(201).json({ conversation: toConversation(row) });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] POST /api/tutor/conversations failed");
    }
  });

  app.get("/api/tutor/conversations/:id", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      if (!isUuid(req.params.id)) {
        res.status(400).json({ error: "Invalid conversation id" });
        return;
      }
      const conversation = await requireConversation(deps, claims.sub, req.params.id);
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }
      const messages = await deps.db
        .select()
        .from(tutorMessages)
        .where(
          and(
            eq(tutorMessages.conversationId, conversation.id),
            eq(tutorMessages.userId, claims.sub),
          ),
        )
        .orderBy(tutorMessages.createdAt)
        .limit(200);
      res.json({
        conversation: toConversation(conversation),
        messages: messages.map(toMessage),
      });
    } catch (err) {
      deps.sendRouteError(
        res,
        err,
        "[Server] GET /api/tutor/conversations/:id failed",
      );
    }
  });

  app.delete("/api/tutor/conversations/:id", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      if (!isUuid(req.params.id)) {
        res.status(400).json({ error: "Invalid conversation id" });
        return;
      }
      const conversation = await requireConversation(deps, claims.sub, req.params.id);
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }
      await deps.db
        .update(tutorConversations)
        .set({ deletedAt: new Date() })
        .where(eq(tutorConversations.id, conversation.id));
      res.status(204).end();
    } catch (err) {
      deps.sendRouteError(
        res,
        err,
        "[Server] DELETE /api/tutor/conversations/:id failed",
      );
    }
  });

  app.get("/api/tutor/preferences", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      res.json({ preferences: await loadPreferences(deps, claims.sub) });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] GET /api/tutor/preferences failed");
    }
  });

  app.put("/api/tutor/preferences", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const current = await loadPreferences(deps, claims.sub);
      const persona = normalizePersona(req.body?.persona ?? current.persona);
      const instructions = sanitizeInstructions(
        req.body?.instructions ?? current.instructions,
      );
      const examType =
        req.body?.examType === undefined
          ? current.examType
          : sanitizeExamType(req.body.examType);
      const examDate = isIsoDate(req.body?.examDate)
        ? req.body.examDate
        : current.examDate;
      const locale =
        typeof req.body?.locale === "string" && req.body.locale.trim()
          ? req.body.locale.trim().slice(0, 20)
          : current.locale;
      const dailyMessageLimit = Math.min(
        Math.max(Number(req.body?.dailyMessageLimit ?? current.dailyMessageLimit), 5),
        200,
      );
      await savePreferences(deps, claims.sub, {
        persona,
        instructions,
        examType,
        examDate,
        locale,
        dailyMessageLimit,
      });
      res.json({
        preferences: {
          persona,
          instructions,
          examType,
          examDate,
          locale,
          dailyMessageLimit,
        },
      });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] PUT /api/tutor/preferences failed");
    }
  });

  app.post("/api/tutor/plan", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const examDate = req.body?.examDate;
      if (!isIsoDate(examDate)) {
        res.status(400).json({ error: "examDate must be a valid YYYY-MM-DD date" });
        return;
      }
      const examDay = new Date(`${examDate}T00:00:00Z`);
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (examDay.getTime() <= today.getTime()) {
        res.status(400).json({ error: "examDate must be in the future" });
        return;
      }
      const subjects = Array.isArray(req.body?.subjects)
        ? req.body.subjects
            .filter((s: unknown): s is string => typeof s === "string")
            .map((s: string) => s.trim())
            .filter(Boolean)
            .slice(0, 12)
        : [];
      const examType = sanitizeExamType(req.body?.examType);
      const timezone =
        typeof req.body?.timezone === "string" && req.body.timezone.trim()
          ? req.body.timezone.trim().slice(0, 64)
          : "Africa/Lagos";
      const daysPerWeek = Number(req.body?.daysPerWeek ?? 5);
      const minutesPerDay = Number(req.body?.minutesPerDay ?? 45);
      if (!Number.isFinite(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) {
        res.status(400).json({ error: "daysPerWeek must be between 1 and 7" });
        return;
      }
      if (!Number.isFinite(minutesPerDay) || minutesPerDay < 10 || minutesPerDay > 240) {
        res.status(400).json({ error: "minutesPerDay must be between 10 and 240" });
        return;
      }
      const plan = buildStudyPlan({
        examType,
        examDate,
        subjects,
        daysPerWeek,
        minutesPerDay,
        timezone,
      });
      const current = await loadPreferences(deps, claims.sub);
      await savePreferences(deps, claims.sub, {
        ...current,
        examType,
        examDate,
      });
      res.json({ plan });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] POST /api/tutor/plan failed");
    }
  });

  app.post("/api/tutor/quiz", async (req, res) => {
    try {
      await deps.verifyClerkToken(req.headers.authorization);
      const topic = sanitizeTopic(req.body?.topic);
      if (!topic) {
        res.status(400).json({ error: "topic must be between 3 and 200 characters" });
        return;
      }

      const mode = normalizeMode(req.body?.mode);
      const persona = normalizePersona(req.body?.persona);
      const noteTexts = sanitizeNoteTexts(req.body?.noteTexts);
      const examType = sanitizeExamType(req.body?.examType);

      const prompt = buildTutorQuizPrompt({
        topic,
        examType,
        persona,
        mode,
        noteTexts,
      });
      const ai = deps.aiRequestOptions(req);
      const questions = await deps.generateQuizQuestions(
        ai.modelRef,
        prompt,
        ai.apiKey,
      );

      res.json({ quiz: { topic, questions } });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] POST /api/tutor/quiz failed");
    }
  });

  app.post("/api/tutor/chat", async (req, res) => {
    try {
      const claims = await deps.verifyClerkToken(req.headers.authorization);
      const userId = claims.sub;
      const message = sanitizeMessage(req.body?.message);
      if (!message) {
        res.status(400).json({ error: "Missing required field: message" });
        return;
      }

      const mode = normalizeMode(req.body?.mode);
      const requestedPersona = req.body?.persona
        ? normalizePersona(req.body.persona)
        : null;
      const materialIds = sanitizeMaterialIds(req.body?.materialIds);
      const noteTexts = sanitizeNoteTexts(req.body?.noteTexts);

      const conversationId = req.body?.conversationId;
      let conversation: ConversationRow | null = null;
      if (conversationId !== undefined && conversationId !== null) {
        if (!isUuid(conversationId)) {
          res.status(400).json({ error: "Invalid conversation id" });
          return;
        }
        conversation = await requireConversation(deps, userId, conversationId);
        if (!conversation) {
          res.status(404).json({ error: "Conversation not found" });
          return;
        }
      }

      const preferences = await loadPreferences(deps, userId);
      const persona = requestedPersona ?? (conversation?.persona as TutorPersona) ?? preferences.persona;
      const examType =
        req.body?.examType === undefined
          ? preferences.examType
          : sanitizeExamType(req.body.examType);

      const messagesToday = await countMessagesToday(deps, userId);
      if (messagesToday >= preferences.dailyMessageLimit) {
        res.status(429).json({
          error: `You have reached today's Tutor limit (${preferences.dailyMessageLimit} messages). Try again tomorrow.`,
          code: "tutor_quota",
        });
        return;
      }

      if (!conversation) {
        const [created] = await deps.db
          .insert(tutorConversations)
          .values({
            userId,
            title: deriveTitle(message),
            persona,
            mode,
          })
          .returning();
        conversation = created;
      }

      const historyRows = await deps.db
        .select()
        .from(tutorMessages)
        .where(
          and(
            eq(tutorMessages.conversationId, conversation.id),
            eq(tutorMessages.userId, userId),
          ),
        )
        .orderBy(desc(tutorMessages.createdAt))
        .limit(14);
      const history = sanitizeHistory(
        historyRows.reverse().map((row) => ({
          role: row.role,
          content: row.content,
        })),
      );

      const { contexts } = await collectContexts(
        deps,
        userId,
        message,
        materialIds,
        noteTexts,
      );

      const system = buildTutorSystemPrompt({
        persona,
        mode,
        instructions: preferences.instructions,
        examType,
        contexts,
        history,
        question: message,
      });

      const [userRow] = await deps.db
        .insert(tutorMessages)
        .values({
          conversationId: conversation.id,
          userId,
          role: "user",
          kind: "chat",
          content: message,
        })
        .returning();

      await deps.db
        .update(tutorConversations)
        .set({ updatedAt: new Date() })
        .where(eq(tutorConversations.id, conversation.id));

      const ai = deps.aiRequestOptions(req);
      const parsed = parseModelRef(ai.modelRef);
      const provider = parsed?.provider ?? "gemini";
      const baseModelId = parsed?.id ?? "gemini-2.5-flash";

      if (req.body?.stream && provider === "gemini") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        const send = (data: unknown): boolean => {
          if (req.aborted) return false;
          try {
            return res.write(`data: ${JSON.stringify(data)}\n\n`);
          } catch {
            return false;
          }
        };

        let answer = "";
        try {
          const client = deps.getGemini(ai.apiKey);
          const stream = await client.models.generateContentStream({
            model: baseModelId,
            contents: toGeminiContents(history, message),
            config: { systemInstruction: system },
          });
          for await (const chunk of stream) {
            if (req.aborted) break;
            if (chunk.text) {
              answer += chunk.text;
              if (!send({ type: "delta", text: chunk.text })) break;
            }
          }
        } catch (err) {
          const text = err instanceof Error ? err.message : String(err);
          send({ type: "error", message: text });
          res.end();
          return;
        }

        const citations = contexts.slice(0, 5).map((context) => ({
          quote: context.content.slice(0, 240),
          source: context.title,
        }));
        if (answer.trim()) {
          try {
            const [assistantRow] = await deps.db
              .insert(tutorMessages)
              .values({
                conversationId: conversation.id,
                userId,
                role: "assistant",
                kind: "chat",
                content: answer.trim(),
                citations,
                model: ai.modelRef,
              })
              .returning();
            send({
              type: "done",
              conversationId: conversation.id,
              message: toMessage(assistantRow),
              userMessageId: userRow.id,
            });
          } catch (err) {
            console.error("[Server] Failed to store tutor reply", err);
            send({
              type: "done",
              conversationId: conversation.id,
              message: null,
              userMessageId: userRow.id,
            });
          }
        } else {
          send({ type: "done", conversationId: conversation.id, message: null });
        }
        res.end();
        return;
      }

      let result: { answer?: unknown; citations?: unknown };
      try {
        result = await deps.generateJsonContent<{
          answer?: unknown;
          citations?: unknown;
        }>(ai.modelRef, buildTutorJsonPrompt(system), ai.apiKey);
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        if (text.includes("no parseable JSON")) {
          const label = getModelOption(ai.modelRef)?.label ?? ai.modelRef;
          res.status(422).json({
            error: `"${label}" returned no usable answer. Please try again or switch models.`,
          });
          return;
        }
        throw err;
      }

      const answer = String(result?.answer ?? "").trim();
      if (!answer) {
        const label = getModelOption(ai.modelRef)?.label ?? ai.modelRef;
        res.status(422).json({
          error: `"${label}" returned an empty answer. Try again or switch models.`,
        });
        return;
      }

      const [assistantRow] = await deps.db
        .insert(tutorMessages)
        .values({
          conversationId: conversation.id,
          userId,
          role: "assistant",
          kind: "chat",
          content: answer,
          citations: sanitizeCitations(result?.citations),
          model: ai.modelRef,
        })
        .returning();

      res.json({
        conversationId: conversation.id,
        message: toMessage(assistantRow),
        userMessageId: userRow.id,
      });
    } catch (err) {
      deps.sendRouteError(res, err, "[Server] POST /api/tutor/chat failed");
    }
  });
}
