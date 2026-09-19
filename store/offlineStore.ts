import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type OfflineStatus = "none" | "downloading" | "downloaded" | "ready" | "error";

interface OfflineState {
  status: OfflineStatus;
  progress: number;
  downloadedId: string | null;
  error: string | null;
  available: boolean;
  setAvailable: (value: boolean) => void;
  setDownloading: (id: string) => void;
  setProgress: (id: string, progress: number) => void;
  setDownloaded: (id: string) => void;
  setReady: (id: string) => void;
  setError: (message: string) => void;
  setNone: () => void;
  reset: () => void;
}

const OFFLINE_KEY = "@yuinx_offline_v1";

const initialState = {
  status: "none" as OfflineStatus,
  progress: 0,
  downloadedId: null as string | null,
  error: null as string | null,
  available: false,
};

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      ...initialState,
      setAvailable: (value) => set({ available: value }),
      setDownloading: (id) =>
        set({ status: "downloading", downloadedId: id, progress: 0, error: null }),
      setProgress: (id, progress) =>
        set((s) => ({
          ...s,
          status: "downloading",
          downloadedId: s.downloadedId ?? id,
          progress: Math.min(1, Math.max(0, progress)),
          error: null,
        })),
      setDownloaded: (id) => set({ status: "downloaded", downloadedId: id, progress: 1, error: null }),
      setReady: (id) => set({ status: "ready", downloadedId: id, progress: 1, error: null }),
      setError: (message) => set({ status: "error", error: message }),
      setNone: () => set({ ...initialState }),
      reset: () => set({ ...initialState }),
    }),
    {
      name: OFFLINE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        status: s.status === "ready" || s.status === "downloaded" ? s.status : ("none" as OfflineStatus),
        downloadedId: s.status === "ready" || s.status === "downloaded" ? s.downloadedId : null,
        progress: s.status === "ready" || s.status === "downloaded" ? 1 : 0,
        available: s.available,
      }),
    },
  ),
);