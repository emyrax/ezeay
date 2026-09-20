import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import express from "express";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { verifyToken } from "@clerk/backend";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, or, inArray, gte, desc, asc, isNull, isNotNull, ne, sql as drizzleSql, count, sum, gt } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { initGemini, generateCourseContent, generateJsonContent, generateQuizQuestions, generateDailyBounties, generateThumbnailImage, generateTextWithFile, generateEmbedding } from "../lib/gemini";
import type { GeminiBounty } from "../lib/gemini";
import { AI_MODEL_DEFAULT, getModelOption, isModelAllowed, parseModelRef } from "../lib/providers/modelRegistry";
import { providerKeyStatus, initAiEngine, getGemini } from "./ai/text";
import { generateText } from "../lib/providers/generateText";
import {
  users,
  levels,
  trophies,
  courses,
  courseEnrollments,
  userTrophies,
  studyMaterials,
  studyFlashcards,
  quizAttempts,
  knowledgeChunks,
  noteChats,
  bountyClaims,
  userDailyActivity,
  communityPosts,
  communityPostReactions,
  communityPostComments,
  courseFeedLikes,
} from "../db/schema";
import { generateFallbackBounties } from "./bountyTemplates";
import { buildCourseGenerationPrompt, buildThumbnailGenerationPrompt } from "./prompts/courseGeneration";
import { buildQuizGenerationPrompt } from "./prompts/quizGeneration";
import { buildStudyExtractionPrompt } from "./prompts/studyProcessing";
import { buildStudyCheatsheetPrompt, buildFlashcardsPrompt } from "./prompts/studyGeneration";
import { buildNotesAiPrompt, buildNotesChatPrompt } from "./prompts/notesPrompts";
import type { NotesAiAction, NotesChatMode } from "./prompts/notesPrompts";
import type { Course } from "../types/course";

const app = express();
app.use(express.json({ limit: "25mb" }));

const DATABASE_URL = process.env.NEON_DATABASE_URL;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!DATABASE_URL) {
  console.error("[Server] Missing NEON_DATABASE_URL");
  process.exit(1);
}

const DB_HOST = (() => {
  try {
    return new URL(DATABASE_URL).host;
  } catch {
    return "unknown";
  }
})();
if (!CLERK_SECRET_KEY) {
  console.error("[Server] Missing CLERK_SECRET_KEY");
  process.exit(1);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("[Server] Missing GEMINI_API_KEY — AI features (quiz generation, course generation) will not work");
  process.exit(1);
}

initAiEngine();

const genAI = initGemini(GEMINI_API_KEY);

function resolveAiModel(header: string | string[] | undefined): string {
  const ref = Array.isArray(header) ? header[0] : header;
  if (typeof ref === "string" && isModelAllowed(ref)) return ref;
  return AI_MODEL_DEFAULT;
}

function singleHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function aiRequestOptions(req: Request): { modelRef: string; apiKey?: string } {
  return {
    modelRef: resolveAiModel(req.headers["x-ai-model"] as string | string[] | undefined),
    apiKey: singleHeader(req.headers["x-ai-key"] as string | string[] | undefined),
  };
}

function sendRouteError(res: Response, err: unknown, label = "[Server] Request failed"): void {
  if (isTokenError(err)) {
    res.status(401).json({ error: `Invalid token: ${(err as any)?.reason || (err as Error)?.message}` });
    return;
  }
  console.error(`${label}:`, err);
  const anyErr = err as any;
  const rawStatus =
    typeof anyErr?.statusCode === "number"
      ? anyErr.statusCode
      : typeof anyErr?.status === "number"
        ? anyErr.status
        : 0;
  const status =
    rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;
  const baseMessage = (err as Error)?.message || "Internal server error";
  const causeMessage =
    typeof (err as any)?.cause?.message === "string"
      ? ((err as any).cause as Error).message
      : undefined;
  const payload: Record<string, string> = {
    error: causeMessage ? `${baseMessage} — ${causeMessage}` : baseMessage,
  };
  if (typeof (err as any)?.code === "string") {
    payload.code = (err as any).code as string;
  }
  res.status(status).json(payload);
}

const rawSql = neon(DATABASE_URL);

neonConfig.fetchFunction = (url: any, init: any) => {
  const timeoutSignal = AbortSignal.timeout(15000);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  return fetch(url, { ...init, signal });
};

function isTransientDbError(err: any): boolean {
  if (!err) return false;
  const message = `${err?.message ?? ""} ${err?.code ?? ""}`;
  return (
    /fetch failed/i.test(message) ||
    /ConnectTimeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|AbortError|TimeoutError|UND_ERR_|aborted due to timeout/i.test(message)
  );
}

async function runWithRetry<T>(run: () => Promise<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await run();
    } catch (err) {
      if (!isTransientDbError(err) || attempt >= 2) throw err;
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
}

const sql = Object.assign(
  (...args: Parameters<typeof rawSql>) => runWithRetry(() => rawSql(...args)),
  {
    query: (...args: Parameters<typeof rawSql.query>) => runWithRetry(() => rawSql.query(...args)),
  },
) as typeof rawSql;

const db = drizzle(sql, {
  schema: { users, levels, trophies, courses, courseEnrollments, userTrophies, studyMaterials, studyFlashcards, quizAttempts, knowledgeChunks, bountyClaims, userDailyActivity, communityPosts, communityPostReactions, communityPostComments },
});

app.get("/api/health", async (_req, res) => {
  try {
    await sql`select 1 from courses limit 1`;
    res.json({ status: "ok", database: "ok" });
  } catch (err: any) {
    console.error("[Server] GET /api/health failed:", err);
    res.status(503).json({ error: "Service unavailable", detail: `${err?.message ?? ""} ${err?.cause?.message ?? ""}`.trim() });
  }
});

type UserRow = {
  id: string;
  displayName: string;
  email: string;
  photoUrl: string | null;
  level: string;
  majorCourse: string;
  birthday: string | null;
  educationLevel: string | null;
  professionalInfoEnabled: boolean;
  status: string;
  xp: number;
  coins: number;
  gamingLevel: number;
  rank: string;
  nextLevelXp: number;
  courses: string;
  earnedTrophies: string;
  lastCheckInDate: string | null;
  currentStreak: number;
  longestStreak: number;
  learningGoals: string;
  onBoarded: boolean;
  modelRatings: string;
  isPro: boolean;
  headline: string | null;
  bio: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  university: string | null;
  website: string | null;
  linkedInUrl: string | null;
  department: string | null;
  collarType: string | null;
  availability: string | null;
  industry: string | null;
  jobTitle: string | null;
  company: string | null;
  yearsOfTradeExperience: number | null;
  interests: string;
  skills: string;
  languages: string;
  tradeSkills: string;
  education: string;
  workExperience: string;
  certifications: string;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

function mapUser(row: UserRow) {
  let courses: unknown[] = [];
  try { courses = JSON.parse(row.courses); } catch { /* ignore */ }
  let earnedTrophies: string[] = [];
  try { earnedTrophies = JSON.parse(row.earnedTrophies); } catch { /* ignore */ }
  let learningGoals: string[] = [];
  try { learningGoals = JSON.parse(row.learningGoals); } catch { /* ignore */ }
  let modelRatings: Record<string, number> = {};
  try { modelRatings = JSON.parse(row.modelRatings ?? "{}"); } catch { /* ignore */ }
  let interests: string[] = [];
  try { interests = JSON.parse(row.interests); } catch { /* ignore */ }
  let skills: string[] = [];
  try { skills = JSON.parse(row.skills); } catch { /* ignore */ }
  let languages: string[] = [];
  try { languages = JSON.parse(row.languages); } catch { /* ignore */ }
  let tradeSkills: string[] = [];
  try { tradeSkills = JSON.parse(row.tradeSkills); } catch { /* ignore */ }
  let education: unknown[] = [];
  try { education = JSON.parse(row.education); } catch { /* ignore */ }
  let workExperience: unknown[] = [];
  try { workExperience = JSON.parse(row.workExperience); } catch { /* ignore */ }
  let certifications: unknown[] = [];
  try { certifications = JSON.parse(row.certifications); } catch { /* ignore */ }
  return {
    uid: row.id,
    displayName: row.displayName,
    email: row.email,
    photoURL: row.photoUrl,
    level: row.level,
    majorCourse: row.majorCourse,
    birthday: row.birthday ?? undefined,
    educationLevel: row.educationLevel ?? undefined,
    professionalInfoEnabled: row.professionalInfoEnabled ?? true,
    status: row.status,
    xp: row.xp,
    coins: row.coins,
    gamingLevel: row.gamingLevel,
    rank: row.rank,
    nextLevelXp: row.nextLevelXp,
    courses,
    earnedTrophies,
    lastCheckInDate: row.lastCheckInDate ?? null,
    currentStreak: row.currentStreak,
    longestStreak: row.longestStreak,
    learningGoals,
    onBoarded: row.onBoarded ?? false,
    modelRatings,
    isPro: row.isPro ?? false,
    headline: row.headline ?? undefined,
    bio: row.bio ?? undefined,
    location: row.location ?? undefined,
    locationLat: row.locationLat !== null && row.locationLat !== undefined ? Number(row.locationLat) : undefined,
    locationLng: row.locationLng !== null && row.locationLng !== undefined ? Number(row.locationLng) : undefined,
    university: row.university ?? undefined,
    website: row.website ?? undefined,
    linkedInUrl: row.linkedInUrl ?? undefined,
    department: row.department ?? undefined,
    collarType: row.collarType ?? undefined,
    availability: row.availability ?? undefined,
    industry: row.industry ?? undefined,
    jobTitle: row.jobTitle ?? undefined,
    company: row.company ?? undefined,
    yearsOfTradeExperience: row.yearsOfTradeExperience ?? undefined,
    interests,
    skills,
    languages,
    tradeSkills,
    education,
    workExperience,
    certifications,
    createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
    updatedAt: row.updatedAt
      ? (row.updatedAt?.toISOString?.() ?? String(row.updatedAt))
      : undefined,
    deletedAt: row.deletedAt
      ? (row.deletedAt?.toISOString?.() ?? String(row.deletedAt))
      : undefined,
  };
}

function isNetworkError(err: any): boolean {
  if (!err) return false;
  const message = `${err?.message ?? ""} ${err?.code ?? ""}`;
  return (
    (err instanceof TypeError && /fetch|network|abort/i.test(message)) ||
    /UND_ERR|ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(message)
  );
}

async function verifyClerkToken(authHeader: string | undefined) {
  if (!authHeader) throw new Error("Unauthorized");
  const startedAt = Date.now();
  let attempts = 0;
  for (;;) {
    attempts += 1;
    try {
      return await verifyToken(authHeader.replace("Bearer ", ""), {
        secretKey: CLERK_SECRET_KEY,
        clockSkewInMs: 60000,
      });
    } catch (err) {
      if (isNetworkError(err) && attempts < 2 && Date.now() - startedAt < 2000) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }
      if (isNetworkError(err)) {
        console.error("[Server] Token verification network error:", err);
        const unreachable = new Error("Auth service unreachable. Please try again.");
        (unreachable as any).statusCode = 503;
        throw unreachable;
      }
      if (!isTokenError(err)) {
        console.error("[Server] Token verification failed:", err);
      }
      throw err;
    }
  }
}

function isTokenError(err: any): boolean {
  return (
    err?.message === "Unauthorized" ||
    typeof err?.reason === "string" ||
    (typeof err?.name === "string" && /Token|JWT|Jwk|Expired/i.test(err.name))
  );
}

// --- AI Provider Status ---

app.get("/api/ai/providers", async (req, res) => {
  try {
    await verifyClerkToken(req.headers.authorization);
    res.json({ providers: providerKeyStatus() });
  } catch (err: any) {
    sendRouteError(res, err, "[Server] GET /api/ai/providers failed");
  }
});

// --- User Routes ---

app.get("/api/users/:id", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    if (claims.sub !== req.params.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.params.id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json(mapUser(row as unknown as UserRow));
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/users/:id failed");
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const clerkUserId = claims.sub;
    const body = req.body;

    const nextLevelXp = 100;
    const now = new Date();
    const values = {
      id: clerkUserId,
      displayName: body.displayName || "Scholar",
      email: body.email || "",
      photoUrl: body.photoURL || null,
      level: body.level || "",
      majorCourse: body.majorCourse || "",
      birthday: body.birthday || null,
      educationLevel: body.educationLevel || null,
      professionalInfoEnabled: body.professionalInfoEnabled ?? true,
      locationLat: typeof body.locationLat === "number" ? body.locationLat : null,
      locationLng: typeof body.locationLng === "number" ? body.locationLng : null,
      university: body.university || null,
      xp: body.xp ?? 0,
      coins: body.coins ?? 0,
      gamingLevel: body.gamingLevel ?? 1,
      rank: body.rank ?? "Spark",
      nextLevelXp: nextLevelXp,
      courses: JSON.stringify(body.courses ?? []),
      earnedTrophies: JSON.stringify(body.earnedTrophies ?? []),
      isPro: body.isPro ?? false,
      status: "active" as const,
      createdAt: now,
    };

    await db.insert(users).values(values);
    console.debug(`[Server] POST /api/users — created ${clerkUserId}`);
    res.status(201).json(mapUser(values as unknown as UserRow));
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/users failed");
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    if (claims.sub !== req.params.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const body = req.body;
    const updateData: Record<string, unknown> = {};
    if (body.displayName !== undefined) updateData.displayName = body.displayName;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.photoURL !== undefined) updateData.photoUrl = body.photoURL;
    if (body.level !== undefined) updateData.level = body.level;
    if (body.majorCourse !== undefined) updateData.majorCourse = body.majorCourse;
    if (body.birthday !== undefined) updateData.birthday = body.birthday;
    if (body.educationLevel !== undefined) updateData.educationLevel = body.educationLevel || null;
    if (body.professionalInfoEnabled !== undefined) updateData.professionalInfoEnabled = Boolean(body.professionalInfoEnabled);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.xp !== undefined) updateData.xp = body.xp;
    if (body.coins !== undefined) updateData.coins = body.coins;
    if (body.gamingLevel !== undefined) updateData.gamingLevel = body.gamingLevel;
    if (body.rank !== undefined) updateData.rank = body.rank;
    if (body.nextLevelXp !== undefined) updateData.nextLevelXp = body.nextLevelXp;
    if (body.courses !== undefined) updateData.courses = JSON.stringify(body.courses);
    if (body.earnedTrophies !== undefined) updateData.earnedTrophies = JSON.stringify(body.earnedTrophies);
    if (body.lastCheckInDate !== undefined) updateData.lastCheckInDate = body.lastCheckInDate;
    if (body.currentStreak !== undefined) updateData.currentStreak = body.currentStreak;
    if (body.longestStreak !== undefined) updateData.longestStreak = body.longestStreak;
    if (body.learningGoals !== undefined) updateData.learningGoals = JSON.stringify(body.learningGoals);
    if (body.onBoarded !== undefined) updateData.onBoarded = body.onBoarded;
    if (body.modelRatings !== undefined) updateData.modelRatings = JSON.stringify(body.modelRatings);
    if (body.isPro !== undefined) updateData.isPro = Boolean(body.isPro);
    if (body.headline !== undefined) updateData.headline = body.headline || null;
    if (body.bio !== undefined) updateData.bio = body.bio || null;
    if (body.location !== undefined) updateData.location = body.location || null;
    if (body.locationLat !== undefined) updateData.locationLat = typeof body.locationLat === "number" ? body.locationLat : null;
    if (body.locationLng !== undefined) updateData.locationLng = typeof body.locationLng === "number" ? body.locationLng : null;
    if (body.university !== undefined) updateData.university = body.university || null;
    if (body.website !== undefined) updateData.website = body.website || null;
    if (body.linkedInUrl !== undefined) updateData.linkedInUrl = body.linkedInUrl || null;
    if (body.department !== undefined) updateData.department = body.department || null;
    if (body.collarType !== undefined) updateData.collarType = body.collarType || null;
    if (body.availability !== undefined) updateData.availability = body.availability || null;
    if (body.industry !== undefined) updateData.industry = body.industry || null;
    if (body.jobTitle !== undefined) updateData.jobTitle = body.jobTitle || null;
    if (body.company !== undefined) updateData.company = body.company || null;
    if (body.yearsOfTradeExperience !== undefined) updateData.yearsOfTradeExperience = body.yearsOfTradeExperience;
    if (body.skills !== undefined) updateData.skills = Array.isArray(body.skills) ? JSON.stringify(body.skills) : body.skills;
    if (body.languages !== undefined) updateData.languages = Array.isArray(body.languages) ? JSON.stringify(body.languages) : body.languages;
    if (body.interests !== undefined) updateData.interests = Array.isArray(body.interests) ? JSON.stringify(body.interests) : body.interests;
    if (body.tradeSkills !== undefined) updateData.tradeSkills = Array.isArray(body.tradeSkills) ? JSON.stringify(body.tradeSkills) : body.tradeSkills;
    if (body.education !== undefined) updateData.education = Array.isArray(body.education) ? JSON.stringify(body.education) : body.education;
    if (body.workExperience !== undefined) updateData.workExperience = Array.isArray(body.workExperience) ? JSON.stringify(body.workExperience) : body.workExperience;
    if (body.certifications !== undefined) updateData.certifications = Array.isArray(body.certifications) ? JSON.stringify(body.certifications) : body.certifications;
    updateData.updatedAt = new Date();

    await db.update(users).set(updateData).where(eq(users.id, req.params.id));
    console.debug(`[Server] PUT /api/users/${req.params.id} — updated`);
    res.status(204).end();
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] PUT /api/users/:id failed");
  }
});

// --- Check-In Route ---

app.post("/api/users/:id/checkin", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    if (claims.sub !== req.params.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [row] = await db
      .select({
        lastCheckInDate: users.lastCheckInDate,
        currentStreak: users.currentStreak,
        longestStreak: users.longestStreak,
      })
      .from(users)
      .where(eq(users.id, req.params.id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let newStreak: number;
    if (row.lastCheckInDate === today) {
      res.json({ alreadyCheckedIn: true, streak: row.currentStreak, longestStreak: row.longestStreak, xpReward: 0, coinReward: 0 });
      return;
    } else if (row.lastCheckInDate === yesterdayStr) {
      newStreak = row.currentStreak + 1;
    } else {
      newStreak = 1;
    }

    const newLongest = Math.max(newStreak, row.longestStreak);

    const xpReward = newStreak <= 3 ? 10 : newStreak <= 7 ? 25 : newStreak <= 14 ? 50 : 100;
    const coinReward = newStreak <= 3 ? 5 : newStreak <= 7 ? 10 : newStreak <= 14 ? 20 : 50;

    const [updated] = await db
      .update(users)
      .set({
        lastCheckInDate: today,
        currentStreak: newStreak,
        longestStreak: newLongest,
        xp: drizzleSql`${users.xp} + ${xpReward}`,
        coins: drizzleSql`${users.coins} + ${coinReward}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.params.id))
      .returning({ xp: users.xp, coins: users.coins });

    console.debug(`[Server] POST /api/users/${req.params.id}/checkin — streak: ${newStreak}, +${xpReward}xp, +${coinReward}coins`);
    res.json({
      alreadyCheckedIn: false,
      streak: newStreak,
      longestStreak: newLongest,
      xpReward,
      coinReward,
      xp: updated.xp,
      coins: updated.coins,
    });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/users/:id/checkin failed");
  }
});

// --- Daily Activity Routes ---

app.post("/api/users/:id/activity", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    if (claims.sub !== req.params.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const body = req.body ?? {};
    const delta = typeof body.delta === "number" && Number.isFinite(body.delta) ? Math.floor(body.delta) : 1;
    const date = typeof body.date === "string" && body.date.length === 10 ? body.date : new Date().toISOString().slice(0, 10);

    const inserted = await db
      .insert(userDailyActivity)
      .values({
        id: `act_${req.params.id}_${date}`,
        userId: req.params.id,
        date,
        count: delta,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userDailyActivity.userId, userDailyActivity.date],
        set: { count: drizzleSql`${userDailyActivity.count} + ${delta}`, updatedAt: new Date() },
      })
      .returning({ count: userDailyActivity.count });

    res.json({ date, count: inserted[0]?.count ?? 0 });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/users/:id/activity failed");
  }
});

app.get("/api/users/:id/activity", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    if (claims.sub !== req.params.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const daysRaw = Number(req.query.days);
    const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(Math.floor(daysRaw), 365) : 90;

    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const startDate = start.toISOString().slice(0, 10);

    const rows = await db
      .select({ date: userDailyActivity.date, count: userDailyActivity.count })
      .from(userDailyActivity)
      .where(and(eq(userDailyActivity.userId, req.params.id), gte(userDailyActivity.date, startDate)))
      .orderBy(asc(userDailyActivity.date));

    res.json({ days, daysData: rows });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/users/:id/activity failed");
  }
});

// --- Community Routes ---

app.get("/api/community/overview", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const today = new Date().toISOString().slice(0, 10);

    const [myRow] = await db
      .select({ xp: users.xp })
      .from(users)
      .where(eq(users.id, claims.sub))
      .limit(1);

    if (!myRow) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const leaderboard = await db
      .select({
        uid: users.id,
        displayName: users.displayName,
        photoURL: users.photoUrl,
        xp: users.xp,
        gamingLevel: users.gamingLevel,
        rank: users.rank,
        currentStreak: users.currentStreak,
      })
      .from(users)
      .where(eq(users.status, "active"))
      .orderBy(desc(users.xp))
      .limit(25);

    const topStreaks = await db
      .select({
        uid: users.id,
        displayName: users.displayName,
        photoURL: users.photoUrl,
        xp: users.xp,
        gamingLevel: users.gamingLevel,
        rank: users.rank,
        currentStreak: users.currentStreak,
      })
      .from(users)
      .where(and(eq(users.status, "active"), gte(users.currentStreak, 1)))
      .orderBy(desc(users.currentStreak))
      .limit(5);

    const [learnersAgg, xpAgg, notesAgg, activeAgg, rankAgg] = await Promise.all([
      db.select({ value: count() }).from(users).where(eq(users.status, "active")),
      db
        .select({ value: sum(users.xp) })
        .from(users)
        .where(eq(users.status, "active")),
      db.select({ value: count() }).from(studyMaterials),
      db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.status, "active"), eq(users.lastCheckInDate, today))),
      db
        .select({ value: count() })
        .from(users)
        .where(and(eq(users.status, "active"), gt(users.xp, myRow.xp))),
    ]);

    console.debug(`[Server] GET /api/community/overview — rank #${(rankAgg[0]?.value ?? 0) + 1} of ${learnersAgg[0]?.value ?? 0}`);
    return res.json({
      leaderboard,
      topStreaks,
      me: {
        rank: (rankAgg[0]?.value ?? 0) + 1,
        learnerCount: learnersAgg[0]?.value ?? 0,
      },
      totals: {
        learners: learnersAgg[0]?.value ?? 0,
        totalXp: xpAgg[0]?.value ?? 0,
        notesShared: notesAgg[0]?.value ?? 0,
        activeToday: activeAgg[0]?.value ?? 0,
      },
      refreshedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/community/overview failed");
  }
});

interface FeedChapterRaw {
  title?: string;
  subtopics?: { title?: string }[];
  isPrivate?: boolean;
}

app.get("/api/community/feed", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const limitRaw = Number(req.query.limit);
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 50) : 20;
    const includeMine = req.query.includeMine === "1" || req.query.includeMine === "true";
    const offsetRaw = Number(req.query.offset);
    const offset =
      Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;
    const whereConds: (SQL | undefined)[] = [];

    if (includeMine) {
      whereConds.push(
        or(
          eq(courses.creatorId, claims.sub),
          and(
            eq(courses.isPublic, true),
            isNotNull(courses.sharedAt),
            isNull(courses.deletedAt),
          ),
        ),
      );
    } else {
      whereConds.push(
        ne(courses.creatorId, claims.sub),
        eq(courses.isPublic, true),
        isNotNull(courses.sharedAt),
        isNull(courses.deletedAt),
      );
    }

    const rows = await db
      .select({
        id: courses.id,
        title: courses.title,
        description: courses.description,
        category: courses.category,
        difficulty: courses.difficulty,
        totalChapters: courses.totalChapters,
        rewardXp: courses.rewardXp,
        icon: courses.icon,
        creatorId: courses.creatorId,
        creatorName: courses.creatorName,
        creatorAvatar: courses.creatorAvatar,
        thumbnailUrl: courses.thumbnailUrl,
        chapters: courses.chapters,
        sharedAt: courses.sharedAt,
        views: courses.views,
      })
      .from(courses)
      .where(and(...whereConds))
      .orderBy(desc(courses.sharedAt))
      .offset(offset)
      .limit(limit);

    const courseIds = rows.map((r) => r.id);
    const [likeAggRows, myLikeRows] =
      courseIds.length > 0
        ? await Promise.all([
            db
              .select({
                courseId: courseFeedLikes.courseId,
                count: count(),
              })
              .from(courseFeedLikes)
              .where(inArray(courseFeedLikes.courseId, courseIds))
              .groupBy(courseFeedLikes.courseId),
            db
              .select({ courseId: courseFeedLikes.courseId })
              .from(courseFeedLikes)
              .where(and(inArray(courseFeedLikes.courseId, courseIds), eq(courseFeedLikes.userId, claims.sub))),
          ])
        : [[], []];

    const likeMap = new Map(likeAggRows.map((r) => [r.courseId, Number(r.count)]));
    const myLikeSet = new Set(myLikeRows.map((r) => r.courseId));

    const posts = rows.map((row) => {
      let chapterIndex: { title: string; order: number; isPrivate: boolean; subtopics: { title: string; order: number }[] }[] = [];
      try {
        const parsed = JSON.parse(row.chapters) as FeedChapterRaw[];
        if (Array.isArray(parsed)) {
          const isOwner = row.creatorId === claims.sub;
          chapterIndex = parsed
            .map((ch, ci) => ({ ch, ci }))
            .filter(({ ch }) => isOwner || !ch?.isPrivate)
            .map(({ ch, ci }) => ({
              title: ch?.title || "",
              order: ci,
              isPrivate: !!ch?.isPrivate,
              subtopics: Array.isArray(ch?.subtopics)
                ? ch.subtopics.map((sub, si) => ({
                    title: sub?.title || "",
                    order: si,
                  }))
                : [],
            }));
        }
      } catch {
        // ignore malformed chapters JSON
      }
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        difficulty: row.difficulty,
        totalChapters: row.totalChapters,
        rewardXp: row.rewardXp,
        icon: row.icon,
        creatorId: row.creatorId,
        creatorName: row.creatorName,
        creatorAvatar: row.creatorAvatar,
        thumbnailUrl: row.thumbnailUrl,
        sharedAt: row.sharedAt,
        isMine: row.creatorId === claims.sub,
        likeCount: likeMap.get(row.id) ?? 0,
        likedByMe: myLikeSet.has(row.id),
        viewCount: row.views ?? 0,
        chapterIndex,
      };
    });

    res.json({ posts, refreshedAt: new Date().toISOString(), hasMore: rows.length === limit });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/community/feed failed");
  }
});

app.post("/api/community/feed/:id/like", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const courseId = req.params.id as string;

    const course = await db
      .select({ id: courses.id })
      .from(courses)
      .where(
        and(
          eq(courses.id, courseId),
          eq(courses.isPublic, true),
          ne(courses.creatorId, claims.sub),
          isNotNull(courses.sharedAt),
          isNull(courses.deletedAt),
        ),
      )
      .limit(1);

    if (course.length === 0) {
      res.status(404).json({ error: "Course not found or not in the feed" });
      return;
    }

    const existing = await db
      .select({ id: courseFeedLikes.id })
      .from(courseFeedLikes)
      .where(
        and(eq(courseFeedLikes.courseId, courseId), eq(courseFeedLikes.userId, claims.sub)),
      )
      .limit(1);

    let liked: boolean;
    if (existing.length > 0) {
      await db
        .delete(courseFeedLikes)
        .where(eq(courseFeedLikes.id, existing[0].id));
      liked = false;
    } else {
      await db.insert(courseFeedLikes).values({
        id: `cl_${crypto.randomUUID()}`,
        courseId,
        userId: claims.sub,
      });
      liked = true;
    }

    const agg = await db
      .select({ count: count() })
      .from(courseFeedLikes)
      .where(eq(courseFeedLikes.courseId, courseId));

    res.json({ liked, likeCount: Number(agg[0]?.count ?? 0) });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/community/feed/:id/like failed");
  }
});

app.post("/api/community/feed/:id/view", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const courseId = req.params.id as string;

    const course = await db
      .select({ id: courses.id })
      .from(courses)
      .where(
        and(
          eq(courses.id, courseId),
          eq(courses.isPublic, true),
          isNotNull(courses.sharedAt),
          isNull(courses.deletedAt),
        ),
      )
      .limit(1);

    if (course.length === 0) {
      res.status(404).json({ error: "Course not found or not in the feed" });
      return;
    }

    await db
      .update(courses)
      .set({ views: drizzleSql`${courses.views} + 1` })
      .where(eq(courses.id, courseId));

    const updated = await db
      .select({ views: courses.views })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    res.json({ viewCount: Number(updated[0]?.views ?? 0) });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/community/feed/:id/view failed");
  }
});

// --- Community Social Routes ---

type CommunityPostAuthor = { uid: string; displayName: string; photoURL: string | null };
type CommunityCommentView = { id: string; body: string; createdAt: Date; author: CommunityPostAuthor };

app.get("/api/community/posts", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 50) : 20;

    const postRows = await db
      .select({
        id: communityPosts.id,
        body: communityPosts.body,
        challengeType: communityPosts.challengeType,
        createdAt: communityPosts.createdAt,
        userId: communityPosts.userId,
        authorName: users.displayName,
        authorPhoto: users.photoUrl,
      })
      .from(communityPosts)
      .innerJoin(users, eq(communityPosts.userId, users.id))
      .orderBy(desc(communityPosts.createdAt))
      .limit(limit);

    const postIds = postRows.map((p) => p.id);

    const [reactionRows, myReactionRows, commentRows] =
      postIds.length > 0
        ? await Promise.all([
            db
              .select({
                postId: communityPostReactions.postId,
                reaction: communityPostReactions.reaction,
                count: count(),
              })
              .from(communityPostReactions)
              .where(inArray(communityPostReactions.postId, postIds))
              .groupBy(communityPostReactions.postId, communityPostReactions.reaction),
            db
              .select({
                postId: communityPostReactions.postId,
                reaction: communityPostReactions.reaction,
              })
              .from(communityPostReactions)
              .where(
                and(
                  inArray(communityPostReactions.postId, postIds),
                  eq(communityPostReactions.userId, claims.sub),
                ),
              ),
            db
              .select({
                id: communityPostComments.id,
                postId: communityPostComments.postId,
                body: communityPostComments.body,
                createdAt: communityPostComments.createdAt,
                userId: communityPostComments.userId,
                authorName: users.displayName,
                authorPhoto: users.photoUrl,
              })
              .from(communityPostComments)
              .innerJoin(users, eq(communityPostComments.userId, users.id))
              .where(inArray(communityPostComments.postId, postIds))
              .orderBy(desc(communityPostComments.createdAt))
              .limit(200),
          ])
        : [[], [], []];

    const commentMap = new Map<string, CommunityCommentView[]>();
    for (const c of commentRows) {
      const list = commentMap.get(c.postId) ?? [];
      const view: CommunityCommentView = {
        id: c.id,
        body: c.body,
        createdAt: c.createdAt,
        author: { uid: c.userId, displayName: c.authorName, photoURL: c.authorPhoto },
      };
      list.push(view);
      commentMap.set(c.postId, list);
    }

    const reactionCountMap = new Map<string, Record<string, number>>();
    for (const r of reactionRows) {
      const map = reactionCountMap.get(r.postId) ?? {};
      map[r.reaction] = (map[r.reaction] ?? 0) + Number(r.count);
      reactionCountMap.set(r.postId, map);
    }

    const myReactionMap = new Map<string, string>();
    for (const m of myReactionRows) myReactionMap.set(m.postId, m.reaction);

    const posts = postRows.map((p) => {
      const comments = commentMap.get(p.id) ?? [];
      return {
        id: p.id,
        body: p.body,
        challengeType: p.challengeType,
        createdAt: p.createdAt,
        author: { uid: p.userId, displayName: p.authorName, photoURL: p.authorPhoto },
        reactionCounts: reactionCountMap.get(p.id) ?? {},
        myReaction: myReactionMap.get(p.id) ?? null,
        commentCount: comments.length,
        comments: comments.slice(0, 3),
      };
    });

    res.json({ posts });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/community/posts failed");
  }
});

app.post("/api/community/posts", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const body = req.body ?? {};
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) {
      res.status(400).json({ error: "Missing post body" });
      return;
    }

    const now = new Date();
    const id = `post_${claims.sub}_${now.getTime()}`;
    const sanitized = text.slice(0, 1000);
    const challengeType = typeof body.challengeType === "string" && body.challengeType ? body.challengeType : null;

    await db.insert(communityPosts).values({
      id,
      userId: claims.sub,
      body: sanitized,
      challengeType,
      createdAt: now,
    });

    const [author] = await db
      .select({ displayName: users.displayName, photoURL: users.photoUrl })
      .from(users)
      .where(eq(users.id, claims.sub))
      .limit(1);

    res.status(201).json({
      post: {
        id,
        body: sanitized,
        challengeType,
        createdAt: now,
        author: {
          uid: claims.sub,
          displayName: author?.displayName ?? "Scholar",
          photoURL: author?.photoURL ?? null,
        },
        reactionCounts: {},
        myReaction: null,
        commentCount: 0,
        comments: [],
      },
    });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/community/posts failed");
  }
});

app.post("/api/community/posts/:id/reactions", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const postId = req.params.id;
    const body = req.body ?? {};
    const reaction =
      typeof body.reaction === "string" && body.reaction.trim()
        ? body.reaction.trim().slice(0, 30)
        : "like";

    const [post] = await db
      .select({ id: communityPosts.id })
      .from(communityPosts)
      .where(eq(communityPosts.id, postId))
      .limit(1);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    const [existing] = await db
      .select({ id: communityPostReactions.id })
      .from(communityPostReactions)
      .where(
        and(
          eq(communityPostReactions.postId, postId),
          eq(communityPostReactions.userId, claims.sub),
        ),
      )
      .limit(1);

    if (existing) {
      await db.delete(communityPostReactions).where(eq(communityPostReactions.id, existing.id));
      res.json({ active: false });
      return;
    }

    const id = `react_${postId}_${claims.sub}`;
    await db.insert(communityPostReactions).values({
      id,
      postId,
      userId: claims.sub,
      reaction,
      createdAt: new Date(),
    });
    res.status(201).json({ active: true, reaction });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/community/posts/:id/reactions failed");
  }
});

app.post("/api/community/posts/:id/comments", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const postId = req.params.id;
    const body = req.body ?? {};
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) {
      res.status(400).json({ error: "Missing comment body" });
      return;
    }

    const [post] = await db
      .select({ id: communityPosts.id })
      .from(communityPosts)
      .where(eq(communityPosts.id, postId))
      .limit(1);
    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    const now = new Date();
    const id = `comment_${postId}_${now.getTime()}`;
    const sanitized = text.slice(0, 500);

    await db.insert(communityPostComments).values({
      id,
      postId,
      userId: claims.sub,
      body: sanitized,
      createdAt: now,
    });

    const [author] = await db
      .select({ displayName: users.displayName, photoURL: users.photoUrl })
      .from(users)
      .where(eq(users.id, claims.sub))
      .limit(1);

    res.status(201).json({
      comment: {
        id,
        body: sanitized,
        createdAt: now,
        author: {
          uid: claims.sub,
          displayName: author?.displayName ?? "Scholar",
          photoURL: author?.photoURL ?? null,
        },
      },
    });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/community/posts/:id/comments failed");
  }
});

// --- Level Routes ---

app.get("/api/levels", async (req, res) => {
  try {
    await verifyClerkToken(req.headers.authorization);
    const rows = await db.select().from(levels).orderBy(levels.levelNumber);
    console.debug(`[Server] GET /api/levels — ${rows.length} levels returned`);
    res.json(rows);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/levels failed");
  }
});

// --- Trophy (Catalog) Routes ---

app.get("/api/trophies", async (req, res) => {
  try {
    await verifyClerkToken(req.headers.authorization);
    const rows = await db.select().from(trophies).orderBy(trophies.createdAt);
    res.json(rows);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/trophies failed");
  }
});

// --- Bounty Routes ---

interface BountyRequest {
  courses: {
    id: string;
    title: string;
    category: string;
    difficulty: string;
    progress: number;
    totalChapters: number;
    completedModules: number;
  }[];
  userId: string;
  dateSeed: string;
}

function buildBountyPrompt(courses: BountyRequest["courses"], dateSeed: string): string {
  const courseBlock = courses.length > 0
    ? `The user is enrolled in these courses:\n${courses.map((c) =>
      `- "${c.title}" (category: ${c.category}, difficulty: ${c.difficulty}, progress: ${c.progress}%, ${c.completedModules}/${c.totalChapters} chapters)`
    ).join("\n")}\n\nGenerate bounties related to these courses. Each bounty should reference a specific course.`
    : "The user has no enrolled courses yet. Generate general onboarding bounties to help them get started with the app.";

  return `You are a gamified learning companion for the app "Yuinx".
Generate exactly 3 daily bounties (challenges/tasks) as a JSON array.

Today's seed: ${dateSeed} (use this to ensure different bounties each day)

${courseBlock}

Rules:
- Each bounty's rewardXP must be 1-9 (random integer, strictly less than 10)
- Each bounty's rewardCoins must be 1-5 (random integer)
- Difficulty: mix of "easy", "medium", "hard" across the 3 bounties
- Be creative — different bounties every day
- Make titles engaging and game-like

Return ONLY a valid JSON array of exactly 3 objects with fields:
- title (string): short, engaging name
- description (string): 1-2 sentences explaining the task
- difficulty: "easy" | "medium" | "hard"
- rewardXP: number 1-9
- rewardCoins: number 1-5
- completionCondition: string describing what the user must do to complete
- courseId: string | null (the course id this bounty relates to, or null for general)
- courseTitle: string | null`;
}

async function callGemini(courses: BountyRequest["courses"], dateSeed: string, modelRef: string, apiKey?: string): Promise<GeminiBounty[] | null> {
  const prompt = buildBountyPrompt(courses, dateSeed);
  return generateDailyBounties(modelRef, prompt, apiKey);
}

app.post("/api/bounties/generate", async (req, res) => {
  try {
    await verifyClerkToken(req.headers.authorization);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/bounties/generate failed");
    return;
  }

  const { courses, userId, dateSeed } = req.body as BountyRequest;

  if (!Array.isArray(courses) || !userId || !dateSeed) {
    res.status(400).json({ error: "Missing required fields: courses, userId, dateSeed" });
    return;
  }

  const now = Date.now();
  const sixHours = 6 * 60 * 60 * 1000;

  const ai = aiRequestOptions(req);
  let geminiBounties = await callGemini(courses, dateSeed, ai.modelRef, ai.apiKey);

  if (geminiBounties) {
    const bounties = geminiBounties.map((b, i) => ({
      id: `bounty_gemini_${dateSeed}_${i}`,
      ...b,
      status: "active" as const,
      progress: 0,
      generatedAt: now,
      expiresAt: now + sixHours,
    }));

    res.json({ bounties, source: "ai" });
    return;
  }

  const fallback = generateFallbackBounties(courses, dateSeed);
  res.json({ bounties: fallback, source: "fallback" });
});

app.post("/api/bounties/claim", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const body = req.body ?? {};

    const userId = body.userId;
    const bounty = body.bounty ?? {};

    if (!userId || claims.sub !== userId || !bounty?.id) {
      res.status(400).json({ error: "Missing userId or bounty id" });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const inserted = await db
      .insert(bountyClaims)
      .values({
        id: `bc_${userId}_${bounty.id}`,
        userId,
        bountyId: bounty.id,
        title: typeof bounty.title === "string" ? bounty.title.slice(0, 200) : "",
        rewardXp: typeof bounty.rewardXP === "number" ? Math.max(0, Math.floor(bounty.rewardXP)) : 0,
        rewardCoins: typeof bounty.rewardCoins === "number" ? Math.max(0, Math.floor(bounty.rewardCoins)) : 0,
        claimedAt: new Date(),
        date: today,
      })
      .onConflictDoNothing()
      .returning({ id: bountyClaims.id });

    if (inserted.length === 0) {
      res.json({ claimed: false, alreadyClaimed: true });
      return;
    }

    console.debug(`[Server] POST /api/bounties/claim — ${userId} claimed ${bounty.id}`);
    res.status(201).json({ claimed: true, alreadyClaimed: false, date: today });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/bounties/claim failed");
  }
});

// --- Course Routes ---

app.get("/api/courses", async (req, res) => {
  try {
    await verifyClerkToken(req.headers.authorization);
    const { userId } = req.query;

    let rows;
    if (userId && typeof userId === "string") {
      rows = await db
        .select()
        .from(courses)
        .where(
          and(
            isNull(courses.deletedAt),
            or(
              eq(courses.creatorId, userId),
              inArray(
                courses.id,
                db
                  .select({ courseId: courseEnrollments.courseId })
                  .from(courseEnrollments)
                  .where(eq(courseEnrollments.userId, userId)),
              ),
            ),
          ),
        )
        .orderBy(desc(courses.pinned), courses.createdAt);
    } else {
      rows = await db
        .select()
        .from(courses)
        .where(isNull(courses.deletedAt))
        .orderBy(desc(courses.pinned), courses.createdAt);
    }
    res.json(rows);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/courses failed");
  }
});

app.get("/api/courses/:id", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const [row] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, req.params.id), isNull(courses.deletedAt)))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    const isOwner = row.creatorId === claims.sub;
    const isPublic = !!row.isPublic;

    if (!isOwner && !isPublic) {
      const [enrollment] = await db
        .select({ id: courseEnrollments.id })
        .from(courseEnrollments)
        .where(
          and(
            eq(courseEnrollments.courseId, row.id),
            eq(courseEnrollments.userId, claims.sub),
          ),
        )
        .limit(1);

      if (!enrollment) {
        res.status(403).json({ error: "This course is private" });
        return;
      }
    }

    res.json(row);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/courses/:id failed");
  }
});

// --- Course Generation Route ---

app.post("/api/courses/generate", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const body = req.body;
    const userId = claims.sub;

    if (!body.title || !body.description || !body.category || !body.difficulty) {
      res.status(400).json({ error: "Missing required fields: title, description, category, difficulty" });
      return;
    }

    const recentCutoff = new Date(Date.now() - 2 * 60 * 1000);
    const [recent] = await db
      .select()
      .from(courses)
      .where(
        and(
          eq(courses.creatorId, userId),
          eq(courses.description, body.description),
          gte(courses.createdAt, recentCutoff),
          isNull(courses.deletedAt),
        ),
      )
      .orderBy(desc(courses.createdAt))
      .limit(1);

    const existing = recent ?? null;
    if (existing) {
      let chapters: unknown[] = [];
      try {
        chapters = typeof existing.chapters === "string"
          ? JSON.parse(existing.chapters)
          : (existing.chapters as unknown[]) ?? [];
      } catch {
        chapters = [];
      }
      console.debug(`[Server] POST /api/courses/generate — reused existing ${existing.id}`);
      res.status(200).json({
        courseTitle: existing.title,
        courseDescription: existing.description,
        reused: true,
        course: {
          id: existing.id,
          title: existing.title,
          description: existing.description,
          category: existing.category,
          difficulty: existing.difficulty,
          totalChapters: existing.totalChapters,
          rewardXp: existing.rewardXp,
          icon: existing.icon,
          creatorId: existing.creatorId,
          creatorName: existing.creatorName,
          creatorAvatar: existing.creatorAvatar,
          chapters,
          thumbnailPrompt: existing.thumbnailPrompt,
          thumbnailUrl: undefined,
          isPublic: !!existing.isPublic,
          sharedAt: existing.sharedAt
            ? (existing.sharedAt?.toISOString?.() ?? String(existing.sharedAt))
            : undefined,
          createdAt: existing.createdAt
            ? (existing.createdAt?.toISOString?.() ?? String(existing.createdAt))
            : undefined,
        },
        chapters,
        thumbnailPrompt: existing.thumbnailPrompt,
      });
      return;
    }

    const prompt = buildCourseGenerationPrompt({
      prompt: body.prompt || body.title,
      title: body.title,
      description: body.description,
      category: body.category,
      difficulty: body.difficulty,
      weeks: body.weeks || 3,
      learningGoals: body.learningGoals || [],
      learnerContext: body.personalizationContext || undefined,
    });

    const ai = aiRequestOptions(req);
    const { courseTitle, courseDescription, chapters, thumbnailPrompt } = await generateCourseContent(ai.modelRef, prompt, ai.apiKey);

    const courseId = `course_gen_${userId}_${Date.now()}`;
    const now = new Date();
    const totalChapters = chapters.length;

    const courseValues = {
      id: courseId,
      title: courseTitle || body.title,
      description: courseDescription || body.description,
      category: body.category,
      difficulty: body.difficulty,
      totalChapters,
      rewardXp: totalChapters * 50,
      icon: getCategoryIcon(body.category),
      creatorId: userId,
      creatorName: body.creatorName || null,
      creatorAvatar: body.creatorAvatar || null,
      chapters: JSON.stringify(chapters),
      thumbnailUrl: null,
      thumbnailPrompt,
      isPublic: true,
      sharedAt: now,
      createdAt: now,
    };

    await db.insert(courses).values(courseValues);

    // Auto-enroll the creator
    const enrollmentId = `enr_${userId}_${courseId}_${Date.now()}`;
    await db.insert(courseEnrollments).values({
      id: enrollmentId,
      userId,
      courseId,
      currentChapter: 0,
      progress: 0,
      isCompleted: false,
      lastAccessedAt: now,
      createdAt: now,
    });

    console.debug(`[Server] POST /api/courses/generate — created ${courseId}`);

    res.status(201).json({
      courseTitle,
      courseDescription,
      course: {
        id: courseId,
        title: courseTitle || body.title,
        description: courseDescription || body.description,
        category: body.category,
        difficulty: body.difficulty,
        totalChapters,
        rewardXp: totalChapters * 50,
        icon: getCategoryIcon(body.category),
        creatorId: userId,
        creatorName: body.creatorName || null,
        creatorAvatar: body.creatorAvatar || null,
        chapters,
        thumbnailPrompt,
        thumbnailUrl: undefined,
        isPublic: true,
        sharedAt: now.toISOString(),
        createdAt: now.toISOString(),
      },
      chapters,
      thumbnailPrompt,
    });
  } catch (err) {
    sendRouteError(res, err, "[Server] POST /api/courses/generate failed");
  }
});

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    programming: "code",
    marketing: "trending-up",
    "data-science": "bar-chart",
    design: "palette",
    business: "briefcase",
    "personal-dev": "star",
  };
  return icons[category] || "book";
}

// --- Thumbnail Generation Route ---

app.post("/api/courses/:id/thumbnail", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const { prompt } = req.body;

    if (!prompt) {
      res.status(400).json({ error: "Missing prompt" });
      return;
    }

    try {
      const fullPrompt = buildThumbnailGenerationPrompt(prompt);
      const image = await generateThumbnailImage(genAI, fullPrompt);

      let thumbnailUrl = "";

      if (image) {
        try {
          const cloudinaryResult = await uploadToCloudinary(image.base64);
          thumbnailUrl = cloudinaryResult;
        } catch {
          thumbnailUrl = `data:${image.mimeType};base64,${image.base64}`;
        }
      }

      if (thumbnailUrl) {
        await db
          .update(courses)
          .set({ thumbnailUrl, updatedAt: new Date() })
          .where(eq(courses.id, req.params.id));
      }

      res.json({ thumbnailUrl });
    } catch (err) {
      console.error("[Server] Nano Banana generation failed:", err);
      res.json({ thumbnailUrl: "" });
    }
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/courses/:id/thumbnail failed");
  }
});

// --- Course Flags Route ---

app.patch("/api/courses/:id", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const { pinned, favorite, isPublic, chapterPrivate } = req.body;

    if (pinned === undefined && favorite === undefined && isPublic === undefined && chapterPrivate === undefined) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [existing] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, req.params.id), isNull(courses.deletedAt)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    if (existing.creatorId !== claims.sub) {
      res.status(403).json({ error: "Not your course" });
      return;
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (pinned !== undefined) updateData.pinned = !!pinned;
    if (favorite !== undefined) updateData.favorite = !!favorite;
    if (isPublic !== undefined) {
      updateData.isPublic = !!isPublic;
      updateData.sharedAt = isPublic ? new Date() : null;
    }
    if (chapterPrivate !== undefined) {
      const { order, isPrivate } = chapterPrivate as { order: number; isPrivate: boolean };
      let parsedChapters: Record<string, unknown>[] = [];
      try {
        const parsed = JSON.parse(existing.chapters ?? "[]");
        parsedChapters = Array.isArray(parsed) ? parsed : [];
      } catch {
        parsedChapters = [];
      }
      if (order < 0 || order >= parsedChapters.length) {
        res.status(400).json({ error: "Invalid chapter order" });
        return;
      }
      parsedChapters[order] = {
        ...(parsedChapters[order] ?? {}),
        isPrivate: !!isPrivate,
      };
      updateData.chapters = JSON.stringify(parsedChapters);
    }

    const [updated] = await db
      .update(courses)
      .set(updateData)
      .where(eq(courses.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] PATCH /api/courses/:id failed");
  }
});

// --- Course Soft-Delete Route ---

app.delete("/api/courses/:id", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);

    const [existing] = await db
      .select()
      .from(courses)
      .where(and(eq(courses.id, req.params.id), isNull(courses.deletedAt)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    if (existing.creatorId !== claims.sub) {
      res.status(403).json({ error: "Not your course" });
      return;
    }

    await db
      .update(courses)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(courses.id, req.params.id));

    res.json({ id: req.params.id });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] DELETE /api/courses/:id failed");
  }
});

async function uploadToCloudinary(
  base64: string,
  mimeType = "image/png",
): Promise<string> {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary not configured");
  }

  const formData = new URLSearchParams();
  formData.append("file", `data:${mimeType};base64,${base64}`);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData.toString() },
  );

  const data = await res.json();
  return data.secure_url;
}

app.post("/api/uploads/cloudinary", async (req, res) => {
  try {
    await verifyClerkToken(req.headers.authorization);
    const { base64, mimeType } = req.body ?? {};

    if (!base64 || typeof base64 !== "string") {
      res.status(400).json({ error: "Missing required field: base64" });
      return;
    }

    const secure_url = await uploadToCloudinary(
      base64,
      typeof mimeType === "string" && mimeType ? mimeType : undefined,
    );
    res.json({ secure_url });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/uploads/cloudinary failed");
  }
});

// --- Subtopic Quiz Generation Route ---

app.post("/api/subtopics/quiz", async (req, res) => {
  try {
    await verifyClerkToken(req.headers.authorization);
    const body = req.body;

    if (!body.courseTitle || !body.subtopicTitle) {
      res.status(400).json({ error: "Missing courseTitle or subtopicTitle" });
      return;
    }

    const prompt = buildQuizGenerationPrompt({
      courseId: body.courseId || "",
      courseTitle: body.courseTitle,
      chapterIndex: body.chapterIndex ?? 0,
      subtopicIndex: body.subtopicIndex ?? 0,
      subtopicTitle: body.subtopicTitle,
    });

    const ai = aiRequestOptions(req);
    const questions = await generateQuizQuestions(ai.modelRef, prompt, ai.apiKey);

    res.json({
      quiz: {
        chapterIndex: body.chapterIndex ?? 0,
        subtopicIndex: body.subtopicIndex ?? 0,
        questions,
      },
    });
  } catch (err) {
    sendRouteError(res, err, "[Server] POST /api/subtopics/quiz failed");
  }
});

// --- Enrollment Routes ---

app.get("/api/enrollments", async (req, res) => {
  try {
    await verifyClerkToken(req.headers.authorization);
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "Missing userId query param" });
      return;
    }

    const rows = await db
      .select()
      .from(courseEnrollments)
      .where(eq(courseEnrollments.userId, userId));

    res.json(rows);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/enrollments failed");
  }
});

app.post("/api/enrollments", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const body = req.body;

    if (!body.userId || !body.courseId) {
      res.status(400).json({ error: "Missing userId or courseId" });
      return;
    }

    const [existingEnrollment] = await db
      .select()
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.userId, body.userId),
          eq(courseEnrollments.courseId, body.courseId),
        ),
      )
      .limit(1);

    if (existingEnrollment) {
      res.status(200).json(existingEnrollment);
      return;
    }

    const id = `enr_${body.userId}_${body.courseId}_${Date.now()}`;
    const now = new Date();

    const values = {
      id,
      userId: body.userId,
      courseId: body.courseId,
      currentChapter: 0,
      progress: 0,
      isCompleted: false,
      lastAccessedAt: now,
      createdAt: now,
    };

    await db.insert(courseEnrollments).values(values);
    console.debug(`[Server] POST /api/enrollments — created ${id}`);

    res.status(201).json(values);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    if (err?.code === "23505") {
      const [existing] = await db
        .select()
        .from(courseEnrollments)
        .where(
          and(
            eq(courseEnrollments.userId, req.body?.userId),
            eq(courseEnrollments.courseId, req.body?.courseId),
          ),
        )
        .limit(1);
      if (existing) {
        res.status(200).json(existing);
        return;
      }
    }
    sendRouteError(res, err, "[Server] POST /api/enrollments failed");
  }
});

app.put("/api/enrollments/:id", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const body = req.body;

    const [existing] = await db
      .select({ userId: courseEnrollments.userId })
      .from(courseEnrollments)
      .where(eq(courseEnrollments.id, req.params.id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Enrollment not found" });
      return;
    }

    if (existing.userId !== claims.sub) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const updateData: Record<string, unknown> = {};

    if (body.currentChapter !== undefined) updateData.currentChapter = body.currentChapter;
    if (body.progress !== undefined) updateData.progress = body.progress;
    if (body.isCompleted !== undefined) updateData.isCompleted = body.isCompleted;
    if (body.progressDetails !== undefined) updateData.progressDetails = body.progressDetails;
    updateData.lastAccessedAt = new Date();
    updateData.updatedAt = new Date();

    await db
      .update(courseEnrollments)
      .set(updateData)
      .where(eq(courseEnrollments.id, req.params.id));

    console.debug(`[Server] PUT /api/enrollments/${req.params.id} — updated`);
    res.status(204).end();
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] PUT /api/enrollments/:id failed");
  }
});

app.delete("/api/enrollments/:id", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);

    const [existing] = await db
      .select({ userId: courseEnrollments.userId })
      .from(courseEnrollments)
      .where(eq(courseEnrollments.id, req.params.id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Enrollment not found" });
      return;
    }

    if (existing.userId !== claims.sub) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db
      .delete(courseEnrollments)
      .where(eq(courseEnrollments.id, req.params.id));

    console.debug(`[Server] DELETE /api/enrollments/${req.params.id} — deleted`);
    res.status(204).end();
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] DELETE /api/enrollments/:id failed");
  }
});

// --- User Trophy Routes ---

app.get("/api/user-trophies", async (req, res) => {
  try {
    await verifyClerkToken(req.headers.authorization);
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "Missing userId query param" });
      return;
    }

    const rows = await db
      .select()
      .from(userTrophies)
      .where(eq(userTrophies.userId, userId));

    res.json(rows);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/user-trophies failed");
  }
});

app.post("/api/user-trophies", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const body = req.body;

    if (!body.userId || !body.trophyId) {
      res.status(400).json({ error: "Missing userId or trophyId" });
      return;
    }

    // Check if already earned
    const [existing] = await db
      .select()
      .from(userTrophies)
      .where(
        and(
          eq(userTrophies.userId, body.userId),
          eq(userTrophies.trophyId, body.trophyId),
        ),
      )
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Trophy already earned" });
      return;
    }

    const id = `ut_${body.userId}_${body.trophyId}`;
    const values = {
      id,
      userId: body.userId,
      trophyId: body.trophyId,
      earnedAt: new Date(),
    };

    await db.insert(userTrophies).values(values);

    // Also update the legacy earnedTrophies field on users
    const [userRow] = await db
      .select({ earnedTrophies: users.earnedTrophies })
      .from(users)
      .where(eq(users.id, body.userId))
      .limit(1);

    if (userRow) {
      let list: string[] = [];
      try { list = JSON.parse(userRow.earnedTrophies); } catch { /* ignore */ }
      if (!list.includes(body.trophyId)) {
        list.push(body.trophyId);
        await db
          .update(users)
          .set({ earnedTrophies: JSON.stringify(list) })
          .where(eq(users.id, body.userId));
      }
    }

    console.debug(`[Server] POST /api/user-trophies — awarded ${body.trophyId} to ${body.userId}`);
    res.status(201).json(values);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/user-trophies failed");
  }
});

app.post("/api/user-trophies/check", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const body = req.body;
    const userId = body.userId;

    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }

    // Get user stats
    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userRow) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let earnedTrophyIds: string[] = [];
    try { earnedTrophyIds = JSON.parse(userRow.earnedTrophies); } catch { /* ignore */ }

    // Get all trophies from catalog
    const allTrophies = await db.select().from(trophies);

    // Get enrollments for completed courses count
    const enrollments = await db
      .select()
      .from(courseEnrollments)
      .where(eq(courseEnrollments.userId, userId));
    const completedCourses = enrollments.filter((e) => e.isCompleted).length;

    // Count total modules completed across enrollments
    const totalCompletedModules = enrollments.reduce((sum, e) => sum + e.currentChapter, 0);

    // Count bounty claims from the ledger
    const [bountyAgg] = await db
      .select({ value: count() })
      .from(bountyClaims)
      .where(eq(bountyClaims.userId, userId));
    const bountyClaimsCount = bountyAgg?.value ?? 0;

    const now = new Date();
    const awarded: { id: string; userId: string; trophyId: string; earnedAt: Date }[] = [];

    for (const trophy of allTrophies) {
      if (earnedTrophyIds.includes(trophy.id)) continue;

      let satisfied = false;
      const val = trophy.conditionValue;

      switch (trophy.conditionType) {
        case "courses_completed":
          satisfied = completedCourses >= val;
          break;
        case "xp_total":
          satisfied = userRow.xp >= val;
          break;
        case "streak_days":
          satisfied = userRow.currentStreak >= val;
          break;
        case "bounties_claimed":
          satisfied = bountyClaimsCount >= val;
          break;
        case "modules_completed":
          satisfied = totalCompletedModules >= val;
          break;
        case "gaming_level":
          satisfied = userRow.gamingLevel >= val;
          break;
      }

      if (satisfied) {
        const utId = `ut_${userId}_${trophy.id}`;
        await db.insert(userTrophies).values({
          id: utId,
          userId,
          trophyId: trophy.id,
          earnedAt: now,
        });

        awarded.push({ id: utId, userId, trophyId: trophy.id, earnedAt: now });
        earnedTrophyIds.push(trophy.id);
      }
    }

    // Update legacy field if any new trophies
    if (awarded.length > 0) {
      await db
        .update(users)
        .set({ earnedTrophies: JSON.stringify(earnedTrophyIds) })
        .where(eq(users.id, userId));
    }

    res.json({ awarded });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/user-trophies/check failed");
  }
});

// --- Study Material Routes ---

// --- AI / RAG helpers ---

const MAX_FILE_BYTES = 25 * 1024 * 1024;

function mimeFromExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".pdf": return "application/pdf";
    case ".png": return "image/png";
    case ".jpg": case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".txt": case ".md": return "text/plain";
    case ".doc": return "application/msword";
    case ".docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".m4a": case ".mp4": return "audio/mp4";
    case ".mp3": return "audio/mpeg";
    case ".wav": return "audio/wav";
    case ".json": return "application/json";
    default: return "application/octet-stream";
  }
}

async function fetchFileBytes(fileUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  let url = fileUrl;
  if (url.startsWith("/")) {
    const port = process.env.PORT || "3001";
    url = `http://localhost:${port}${url}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch file: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_FILE_BYTES) throw new Error("File too large (max 25 MB)");
  const contentType = res.headers.get("content-type");
  const mimeType = contentType ? contentType.split(";")[0] : mimeFromExtension(url);
  return { buffer, mimeType };
}

function chunkText(text: string, maxLength = 1500, overlap = 150): string[] {
  const clean = text.replace(/\r/g, "").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  const paragraphs = clean.split(/\n\n+/);
  let current = "";
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (trimmed.length > maxLength) {
      if (current.trim()) chunks.push(current.trim());
      current = "";
      let rest = trimmed;
      while (rest.length > maxLength) {
        chunks.push(rest.slice(0, maxLength));
        rest = rest.slice(maxLength - overlap);
      }
      current = rest;
      continue;
    }
    const candidate = current.trim() ? `${current}\n\n${trimmed}` : trimmed;
    if (candidate.length <= maxLength) {
      current = candidate;
    } else {
      chunks.push(current.trim());
      current = trimmed;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function upsertKnowledgeChunks(
  userId: string,
  sourceType: string,
  sourceId: string,
  title: string,
  content: string,
): Promise<void> {
  const chunks = chunkText(content);
  if (chunks.length === 0) return;

  await sql`DELETE FROM knowledge_chunks WHERE user_id = ${userId} AND source_type = ${sourceType} AND source_id = ${sourceId}`;

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(genAI, chunks[i]).catch(() => null);
    if (!embedding) continue;
    const id = `kc_${crypto.randomUUID()}`;
    await sql`
      INSERT INTO knowledge_chunks (id, user_id, source_type, source_id, title, content, chunk_index, embedding)
      VALUES (${id}, ${userId}, ${sourceType}, ${sourceId}, ${title}, ${chunks[i]}, ${i}, ${JSON.stringify(embedding)}::vector)
    `;
  }
}

async function searchKnowledgeChunks(
  userId: string,
  queryEmbedding: number[],
  sourceTypes: string[],
  sourceIds?: string[],
  limit = 6,
): Promise<{ id: string; title: string; content: string; sourceType: string; sourceId: string }[]> {
  const typeFilter =
    sourceTypes.length > 0 ? sql`AND source_type IN (${sourceTypes})` : sql``;
  const idFilter =
    sourceIds && sourceIds.length > 0 ? sql`AND source_id IN (${sourceIds})` : sql``;
  const vec = JSON.stringify(queryEmbedding);

  const rows = await sql`
    SELECT id, title, content, source_type, source_id
    FROM knowledge_chunks
    WHERE user_id = ${userId}
      AND embedding IS NOT NULL
      ${typeFilter}
      ${idFilter}
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${limit}
  `;

  return rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    sourceType: r.source_type,
    sourceId: r.source_id,
  }));
}

app.post("/api/study/process", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const userId = claims.sub;
    const { fileUrl, fileType, sourceType, title: inputTitle, content: inlineContent } = req.body;

    if (!fileType) {
      res.status(400).json({ error: "Missing required field: fileType" });
      return;
    }
    if (!fileUrl && !(inlineContent && String(inlineContent).trim())) {
      res.status(400).json({ error: "Missing required fields: fileUrl or content" });
      return;
    }

    const isAudio = fileType === "audio";
    let extractedText: string;

    if (inlineContent && String(inlineContent).trim()) {
      extractedText = String(inlineContent);
    } else {
      const { buffer, mimeType } = await fetchFileBytes(fileUrl);
      const extractPrompt = isAudio
        ? "You are Yuinx's audio transcription engine. Transcribe the audio verbatim, preserving natural paragraph breaks and speaker turns where obvious. Return ONLY the transcript text."
        : "You are Yuinx's document OCR and extraction engine. Extract ALL visible text from the provided file verbatim, preserving headings, lists, and structure. Correct obvious OCR errors without changing meaning. Return ONLY the extracted text.";
      extractedText = await generateTextWithFile(genAI, extractPrompt, {
        base64: buffer.toString("base64"),
        mimeType,
      });
    }

    const prompt = buildStudyExtractionPrompt({ fileType: isAudio ? "txt" : fileType });
    const ai = aiRequestOptions(req);
    const result = await generateJsonContent<{
      contentType: "timetable" | "study_content";
      title: string;
      summary: string;
      bites: {
        id: string;
        title: string;
        content: string;
        order: number;
        quizzes: {
          id: string;
          question: string;
          options: string[];
          correctAnswer: number;
        }[];
      }[];
      timetable: { slots: { id: string; day: string; startTime: string; endTime: string; subject: string; location: string }[] } | null;
    }>(ai.modelRef, `${prompt}\n\nExtracted content:\n${extractedText.slice(0, 40000)}`, ai.apiKey);

    const materialId = `study_${userId}_${Date.now()}`;
    const now = new Date();

    const values = {
      id: materialId,
      userId,
      title: inputTitle || result.title || "Study Material",
      type: result.contentType === "timetable" ? "timetable" : fileType,
      sourceType: sourceType || "file",
      extractedContent: extractedText,
      summary: result.summary || "",
      bites: JSON.stringify(result.bites || []),
      timetable: result.timetable ? JSON.stringify(result.timetable) : null,
      tags: JSON.stringify([]),
      createdAt: now,
    };

    await db.insert(studyMaterials).values(values);

    if (extractedText.trim().length > 20) {
      upsertKnowledgeChunks(userId, "material", materialId, values.title, extractedText).catch((err) =>
        console.error("[Server] knowledge chunk backfill failed:", err),
      );
    }

    res.status(201).json({
      ...values,
      createdAt: now.toISOString(),
    });
  } catch (err) {
    sendRouteError(res, err, "[Server] POST /api/study/process failed");
  }
});

app.get("/api/study/materials", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({ error: "Missing userId query param" });
      return;
    }

    const rows = await db
      .select()
      .from(studyMaterials)
      .where(eq(studyMaterials.userId, userId))
      .orderBy(studyMaterials.createdAt);

    res.json(rows);
  } catch (err: any) {
    sendRouteError(res, err, "[Server] GET /api/study/materials failed");
  }
});

app.put("/api/study/materials/:id", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const body = req.body;

    const [existing] = await db
      .select({ userId: studyMaterials.userId })
      .from(studyMaterials)
      .where(eq(studyMaterials.id, req.params.id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Study material not found" });
      return;
    }

    if (existing.userId !== claims.sub) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.extractedContent !== undefined) updateData.extractedContent = body.extractedContent;
    if (body.summary !== undefined) updateData.summary = body.summary;
    if (body.bites !== undefined) updateData.bites = JSON.stringify(body.bites);
    if (body.timetable !== undefined) updateData.timetable = JSON.stringify(body.timetable);
    if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags);
    updateData.updatedAt = new Date();

    await db
      .update(studyMaterials)
      .set(updateData)
      .where(eq(studyMaterials.id, req.params.id));

    res.status(204).end();
  } catch (err: any) {
    sendRouteError(res, err, "[Server] PUT /api/study/materials/:id failed");
  }
});

app.delete("/api/study/materials/:id", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);

    const [existing] = await db
      .select({ userId: studyMaterials.userId })
      .from(studyMaterials)
      .where(eq(studyMaterials.id, req.params.id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Study material not found" });
      return;
    }

    if (existing.userId !== claims.sub) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db
      .delete(studyMaterials)
      .where(eq(studyMaterials.id, req.params.id));

    res.status(204).end();
  } catch (err: any) {
    sendRouteError(res, err, "[Server] DELETE /api/study/materials/:id failed");
  }
});

// --- File upload for study materials ---

const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOADS_DIR));

app.post("/api/study/upload", async (req, res) => {
  try {
    await verifyClerkToken(req.headers.authorization);
    const { base64, filename, mimeType } = req.body;

    if (!base64 || !filename) {
      res.status(400).json({ error: "Missing required fields: base64, filename" });
      return;
    }

    const ext = path.extname(filename) || ".bin";
    const safeName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeName);
    const buffer = Buffer.from(base64, "base64");
    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/${safeName}`;
    console.debug(`[Server] POST /api/study/upload — saved ${safeName}`);
    res.json({ url });
  } catch (err: any) {
    console.error("[Server] POST /api/study/upload failed:", err);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// --- RAG query for study materials + notes ---

const buildRagPrompt = (context: string, question: string) =>
  `You are a study assistant for Yuinx, a gamified learning app. Answer the user's question using ONLY the provided context.

Context:
${context}

Question: ${question}

Rules:
- Ground the answer in the context. If the answer cannot be found in the context, say so clearly.
- When you use a specific part of the context, cite it. The citation quote must be copied verbatim from the context and must include its source label.

Return ONLY valid JSON with this exact structure:
{
  "answer": "Clear, concise answer (Markdown allowed)",
  "citations": [{ "quote": "verbatim quote from context", "source": "source label" }]
}

Do NOT include any markdown code fences. Return raw JSON only.`;

app.post("/api/study/rag-query", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const userId = claims.sub;
    const { question, materialIds, noteTexts } = req.body;

    if (!question || !String(question).trim()) {
      res.status(400).json({ error: "Missing required field: question" });
      return;
    }

    const queryEmbedding = await generateEmbedding(genAI, String(question));

    const materialIdList: string[] = Array.isArray(materialIds)
      ? materialIds.map((m: any) => String(m))
      : [];

    const contexts: { text: string; source: string }[] = [];

    const chunks = await searchKnowledgeChunks(
      userId,
      queryEmbedding,
      ["material"],
      materialIdList.length ? materialIdList : undefined,
      6,
    );
    for (const c of chunks) contexts.push({ text: c.content, source: c.title });

    if (materialIdList.length > 0 && chunks.length === 0) {
      const rows = await db
        .select({
          title: studyMaterials.title,
          extractedContent: studyMaterials.extractedContent,
          summary: studyMaterials.summary,
        })
        .from(studyMaterials)
        .where(
          and(
            eq(studyMaterials.userId, userId),
            inArray(studyMaterials.id, materialIdList),
          ),
        );
      for (const r of rows) {
        const text = (r.extractedContent || r.summary || "").slice(0, 6000);
        if (text.trim()) contexts.push({ text, source: r.title });
      }
    }

    if (Array.isArray(noteTexts) && noteTexts.length > 0) {
      const noteChunks: { text: string; source: string; sim: number }[] = [];
      for (const n of noteTexts) {
        const title = n?.title || "Note";
        const content = String(n?.content || "").slice(0, 20000);
        for (const chunk of chunkText(content)) {
          const emb = await generateEmbedding(genAI, chunk).catch(() => null);
          if (!emb) continue;
          noteChunks.push({
            text: chunk,
            source: `${title} (note)`,
            sim: cosineSimilarity(queryEmbedding, emb),
          });
        }
      }
      noteChunks.sort((a, b) => b.sim - a.sim);
      for (const c of noteChunks.slice(0, 3)) contexts.push({ text: c.text, source: c.source });
    }

    if (contexts.length === 0) {
      res.json({
        answer:
          "I couldn't find any study content to answer from yet. Upload a study material or write a note first.",
        citations: [],
      });
      return;
    }

    const contextText = contexts
      .map((c) => `[${c.source}]\n${c.text}`)
      .join("\n\n---\n\n")
      .slice(0, 45000);

    const ai = aiRequestOptions(req);
    const result = await generateJsonContent<{
      answer: string;
      citations: { quote: string; source: string }[];
    }>(ai.modelRef, buildRagPrompt(contextText, String(question)), ai.apiKey);

    res.json(result);
  } catch (err) {
    sendRouteError(res, err, "[Server] POST /api/study/rag-query failed");
  }
});

// --- AI retrieval (context only, no generation) — used by on-device/offline answer paths ---

app.post("/api/ai/rag-contexts", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const userId = claims.sub;
    const { question, materialIds, noteId, noteTexts } = req.body;

    if (!question || !String(question).trim()) {
      res.status(400).json({ error: "Missing required field: question" });
      return;
    }

    const queryText = String(question);
    const queryEmbedding = await generateEmbedding(genAI, queryText);

    const materialIdList: string[] = Array.isArray(materialIds)
      ? materialIds.map((m: any) => String(m))
      : [];
    const excludeNoteId = noteId ? String(noteId) : null;

    const contexts: { text: string; source: string }[] = [];
    const sourceTypes = materialIdList.length ? ["material"] : ["note", "material"];

    const chunks = await searchKnowledgeChunks(
      userId,
      queryEmbedding,
      sourceTypes,
      materialIdList.length ? materialIdList : undefined,
      8,
    );
    for (const c of chunks) {
      if (excludeNoteId && c.sourceType === "note" && c.sourceId === excludeNoteId) continue;
      if (contexts.some((x) => x.text === c.content)) continue;
      const source =
        c.sourceType === "note" ? `${c.title || "Note"} (note)` : c.title || "Material";
      contexts.push({ text: c.content, source });
      if (contexts.length >= 9) break;
    }

    if (materialIdList.length > 0 && chunks.length === 0) {
      const rows = await db
        .select({
          title: studyMaterials.title,
          extractedContent: studyMaterials.extractedContent,
          summary: studyMaterials.summary,
        })
        .from(studyMaterials)
        .where(
          and(
            eq(studyMaterials.userId, userId),
            inArray(studyMaterials.id, materialIdList),
          ),
        );
      for (const r of rows) {
        const text = (r.extractedContent || r.summary || "").slice(0, 6000);
        if (text.trim()) contexts.push({ text, source: r.title });
      }
    }

    if (Array.isArray(noteTexts) && noteTexts.length > 0) {
      const noteChunks: { text: string; source: string; sim: number }[] = [];
      for (const n of noteTexts) {
        const title = n?.title || "Note";
        const content = String(n?.content || "").slice(0, 20000);
        for (const chunk of chunkText(content)) {
          const emb = await generateEmbedding(genAI, chunk).catch(() => null);
          if (!emb) continue;
          noteChunks.push({
            text: chunk,
            source: `${title} (note)`,
            sim: cosineSimilarity(queryEmbedding, emb),
          });
        }
      }
      noteChunks.sort((a, b) => b.sim - a.sim);
      for (const c of noteChunks.slice(0, 3)) {
        if (contexts.length >= 9) break;
        contexts.push({ text: c.text, source: c.source });
      }
    }

    res.json({ contexts: contexts.slice(0, 9) });
  } catch (err) {
    sendRouteError(res, err, "[Server] POST /api/ai/rag-contexts failed");
  }
});

// --- Study material content (for on-device/offline generation) ---

app.get("/api/study/:id/content", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const userId = claims.sub;
    const [material] = await db
      .select({
        title: studyMaterials.title,
        extractedContent: studyMaterials.extractedContent,
        summary: studyMaterials.summary,
      })
      .from(studyMaterials)
      .where(
        and(
          eq(studyMaterials.id, String(req.params.id)),
          eq(studyMaterials.userId, userId),
        ),
      )
      .limit(1);

    if (!material) {
      res.status(404).json({ error: "Study material not found" });
      return;
    }

    const content = [material.extractedContent, material.summary]
      .filter((x) => x && String(x).trim())
      .join("\n\nSUMMARY:\n");
    res.json({ title: material.title, content });
  } catch (err) {
    sendRouteError(res, err, "[Server] GET /api/study/:id/content failed");
  }
});

// --- Study AI generation (quiz, cheat sheet, flashcards) ---

async function requireMaterial(
  materialId: string,
  userId: string,
): Promise<{ id: string; userId: string; title: string; extractedContent: string; summary: string | null }> {
  const [material] = await db
    .select({
      id: studyMaterials.id,
      userId: studyMaterials.userId,
      title: studyMaterials.title,
      extractedContent: studyMaterials.extractedContent,
      summary: studyMaterials.summary,
    })
    .from(studyMaterials)
    .where(eq(studyMaterials.id, materialId))
    .limit(1);

  if (!material) {
    const err = new Error("Study material not found") as Error & { statusCode?: number };
    err.statusCode = 404;
    throw err;
  }
  if (material.userId !== userId) {
    const err = new Error("Forbidden") as Error & { statusCode?: number };
    err.statusCode = 403;
    throw err;
  }
  return material;
}

function materialText(material: { extractedContent: string; summary: string | null }): string {
  return (material.extractedContent || material.summary || "").toString();
}

app.post("/api/study/:id/quiz/generate", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const material = await requireMaterial(req.params.id, claims.sub);
    const content = materialText(material);
    if (!content.trim()) {
      res.status(400).json({ error: "This material has no extractable content yet" });
      return;
    }

    const prompt = `You are a quiz master for Yuinx, a gamified learning app. Based on the study content below, create exactly 5 multiple-choice questions that test understanding of the most important concepts.

Study content:
${content.slice(0, 30000)}

Rules:
- Each question must have exactly 4 options
- correctAnswer is the 0-based index of the correct option
- Questions must be answerable from the content alone
- Questions should be clear and unambiguous

Return ONLY valid JSON with this exact structure:
{
  "questions": [
    { "id": "q1", "question": "Question text?", "options": ["A", "B", "C", "D"], "correctAnswer": 0 }
  ]
}

Do NOT include any markdown code fences. Return raw JSON only.`;

    const ai = aiRequestOptions(req);
    const result = await generateJsonContent<{
      questions: { id: string; question: string; options: string[]; correctAnswer: number }[];
    }>(ai.modelRef, prompt, ai.apiKey);

    res.json(result);
  } catch (err) {
    sendRouteError(res, err, "[Server] POST /api/study/:id/quiz/generate failed");
  }
});

app.post("/api/study/:id/cheatsheet", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const material = await requireMaterial(req.params.id, claims.sub);
    const content = materialText(material);
    if (!content.trim()) {
      res.status(400).json({ error: "This material has no extractable content yet" });
      return;
    }

    const prompt = `${buildStudyCheatsheetPrompt(content)}\n\nReturn ONLY valid JSON: { "cheatsheet": "the full markdown content" }. Do NOT include markdown code fences. Return raw JSON only.`;

    const ai = aiRequestOptions(req);
    const result = await generateJsonContent<{ cheatsheet: string }>(ai.modelRef, prompt, ai.apiKey);

    await db
      .update(studyMaterials)
      .set({ cheatsheet: result.cheatsheet, updatedAt: new Date() })
      .where(eq(studyMaterials.id, req.params.id));

    res.json({ cheatsheet: result.cheatsheet });
  } catch (err) {
    sendRouteError(res, err, "[Server] POST /api/study/:id/cheatsheet failed");
  }
});

app.post("/api/study/:id/flashcards/generate", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const material = await requireMaterial(req.params.id, claims.sub);
    const content = materialText(material);
    if (!content.trim()) {
      res.status(400).json({ error: "This material has no extractable content yet" });
      return;
    }

    const ai = aiRequestOptions(req);
    const result = await generateJsonContent<{
      flashcards: { front: string; back: string }[];
    }>(ai.modelRef, buildFlashcardsPrompt(content), ai.apiKey);

    const now = new Date();
    const cards = (result.flashcards || []).map((c) => {
      const id = `fc_${crypto.randomUUID()}`;
      return {
        id,
        userId: claims.sub,
        sourceType: "material" as const,
        sourceId: req.params.id,
        sourceTitle: material.title,
        front: c.front,
        back: c.back,
        intervalDays: 0,
        ease: 2.5,
        repetitions: 0,
        lapses: 0,
        dueAt: now,
        createdAt: now,
      };
    });

    if (cards.length === 0) {
      res.status(502).json({ error: "No flashcards were generated. Try again." });
      return;
    }

    await db.insert(studyFlashcards).values(cards);

    res.json({
      flashcards: cards.map((c) => ({
        id: c.id,
        userId: c.userId,
        sourceType: c.sourceType,
        sourceId: c.sourceId,
        sourceTitle: c.sourceTitle,
        front: c.front,
        back: c.back,
        intervalDays: c.intervalDays,
        ease: c.ease,
        repetitions: c.repetitions,
        lapses: c.lapses,
        dueAt: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: null,
      })),
    });
  } catch (err) {
    sendRouteError(res, err, "[Server] POST /api/study/:id/flashcards/generate failed");
  }
});

// --- Flashcards (spaced repetition) ---

type FlashcardRow = {
  id: string;
  userId: string;
  sourceType: string;
  sourceId: string | null;
  sourceTitle: string;
  front: string;
  back: string;
  intervalDays: number;
  ease: number;
  repetitions: number;
  lapses: number;
  dueAt: Date;
  createdAt: Date;
  updatedAt: Date | null;
};

function mapFlashcard(row: FlashcardRow) {
  return {
    id: row.id,
    userId: row.userId,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    sourceTitle: row.sourceTitle,
    front: row.front,
    back: row.back,
    intervalDays: row.intervalDays,
    ease: row.ease,
    repetitions: row.repetitions,
    lapses: row.lapses,
    dueAt: row.dueAt instanceof Date ? row.dueAt.toISOString() : String(row.dueAt),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt
      ? (row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt))
      : null,
  };
}

app.get("/api/flashcards", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const userId = req.query.userId as string;
    if (userId && userId !== claims.sub) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const rows = await db
      .select()
      .from(studyFlashcards)
      .where(eq(studyFlashcards.userId, claims.sub))
      .orderBy(studyFlashcards.dueAt);

    const list = req.query.due === "1" || req.query.due === "true"
      ? rows.filter((r: any) => new Date(r.dueAt) <= new Date())
      : rows;

    res.json(list.map((r: any) => mapFlashcard(r)));
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/flashcards failed");
  }
});

app.post("/api/flashcards/:id/review", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const { quality } = req.body;
    if (![0, 3, 5].includes(Number(quality))) {
      res.status(400).json({ error: "quality must be 0, 3, or 5" });
      return;
    }

    const [card] = await db
      .select()
      .from(studyFlashcards)
      .where(eq(studyFlashcards.id, req.params.id))
      .limit(1);

    if (!card) {
      res.status(404).json({ error: "Flashcard not found" });
      return;
    }
    if (card.userId !== claims.sub) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    let intervalDays = Number(card.intervalDays || 0);
    let ease = Number(card.ease || 2.5);
    let repetitions = Number(card.repetitions || 0);
    let lapses = Number(card.lapses || 0);
    const q = Number(quality);
    const now = new Date();

    if (q >= 3) {
      if (repetitions === 0) intervalDays = 1;
      else if (repetitions === 1) intervalDays = 6;
      else intervalDays = Math.max(1, Math.round(intervalDays * ease));
      repetitions += 1;
      ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    } else {
      repetitions = 0;
      lapses += 1;
      ease = Math.max(1.3, ease - 0.2);
      intervalDays = 1;
    }

    const dueAt = new Date(now.getTime() + intervalDays * 86400000);

    await db
      .update(studyFlashcards)
      .set({ intervalDays, ease, repetitions, lapses, dueAt, updatedAt: now })
      .where(eq(studyFlashcards.id, req.params.id));

    let awardedXp = 0;
    if (q >= 3) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const [countRow] = await sql`
        SELECT COUNT(*)::int AS c
        FROM study_flashcards
        WHERE user_id = ${claims.sub} AND updated_at >= ${todayStart}
      `;
      if (Number(countRow?.c || 0) <= 8) {
        awardedXp = 3;
        await sql`UPDATE users SET xp = xp + ${awardedXp}, updated_at = now() WHERE id = ${claims.sub}`;
      }
    }

    res.json({
      id: req.params.id,
      intervalDays,
      ease,
      repetitions,
      lapses,
      dueAt: dueAt.toISOString(),
      awardedXp,
    });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    console.error("[Server] POST /api/flashcards/:id/review failed:", err);
    res.status(500).json({ error: err.message || "Failed to review flashcard" });
  }
});

app.delete("/api/flashcards/:id", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);

    const [card] = await db
      .select({ userId: studyFlashcards.userId })
      .from(studyFlashcards)
      .where(eq(studyFlashcards.id, req.params.id))
      .limit(1);

    if (!card) {
      res.status(404).json({ error: "Flashcard not found" });
      return;
    }
    if (card.userId !== claims.sub) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db
      .delete(studyFlashcards)
      .where(eq(studyFlashcards.id, req.params.id));

    res.status(204).end();
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] DELETE /api/flashcards/:id failed");
  }
});

// --- Quiz completion + XP rewards ---

app.post("/api/study/:id/quiz/complete", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const { correct, total } = req.body;

    if (!Number.isInteger(correct) || !Number.isInteger(total) || total <= 0) {
      res.status(400).json({ error: "Invalid correct/total values" });
      return;
    }

    await requireMaterial(req.params.id, claims.sub);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [existing] = await db
      .select({ id: quizAttempts.id })
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.userId, claims.sub),
          eq(quizAttempts.materialId, req.params.id),
          gte(quizAttempts.createdAt, todayStart),
        ),
      )
      .limit(1);

    const scorePct = Math.round((correct / total) * 100);
    const isFirstDailyAttempt = !existing;
    const awardedXp = isFirstDailyAttempt
      ? Math.min(20, Math.max(5, Math.round(scorePct * 0.2)))
      : 0;

    if (awardedXp > 0) {
      await sql`UPDATE users SET xp = xp + ${awardedXp}, updated_at = now() WHERE id = ${claims.sub}`;
    }

    await db.insert(quizAttempts).values({
      id: `qa_${crypto.randomUUID()}`,
      userId: claims.sub,
      materialId: req.params.id,
      correct,
      total,
      scorePct,
      awardedXp,
      createdAt: new Date(),
    });

    res.json({ scorePct, awardedXp, isFirstDailyAttempt });
  } catch (err: any) {
    if (err?.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error("[Server] POST /api/study/:id/quiz/complete failed:", err);
    res.status(500).json({ error: err.message || "Failed to record quiz result" });
  }
});

app.get("/api/study/attempts", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);

    const rows = await db
      .select({
        id: quizAttempts.id,
        materialId: quizAttempts.materialId,
        correct: quizAttempts.correct,
        total: quizAttempts.total,
        scorePct: quizAttempts.scorePct,
        awardedXp: quizAttempts.awardedXp,
        createdAt: quizAttempts.createdAt,
      })
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, claims.sub))
      .orderBy(desc(quizAttempts.createdAt))
      .limit(10);

    const materialIds = [...new Set(rows.map((r) => r.materialId))];
    const titles: Record<string, string> = {};
    if (materialIds.length > 0) {
      const materials = await db
        .select({ id: studyMaterials.id, title: studyMaterials.title })
        .from(studyMaterials)
        .where(inArray(studyMaterials.id, materialIds));
      for (const m of materials) titles[m.id] = m.title;
    }

    res.json(
      rows.map((r) => ({
        id: r.id,
        materialId: r.materialId,
        materialTitle: titles[r.materialId] || "Study material",
        correct: r.correct,
        total: r.total,
        scorePct: r.scorePct,
        awardedXp: r.awardedXp,
        createdAt: r.createdAt,
      })),
    );
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/study/attempts failed");
  }
});

// --- Audio transcription ---

function isGeminiBusyError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    /high demand/i.test(message) ||
    /RESOURCE_EXHAUSTED|UNAVAILABLE|503|429/i.test(message)
  );
}

async function transcribeWithRetry(
  prompt: string,
  file: { base64: string; mimeType: string },
): Promise<string> {
  let attempt = 0;
  let delay = 1500;
  for (;;) {
    try {
      return await generateTextWithFile(genAI, prompt, file);
    } catch (err: any) {
      if (!isGeminiBusyError(err) || attempt >= 2) throw err;
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

app.post("/api/audio/transcribe", async (req, res) => {
  try {
    await verifyClerkToken(req.headers.authorization);
    const { base64, mimeType } = req.body;

    if (!base64) {
      res.status(400).json({ error: "Missing required field: base64" });
      return;
    }

    const bytes = Buffer.byteLength(base64, "base64");
    if (bytes > MAX_FILE_BYTES) {
      res.status(413).json({ error: "Audio too large (max 25 MB)" });
      return;
    }

    const transcript = await transcribeWithRetry(
      "You are Yuinx's audio transcription engine. Transcribe the audio verbatim, preserving natural paragraph breaks. Return ONLY the transcript text.",
      { base64, mimeType: mimeType || "audio/mp4" },
    );

    res.json({ transcript });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    if (isGeminiBusyError(err)) {
      res.status(503).json({
        error: "AI transcription is temporarily busy. Please try again in a few seconds.",
      });
      return;
    }
    console.error("[Server] POST /api/audio/transcribe failed:", err);
    res.status(500).json({ error: err.message || "Failed to transcribe audio" });
  }
});

// --- Notes AI + RAG indexing ---

const NOTES_AI_ACTIONS: NotesAiAction[] = [
  "summary",
  "tags",
  "flashcards",
  "quiz",
  "cheatsheet",
  "chat",
];

// Free-form text tools: sent as plain text (no JSON-in-JSON), keyed by NOTES_AI_TEXT_KEYS.
const NOTES_AI_TEXT_KEYS: Partial<Record<NotesAiAction, string>> = {
  summary: "summary",
  cheatsheet: "cheat_sheet",
};

function normalizeAiStructured(
  result: Record<string, unknown>,
  action: NotesAiAction,
): Record<string, unknown> {
  if (action === "tags") {
    const tags: string[] = [];
    if (Array.isArray(result.tags)) {
      for (const t of result.tags) {
        const s = String(t ?? "").trim();
        if (s && !tags.includes(s)) tags.push(s);
      }
    }
    return { tags: tags.slice(0, 8) };
  }
  if (action === "flashcards") {
    const source = Array.isArray(result.flashcards)
      ? result.flashcards
      : Array.isArray(result.cards)
        ? result.cards
        : [];
    const cards = source
      .map((c) => {
        const o = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
        return {
          front: String(o.front ?? o.question ?? ""),
          back: String(o.back ?? o.answer ?? ""),
        };
      })
      .filter((c) => c.front.trim() && c.back.trim())
      .slice(0, 12);
    return { flashcards: cards };
  }
  if (action === "quiz") {
    const source = Array.isArray(result.questions)
      ? result.questions
      : Array.isArray(result.quiz)
        ? result.quiz
        : [];
    const questions = source
      .map((q, qi) => {
        const o = (q && typeof q === "object" ? q : {}) as Record<string, unknown>;
        const options = Array.isArray(o.options) ? o.options.map((x) => String(x)) : [];
        const question = String(o.question ?? o.q ?? "");
        if (!question.trim() || options.length === 0) return null;
        let correctAnswer =
          typeof o.correctAnswer === "number"
            ? o.correctAnswer
            : typeof o.correct === "number"
              ? o.correct
              : -1;
        if (correctAnswer < 0 || correctAnswer >= options.length) {
          const answerText = String(o.answer ?? o.correct ?? "").trim();
          const byIndex = Number(answerText);
          correctAnswer = Number.isInteger(byIndex)
            ? byIndex >= 0 && byIndex < options.length
              ? byIndex
              : -1
            : answerText
              ? options.findIndex((opt) => opt.trim().toLowerCase() === answerText.toLowerCase())
              : -1;
        }
        return {
          id: String(o.id ?? qi),
          question,
          options,
          correctAnswer,
        };
      })
      .filter((q): q is { id: string; question: string; options: string[]; correctAnswer: number } => q !== null)
      .slice(0, 8);
    return { questions };
  }
  return result;
}

interface NoteImageArg {
  order: number;
  base64: string;
  mimeType: string;
}

const NOTE_IMAGE_READ_LIMIT = 4;

function sanitizeNoteImages(value: unknown): NoteImageArg[] {
  if (!Array.isArray(value)) return [];
  const out: NoteImageArg[] = [];
  for (let i = 0; i < value.length && out.length < NOTE_IMAGE_READ_LIMIT; i++) {
    const item = value[i];
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.base64 !== "string" || o.base64.length === 0) continue;
    const mimeType =
      typeof o.mimeType === "string" && /^image\//.test(o.mimeType)
        ? o.mimeType
        : "image/jpeg";
    out.push({
      order: typeof o.order === "number" && o.order >= 0 ? o.order : i,
      base64: o.base64,
      mimeType,
    });
  }
  return out;
}

async function extractNoteImages(images: NoteImageArg[]): Promise<string> {
  if (images.length === 0) return "";
  const parts: (
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  )[] = [
    {
      text: "You are an expert at extracting structured information from images. Extract all readable text, numbers, tables, formulas, and concise descriptions of diagrams, charts, screenshots or other visual content from each of the following images.\n\nProcess the images STRICTLY IN THE ORDER given and label each block exactly as shown. When an image is blank, unrelated or unreadable, write \"No readable content\". Keep each block brief but complete.\n\nReturn the blocks in EXACTLY this format, one block per image, starting with \"[Image 1]\":\n[Image 1] <extracted content>\n[Image 2] <extracted content>",
    },
  ];
  for (const img of images) {
    parts.push({ text: `[Image ${img.order + 1}]:` });
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  }

  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
  });
  const text = response.text?.trim();
  return text || "";
}

app.post("/api/notes/ai", async (req, res) => {
  try {
    await verifyClerkToken(req.headers.authorization);
    const { action, noteTitle, noteContent, question, existingTags } = req.body;
    const noteImages = sanitizeNoteImages(req.body.images);

    if (!action || !NOTES_AI_ACTIONS.includes(action)) {
      res.status(400).json({ error: "Invalid action" });
      return;
    }
    if (!String(noteContent || "").trim() && noteImages.length === 0) {
      res.status(400).json({ error: "Note content is empty" });
      return;
    }

    let effectiveContent = String(noteContent || "");
    if (noteImages.length > 0) {
      try {
        const extracted = await extractNoteImages(noteImages);
        if (extracted) {
          effectiveContent += `\n\n## Note Images (in order of arrangement)\n${extracted}`;
        }
      } catch (err) {
        console.error(
          "[Server] note image extraction failed:",
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    const { system } = buildNotesAiPrompt({
      action,
      noteTitle,
      noteContent: effectiveContent,
      question,
      existingTags,
    });

    const ai = aiRequestOptions(req);
    try {
      const textKey = NOTES_AI_TEXT_KEYS[action];
      if (textKey) {
        const text = await generateText({
          modelRef: ai.modelRef,
          prompt: system,
          json: false,
          apiKey: ai.apiKey,
        });
        const clean = text.trim();
        if (!clean) {
          const label = getModelOption(ai.modelRef)?.label ?? ai.modelRef;
          res.status(422).json({
            error: `"${label}" returned no usable output for this note. Please try again or switch to a more reliable model.`,
          });
          return;
        }
        res.json({ [textKey]: clean });
        return;
      }

      const result = await generateJsonContent<Record<string, unknown>>(
        ai.modelRef,
        `${system}\n\nReturn ONLY valid JSON matching the requested structure. Do NOT include any markdown code fences. Return raw JSON only.`,
        ai.apiKey,
      );
      res.json(normalizeAiStructured(result, action));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("no parseable JSON")) {
        const label = getModelOption(ai.modelRef)?.label ?? ai.modelRef;
        res.status(422).json({
          error: `"${label}" returned no usable JSON for this note. Please try again or switch to a more reliable model.`,
        });
        return;
      }
      throw err;
    }
  } catch (err) {
    sendRouteError(res, err, "[Server] POST /api/notes/ai failed");
  }
});

// --- Note AI chat (multi-turn, grounding modes, streaming) ---

const NOTES_CHAT_MODES: NotesChatMode[] = ["note", "web"];

interface NotesChatEntry {
  role: "user" | "assistant";
  content: string;
}

function sanitizeChatHistory(value: unknown): NotesChatEntry[] {
  if (!Array.isArray(value)) return [];
  const out: NotesChatEntry[] = [];
  for (const m of value) {
    if (!m || typeof m !== "object") continue;
    const o = m as Record<string, unknown>;
    if (o.role !== "user" && o.role !== "assistant") continue;
    if (typeof o.content !== "string") continue;
    out.push({ role: o.role, content: o.content.slice(0, 12000) });
  }
  return out.slice(-14);
}

function normalizeGeminiRoles(
  msgs: { role: "user" | "model"; content: string }[],
): { role: "user" | "model"; parts: { text: string }[] }[] {
  const out: { role: "user" | "model"; content: string }[] = [];
  for (const m of msgs) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      last.content = `${last.content}\n\n${m.content}`;
    } else {
      out.push({ ...m });
    }
  }
  if (out.length === 0 || out[0].role !== "user") {
    out.unshift({ role: "user", content: "(conversation start)" });
  }
  return out.map((m) => ({ role: m.role, parts: [{ text: m.content }] }));
}

app.post("/api/notes/ai/chat", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const userId = claims.sub;
    const { mode, reasoning, stream, messages, noteId, noteTitle, noteContent } = req.body;

    if (!NOTES_CHAT_MODES.includes(mode)) {
      res.status(400).json({ error: "Invalid mode" });
      return;
    }

    const history = sanitizeChatHistory(messages);
    const lastUser = [...history].reverse().find((m) => m.role === "user");
    if (!lastUser) {
      res.status(400).json({ error: "No user question found" });
      return;
    }
    const question = lastUser.content;
    const title = String(noteTitle || "Untitled note");
    const baseContent = String(noteContent || "");
    const noteImages = sanitizeNoteImages(req.body.images);

    let content = baseContent;
    if (noteImages.length > 0) {
      try {
        const extracted = await extractNoteImages(noteImages);
        if (extracted) {
          content += `\n\n## Note Images (in order of arrangement)\n${extracted}`;
        }
      } catch (err) {
        console.error(
          "[Server] note image extraction failed:",
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    if (mode !== "web" && !content.trim()) {
      res.status(400).json({ error: "No content to answer from. Add content to the note first." });
      return;
    }

    const ai = aiRequestOptions(req);
    let modelRef = ai.modelRef;
    const apiKey = ai.apiKey;
    if (mode === "web") modelRef = "gemini::gemini-2.5-flash";

    const parsed = parseModelRef(modelRef);
    const provider = parsed?.provider ?? "gemini";
    const baseModelId = parsed?.id ?? "gemini-2.5-flash";

    const promptInput = {
      mode,
      noteTitle: title,
      noteContent: content,
      messages: history,
      question,
      reasoning: Boolean(reasoning),
    };

    if (stream && provider === "gemini") {
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

      send({ type: "meta", model: baseModelId });

      const system = buildNotesChatPrompt({ ...promptInput, json: false });
      const conversationText: { role: "user" | "model"; content: string }[] = history.map(
        (m) => ({
          role: m.role === "assistant" ? "model" : "user",
          content: m.content,
        }),
      );
      if (
        conversationText.length === 0 ||
        conversationText[conversationText.length - 1].role !== "user" ||
        conversationText[conversationText.length - 1].content !== question
      ) {
        conversationText.push({ role: "user", content: question });
      }

      try {
        const client = getGemini(apiKey);
        const streamHeader = await client.models.generateContentStream({
          model: baseModelId,
          contents: normalizeGeminiRoles(conversationText),
          config: {
            systemInstruction: system,
            ...(reasoning ? { thinkingConfig: { thinkingBudget: 400 } } : {}),
            ...(mode === "web" ? { tools: [{ googleSearch: {} }] } : {}),
          },
        });

        for await (const chunk of streamHeader) {
          if (req.aborted) break;
          if (chunk.text) {
            if (!send({ type: "delta", text: chunk.text })) break;
          }
        }
        send({ type: "done" });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({ type: "error", message });
      }
      res.end();
      return;
    }

    const system = buildNotesChatPrompt({ ...promptInput, json: true });

    let result: { answer?: unknown };
    try {
      result = await generateJsonContent<{ answer?: unknown }>(modelRef, system, apiKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("no parseable JSON")) {
        const label = getModelOption(modelRef)?.label ?? modelRef;
        res.status(422).json({
          error: `"${label}" returned no usable answer for this question. Please try again or switch to a more reliable model.`,
        });
        return;
      }
      throw err;
    }

    const answer = String(result?.answer ?? "").trim();
    if (!answer) {
      const label = getModelOption(modelRef)?.label ?? modelRef;
      res.status(422).json({
        error: `"${label}" returned an empty answer. Try again or switch to a more reliable model.`,
      });
      return;
    }

    res.json({ answer, mode, model: modelRef });
  } catch (err) {
    sendRouteError(res, err, "[Server] POST /api/notes/ai/chat failed");
  }
});

app.post("/api/notes/index", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const { noteId, title, content } = req.body;

    if (!noteId || !String(content || "").trim()) {
      res.status(400).json({ error: "Missing noteId or content" });
      return;
    }

    await upsertKnowledgeChunks(
      claims.sub,
      "note",
      String(noteId),
      String(title || "Note"),
      String(content),
    );

    res.status(204).end();
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    console.error("[Server] POST /api/notes/index failed:", err);
    res.status(500).json({ error: err.message || "Failed to index note" });
  }
});

app.delete("/api/notes/index/:noteId", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);

    await sql`
      DELETE FROM knowledge_chunks
      WHERE user_id = ${claims.sub} AND source_type = 'note' AND source_id = ${req.params.noteId}
    `;

    res.status(204).end();
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    sendRouteError(res, err, "[Server] DELETE /api/notes/index/:noteId failed");
  }
});

// --- Note chat history (AI chat with a note, persisted) ---

const CHAT_KINDS = ["chat", "summary", "tags", "cheatsheet", "flashcards", "quiz"];

app.get("/api/notes/:noteId/chats", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const rows = await db
      .select()
      .from(noteChats)
      .where(
        and(eq(noteChats.userId, claims.sub), eq(noteChats.noteId, String(req.params.noteId))),
      )
      .orderBy(noteChats.createdAt);
    res.json(rows);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    console.error("[Server] GET /api/notes/:noteId/chats failed:", err);
    res.status(500).json({ error: "Failed to load chat history" });
  }
});

app.post("/api/notes/:noteId/chats", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Missing messages" });
      return;
    }
    const values = messages
      .filter(
        (m: any) =>
          m &&
          typeof m.id === "string" &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.length <= 10000,
      )
      .map((m: any) => ({
        id: m.id,
        userId: claims.sub,
        noteId: String(req.params.noteId),
        role: m.role,
        kind: CHAT_KINDS.includes(m.kind) ? m.kind : "chat",
        content: m.content,
        createdAt: m.createdAt ? new Date(m.createdAt) : undefined,
      }))
      .filter((m: any) => m.id && m.content);

    if (values.length === 0) {
      res.status(400).json({ error: "No valid messages" });
      return;
    }

    await db.insert(noteChats).values(values).onConflictDoNothing();
    res.status(204).end();
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    console.error("[Server] POST /api/notes/:noteId/chats failed:", err);
    res.status(500).json({ error: "Failed to save chat history" });
  }
});

app.delete("/api/notes/:noteId/chats", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    await sql`
      DELETE FROM note_chats
      WHERE user_id = ${claims.sub} AND note_id = ${req.params.noteId}
    `;
    res.status(204).end();
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: `Invalid token: ${err.reason || err.message}` });
      return;
    }
    console.error("[Server] DELETE /api/notes/:noteId/chats failed:", err);
    res.status(500).json({ error: "Failed to clear chat history" });
  }
});

const PORT = parseInt(process.env.PORT || "3001", 10);
app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] DB host: ${DB_HOST}`);
});
