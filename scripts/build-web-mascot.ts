import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SOURCE_DIR = path.join(ROOT, "assets", "mascot", "gamification");
const VIDEO_DIR = path.join(ROOT, "assets", "mascot", "animated_mascot_mp4");
const MANIFEST_PATH = path.join(SOURCE_DIR, "manifest.json");
const OUTPUT_DIR = path.join(SOURCE_DIR, "web");

interface ManifestEntry {
  source: string;
  output: string | null;
  background: { solid: boolean; color: string } | null;
  status: string;
}

const ACTIONS = [
  "mascot_celebrating",
  "mascot_disappointed",
  "mascot_emitting_energy",
  "mascot_jumping",
  "mascot_loading",
  "mascot_posing",
  "mascot_waving",
] as const;

const ANIMATED_ATTEMPTS = [
  { width: 200, fps: 10, seconds: 6, quality: 36 },
  { width: 160, fps: 8, seconds: 5, quality: 30 },
  { width: 140, fps: 6, seconds: 4, quality: 26 },
];

// Never ship anything larger than this to the web. If the encoder cannot get
// under the cap, the poster is copied into the animated slot so the UI stays
// static instead of downloading a multi-megabyte file.
const ANIMATED_HARD_CAP = 160 * 1024;

function findFile(dir: string, name: string): string | null {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = findFile(fullPath, name);
      if (nested) return nested;
    } else if (entry.name === name) {
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

function run(bin: string, args: string[]) {
  const result = spawnSync(bin, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${path.basename(bin)} exited ${result.status}: ${result.stderr}`);
  }
}

function encodePoster(
  ffmpeg: string,
  input: string,
  output: string,
  background: { solid: boolean; color: string } | null,
) {
  const filters = [];
  if (background?.solid) {
    filters.push(`colorkey=${background.color}:0.10:0.03`);
  }
  filters.push("scale='min(720,iw)':-2:flags=lanczos", "format=rgba");

  run(ffmpeg, [
    "-y",
    "-loglevel",
    "error",
    "-i",
    input,
    "-frames:v",
    "1",
    "-vf",
    filters.join(","),
    "-c:v",
    "libwebp",
    "-lossless",
    "0",
    "-q:v",
    "72",
    "-an",
    output,
  ]);
}

function encodeAnimated(
  ffmpeg: string,
  input: string,
  output: string,
  width: number,
  fps: number,
  seconds: number,
  quality: number,
) {
  run(ffmpeg, [
    "-y",
    "-loglevel",
    "error",
    "-i",
    input,
    "-t",
    String(seconds),
    "-vf",
    `fps=${fps},scale='min(${width},iw)':-2:flags=lanczos,format=rgba`,
    "-c:v",
    "libwebp_anim",
    "-lossless",
    "0",
    "-q:v",
    String(quality),
    "-compression_level",
    "4",
    "-loop",
    "0",
    "-an",
    output,
  ]);
}

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function main() {
  const ffmpeg = findTool("ffmpeg");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, "utf8"),
  ) as ManifestEntry[];
  const manifestByAction = new Map(
    manifest
      .filter((entry) => entry.status === "ok" && entry.output)
      .map((entry) => [entry.output as string, entry]),
  );

  for (const action of ACTIONS) {
    const input = path.join(SOURCE_DIR, `${action}.webp`);
    if (!fs.existsSync(input)) {
      console.warn(`SKIP ${action}: source webp missing`);
      continue;
    }

    const entry = manifestByAction.get(`${action}.webp`);
    const video = entry ? path.join(VIDEO_DIR, entry.source) : null;

    const posterPath = path.join(OUTPUT_DIR, `${action}-poster.webp`);
    encodePoster(
      ffmpeg,
      video && fs.existsSync(video) ? video : input,
      posterPath,
      video && fs.existsSync(video) ? entry?.background ?? null : null,
    );
    const posterBytes = fs.statSync(posterPath).size;

    let animatedPath = path.join(OUTPUT_DIR, `${action}-web.webp`);
    let animatedBytes = Number.POSITIVE_INFINITY;

    for (const attempt of ANIMATED_ATTEMPTS) {
      encodeAnimated(
        ffmpeg,
        input,
        animatedPath,
        attempt.width,
        attempt.fps,
        attempt.seconds,
        attempt.quality,
      );
      animatedBytes = fs.statSync(animatedPath).size;
      if (animatedBytes <= ANIMATED_HARD_CAP) break;
    }

    if (animatedBytes > ANIMATED_HARD_CAP) {
      fs.copyFileSync(posterPath, animatedPath);
      animatedBytes = fs.statSync(animatedPath).size;
      console.log(
        `WARN ${action}: animation exceeded ${formatMb(ANIMATED_HARD_CAP)}; using static poster`,
      );
    }

    console.log(
      `OK   ${action}: poster ${formatMb(posterBytes)}, web ${formatMb(animatedBytes)}`,
    );
  }
}

main();

