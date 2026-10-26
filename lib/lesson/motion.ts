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
    description: "Staggered text, drawn visuals, and smooth highlights.",
  },
  {
    id: "playful",
    label: "Playful",
    description: "Springy motion, bigger reveals, and completion confetti.",
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
};

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
