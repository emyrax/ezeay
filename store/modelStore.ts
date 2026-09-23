import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  AI_MODEL_DEFAULT,
  isModelAllowed,
} from "../lib/providers/modelRegistry";

interface ModelState {
  selectedModel: string;
  setSelectedModel: (ref: string) => void;
  reset: () => void;
}

const MODEL_KEY = "@yuinx_model_v1";

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      selectedModel: AI_MODEL_DEFAULT,
      setSelectedModel: (ref) =>
        set({ selectedModel: isModelAllowed(ref) ? ref : AI_MODEL_DEFAULT }),
      reset: () => set({ selectedModel: AI_MODEL_DEFAULT }),
    }),
    {
      name: MODEL_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);