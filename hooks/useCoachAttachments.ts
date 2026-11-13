import { useCallback, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { friendlyError } from "../lib/api";
import {
  uploadMemoryFile,
  type MemoryFileAsset,
} from "../lib/agent/memoryFiles";
import type { AgentMemoryRecord } from "../types/agent";

export function useCoachAttachments() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<AgentMemoryRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const upload = useCallback(
    async (file: MemoryFileAsset, kind: "file" | "photo" = "file") => {
      if (busyRef.current) return;
      busyRef.current = true;
      setUploading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Your session expired. Please sign in again.");
        }
        const result = await uploadMemoryFile(file, token, "", kind);
        setItems((prev) => [...prev, result.memory]);
        if (result.extractionFailed) {
          setError(
            "Attached, but we could not read all of its text. The coach can still use the file.",
          );
        }
      } catch (err) {
        setError(
          friendlyError(
            err,
            "Could not attach that file. Please try again.",
          ),
        );
      } finally {
        busyRef.current = false;
        setUploading(false);
      }
    },
    [getToken],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setError(null);
  }, []);

  const hydrate = useCallback((memories: AgentMemoryRecord[]) => {
    setItems(memories);
  }, []);

  return {
    items,
    uploading,
    error,
    upload,
    remove,
    clear,
    hydrate,
    clearError: () => setError(null),
    ids: items.map((item) => item.id),
  };
}
