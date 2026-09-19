import { useEffect } from "react";
import { useModelStore } from "../store/modelStore";
import { ensureOfflineActivated } from "../lib/providers/offline";

export function useOfflineModelSync(): void {
  const selectedModel = useModelStore((s) => s.selectedModel);

  useEffect(() => {
    ensureOfflineActivated(selectedModel).catch(() => {});
  }, [selectedModel]);
}