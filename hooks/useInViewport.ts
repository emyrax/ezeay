import { useEffect, useRef, useState } from "react";
import { Platform, type View } from "react-native";

export function useInViewport(rootMargin = "250px") {
  const ref = useRef<View | null>(null);
  const [inView, setInView] = useState(Platform.OS !== "web");

  useEffect(() => {
    if (Platform.OS !== "web" || inView) return;

    const node = ref.current as unknown as Element | null;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}
