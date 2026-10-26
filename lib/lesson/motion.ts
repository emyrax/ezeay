export type LessonMotionStyle = "calm" | "kinetic" | "playful";

export interface LessonMotionPreset {
  style: LessonMotionStyle;
  enabled: boolean;
  duration: number;
  stagger: number;
  distance: number;
  scaleFrom: number;
  drawDiagram: boolean;
  sweep: boolean;
  equalizer: boolean;
  confetti: boolean;
  ambient: boolean;
  wordReveal: boolean;
}

export const LESSON_MOTION_DEFAULT: LessonMotionStyle = "kinetic";

export const LESSON_MOTION_OPTIONS: {
  id: LessonMotionStyle;
  label: string;
  description: string;
}[] = [
  {
    id: "calm",
    label: "Calm",
    description: "Short fades and minimal movement. Best for focus.",
  },
  {
    id: "kinetic",
    label: "Kinetic",
    description: "Kinetic text, flowing diagrams, and ambient motion graphics.",
  },
  {
    id: "playful",
    label: "Playful",
    description:
      "Springy word reveals, flowing diagrams, and completion confetti.",
  },
];

const STYLE_PRESETS: Record<LessonMotionStyle, LessonMotionPreset> = {
  calm: {
    style: "calm",
    enabled: true,
    duration: 200,
    stagger: 30,
    distance: 4,
    scaleFrom: 0.99,
    drawDiagram: false,
    sweep: false,
    equalizer: false,
    confetti: false,
    ambient: false,
    wordReveal: false,
  },
  kinetic: {
    style: "kinetic",
    enabled: true,
    duration: 420,
    stagger: 75,
    distance: 12,
    scaleFrom: 0.96,
    drawDiagram: true,
    sweep: true,
    equalizer: true,
    confetti: false,
    ambient: true,
    wordReveal: true,
  },
  playful: {
    style: "playful",
    enabled: true,
    duration: 500,
    stagger: 100,
    distance: 18,
    scaleFrom: 0.9,
    drawDiagram: true,
    sweep: true,
    equalizer: true,
    confetti: true,
    ambient: true,
    wordReveal: true,
  },
};

const REDUCED_MOTION_PRESET: LessonMotionPreset = {
  style: "calm",
  enabled: false,
  duration: 0,
  stagger: 0,
  distance: 0,
  scaleFrom: 1,
  drawDiagram: false,
  sweep: false,
  equalizer: false,
  confetti: false,
  ambient: false,
  wordReveal: false,
};

export function splitMotionWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function getWordRevealDelay(index: number, stagger: number): number {
  return Math.round(Math.max(0, index) * Math.max(18, stagger * 0.45));
}

export function isLessonMotionStyle(
  value: unknown,
): value is LessonMotionStyle {
  return value === "calm" || value === "kinetic" || value === "playful";
}

export function getLessonMotionPreset(
  style: LessonMotionStyle,
  reduceMotion: boolean,
): LessonMotionPreset {
  if (reduceMotion) return REDUCED_MOTION_PRESET;
  return STYLE_PRESETS[style] ?? STYLE_PRESETS[LESSON_MOTION_DEFAULT];
}
