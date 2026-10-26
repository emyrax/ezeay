import { useMemo } from "react";
import {
  LESSON_MOTION_DEFAULT,
  getLessonMotionPreset,
  isLessonMotionStyle,
  type LessonMotionPreset,
} from "../lib/lesson/motion";
import { useMotionStore } from "../store/motionStore";
import { useReducedMotion } from "./useReducedMotion";

export function useLessonMotion(): LessonMotionPreset {
  const style = useMotionStore((state) => state.motionStyle);
  const reduceMotion = useReducedMotion();

  return useMemo(() => {
    const safeStyle = isLessonMotionStyle(style)
      ? style
      : LESSON_MOTION_DEFAULT;
    return getLessonMotionPreset(safeStyle, reduceMotion);
  }, [style, reduceMotion]);
}
