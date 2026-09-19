import { useState, useCallback } from "react";

interface SafeAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useSafeAsync<T = void>() {
  const [state, setState] = useState<SafeAsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (fn: () => Promise<T>): Promise<T | undefined> => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await fn();
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err: any) {
        const message =
          err?.message || err?.error?.message || "Something went wrong.";
        setState({ data: null, loading: false, error: message });
        return undefined;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
