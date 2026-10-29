import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import express from "express";
import type { Request, Response, NextFunction } from "express";
import net from "net";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { verifyToken } from "@clerk/backend";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, or, inArray, gte, desc, asc, isNull, isNotNull, ne, ilike, sql as drizzleSql, count, sum, gt } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { initGemini, generateCourseContent, generateJsonContent, generateQuizQuestions, generateDailyBounties, generateThumbnailImage, generateTextWithFile, generateEmbedding, generateLessonScript, generateSpeech, TTS_MODEL, TTS_VOICE } from "../lib/gemini";
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
  notes,
  bountyClaims,
  spinClaims,
  userDailyActivity,
  communityPosts,
  communityPostReactions,
  communityPostComments,
  courseFeedLikes,
  lessonScripts,
} from "../db/schema";
import { generateFallbackBounties } from "./bountyTemplates";
import { buildCourseGenerationPrompt, buildThumbnailGenerationPrompt } from "./prompts/courseGeneration";
import { buildQuizGenerationPrompt } from "./prompts/quizGeneration";
import { buildStudyExtractionPrompt } from "./prompts/studyProcessing";
import { buildStudyCheatsheetPrompt, buildFlashcardsPrompt, buildStudySuggestPrompt } from "./prompts/studyGeneration";
import { buildNotesAiPrompt, buildNotesChatPrompt } from "./prompts/notesPrompts";
import type { NotesAiAction, NotesChatMode } from "./prompts/notesPrompts";
import { buildScheduleSuggestPrompt } from "./prompts/scheduleSuggest";
import { buildLessonScriptPrompt } from "./prompts/lessonScript";
import { buildLessonExplainPrompt } from "./prompts/lessonExplain";
import {
  buildUserCreateValues,
  buildUserUpdateValues,
  ProfilePayloadError,
} from "./profilePayload";
import { latexToSvg } from "./math/mathjax";
import { pcmRateFromMime, pcmToWav } from "./audio/pcmToWav";
import { lessonAudioDeliveryUrl } from "./audio/deliveryUrl";
import { lessonSourceHash } from "../lib/lesson/validateLessonScript";
import type { Course } from "../types/course";
import type { AudioClip, NoteImage } from "../types/note";
import type { Chapter, Subtopic } from "../types/chapter";
import type {
  LessonAudioClip,
  LessonExplainAction,
  LessonScript,
  LessonScriptDraft,
  LessonStatus,
} from "../types/lesson";

const SERVER_LOG_FILE = process.env.SERVER_LOG_FILE ?? path.join(process.cwd(), "server.log");

function formatLogArg(value: unknown): string {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
  }
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// Mirror console.error/warn into a file so real server errors survive after the
// terminal scrolls away (previously only startup output was ever captured).
for (const level of ["error", "warn"] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    original(...args);
    try {
      const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${args
        .map(formatLogArg)
        .join(" ")}\n`;
      fs.appendFileSync(SERVER_LOG_FILE, line);
    } catch {
      // logging must never break a request
    }
  };
}

let errorCounter = 0;

const app = express();
app.use(express.json({ limit: "25mb" }));
app.use(helmet());

const isProd = process.env.NODE_ENV === "production";
const DEV_ORIGINS = [
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
const APP_ORIGINS = ["https://app.yuinx.xyz"];
const WEB_ORIGINS = ["https://yuinx.xyz", "https://www.yuinx.xyz"];
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins: string[] = [
  ...new Set([
    ...(isProd ? [] : DEV_ORIGINS),
    ...APP_ORIGINS,
    ...WEB_ORIGINS,
    ...CORS_ORIGINS,
  ]),
];
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "x-ai-model",
      "x-ai-key",
    ],
    exposedHeaders: [
      "x-request-id",
      "Retry-After",
      "RateLimit-Limit",
      "RateLimit-Remaining",
      "RateLimit-Reset",
    ],
    maxAge: 86400,
  }),
);

app.use((req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers["x-request-id"];
  const id =
    typeof incoming === "string" && /^[A-Za-z0-9._:-]{1,100}$/.test(incoming)
      ? incoming
      : crypto.randomUUID();
  (req as any).requestId = id;
  res.setHeader("x-request-id", id);
  next();
});

const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS ?? 60_000);
const TIMEOUT_EXEMPT_PREFIXES = ["/api/notes/ai/chat"];
const LESSON_GENERATE_PATH =
  /^\/api\/courses\/[^/]+\/lessons\/\d+\/\d+\/generate$/;

function isLongRunningRoute(pathname: string): boolean {
  return (
    TIMEOUT_EXEMPT_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    pathname.startsWith("/api/lessons/") ||
    LESSON_GENERATE_PATH.test(pathname)
  );
}

app.use((req: Request, res: Response, next: NextFunction) => {
  if (
    req.method === "OPTIONS" ||
    !req.path.startsWith("/api/") ||
    isLongRunningRoute(req.path)
  ) {
    next();
    return;
  }
  const timer = setTimeout(() => {
    if (res.headersSent) return;
    res.status(503).json({ error: "Request timed out. Please try again.", code: "timeout" });
  }, REQUEST_TIMEOUT_MS);
  const clear = () => clearTimeout(timer);
  res.on("finish", clear);
  res.on("close", clear);
  next();
});

const GLOBAL_RATE_LIMIT = Number(process.env.GLOBAL_RATE_LIMIT ?? 300);
const STRICT_RATE_LIMIT = Number(process.env.STRICT_RATE_LIMIT ?? 20);
const AI_USER_RATE_LIMIT = Number(process.env.AI_USER_RATE_LIMIT ?? 30);

const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: GLOBAL_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

const strictLimiter = rateLimit({
  windowMs: 60_000,
  limit: STRICT_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});

const AI_ROUTES = [
  "/api/bounties/generate",
  "/api/courses/generate",
  "/api/courses/:id/thumbnail",
  "/api/courses/:id/lessons/:chapterIndex/:subtopicIndex/generate",
  "/api/lessons/:id/audio",
  "/api/lessons/:id/explain",
  "/api/subtopics/quiz",
  "/api/study/process",
  "/api/study/upload",
  "/api/study/rag-query",
  "/api/ai/rag-contexts",
  "/api/study/:id/quiz/generate",
  "/api/study/:id/cheatsheet",
  "/api/study/:id/flashcards/generate",
  "/api/audio/transcribe",
  "/api/notes/ai",
  "/api/notes/ai/chat",
  "/api/schedule/suggest",
];

type AiBucket = { count: number; resetAt: number };
const aiUserBuckets = new Map<string, AiBucket>();

function aiUserKey(req: Request): string {
  const auth = req.headers.authorization;
  if (auth) {
    const payload = auth.replace(/^Bearer\s+/i, "").split(".")[1];
    if (payload) {
      try {
        const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (decoded && typeof decoded.sub === "string" && decoded.sub) {
          return `user:${decoded.sub}`;
        }
      } catch {
        // fall through to IP key
      }
    }
  }
  return `ip:${req.ip ?? "unknown"}`;
}

function aiUserLimiter(req: Request, res: Response, next: NextFunction): void {
  const key = aiUserKey(req);
  const now = Date.now();
  const bucket = aiUserBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (aiUserBuckets.size > 10_000) aiUserBuckets.clear();
    aiUserBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    next();
    return;
  }
  if (bucket.count >= AI_USER_RATE_LIMIT) {
    res.setHeader("Retry-After", Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
    res.status(429).json({ error: "Too many AI requests. Please slow down.", code: "rate_limited" });
    return;
  }
  bucket.count += 1;
  next();
}

app.use(globalLimiter);
app.use(AI_ROUTES, strictLimiter);
app.use(AI_ROUTES, aiUserLimiter);

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
type IdempotencyRecord = { status: number; body: unknown; expiresAt: number };
const idempotencyStore = new Map<string, IdempotencyRecord>();
const idempotencyInFlight = new Set<string>();

type IdempotencyState =
  | { state: "none" }
  | { state: "replay"; status: number; body: unknown }
  | { state: "pending"; key: string }
  | { state: "new"; key: string };

function beginIdempotent(req: Request, userId: string): IdempotencyState {
  const raw = req.headers["idempotency-key"];
  if (typeof raw !== "string" || !raw.trim()) return { state: "none" };
  if (raw.length > 128) return { state: "none" };
  const key = `${userId}:${raw.trim()}`;
  const now = Date.now();
  const hit = idempotencyStore.get(key);
  if (hit && hit.expiresAt > now) {
    return { state: "replay", status: hit.status, body: hit.body };
  }
  if (hit) idempotencyStore.delete(key);
  if (idempotencyInFlight.has(key)) return { state: "pending", key };
  idempotencyInFlight.add(key);
  return { state: "new", key };
}

function finishIdempotent(key: string, status: number, body: unknown): void {
  idempotencyInFlight.delete(key);
  if (idempotencyStore.size > 5_000) {
    const now = Date.now();
    for (const [k, v] of idempotencyStore) {
      if (v.expiresAt <= now) idempotencyStore.delete(k);
    }
  }
  idempotencyStore.set(key, { status, body, expiresAt: Date.now() + IDEMPOTENCY_TTL_MS });
}

function abortIdempotent(key: string): void {
  idempotencyInFlight.delete(key);
}

async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await verifyClerkToken(req.headers.authorization);
    next();
  } catch (err) {
    res.status(401).json({ error: isTokenError(err) ? "Invalid token" : "Unauthorized" });
  }
}

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
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  const anyErr = err as any;
  errorCounter = (errorCounter + 1) & 0xffffff;
  const requestId =
    (res.req as any)?.requestId ?? `${Date.now().toString(36)}-${errorCounter.toString(36)}`;
  console.error(`${label} [req ${requestId}]:`, err);

  const rawStatus =
    typeof anyErr?.statusCode === "number"
      ? anyErr.statusCode
      : typeof anyErr?.status === "number"
        ? anyErr.status
        : typeof anyErr?.response?.status === "number"
          ? anyErr.response.status
          : 0;
  const pgCode = typeof anyErr?.code === "string" ? anyErr.code : undefined;
  const isUniqueViolation = pgCode === "23505";
  const isForeignKeyViolation = pgCode === "23503";
  const status = isUniqueViolation
    ? 409
    : isForeignKeyViolation
      ? 400
      : rawStatus >= 400 && rawStatus <= 599
        ? rawStatus
        : 500;

  const rawMessage = typeof (err as Error)?.message === "string" ? (err as Error).message : "";
  const exposesMessage = anyErr?.expose === true;
  const safePattern = /timeout|too large|quota|rate limit|failed to fetch file|file not found|overloaded|unavailable/i;

  let message = "Internal server error";
  if (rawMessage && (status < 500 || exposesMessage || safePattern.test(rawMessage))) {
    message = rawMessage;
  }
  if (isUniqueViolation) message = "This record already exists.";
  if (isForeignKeyViolation) message = "Related record not found.";

  const body: { error: string; code?: string; requestId?: string } = { error: message };
  const code = isUniqueViolation
    ? "conflict"
    : isForeignKeyViolation
      ? "invalid_reference"
      : pgCode;
  if (code) body.code = code;
  if (status >= 500) body.requestId = requestId;
  res.status(status).json(body);
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
  schema: { users, levels, trophies, courses, courseEnrollments, userTrophies, studyMaterials, studyFlashcards, quizAttempts, knowledgeChunks, noteChats, notes, bountyClaims, spinClaims, userDailyActivity, communityPosts, communityPostReactions, communityPostComments },
});

app.get("/api/health", async (_req, res) => {
  const startedAt = Date.now();
  try {
    await sql`select 1 from courses limit 1`;
    res.json({
      status: "ok",
      database: "ok",
      dbLatencyMs: Date.now() - startedAt,
      ai: providerKeyStatus(),
      uptimeSeconds: Math.round(process.uptime()),
      version: process.env.APP_VERSION ?? "dev",
      checkedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Server] GET /api/health failed:", err);
    res.status(503).json({
      status: "degraded",
      database: "down",
      ai: providerKeyStatus(),
      error: "Service unavailable",
      detail: `${err?.message ?? ""} ${err?.cause?.message ?? ""}`.trim(),
    });
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
  country: string | null;
  region: string | null;
  schoolType: string | null;
  school: string | null;
  grade: string | null;
  degree: string | null;
  subjects: string;
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

function parseStringArray(raw: string | null | undefined): string[] {
  try {
    const value = JSON.parse(raw ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

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
  const subjects = parseStringArray(row.subjects);
  return {
    uid: row.id,
    displayName: row.displayName,
    email: row.email,
    photoURL: row.photoUrl,
    level: row.level,
    majorCourse: row.majorCourse,
    birthday: row.birthday ?? undefined,
    educationLevel: row.educationLevel ?? undefined,
    country: row.country ?? undefined,
    region: row.region ?? undefined,
    schoolType: row.schoolType ?? undefined,
    school: row.school ?? undefined,
    grade: row.grade ?? undefined,
    degree: row.degree ?? undefined,
    subjects,
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

app.get("/api/users/me", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const [row] = await db.select().from(users).where(eq(users.id, claims.sub)).limit(1);

    if (!row) {
      res.status(404).json({ error: "Profile not found", code: "not_found" });
      return;
    }

    const [materials, flashcards, quiz, noteRows, bounties, enrollments, trophyRows] =
      await Promise.all([
        db.select({ value: count() }).from(studyMaterials).where(eq(studyMaterials.userId, claims.sub)),
        db.select({ value: count() }).from(studyFlashcards).where(eq(studyFlashcards.userId, claims.sub)),
        db
          .select({
            attempts: count(),
            averageScore: drizzleSql<number>`coalesce(avg(${quizAttempts.scorePct}), 0)`,
            xpEarned: drizzleSql<number>`coalesce(sum(${quizAttempts.awardedXp}), 0)`,
          })
          .from(quizAttempts)
          .where(eq(quizAttempts.userId, claims.sub)),
        db
          .select({ value: count() })
          .from(notes)
          .where(and(eq(notes.userId, claims.sub), isNull(notes.deletedAt))),
        db.select({ value: count() }).from(bountyClaims).where(eq(bountyClaims.userId, claims.sub)),
        db
          .select({ value: count() })
          .from(courseEnrollments)
          .where(eq(courseEnrollments.userId, claims.sub)),
        db.select().from(userTrophies).where(eq(userTrophies.userId, claims.sub)),
      ]);

    const quizRow = quiz[0];
    res.json({
      profile: mapUser(row as unknown as UserRow),
      stats: {
        materials: Number(materials[0]?.value ?? 0),
        flashcards: Number(flashcards[0]?.value ?? 0),
        notes: Number(noteRows[0]?.value ?? 0),
        bountiesClaimed: Number(bounties[0]?.value ?? 0),
        enrollments: Number(enrollments[0]?.value ?? 0),
        quizAttempts: Number(quizRow?.attempts ?? 0),
        quizAverageScore: Math.round(Number(quizRow?.averageScore ?? 0)),
        quizXpEarned: Number(quizRow?.xpEarned ?? 0),
      },
      trophies: trophyRows,
      refreshedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token", code: "unauthorized" });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/users/me failed");
  }
});

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
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/users/:id failed");
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const clerkUserId = claims.sub;
    const values = buildUserCreateValues(clerkUserId, req.body);

    try {
      await db.insert(users).values(values);
    } catch (err: any) {
      if (err?.code === "23505") {
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.id, clerkUserId))
          .limit(1);
        if (existing) {
          res.status(200).json(mapUser(existing as unknown as UserRow));
          return;
        }
      }
      throw err;
    }

    console.debug(`[Server] POST /api/users — created ${clerkUserId}`);
    res.status(201).json(mapUser(values as unknown as UserRow));
  } catch (err: any) {
    if (err instanceof ProfilePayloadError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token" });
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

    const updateData = buildUserUpdateValues(req.body);

    await db.update(users).set(updateData).where(eq(users.id, req.params.id));
    console.debug(`[Server] PUT /api/users/${req.params.id} — updated`);
    res.status(204).end();
  } catch (err: any) {
    if (err instanceof ProfilePayloadError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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

    res.json({ days, daysData: rows, activity: rows, totalDays: rows.length });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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
  let claims: { sub: string } | null = null;
  try {
    claims = await verifyClerkToken(req.headers.authorization);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token" });
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

  if (claims?.sub !== userId) {
    res.status(403).json({ error: "Forbidden" });
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
  let idemKey: string | null = null;
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const body = req.body ?? {};

    const userId = body.userId;
    const bounty = body.bounty ?? {};

    if (!userId || claims.sub !== userId || !bounty?.id) {
      res.status(400).json({ error: "Missing userId or bounty id" });
      return;
    }

    const idem = beginIdempotent(req, claims.sub);
    if (idem.state === "replay") {
      res.status(idem.status).json(idem.body);
      return;
    }
    if (idem.state === "pending") {
      res.status(409).json({ error: "Claim already in progress", code: "idempotency_in_progress" });
      return;
    }
    if (idem.state === "new") idemKey = idem.key;

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
      const payload = { claimed: false, alreadyClaimed: true };
      if (idemKey) finishIdempotent(idemKey, 200, payload);
      res.json(payload);
      return;
    }

    console.debug(`[Server] POST /api/bounties/claim — ${userId} claimed ${bounty.id}`);
    const payload = { claimed: true, alreadyClaimed: false, date: today };
    if (idemKey) finishIdempotent(idemKey, 201, payload);
    res.status(201).json(payload);
  } catch (err: any) {
    if (idemKey) abortIdempotent(idemKey);
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/bounties/claim failed");
  }
});

// --- Daily Spin ---

const SPIN_DAILY_LIMIT = 3;
const SPIN_PRIZES = [
  { id: "continue_learning", label: "Continue Learning", type: "navigate", rewardXp: 0, rewardCoins: 0 },
  { id: "course_plan", label: "Course Plan", type: "navigate", rewardXp: 0, rewardCoins: 0 },
  { id: "review_time", label: "Review Time", type: "navigate", rewardXp: 0, rewardCoins: 0 },
  { id: "bounty_hunt", label: "Bounty Hunt", type: "navigate", rewardXp: 0, rewardCoins: 0 },
  { id: "xp_10", label: "+10 XP", type: "reward", rewardXp: 10, rewardCoins: 0 },
  { id: "xp_25", label: "+25 XP", type: "reward", rewardXp: 25, rewardCoins: 0 },
  { id: "coins_5", label: "+5 Coins", type: "reward", rewardXp: 0, rewardCoins: 5 },
  { id: "free_spin", label: "Free Spin", type: "free_spin", rewardXp: 0, rewardCoins: 0 },
] as const;

function nextUtcMidnight(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
}

async function readSpinStatus(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const todayRows = await db
    .select({
      total: count(),
      used: drizzleSql<number>`count(*) filter (where ${spinClaims.consumesSpin})`,
      lastSpinAt: drizzleSql<string | null>`max(${spinClaims.claimedAt})`,
    })
    .from(spinClaims)
    .where(and(eq(spinClaims.userId, userId), eq(spinClaims.date, today)));
  const lifetimeRows = await db
    .select({ value: count() })
    .from(spinClaims)
    .where(eq(spinClaims.userId, userId));

  const todayRow = todayRows[0];
  const lifetimeRow = lifetimeRows[0];
  const used = Number(todayRow?.used ?? 0);
  const spinsRemaining = Math.max(0, SPIN_DAILY_LIMIT - used);
  return {
    date: today,
    dailyLimit: SPIN_DAILY_LIMIT,
    spinsUsed: used,
    spinsToday: Number(todayRow?.total ?? 0),
    spinsRemaining,
    canSpin: spinsRemaining > 0,
    totalSpins: Number(lifetimeRow?.value ?? 0),
    lastSpinAt: todayRow?.lastSpinAt ? new Date(todayRow.lastSpinAt).toISOString() : null,
    nextResetAt: nextUtcMidnight(),
  };
}

app.get("/api/spin/status", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    res.json(await readSpinStatus(claims.sub));
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token", code: "unauthorized" });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/spin/status failed");
  }
});

app.post("/api/spin", async (req, res) => {
  let idemKey: string | null = null;
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const userId = claims.sub;

    const idem = beginIdempotent(req, userId);
    if (idem.state === "replay") {
      res.status(idem.status).json(idem.body);
      return;
    }
    if (idem.state === "pending") {
      res.status(409).json({ error: "Spin already in progress", code: "idempotency_in_progress" });
      return;
    }
    if (idem.state === "new") idemKey = idem.key;

    const [user] = await db
      .select({ xp: users.xp, coins: users.coins })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) {
      if (idemKey) abortIdempotent(idemKey);
      res.status(404).json({ error: "Profile not found", code: "not_found" });
      return;
    }

    const before = await readSpinStatus(userId);
    if (!before.canSpin) {
      const payload = { ...before, spun: false, reason: "daily_limit" as const };
      if (idemKey) finishIdempotent(idemKey, 200, payload);
      res.json(payload);
      return;
    }

    const prize = SPIN_PRIZES[crypto.randomInt(SPIN_PRIZES.length)];
    const consumesSpin = prize.type !== "free_spin";
    const today = new Date().toISOString().slice(0, 10);
    const spinIndex = before.spinsToday + 1;

    const [claim] = await db
      .insert(spinClaims)
      .values({
        userId,
        date: today,
        spinIndex,
        prizeId: prize.id,
        prizeType: prize.type,
        label: prize.label,
        rewardXp: prize.rewardXp,
        rewardCoins: prize.rewardCoins,
        consumesSpin,
      })
      .onConflictDoNothing()
      .returning({ id: spinClaims.id, claimedAt: spinClaims.claimedAt });

    if (!claim) {
      if (idemKey) abortIdempotent(idemKey);
      res.status(409).json({ error: "Spin already recorded", code: "spin_conflict" });
      return;
    }

    let balances = user;
    if (prize.rewardXp > 0 || prize.rewardCoins > 0) {
      const [updated] = await db
        .update(users)
        .set({
          xp: drizzleSql`${users.xp} + ${prize.rewardXp}`,
          coins: drizzleSql`${users.coins} + ${prize.rewardCoins}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({ xp: users.xp, coins: users.coins });
      if (updated) balances = updated;
    }

    const after = await readSpinStatus(userId);
    const payload = {
      spun: true,
      id: claim.id,
      prizeId: prize.id,
      segmentIndex: SPIN_PRIZES.indexOf(prize),
      label: prize.label,
      type: prize.type,
      rewardXp: prize.rewardXp,
      rewardCoins: prize.rewardCoins,
      claimedAt: claim.claimedAt,
      xp: balances.xp,
      coins: balances.coins,
      ...after,
    };

    console.debug(
      `[Server] POST /api/spin — ${userId} won ${prize.id} (+${prize.rewardXp}xp, +${prize.rewardCoins}coins)`,
    );
    if (idemKey) finishIdempotent(idemKey, 201, payload);
    res.status(201).json(payload);
  } catch (err: any) {
    if (idemKey) abortIdempotent(idemKey);
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token", code: "unauthorized" });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/spin failed");
  }
});

// --- Course Routes ---

app.get("/api/courses", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);

    const rows = await db
      .select()
      .from(courses)
      .where(
        and(
          isNull(courses.deletedAt),
          or(
            eq(courses.creatorId, claims.sub),
            inArray(
              courses.id,
              db
                .select({ courseId: courseEnrollments.courseId })
                .from(courseEnrollments)
                .where(eq(courseEnrollments.userId, claims.sub)),
            ),
          ),
        ),
      )
      .orderBy(desc(courses.pinned), courses.createdAt);

    res.json(rows);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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

    const [existing] = await db
      .select({ id: courses.id, creatorId: courses.creatorId })
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    sendRouteError(res, err, "[Server] DELETE /api/courses/:id failed");
  }
});

type CloudinaryResourceType = "image" | "video";

interface CloudinaryUploadOptions {
  resourceType?: CloudinaryResourceType;
}

async function uploadToCloudinary(
  base64: string,
  mimeType = "image/png",
  options: CloudinaryUploadOptions = {},
): Promise<string> {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const resourceType = options.resourceType ?? "image";
  const imagePreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName) {
    throw new Error("Cloudinary cloud name is not configured");
  }

  let uploadPreset =
    resourceType === "video"
      ? process.env.CLOUDINARY_AUDIO_UPLOAD_PRESET || ""
      : imagePreset || "";

  if (!uploadPreset && !(apiKey && apiSecret) && resourceType === "video") {
    uploadPreset = imagePreset || "";
  }

  const formData = new URLSearchParams();
  formData.append("file", `data:${mimeType};base64,${base64}`);

  if (uploadPreset) {
    formData.append("upload_preset", uploadPreset);
  } else if (apiKey && apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHash("sha1")
      .update(`timestamp=${timestamp}${apiSecret}`)
      .digest("hex");
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
  } else {
    throw new Error("Cloudinary upload is not configured");
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    },
  );

  const data = (await response.json().catch(() => null)) as {
    secure_url?: string;
    error?: { message?: string };
  } | null;

  if (!response.ok || !data?.secure_url) {
    const err = new Error(
      data?.error?.message || `Cloudinary upload failed (${response.status})`,
    );
    (err as { statusCode?: number }).statusCode = 502;
    (err as { expose?: boolean }).expose = true;
    throw err;
  }

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

    if (Buffer.byteLength(base64, "base64") > MAX_FILE_BYTES) {
      res.status(413).json({ error: "File too large (max 25 MB)" });
      return;
    }

    const secure_url = await uploadToCloudinary(
      base64,
      typeof mimeType === "string" && mimeType ? mimeType : undefined,
    );
    res.json({ secure_url });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/uploads/cloudinary failed");
  }
});

// --- Animated Lesson Routes ---

const LESSON_ID_RE = /^lsn_[A-Za-z0-9-]{8,64}$/;
const LESSON_EXPLAIN_ACTIONS: LessonExplainAction[] = [
  "simplify",
  "example",
  "why",
];

type CourseRow = typeof courses.$inferSelect;

type CourseAccess =
  | { status: "ok"; course: CourseRow }
  | { status: "not_found" }
  | { status: "forbidden" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseLessonIndex(value: string): number | null {
  if (!/^\d{1,3}$/.test(value)) return null;
  return Number(value);
}

function readCourseChapters(raw: string): Chapter[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const entries: unknown[] = parsed;
    return entries.filter(
      (entry): entry is Chapter =>
        isRecord(entry) &&
        typeof entry.title === "string" &&
        Array.isArray(entry.subtopics),
    );
  } catch {
    return [];
  }
}

function resolveLessonSource(
  course: CourseRow,
  chapterIndex: number,
  subtopicIndex: number,
): { chapter: Chapter; subtopic: Subtopic } | null {
  const chapter = readCourseChapters(course.chapters)[chapterIndex];
  if (!chapter) return null;
  const subtopic = chapter.subtopics[subtopicIndex];
  if (
    !subtopic ||
    typeof subtopic.title !== "string" ||
    typeof subtopic.content !== "string" ||
    !subtopic.title.trim() ||
    !subtopic.content.trim()
  ) {
    return null;
  }
  return { chapter, subtopic };
}

function lessonHash(
  course: CourseRow,
  chapter: Chapter,
  subtopic: Subtopic,
): string {
  return lessonSourceHash(
    subtopic.title,
    subtopic.content,
    `${course.title}\n${course.difficulty}\n${chapter.title}\n${chapter.description}`,
  );
}

async function getCourseAccess(
  courseId: string,
  userId: string,
): Promise<CourseAccess> {
  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, courseId), isNull(courses.deletedAt)))
    .limit(1);

  if (!course) return { status: "not_found" };
  if (course.creatorId === userId || !!course.isPublic) {
    return { status: "ok", course };
  }

  const [enrollment] = await db
    .select({ id: courseEnrollments.id })
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.courseId, course.id),
        eq(courseEnrollments.userId, userId),
      ),
    )
    .limit(1);

  if (!enrollment) return { status: "forbidden" };
  return { status: "ok", course };
}

function readLessonScript(
  row: typeof lessonScripts.$inferSelect,
): LessonScriptDraft {
  const raw = row.script as unknown;
  if (isRecord(raw) && Array.isArray(raw.slides)) {
    return {
      title: typeof raw.title === "string" ? raw.title : row.title,
      slides: raw.slides as LessonScriptDraft["slides"],
    };
  }
  return { title: row.title, slides: [] };
}

function readLessonStatus(value: string): LessonStatus {
  return value === "audio_ready" || value === "failed" ? value : "script_ready";
}

function mapLessonRow(row: typeof lessonScripts.$inferSelect): LessonScript {
  const script = readLessonScript(row);
  return {
    id: row.id,
    courseId: row.courseId,
    chapterIndex: row.chapterIndex,
    subtopicIndex: row.subtopicIndex,
    title: script.title,
    slides: script.slides,
    audio: Array.isArray(row.audio) ? row.audio : [],
    voice: row.voice,
    ttsModel: row.ttsModel,
    sourceHash: row.sourceHash,
    status: readLessonStatus(row.status),
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

function speechErrorStatus(err: unknown): number {
  const value = err as {
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
  };
  for (const candidate of [value?.status, value?.statusCode, value?.code]) {
    const numeric =
      typeof candidate === "number" ? candidate : Number(candidate);
    if (Number.isInteger(numeric) && numeric > 0) return numeric;
  }
  return 0;
}

async function generateSpeechWithRetry(
  ai: ReturnType<typeof getGemini>,
  text: string,
  voice: string,
): Promise<Awaited<ReturnType<typeof generateSpeech>>> {
  try {
    return await generateSpeech(ai, text, voice);
  } catch (err) {
    const status = speechErrorStatus(err);
    if (status !== 429 && status !== 500 && status !== 503) throw err;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return generateSpeech(ai, text, voice);
  }
}

function attachEquationSvgs(draft: LessonScriptDraft): LessonScriptDraft {
  const slides = draft.slides.map((slide) => {
    if (slide.visual.kind !== "equation") return slide;
    try {
      return {
        ...slide,
        visual: { ...slide.visual, svg: latexToSvg(slide.visual.latex) },
      };
    } catch (err) {
      console.warn(
        `[Server] MathJax could not render ${slide.id} (${draft.title}):`,
        err instanceof Error ? err.message : err,
      );
      return slide;
    }
  });
  return { ...draft, slides };
}

app.get(
  "/api/courses/:id/lessons/:chapterIndex/:subtopicIndex",
  async (req, res) => {
    try {
      const claims = await verifyClerkToken(req.headers.authorization);
      const chapterIndex = parseLessonIndex(req.params.chapterIndex);
      const subtopicIndex = parseLessonIndex(req.params.subtopicIndex);
      if (chapterIndex === null || subtopicIndex === null) {
        res.status(400).json({ error: "Invalid chapter or subtopic index" });
        return;
      }

      const access = await getCourseAccess(req.params.id, claims.sub);
      if (access.status === "not_found") {
        console.warn(
          `[Server] GET lesson: course not found (${req.params.id}, ${chapterIndex}/${subtopicIndex})`,
        );
        res
          .status(404)
          .json({ error: "Course not found", code: "course_not_found" });
        return;
      }
      if (access.status === "forbidden") {
        res.status(403).json({ error: "This course is private" });
        return;
      }

      const source = resolveLessonSource(
        access.course,
        chapterIndex,
        subtopicIndex,
      );
      if (!source) {
        console.warn(
          `[Server] GET lesson: source not found (${req.params.id}, ${chapterIndex}/${subtopicIndex})`,
        );
        res.status(404).json({
          error: "Chapter or subtopic not found",
          code: "lesson_source_not_found",
        });
        return;
      }

      const [row] = await db
        .select()
        .from(lessonScripts)
        .where(
          and(
            eq(lessonScripts.courseId, access.course.id),
            eq(lessonScripts.chapterIndex, chapterIndex),
            eq(lessonScripts.subtopicIndex, subtopicIndex),
          ),
        )
        .limit(1);

      if (!row) {
        res
          .status(404)
          .json({ error: "Lesson not generated", code: "lesson_missing" });
        return;
      }

      if (
        row.sourceHash !==
        lessonHash(access.course, source.chapter, source.subtopic)
      ) {
        res
          .status(404)
          .json({ error: "Lesson needs regeneration", code: "lesson_stale" });
        return;
      }

      res.json(mapLessonRow(row));
    } catch (err) {
      if (isTokenError(err)) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }
      sendRouteError(res, err, "[Server] GET lesson failed");
    }
  },
);

app.post(
  "/api/courses/:id/lessons/:chapterIndex/:subtopicIndex/generate",
  async (req, res) => {
    try {
      const claims = await verifyClerkToken(req.headers.authorization);
      const chapterIndex = parseLessonIndex(req.params.chapterIndex);
      const subtopicIndex = parseLessonIndex(req.params.subtopicIndex);
      if (chapterIndex === null || subtopicIndex === null) {
        res.status(400).json({ error: "Invalid chapter or subtopic index" });
        return;
      }

      const access = await getCourseAccess(req.params.id, claims.sub);
      if (access.status === "not_found") {
        console.warn(
          `[Server] POST lesson generate: course not found (${req.params.id}, ${chapterIndex}/${subtopicIndex})`,
        );
        res
          .status(404)
          .json({ error: "Course not found", code: "course_not_found" });
        return;
      }
      if (access.status === "forbidden") {
        res.status(403).json({ error: "This course is private" });
        return;
      }

      const source = resolveLessonSource(
        access.course,
        chapterIndex,
        subtopicIndex,
      );
      if (!source) {
        console.warn(
          `[Server] POST lesson generate: source not found (${req.params.id}, ${chapterIndex}/${subtopicIndex})`,
        );
        res.status(404).json({
          error: "Chapter or subtopic not found",
          code: "lesson_source_not_found",
        });
        return;
      }

      const sourceHash = lessonHash(
        access.course,
        source.chapter,
        source.subtopic,
      );

      const [existing] = await db
        .select()
        .from(lessonScripts)
        .where(
          and(
            eq(lessonScripts.courseId, access.course.id),
            eq(lessonScripts.chapterIndex, chapterIndex),
            eq(lessonScripts.subtopicIndex, subtopicIndex),
          ),
        )
        .limit(1);

      if (existing && existing.sourceHash === sourceHash) {
        res.json(mapLessonRow(existing));
        return;
      }

      const { modelRef, apiKey } = aiRequestOptions(req);
      const prompt = buildLessonScriptPrompt({
        courseTitle: access.course.title,
        chapterTitle: source.chapter.title,
        chapterDescription: source.chapter.description,
        difficulty: access.course.difficulty,
        subtopicTitle: source.subtopic.title,
        subtopicContent: source.subtopic.content,
        slideCount: 6,
      });

      const draft = await generateLessonScript(modelRef, prompt, apiKey);
      const script = attachEquationSvgs(draft);

      const [row] = await db
        .insert(lessonScripts)
        .values({
          id: `lsn_${crypto.randomUUID()}`,
          courseId: access.course.id,
          chapterIndex,
          subtopicIndex,
          title: script.title,
          script,
          audio: [],
          voice: TTS_VOICE,
          ttsModel: TTS_MODEL,
          sourceHash,
          status: "script_ready",
          version: 1,
        })
        .onConflictDoUpdate({
          target: [
            lessonScripts.courseId,
            lessonScripts.chapterIndex,
            lessonScripts.subtopicIndex,
          ],
          set: {
            title: script.title,
            script,
            audio: [],
            voice: TTS_VOICE,
            ttsModel: TTS_MODEL,
            sourceHash,
            status: "script_ready",
            version: drizzleSql`${lessonScripts.version} + 1`,
            updatedAt: new Date(),
          },
        })
        .returning();

      res.status(existing ? 200 : 201).json(mapLessonRow(row));
    } catch (err) {
      if (isTokenError(err)) {
        res.status(401).json({ error: "Invalid token" });
        return;
      }
      sendRouteError(res, err, "[Server] POST lesson generate failed");
    }
  },
);

app.post("/api/lessons/:id/audio", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const lessonId = req.params.id;
    if (!LESSON_ID_RE.test(lessonId)) {
      res.status(400).json({ error: "Invalid lesson id" });
      return;
    }

    const [row] = await db
      .select()
      .from(lessonScripts)
      .where(eq(lessonScripts.id, lessonId))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    const access = await getCourseAccess(row.courseId, claims.sub);
    if (access.status === "not_found") {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (access.status === "forbidden") {
      res.status(403).json({ error: "This course is private" });
      return;
    }

    const source = resolveLessonSource(
      access.course,
      row.chapterIndex,
      row.subtopicIndex,
    );
    if (
      !source ||
      row.sourceHash !==
        lessonHash(access.course, source.chapter, source.subtopic)
    ) {
      res
        .status(409)
        .json({ error: "Lesson needs regeneration", code: "lesson_stale" });
      return;
    }

    const script = readLessonScript(row);
    if (script.slides.length === 0) {
      res.status(422).json({ error: "Lesson script is empty" });
      return;
    }

    const cachedAudio = new Map(
      (Array.isArray(row.audio) ? row.audio : []).map((clip) => [
        clip.slideId,
        clip,
      ]),
    );
    const complete = script.slides.every(
      (slide) => !!cachedAudio.get(slide.id)?.url,
    );

    if (complete) {
      if (row.status !== "audio_ready") {
        await db
          .update(lessonScripts)
          .set({ status: "audio_ready", updatedAt: new Date() })
          .where(eq(lessonScripts.id, row.id));
      }
      res.json(mapLessonRow({ ...row, status: "audio_ready" }));
      return;
    }

    const { modelRef, apiKey } = aiRequestOptions(req);
    const geminiKey = modelRef.startsWith("gemini::") ? apiKey : undefined;
    const ai = getGemini(geminiKey);
    const voice = row.voice || TTS_VOICE;
    const clips: (LessonAudioClip | undefined)[] = script.slides.map(
      (slide) => {
        const cached = cachedAudio.get(slide.id);
        return cached?.url ? cached : undefined;
      },
    );
    const pending = script.slides
      .map((slide, index) => ({ slide, index }))
      .filter(({ index }) => !clips[index]);
    let cursor = 0;
    let failed = 0;

    const worker = async () => {
      while (cursor < pending.length) {
        const current = pending[cursor];
        cursor += 1;
        if (!current) return;
        const { slide, index } = current;

        try {
          const speech = await generateSpeechWithRetry(
            ai,
            slide.narration,
            voice,
          );
          const wav = pcmToWav(speech.base64, {
            sampleRate: pcmRateFromMime(speech.mimeType),
          });
          const uploadedUrl = await uploadToCloudinary(
            wav.base64,
            "audio/wav",
            { resourceType: "video" },
          );
          clips[index] = {
            slideId: slide.id,
            url: lessonAudioDeliveryUrl(uploadedUrl),
            durationMs: wav.durationMs,
            mimeType: "audio/mpeg",
          };
        } catch (err) {
          failed += 1;
          console.warn(
            `[Server] Lesson audio failed for ${row.id}/${slide.id}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(3, pending.length) }, () => worker()),
    );

    const audio = clips.filter(
      (clip): clip is LessonAudioClip => clip !== undefined,
    );
    const status: LessonStatus = failed === 0 ? "audio_ready" : "script_ready";
    await db
      .update(lessonScripts)
      .set({ audio, status, updatedAt: new Date() })
      .where(eq(lessonScripts.id, row.id));

    const payload = mapLessonRow({ ...row, audio, status });
    if (failed > 0) {
      payload.audioError =
        failed === script.slides.length
          ? "Narration is unavailable right now. You can still read every slide."
          : `Narration is unavailable for ${failed} of ${script.slides.length} slides.`;
    }
    res.json(payload);
  } catch (err) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    sendRouteError(res, err, "[Server] POST lesson audio failed");
  }
});

app.post("/api/lessons/:id/explain", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const lessonId = req.params.id;
    if (!LESSON_ID_RE.test(lessonId)) {
      res.status(400).json({ error: "Invalid lesson id" });
      return;
    }

    const { slideId, action } = req.body ?? {};
    if (typeof slideId !== "string" || !slideId || slideId.length > 32) {
      res.status(400).json({ error: "Missing required field: slideId" });
      return;
    }
    if (
      typeof action !== "string" ||
      !LESSON_EXPLAIN_ACTIONS.includes(action as LessonExplainAction)
    ) {
      res.status(400).json({
        error: "Invalid action. Use simplify, example, or why.",
      });
      return;
    }

    const [row] = await db
      .select()
      .from(lessonScripts)
      .where(eq(lessonScripts.id, lessonId))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    const access = await getCourseAccess(row.courseId, claims.sub);
    if (access.status === "not_found") {
      res.status(404).json({ error: "Course not found" });
      return;
    }
    if (access.status === "forbidden") {
      res.status(403).json({ error: "This course is private" });
      return;
    }

    const source = resolveLessonSource(
      access.course,
      row.chapterIndex,
      row.subtopicIndex,
    );
    if (
      !source ||
      row.sourceHash !==
        lessonHash(access.course, source.chapter, source.subtopic)
    ) {
      res
        .status(409)
        .json({ error: "Lesson needs regeneration", code: "lesson_stale" });
      return;
    }

    const script = readLessonScript(row);
    const slide = script.slides.find((entry) => entry.id === slideId);
    if (!slide) {
      res.status(404).json({ error: "Slide not found" });
      return;
    }

    const { modelRef, apiKey } = aiRequestOptions(req);
    const prompt = buildLessonExplainPrompt({
      lessonTitle: script.title,
      slide,
      action: action as LessonExplainAction,
    });
    const text = (
      await generateText({ modelRef, prompt, apiKey, json: false })
    ).trim();
    if (!text) {
      res.status(422).json({ error: "AI returned an empty explanation" });
      return;
    }

    res.json({ text: text.slice(0, 1600) });
  } catch (err) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    sendRouteError(res, err, "[Server] POST lesson explain failed");
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
    const claims = await verifyClerkToken(req.headers.authorization);

    const rows = await db
      .select()
      .from(courseEnrollments)
      .where(eq(courseEnrollments.userId, claims.sub));

    res.json(rows);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/enrollments failed");
  }
});

app.post("/api/enrollments", async (req, res) => {
  let enrollmentUserId = "";
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    enrollmentUserId = claims.sub;
    const body = req.body;

    if (!body.courseId) {
      res.status(400).json({ error: "Missing courseId" });
      return;
    }

    const [course] = await db
      .select({ id: courses.id, creatorId: courses.creatorId, isPublic: courses.isPublic })
      .from(courses)
      .where(and(eq(courses.id, body.courseId), isNull(courses.deletedAt)))
      .limit(1);

    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    if (course.creatorId !== claims.sub && !course.isPublic) {
      res.status(403).json({ error: "You cannot enroll in this course" });
      return;
    }

    const [existingEnrollment] = await db
      .select()
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.userId, claims.sub),
          eq(courseEnrollments.courseId, body.courseId),
        ),
      )
      .limit(1);

    if (existingEnrollment) {
      res.status(200).json(existingEnrollment);
      return;
    }

    const id = `enr_${claims.sub}_${body.courseId}_${Date.now()}`;
    const now = new Date();

    const values = {
      id,
      userId: claims.sub,
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
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    if (err?.code === "23505") {
      const [existing] = await db
        .select()
        .from(courseEnrollments)
        .where(
          and(
            eq(courseEnrollments.userId, enrollmentUserId),
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    sendRouteError(res, err, "[Server] DELETE /api/enrollments/:id failed");
  }
});

// --- User Trophy Routes ---

app.get("/api/user-trophies", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);

    const rows = await db
      .select()
      .from(userTrophies)
      .where(eq(userTrophies.userId, claims.sub));

    res.json(rows);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/user-trophies failed");
  }
});

app.post("/api/user-trophies", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const body = req.body;
    const userId = claims.sub;

    if (!body.trophyId) {
      res.status(400).json({ error: "Missing trophyId" });
      return;
    }

    // Check if already earned
    const [existing] = await db
      .select()
      .from(userTrophies)
      .where(
        and(
          eq(userTrophies.userId, userId),
          eq(userTrophies.trophyId, body.trophyId),
        ),
      )
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Trophy already earned" });
      return;
    }

    const id = `ut_${userId}_${body.trophyId}`;
    const values = {
      id,
      userId,
      trophyId: body.trophyId,
      earnedAt: new Date(),
    };

    await db.insert(userTrophies).values(values);

    // Also update the legacy earnedTrophies field on users
    const [userRow] = await db
      .select({ earnedTrophies: users.earnedTrophies })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userRow) {
      let list: string[] = [];
      try { list = JSON.parse(userRow.earnedTrophies); } catch { /* ignore */ }
      if (!list.includes(body.trophyId)) {
        list.push(body.trophyId);
        await db
          .update(users)
          .set({ earnedTrophies: JSON.stringify(list) })
          .where(eq(users.id, userId));
      }
    }

    console.debug(`[Server] POST /api/user-trophies — awarded ${body.trophyId} to ${userId}`);
    res.status(201).json(values);
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/user-trophies failed");
  }
});

app.post("/api/user-trophies/check", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const userId = claims.sub;

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
      res.status(401).json({ error: "Invalid token" });
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

const CLOUDINARY_HOST_SUFFIX = "cloudinary.com";
const STUDY_FETCH_ALLOWLIST = (process.env.STUDY_FETCH_ALLOWLIST ?? "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host.endsWith(CLOUDINARY_HOST_SUFFIX)) return true;
  return STUDY_FETCH_ALLOWLIST.some((h) => host === h || host.endsWith(`.${h}`));
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  const a = parts[0] ?? -1;
  const b = parts[1] ?? -1;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  const [lhs] = lower.split("::");
  const head = lhs ? lhs.split(":")[0] : "0";
  const first = parseInt(head || "0", 16);
  if (!Number.isFinite(first)) return false;
  if (first >= 0xfc00 && first <= 0xfdff) return true;
  if (first >= 0xfe80 && first <= 0xfebf) return true;
  return false;
}

async function assertFetchableUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid file URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) file URLs are allowed");
  }
  const hostname = parsed.hostname;
  if (!hostAllowed(hostname)) {
    throw new Error("File URL not allowed");
  }
  if (net.isIP(hostname) !== 0) {
    if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
      throw new Error("File URL not allowed");
    }
    return;
  }
  const addresses = await dns.promises.lookup(hostname, { all: true }).catch(() => []);
  for (const { address } of addresses) {
    if (isPrivateIpv4(address) || isPrivateIpv6(address)) {
      throw new Error("File URL not allowed");
    }
  }
}

type FetchResponse = Awaited<ReturnType<typeof fetch>>;

async function safeFetchUrl(url: string): Promise<FetchResponse> {
  let current = url;
  for (let hop = 0; hop <= 2; hop++) {
    await assertFetchableUrl(current);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let res: FetchResponse;
    try {
      res = await fetch(current, { redirect: "manual", signal: controller.signal });
    } catch {
      throw new Error("Failed to fetch file");
    } finally {
      clearTimeout(timeout);
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Unsafe redirect");
      current = new URL(location, current).toString();
      continue;
    }
    if (!res.ok) throw new Error(`Failed to fetch file: HTTP ${res.status}`);
    return res;
  }
  throw new Error("Too many redirects");
}

async function fetchFileBytes(fileUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  // Relative path → read the file we own on disk instead of an HTTP self-call.
  if (fileUrl.startsWith("/uploads/")) {
    const filename = path.basename(fileUrl);
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) throw new Error("File not found");
    const buffer = await fs.promises.readFile(filePath);
    if (buffer.length > MAX_FILE_BYTES) throw new Error("File too large (max 25 MB)");
    return { buffer, mimeType: mimeFromExtension(filename) };
  }

  const res = await safeFetchUrl(fileUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_FILE_BYTES) throw new Error("File too large (max 25 MB)");
  const contentType = res.headers.get("content-type");
  const mimeType = contentType ? contentType.split(";")[0] : mimeFromExtension(res.url);
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

    const rows = await db
      .select()
      .from(studyMaterials)
      .where(eq(studyMaterials.userId, claims.sub))
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

const UPLOAD_SIGNING_SECRET =
  process.env.UPLOAD_SIGNING_SECRET || CLERK_SECRET_KEY || "yuinx-upload-signing";
const UPLOAD_URL_TTL_SECONDS = Number(process.env.UPLOAD_URL_TTL_SECONDS ?? 60 * 60);

function uploadSignature(filename: string, expires: number): string {
  return crypto
    .createHmac("sha256", UPLOAD_SIGNING_SECRET)
    .update(`${filename}:${expires}`)
    .digest("base64url");
}

function buildSignedUploadUrl(filename: string): { url: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + UPLOAD_URL_TTL_SECONDS;
  const token = uploadSignature(filename, expiresAt);
  return {
    url: `/uploads/${encodeURIComponent(filename)}?expires=${expiresAt}&token=${token}`,
    expiresAt,
  };
}

function uploadTokenValid(filename: string, expiresRaw: string, token: string): boolean {
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const expected = uploadSignature(filename, expires);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.use(
  "/uploads",
  (req: Request, res: Response, next: NextFunction) => {
    const token = req.query.token;
    const expires = req.query.expires;
    const filename = path.basename(decodeURIComponent(req.path));
    if (
      typeof token === "string" &&
      typeof expires === "string" &&
      uploadTokenValid(filename, expires, token)
    ) {
      next();
      return;
    }
    void requireAuth(req, res, next);
  },
  express.static(UPLOADS_DIR, {
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", "inline");
    },
  }),
);

const ALLOWED_UPLOAD_EXTS = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".txt",
  ".md",
  ".doc",
  ".docx",
  ".m4a",
  ".mp4",
  ".mp3",
  ".wav",
  ".json",
]);

function failUpload(message: string, statusCode: number): never {
  const err = new Error(message);
  (err as any).statusCode = statusCode;
  (err as any).expose = true;
  throw err;
}

function decodeBase64Payload(value: string): Buffer {
  const bare = value.replace(/^data:[^;]+;base64,/, "");
  return Buffer.from(bare, "base64");
}

async function saveUploadBuffer(
  base64: string,
  filename: string,
): Promise<{ filename: string; path: string; size: number }> {
  const ext = path.extname(filename).toLowerCase();
  if (!ext || !ALLOWED_UPLOAD_EXTS.has(ext)) {
    failUpload("File type not allowed", 400);
  }

  const buffer = decodeBase64Payload(base64);
  if (buffer.length === 0) failUpload("Empty file", 400);
  if (buffer.length > MAX_FILE_BYTES) failUpload("File too large (max 25 MB)", 413);

  const safeName = `${crypto.randomUUID()}${ext}`;
  await fs.promises.writeFile(path.join(UPLOADS_DIR, safeName), buffer);
  return { filename: safeName, path: `/uploads/${safeName}`, size: buffer.length };
}

app.post("/api/uploads", async (req, res) => {
  try {
    await verifyClerkToken(req.headers.authorization);
    const { base64, filename } = req.body ?? {};
    if (typeof base64 !== "string" || !base64 || typeof filename !== "string" || !filename) {
      res.status(400).json({ error: "Missing required fields: base64, filename", code: "invalid_request" });
      return;
    }

    const saved = await saveUploadBuffer(base64, filename);
    const signed = buildSignedUploadUrl(saved.filename);
    console.debug(`[Server] POST /api/uploads — saved ${saved.filename} (${saved.size} bytes)`);
    res.status(201).json({
      path: saved.path,
      size: saved.size,
      signedUrl: signed.url,
      expiresAt: signed.expiresAt,
    });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token", code: "unauthorized" });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/uploads failed");
  }
});

app.post("/api/study/upload", async (req, res) => {
  try {
    await verifyClerkToken(req.headers.authorization);
    const { base64, filename } = req.body;

    if (!base64 || !filename) {
      res.status(400).json({ error: "Missing required fields: base64, filename" });
      return;
    }

    const saved = await saveUploadBuffer(base64, filename);
    console.debug(`[Server] POST /api/study/upload — saved ${saved.filename}`);
    res.json({ url: saved.path });
  } catch (err: any) {
    if (err?.statusCode) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
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

app.post("/api/study/:id/suggest", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const material = await requireMaterial(req.params.id, claims.sub);

    const biteTitle =
      typeof req.body?.biteTitle === "string" ? req.body.biteTitle.slice(0, 200) : "";
    const biteContent =
      typeof req.body?.biteContent === "string" ? req.body.biteContent.slice(0, 6000) : "";

    const content = biteContent.trim() ? biteContent : materialText(material);
    if (!content.trim()) {
      res.status(400).json({ error: "This material has no extractable content yet" });
      return;
    }

    const prompt = buildStudySuggestPrompt(content, biteTitle.trim() || material.title);

    const ai = aiRequestOptions(req);
    const result = await generateJsonContent<{
      suggestions?: { type?: unknown; title?: unknown; body?: unknown }[];
    }>(ai.modelRef, prompt, ai.apiKey);

    const suggestions = (Array.isArray(result?.suggestions) ? result.suggestions : [])
      .map((s) => ({
        type: typeof s?.type === "string" ? s.type : "examTip",
        title: typeof s?.title === "string" ? s.title.trim().slice(0, 120) : "Quick idea",
        body: typeof s?.body === "string" ? s.body.trim() : "",
      }))
      .filter((s) => s.body.length > 0)
      .slice(0, 6);

    if (suggestions.length === 0) {
      const model = getModelOption(ai.modelRef)?.label ?? ai.modelRef;
      res.status(422).json({
        error: `"${model}" returned no suggestions. Try again or switch to a more reliable model.`,
      });
      return;
    }

    res.json({ suggestions });
  } catch (err) {
    sendRouteError(res, err, "[Server] POST /api/study/:id/suggest failed");
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    sendRouteError(res, err, "[Server] DELETE /api/flashcards/:id failed");
  }
});

// --- Quiz completion + XP rewards ---

app.post("/api/study/:id/quiz/complete", async (req, res) => {
  let idemKey: string | null = null;
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const { correct, total } = req.body;

    if (!Number.isInteger(correct) || !Number.isInteger(total) || total <= 0) {
      res.status(400).json({ error: "Invalid correct/total values" });
      return;
    }

    const idem = beginIdempotent(req, claims.sub);
    if (idem.state === "replay") {
      res.status(idem.status).json(idem.body);
      return;
    }
    if (idem.state === "pending") {
      res.status(409).json({ error: "Quiz result already in progress", code: "idempotency_in_progress" });
      return;
    }
    if (idem.state === "new") idemKey = idem.key;

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

    const payload = { scorePct, awardedXp, isFirstDailyAttempt };
    if (idemKey) finishIdempotent(idemKey, 200, payload);
    res.json(payload);
  } catch (err: any) {
    if (idemKey) abortIdempotent(idemKey);
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    if (isGeminiBusyError(err)) {
      res.status(503).json({
        error: "AI transcription is temporarily busy. Please try again in a few seconds.",
      });
      return;
    }
    console.error("[Server] POST /api/audio/transcribe failed:", err);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});

// --- Notes CRUD (web client; mobile keeps AsyncStorage) ---

const NOTE_TITLE_MAX = 300;
const NOTE_BODY_MAX = 500_000;
const NOTE_TAGS_MAX = 50;
const NOTE_IMAGES_MAX = 50;
const NOTE_AUDIO_MAX = 50;
const NOTE_IMPORT_MAX = 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NoteRow = typeof notes.$inferSelect;

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function cleanNullableText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function sanitizeNoteTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((t): t is string => typeof t === "string" && !!t.trim()))]
    .map((t) => t.trim().slice(0, 64))
    .slice(0, NOTE_TAGS_MAX);
}

function normalizeNoteImages(value: unknown): NoteImage[] {
  if (!Array.isArray(value)) return [];
  const out: NoteImage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const uri = typeof raw.uri === "string" ? raw.uri.slice(0, 2048) : "";
    if (!uri) continue;
    out.push({
      id: typeof raw.id === "string" && raw.id ? raw.id.slice(0, 128) : `img_${crypto.randomUUID()}`,
      uri,
      createdAt:
        typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
          ? raw.createdAt
          : Date.now(),
    });
    if (out.length >= NOTE_IMAGES_MAX) break;
  }
  return out;
}

function normalizeNoteAudio(value: unknown): AudioClip[] {
  if (!Array.isArray(value)) return [];
  const out: AudioClip[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const uri = typeof raw.uri === "string" ? raw.uri.slice(0, 2048) : "";
    if (!uri) continue;
    const waveform = Array.isArray(raw.waveform)
      ? raw.waveform
          .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
          .slice(0, 200)
      : [];
    out.push({
      id: typeof raw.id === "string" && raw.id ? raw.id.slice(0, 128) : `aud_${crypto.randomUUID()}`,
      uri,
      duration:
        typeof raw.duration === "number" && Number.isFinite(raw.duration)
          ? Math.max(0, raw.duration)
          : 0,
      createdAt:
        typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
          ? raw.createdAt
          : Date.now(),
      waveform,
      ...(typeof raw.transcript === "string"
        ? { transcript: raw.transcript.slice(0, 5000) }
        : {}),
    });
    if (out.length >= NOTE_AUDIO_MAX) break;
  }
  return out;
}

function parseNoteDate(value: unknown): Date | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    if (date.getFullYear() >= 2000 && date.getFullYear() <= 2100) return date;
  }
  if (typeof value === "string" && value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return undefined;
}

function signUploadUri(uri: string): string {
  if (!uri.startsWith("/uploads/")) return uri;
  const filename = path.basename(uri.split("?")[0]);
  return buildSignedUploadUrl(filename).url;
}

function mapNote(row: NoteRow, signUrls = true) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    tags: row.tags ?? [],
    images: (row.images ?? []).map((img) => ({
      ...img,
      uri: signUrls ? signUploadUri(img.uri) : img.uri,
    })),
    audio: (row.audio ?? []).map((clip) => ({
      ...clip,
      uri: signUrls ? signUploadUri(clip.uri) : clip.uri,
    })),
    pinned: row.pinned,
    color: row.color,
    sourceNoteId: row.sourceNoteId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

function noteValuesFromInput(
  raw: Record<string, unknown>,
  userId: string,
  forImport: boolean,
): typeof notes.$inferInsert {
  const requestedId = typeof raw.id === "string" && UUID_PATTERN.test(raw.id) ? raw.id : undefined;
  const createdAt = parseNoteDate(raw.createdAt) ?? new Date();
  const updatedAt = parseNoteDate(raw.updatedAt) ?? createdAt;
  return {
    ...(requestedId ? { id: requestedId } : {}),
    userId,
    title: cleanText(raw.title, NOTE_TITLE_MAX),
    body: cleanText(raw.body ?? raw.content, NOTE_BODY_MAX),
    tags: sanitizeNoteTags(raw.tags),
    images: normalizeNoteImages(raw.images),
    audio: normalizeNoteAudio(raw.audio ?? raw.audioClips),
    pinned: raw.pinned === true,
    color: cleanNullableText(raw.color, 32),
    sourceNoteId: forImport
      ? cleanNullableText(raw.id, 128)
      : cleanNullableText(raw.sourceNoteId, 128),
    createdAt,
    updatedAt,
    deletedAt: parseNoteDate(raw.deletedAt) ?? null,
  };
}

app.get("/api/notes", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 500) : 100;
    const offsetRaw = Number(req.query.offset);
    const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? Math.floor(offsetRaw) : 0;
    const includeDeleted = req.query.includeDeleted === "1" || req.query.includeDeleted === "true";

    const conditions = [eq(notes.userId, claims.sub)];
    if (!includeDeleted) conditions.push(isNull(notes.deletedAt));
    const since = parseNoteDate(req.query.since);
    if (since) conditions.push(gte(notes.updatedAt, since));
    const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    if (query) {
      const pattern = `%${query}%`;
      conditions.push(or(ilike(notes.title, pattern), ilike(notes.body, pattern))!);
    }

    const rows = await db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.pinned), desc(notes.updatedAt))
      .limit(limit)
      .offset(offset);

    res.json({ notes: rows.map((row) => mapNote(row)), limit, offset });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token", code: "unauthorized" });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/notes failed");
  }
});

app.post("/api/notes", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const values = noteValuesFromInput(req.body ?? {}, claims.sub, false);
    const [row] = await db.insert(notes).values(values).returning();
    res.status(201).json(mapNote(row, false));
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token", code: "unauthorized" });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/notes failed");
  }
});

app.post("/api/notes/import", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    const incoming = req.body?.notes;
    if (!Array.isArray(incoming) || incoming.length === 0) {
      res.status(400).json({ error: "Missing notes array", code: "invalid_request" });
      return;
    }
    if (incoming.length > NOTE_IMPORT_MAX) {
      res.status(413).json({
        error: `Too many notes in one import (max ${NOTE_IMPORT_MAX})`,
        code: "too_many_notes",
      });
      return;
    }

    const seenSources = new Set<string>();
    const values: (typeof notes.$inferInsert)[] = [];
    for (const item of incoming) {
      if (!item || typeof item !== "object") continue;
      const raw = item as Record<string, unknown>;
      const sourceId = typeof raw.id === "string" ? raw.id : "";
      if (sourceId) {
        if (seenSources.has(sourceId)) continue;
        seenSources.add(sourceId);
      }
      values.push(noteValuesFromInput(raw, claims.sub, true));
    }

    if (values.length === 0) {
      res.status(400).json({ error: "No valid notes found", code: "invalid_request" });
      return;
    }

    let imported = 0;
    for (let i = 0; i < values.length; i += 100) {
      const chunk = values.slice(i, i + 100);
      const rows = await db
        .insert(notes)
        .values(chunk)
        .onConflictDoUpdate({
          target: [notes.userId, notes.sourceNoteId],
          set: {
            title: drizzleSql`excluded.title`,
            body: drizzleSql`excluded.body`,
            tags: drizzleSql`excluded.tags`,
            images: drizzleSql`excluded.images`,
            audio: drizzleSql`excluded.audio`,
            pinned: drizzleSql`excluded.pinned`,
            color: drizzleSql`excluded.color`,
            updatedAt: drizzleSql`excluded.updated_at`,
            deletedAt: drizzleSql`excluded.deleted_at`,
          },
        })
        .returning({ id: notes.id });
      imported += rows.length;
    }

    console.debug(`[Server] POST /api/notes/import — ${imported} notes for ${claims.sub}`);
    res.status(201).json({ imported, received: incoming.length });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token", code: "unauthorized" });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/notes/import failed");
  }
});

app.get("/api/notes/:id", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    if (!UUID_PATTERN.test(req.params.id)) {
      res.status(404).json({ error: "Note not found", code: "not_found" });
      return;
    }
    const [row] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, req.params.id), eq(notes.userId, claims.sub), isNull(notes.deletedAt)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Note not found", code: "not_found" });
      return;
    }
    res.json(mapNote(row));
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token", code: "unauthorized" });
      return;
    }
    sendRouteError(res, err, "[Server] GET /api/notes/:id failed");
  }
});

app.patch("/api/notes/:id", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    if (!UUID_PATTERN.test(req.params.id)) {
      res.status(404).json({ error: "Note not found", code: "not_found" });
      return;
    }

    const raw = (req.body ?? {}) as Record<string, unknown>;
    const updates: Partial<typeof notes.$inferInsert> = { updatedAt: new Date() };
    if (raw.title !== undefined) updates.title = cleanText(raw.title, NOTE_TITLE_MAX);
    if (raw.body !== undefined || raw.content !== undefined) {
      updates.body = cleanText(raw.body ?? raw.content, NOTE_BODY_MAX);
    }
    if (raw.tags !== undefined) updates.tags = sanitizeNoteTags(raw.tags);
    if (raw.images !== undefined) updates.images = normalizeNoteImages(raw.images);
    if (raw.audio !== undefined || raw.audioClips !== undefined) {
      updates.audio = normalizeNoteAudio(raw.audio ?? raw.audioClips);
    }
    if (raw.pinned !== undefined) updates.pinned = raw.pinned === true;
    if (raw.color !== undefined) updates.color = cleanNullableText(raw.color, 32);
    if (raw.sourceNoteId !== undefined) updates.sourceNoteId = cleanNullableText(raw.sourceNoteId, 128);

    const [row] = await db
      .update(notes)
      .set(updates)
      .where(and(eq(notes.id, req.params.id), eq(notes.userId, claims.sub), isNull(notes.deletedAt)))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Note not found", code: "not_found" });
      return;
    }
    res.json(mapNote(row, false));
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token", code: "unauthorized" });
      return;
    }
    sendRouteError(res, err, "[Server] PATCH /api/notes/:id failed");
  }
});

app.delete("/api/notes/:id", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    if (!UUID_PATTERN.test(req.params.id)) {
      res.status(404).json({ error: "Note not found", code: "not_found" });
      return;
    }
    const [row] = await db
      .update(notes)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(notes.id, req.params.id), eq(notes.userId, claims.sub), isNull(notes.deletedAt)))
      .returning({ id: notes.id });
    if (!row) {
      res.status(404).json({ error: "Note not found", code: "not_found" });
      return;
    }
    res.status(204).end();
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token", code: "unauthorized" });
      return;
    }
    sendRouteError(res, err, "[Server] DELETE /api/notes/:id failed");
  }
});

app.post("/api/notes/:id/flashcards", async (req, res) => {
  try {
    const claims = await verifyClerkToken(req.headers.authorization);
    if (!UUID_PATTERN.test(req.params.id)) {
      res.status(404).json({ error: "Note not found", code: "not_found" });
      return;
    }
    const [note] = await db
      .select({ id: notes.id, title: notes.title })
      .from(notes)
      .where(and(eq(notes.id, req.params.id), eq(notes.userId, claims.sub), isNull(notes.deletedAt)))
      .limit(1);
    if (!note) {
      res.status(404).json({ error: "Note not found", code: "not_found" });
      return;
    }

    const rawCards = Array.isArray(req.body?.cards) ? req.body.cards : [];
    const cards = rawCards
      .filter(
        (c: any) =>
          c &&
          typeof c.front === "string" &&
          c.front.trim() &&
          typeof c.back === "string" &&
          c.back.trim(),
      )
      .slice(0, 100)
      .map((c: any) => ({
        id: `fc_${crypto.randomUUID()}`,
        userId: claims.sub,
        sourceType: "note",
        sourceId: note.id,
        sourceTitle: note.title || "Note",
        front: c.front.trim().slice(0, 2000),
        back: c.back.trim().slice(0, 4000),
        intervalDays: 0,
        ease: 2.5,
        repetitions: 0,
        lapses: 0,
        dueAt: new Date(),
        createdAt: new Date(),
      }));

    if (cards.length === 0) {
      res.status(400).json({ error: "Missing cards", code: "invalid_request" });
      return;
    }

    const rows = await db.insert(studyFlashcards).values(cards).returning();
    res.status(201).json({ cards: rows });
  } catch (err: any) {
    if (isTokenError(err)) {
      res.status(401).json({ error: "Invalid token", code: "unauthorized" });
      return;
    }
    sendRouteError(res, err, "[Server] POST /api/notes/:id/flashcards failed");
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
      const textKey = NOTES_AI_TEXT_KEYS[action as NotesAiAction];
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
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    console.error("[Server] POST /api/notes/index failed:", err);
    res.status(500).json({ error: "Failed to index note" });
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
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
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    console.error("[Server] DELETE /api/notes/:noteId/chats failed:", err);
    res.status(500).json({ error: "Failed to clear chat history" });
  }
});

// --- Schedule planner suggestions ---

function sanitizeScheduleTasks(value: unknown): {
  id: string;
  title: string;
  time?: string;
  done: boolean;
}[] {
  if (!Array.isArray(value)) return [];
  const out: { id: string; title: string; time?: string; done: boolean }[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== "string" || !o.id) continue;
    if (typeof o.title !== "string" || !o.title.trim()) continue;
    const time =
      typeof o.time === "string" && /^\d{2}:\d{2}$/.test(o.time)
        ? o.time
        : undefined;
    out.push({
      id: o.id.slice(0, 64),
      title: o.title.trim().slice(0, 120),
      time,
      done: o.done === true,
    });
    if (out.length >= 25) break;
  }
  return out;
}

function normalizeScheduleSuggestions(
  result: unknown,
  pool: { id: string }[],
): { id: string; reason: string }[] {
  if (!result || typeof result !== "object") return [];
  const raw = (result as Record<string, unknown>).suggestions;
  if (!Array.isArray(raw)) return [];
  const poolIds = new Set(pool.map((t) => t.id));
  const out: { id: string; reason: string }[] = [];
  const seen = new Set<string>();
  for (const s of raw) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    if (typeof o.id !== "string" || !poolIds.has(o.id)) continue;
    if (seen.has(o.id)) continue;
    seen.add(o.id);
    out.push({
      id: o.id,
      reason:
        typeof o.reason === "string" && o.reason
          ? o.reason.slice(0, 160)
          : "Suggested",
    });
    if (out.length >= 5) break;
  }
  return out;
}

app.post("/api/schedule/suggest", async (req, res) => {
  try {
    await verifyClerkToken(req.headers.authorization);
    const { date, tasks } = req.body;

    const cleanTasks = sanitizeScheduleTasks(tasks);
    if (cleanTasks.length === 0) {
      res.status(400).json({ error: "No tasks provided" });
      return;
    }

    const { system } = buildScheduleSuggestPrompt({
      date:
        typeof date === "string" && date
          ? date.slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      tasks: cleanTasks,
    });

    const ai = aiRequestOptions(req);
    let suggestions: { id: string; reason: string }[];
    try {
      const result = await generateJsonContent<{ suggestions?: unknown }>(
        ai.modelRef,
        `${system}\n\nReturn ONLY valid JSON matching the requested structure. Do NOT include any markdown code fences. Return raw JSON only.`,
        ai.apiKey,
      );
      suggestions = normalizeScheduleSuggestions(result, cleanTasks);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("no parseable JSON")) {
        const label = getModelOption(ai.modelRef)?.label ?? ai.modelRef;
        res.status(422).json({
          error: `"${label}" returned no usable suggestions. Please try again or switch to a more reliable model.`,
        });
        return;
      }
      throw err;
    }

    if (suggestions.length === 0) {
      const label = getModelOption(ai.modelRef)?.label ?? ai.modelRef;
      res.status(422).json({
        error: `"${label}" returned no usable suggestions. Please try again or switch to a more reliable model.`,
      });
      return;
    }

    res.json({ suggestions });
  } catch (err) {
    sendRouteError(res, err, "[Server] POST /api/schedule/suggest failed");
  }
});

app.use((req: Request, res: Response) => {
  const requestId = (req as any).requestId as string | undefined;
  console.warn(
    `[Server] 404 ${req.method} ${req.originalUrl} [${requestId ?? "no-request-id"}]`,
  );
  res.status(404).json({
    error: "Route not found",
    code: "route_not_found",
    requestId,
  });
});

const PORT = parseInt(process.env.PORT || "3001", 10);

export { app };

if (process.env.NODE_ENV !== "test" && process.env.NO_LISTEN !== "1") {
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] DB host: ${DB_HOST}`);
    console.log(`[Server] Animated lesson routes ready`);
  });
}
