import { useEffect, useState, useSyncExternalStore } from "react";
import { Platform } from "react-native";

export type NetworkQuality = "fast" | "slow";

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
}

let measuredSlow = false;
const slowListeners = new Set<() => void>();

export function markConnectionSlow() {
  if (measuredSlow) return;
  measuredSlow = true;
  slowListeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  slowListeners.add(listener);
  return () => {
    slowListeners.delete(listener);
  };
}

function getConnection(): NetworkInformationLike | null {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return null;
  return (
    (navigator as Navigator & { connection?: NetworkInformationLike })
      .connection ?? null
  );
}

function detectQuality(): NetworkQuality {
  if (Platform.OS !== "web") return "fast";

  const connection = getConnection();
  if (!connection) return "slow";
  if (connection.saveData) return "slow";

  const effectiveType = connection.effectiveType ?? "";
  if (
    effectiveType === "slow-2g" ||
    effectiveType === "2g" ||
    effectiveType === "3g"
  ) {
    return "slow";
  }

  if (
    typeof connection.downlink === "number" &&
    connection.downlink > 0 &&
    connection.downlink < 1.5
  ) {
    return "slow";
  }

  return "fast";
}

export function useNetworkProfile(): NetworkQuality {
  const [connectionQuality, setConnectionQuality] =
    useState<NetworkQuality>(detectQuality);
  const measured = useSyncExternalStore(
    subscribe,
    () => measuredSlow,
    () => false,
  );

  useEffect(() => {
    const connection = getConnection();
    if (!connection?.addEventListener) return;

    const update = () => setConnectionQuality(detectQuality());
    connection.addEventListener("change", update);
    return () => connection.removeEventListener?.("change", update);
  }, []);

  return measured || connectionQuality === "slow" ? "slow" : "fast";
}
