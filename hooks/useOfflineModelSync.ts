import { useEffect } from "react";
import { Platform } from "react-native";
import { useModelStore } from "../store/modelStore";
import { AI_MODEL_DEFAULT } from "../lib/providers/modelRegistry";
import { ensureOfflineActivated, isOfflineRef } from "../lib/providers/offline";

export function useOfflineModelSync(): void {
  const selectedModel = useModelStore((s) => s.selectedModel);
  const setSelectedModel = useModelStore((s) => s.setSelectedModel);

  useEffect(() => {
    if (Platform.OS === "web") {
      if (isOfflineRef(selectedModel)) setSelectedModel(AI_MODEL_DEFAULT);
      return;
    }
    ensureOfflineActivated(selectedModel).catch(() => {});
  }, [selectedModel, setSelectedModel]);
}