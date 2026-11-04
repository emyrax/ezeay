import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import {
  isValidActionName,
  toSnakeCaseAction,
  uniqueActionName,
} from "./mascotNaming";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const INPUT_DIR = path.join(ROOT, "assets", "mascot", "animated_mascot_mp4");
const OUTPUT_DIR = path.join(ROOT, "assets", "mascot", "gamification");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");
const REGISTRY_PATH = path.join(ROOT, "constants", "gamificationImages.ts");
const VISION_MODEL = "gemini-2.5-flash";

const FIXED_NAMES = new Map<string, string>([
  ["mainLoadscreen.mp4", "mascot_loading"],
  ["success_feeling.mp4", "mascot_celebrating"],
  ["failture_feeling.mp4", "mascot_disappointed"],
]);

const CORNERS = [
  { x: "0", y: "0" },
  { x: "iw*0.92", y: "0" },
  { x: "0", y: "ih*0.92" },
  { x: "iw*0.92", y: "ih*0.92" },
];

interface ProbeResult {
  width: number;
  height: number;
  fps: number;
  duration: number;
}

interface VisionResult {
  action: string;
  confidence: number;
  description: string;
}

interface BackgroundResult {
  solid: boolean;
  color: string;
  variance: number;
}

interface ManifestEntry {
  source: string;
  sourceSha256: string;
  output: string | null;
  detectedAction: string | null;
  finalAction: string | null;
  confidence: number | null;
  description: string | null;
  background: BackgroundResult | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  duration: number | null;
  bytes: number | null;
  status: "ok" | "failed";
  error?: string;
}

interface RunOptions {
  encoding?: "utf8" | "buffer";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function loadEnv() {
  if (process.env.GEMINI_API_KEY) return;

  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^["']|["']$/g, "");
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

function findFile(dir: string, fileName: string): string | null {
  if (!fs.existsSync(dir)) return null;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = findFile(fullPath, fileName);
      if (nested) return nested;
    } else if (entry.name.toLowerCase() === fileName.toLowerCase()) {
      return fullPath;
    }
  }

  return null;
}

function findTool(name: "ffmpeg" | "ffprobe"): string {
  const envKey = `${name.toUpperCase()}_PATH`;
  const configured = process.env[envKey];
  if (configured && fs.existsSync(configured)) return configured;

  const local = findFile(path.join(ROOT, ".tools", "ffmpeg"), `${name}.exe`);
  if (local) return local;

  const probe = spawnSync(name, ["-version"], { encoding: "utf8" });
  if (!probe.error && probe.status === 0) return name;

  throw new Error(
    `${name} was not found. Add it to .tools/ffmpeg or set ${envKey}.`,
  );
}

function run(bin: string, args: string[]): string {
  const result = spawnSync(bin, args, {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim().slice(-2000);
    throw new Error(`${path.basename(bin)} exited ${result.status}: ${detail}`);
  }

  return result.stdout;
}

function runBuffer(bin: string, args: string[]): Buffer {
  const result = spawnSync(bin, args, {
    encoding: "buffer",
    maxBuffer: 8 * 1024 * 1024,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = Buffer.concat([
      Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.alloc(0),
      Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.alloc(0),
    ])
      .toString("utf8")
      .trim()
      .slice(-2000);
    throw new Error(`${path.basename(bin)} exited ${result.status}: ${detail}`);
  }

  return Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout);
}

function parseRate(value: string): number {
  const [numerator, denominator] = value.split("/").map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

function probe(ffprobe: string, file: string): ProbeResult {
  const raw = run(ffprobe, [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,r_frame_rate,duration",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    file,
  ]);

  const parsed: unknown = JSON.parse(raw);
  const root = asRecord(parsed);
  const streams = Array.isArray(root?.streams) ? root.streams : [];
  const stream = asRecord(streams[0]);
  const format = asRecord(root?.format);

  if (!stream) throw new Error("No video stream found.");

  return {
    width: asNumber(stream.width),
    height: asNumber(stream.height),
    fps: parseRate(asString(stream.r_frame_rate)),
    duration: asNumber(format?.duration, asNumber(stream.duration)),
  };
}

function extractFrames(
  ffmpeg: string,
  file: string,
  duration: number,
  tempDir: string,
): string[] {
  const times =
    duration > 0
      ? [duration * 0.08, duration * 0.5, duration * 0.92]
      : [0, 0.5, 1];

  return times.map((rawTime, index) => {
    const time = Math.max(0, Math.min(duration > 0 ? duration - 0.05 : rawTime, rawTime));
    const output = path.join(tempDir, `frame-${index}.jpg`);
    run(ffmpeg, [
      "-y",
      "-loglevel",
      "error",
      "-ss",
      time.toFixed(3),
      "-i",
      file,
      "-frames:v",
      "1",
      "-vf",
      "scale=480:-2:flags=lanczos",
      "-q:v",
      "2",
      output,
    ]);
    return output;
  });
}

function sampleCorner(
  ffmpeg: string,
  file: string,
  time: number,
  x: string,
  y: string,
): [number, number, number] {
  const pixels = runBuffer(ffmpeg, [
    "-y",
    "-loglevel",
    "error",
    "-ss",
    Math.max(0, time).toFixed(3),
    "-i",
    file,
    "-frames:v",
    "1",
    "-vf",
    `crop=iw*0.08:ih*0.08:${x}:${y},scale=1:1`,
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgb24",
    "-",
  ]);

  if (pixels.length < 3) throw new Error("Could not sample the video background.");
  return [pixels[0], pixels[1], pixels[2]];
}

function detectBackground(
  ffmpeg: string,
  file: string,
  duration: number,
): BackgroundResult {
  const times =
    duration > 0
      ? [duration * 0.08, duration * 0.5, duration * 0.92]
      : [0, 0.5, 1];

  const samples: Array<[number, number, number]> = [];
  for (const time of times) {
    for (const corner of CORNERS) {
      samples.push(sampleCorner(ffmpeg, file, time, corner.x, corner.y));
    }
  }

  const average = samples.reduce(
    (acc, sample) => [
      acc[0] + sample[0] / samples.length,
      acc[1] + sample[1] / samples.length,
      acc[2] + sample[2] / samples.length,
    ],
    [0, 0, 0],
  );

  let variance = 0;
  for (const sample of samples) {
    for (let channel = 0; channel < 3; channel += 1) {
      variance = Math.max(variance, Math.abs(sample[channel] - average[channel]));
    }
  }

  const toHex = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");

  return {
    solid: variance <= 18,
    color: `0x${toHex(average[0])}${toHex(average[1])}${toHex(average[2])}`,
    variance: Math.round(variance * 10) / 10,
  };
}

function buildFilter(background: BackgroundResult, width: number, fps: number): string {
  const filters = [`fps=${fps}`, `scale='min(${width},iw)':-2:flags=lanczos`];
  if (background.solid) {
    filters.push(`colorkey=${background.color}:0.10:0.03`);
  }
  filters.push("format=rgba");
  return filters.join(",");
}

function encode(
  ffmpeg: string,
  input: string,
  output: string,
  background: BackgroundResult,
  width: number,
  fps: number,
  quality: number,
) {
  run(ffmpeg, [
    "-y",
    "-loglevel",
    "error",
    "-i",
    input,
    "-vf",
    buildFilter(background, width, fps),
    "-c:v",
    "libwebp_anim",
    "-lossless",
    "0",
    "-q:v",
    String(quality),
    "-compression_level",
    "2",
    "-loop",
    "0",
    "-an",
    output,
  ]);
}

function encodeWithBudget(
  ffmpeg: string,
  input: string,
  output: string,
  background: BackgroundResult,
): number {
  const attempts = [
    { width: 360, fps: 18, quality: 68 },
    { width: 300, fps: 15, quality: 60 },
  ];

  for (const attempt of attempts) {
    encode(
      ffmpeg,
      input,
      output,
      background,
      attempt.width,
      attempt.fps,
      attempt.quality,
    );
    const bytes = fs.statSync(output).size;
    if (bytes <= 2 * 1024 * 1024) return bytes;
  }

  return fs.statSync(output).size;
}

function parseVisionResult(raw: string): VisionResult {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const parsed: unknown = JSON.parse(cleaned);
  const root = asRecord(parsed);
  const action = toSnakeCaseAction(asString(root?.action));
  if (!isValidActionName(action)) {
    throw new Error("Vision returned an invalid action label.");
  }

  const confidence = asNumber(root?.confidence);
  return {
    action,
    confidence: Math.max(0, Math.min(1, confidence)),
    description: asString(root?.description),
  };
}

async function detectAction(
  ai: GoogleGenAI,
  file: string,
  frames: string[],
): Promise<VisionResult> {
  const parts = frames.map((frame) => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: fs.readFileSync(frame).toString("base64"),
    },
  }));

  const prompt = [
    "You are labeling a mascot animation for a gamified learning app.",
    `Source file: ${path.basename(file)}.`,
    "Look at all keyframes and identify the dominant action.",
    "Return JSON only with this shape:",
    '{"action":"mascot_jumping","confidence":0.94,"description":"The mascot jumps twice and lands."}',
    "The action must be lowercase snake_case, start with mascot_, and describe the visible action.",
  ].join(" ");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: VISION_MODEL,
        contents: [
          {
            role: "user",
            parts: [...parts, { text: prompt }],
          },
        ],
        config: { responseMimeType: "application/json" },
      });

      const text = response.text?.trim();
      if (!text) throw new Error("Vision returned an empty response.");
      return parseVisionResult(text);
    } catch (error) {
      if (attempt === 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw new Error("Vision detection failed.");
}

function hashFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function readExistingManifest(): ManifestEntry[] {
  if (!fs.existsSync(MANIFEST_PATH)) return [];

  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    return Array.isArray(parsed) ? (parsed as ManifestEntry[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(entries: ManifestEntry[]) {
  const successful = entries
    .filter(
      (entry): entry is ManifestEntry & { output: string; finalAction: string } =>
        entry.status === "ok" && !!entry.output && !!entry.finalAction,
    )
    .sort((a, b) => a.finalAction.localeCompare(b.finalAction));

  const lines = [
    "export const gamificationImages = {",
    ...successful.map(
      (entry) =>
        `  ${entry.finalAction}: require("../assets/mascot/gamification/${entry.output}"),`,
    ),
    "} as const;",
    "",
    "export type GamificationAction = keyof typeof gamificationImages;",
    "",
  ];

  fs.writeFileSync(REGISTRY_PATH, lines.join("\n"));
}

async function main() {
  loadEnv();

  const args = new Set(process.argv.slice(2));
  const force = args.has("--force");
  const allowFailures = args.has("--allow-failures");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required for action detection.");

  const ffmpeg = findTool("ffmpeg");
  const ffprobe = findTool("ffprobe");
  const ai = new GoogleGenAI({ apiKey });

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const existing = readExistingManifest();
  const existingBySource = new Map(existing.map((entry) => [entry.source, entry]));
  const usedNames = new Set<string>();

  const files = fs
    .readdirSync(INPUT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".mp4"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const manifest: ManifestEntry[] = [];
  let okCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const sourceName of files) {
    const sourcePath = path.join(INPUT_DIR, sourceName);
    const previous = existingBySource.get(sourceName);

    if (
      !force &&
      previous?.status === "ok" &&
      previous.output &&
      previous.finalAction &&
      fs.existsSync(path.join(OUTPUT_DIR, previous.output))
    ) {
      usedNames.add(previous.finalAction);
      manifest.push(previous);
      okCount += 1;
      skippedCount += 1;
      console.log(`SKIP ${sourceName} -> ${previous.output}`);
      continue;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mascot-media-"));
    const tempOutput = path.join(tempDir, "output.webp");

    try {
      const info = probe(ffprobe, sourcePath);
      const frames = extractFrames(ffmpeg, sourcePath, info.duration, tempDir);
      const background = detectBackground(ffmpeg, sourcePath, info.duration);

      let vision: VisionResult | null = null;
      let visionError: string | null = null;
      try {
        vision = await detectAction(ai, sourcePath, frames);
      } catch (error) {
        visionError = error instanceof Error ? error.message : String(error);
      }

      const fixedName = FIXED_NAMES.get(sourceName);
      const baseName = fixedName ?? vision?.action ?? "";
      if (!isValidActionName(baseName)) {
        throw new Error(visionError ?? "No valid action name was detected.");
      }

      const finalAction = uniqueActionName(baseName, usedNames);
      usedNames.add(finalAction);
      const outputName = `${finalAction}.webp`;
      const finalPath = path.join(OUTPUT_DIR, outputName);

      const bytes = encodeWithBudget(ffmpeg, sourcePath, tempOutput, background);
      fs.copyFileSync(tempOutput, finalPath);

      manifest.push({
        source: sourceName,
        sourceSha256: hashFile(sourcePath),
        output: outputName,
        detectedAction: vision?.action ?? null,
        finalAction,
        confidence: vision?.confidence ?? null,
        description: vision?.description ?? visionError,
        background,
        width: info.width,
        height: info.height,
        fps: info.fps,
        duration: info.duration,
        bytes,
        status: "ok",
      });

      okCount += 1;
      console.log(
        `OK   ${sourceName} -> ${outputName} (${(bytes / 1024 / 1024).toFixed(2)} MB, background ${background.solid ? "removed" : "preserved"})`,
      );
    } catch (error) {
      failedCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      manifest.push({
        source: sourceName,
        sourceSha256: fs.existsSync(sourcePath) ? hashFile(sourcePath) : "",
        output: null,
        detectedAction: null,
        finalAction: null,
        confidence: null,
        description: null,
        background: null,
        width: null,
        height: null,
        fps: null,
        duration: null,
        bytes: null,
        status: "failed",
        error: message,
      });
      console.error(`FAIL ${sourceName}: ${message}`);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  manifest.sort((a, b) => a.source.localeCompare(b.source));

  const expectedOutputs = new Set(
    manifest
      .filter((entry) => entry.status === "ok" && entry.output)
      .map((entry) => entry.output as string),
  );
  for (const file of fs.readdirSync(OUTPUT_DIR)) {
    if (file.toLowerCase().endsWith(".webp") && !expectedOutputs.has(file)) {
      fs.rmSync(path.join(OUTPUT_DIR, file), { force: true });
    }
  }

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  writeRegistry(manifest);

  console.log(
    `\nProcessed ${files.length} file(s): ${okCount} ok, ${failedCount} failed, ${skippedCount} skipped.`,
  );
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST_PATH)}`);
  console.log(`Registry: ${path.relative(ROOT, REGISTRY_PATH)}`);

  if (failedCount > 0 && !allowFailures) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
