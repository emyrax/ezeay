import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  LESSON_MOTION_DEFAULT,
  isLessonMotionStyle,
  type LessonMotionStyle,
} from "../lib/lesson/motion";

interface MotionState {
  motionStyle: LessonMotionStyle;
  setMotionStyle: (style: LessonMotionStyle) => void;
  reset: () => void;
}

const MOTION_KEY = "@yuinx_lesson_motion_v1";

export const useMotionStore = create<MotionState>()(
  persist(
    (set) => ({
      motionStyle: LESSON_MOTION_DEFAULT,
      setMotionStyle: (style) =>
        set({
          motionStyle: isLessonMotionStyle(style)
            ? style
            : LESSON_MOTION_DEFAULT,
        }),
      reset: () => set({ motionStyle: LESSON_MOTION_DEFAULT }),
    }),
    {
      name: MOTION_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
