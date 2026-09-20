import { useCallback, useRef } from "react";

export function createAsyncLock() {
  let locked = false;
  return {
    tryAcquire(): boolean {
      if (locked) return false;
      locked = true;
      return true;
    },
    release(): void {
      locked = false;
    },
  };
}

export function useNavLock(delayMs = 500) {
  const lockedRef = useRef(false);

  const navigate = useCallback(
    (fn: () => void) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      fn();
      setTimeout(() => {
        lockedRef.current = false;
      }, delayMs);
    },
    [delayMs],
  );

  return { navigate };
}