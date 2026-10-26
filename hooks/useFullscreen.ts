import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

interface Options {
  onExit?: () => void;
}

export function useFullscreen({ onExit }: Options = {}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const activeRef = useRef(false);
  const onExitRef = useRef(onExit);

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const handleChange = () => {
      const fullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(fullscreen);
      if (activeRef.current && !fullscreen) {
        activeRef.current = false;
        onExitRef.current?.();
      }
    };

    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const enter = useCallback(async () => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const root = document.documentElement;
    if (!root.requestFullscreen) return;

    activeRef.current = true;
    try {
      await root.requestFullscreen();
      if (!activeRef.current) {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
        return;
      }
      setIsFullscreen(true);
    } catch (err) {
      activeRef.current = false;
      console.warn("[Lesson] fullscreen unavailable:", err);
    }
  }, []);

  const exit = useCallback(async () => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    activeRef.current = false;
    if (!document.fullscreenElement || !document.exitFullscreen) return;

    try {
      await document.exitFullscreen();
      setIsFullscreen(false);
    } catch (err) {
      console.warn("[Lesson] fullscreen exit failed:", err);
    }
  }, []);

  return { isFullscreen, enter, exit };
}
