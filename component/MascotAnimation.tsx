import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ImageStyle,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Image, type ImageProps } from "expo-image";
import { appTheme } from "../constants/themes";
import { images } from "../constants/images";
import {
  gamificationImages,
  type GamificationAction,
} from "../constants/gamificationImages";
import { mascotWebImages } from "../constants/mascotWebImages";
import { useInViewport } from "../hooks/useInViewport";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { markConnectionSlow, useNetworkProfile } from "../hooks/useNetworkProfile";
import {
  MASCOT_LABELS,
  MASCOT_META,
} from "../lib/mascot/actions";
import {
  selectMascotSource,
  type MascotMotion,
} from "../lib/mascot/selectSource";

interface MascotAnimationProps {
  action: GamificationAction;
  width?: number;
  height?: number;
  framed?: boolean;
  contentFit?: ImageProps["contentFit"];
  contentPosition?: ImageProps["contentPosition"];
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
  adaptive?: boolean;
  eager?: boolean;
  priority?: ImageProps["priority"];
  /**
   * Controls web motion: "auto" follows the network/viewport policy, "static"
   * always renders the poster (used by full-screen surfaces).
   */
  motion?: MascotMotion;
  /**
   * Delays the animated web variant until the browser is idle so the poster can
   * win the first paint. Native is unaffected.
   */
  defer?: boolean;
}

const SLOW_LOAD_MS = 2500;
const DEFER_TIMEOUT_MS = 1200;
const DEFER_FALLBACK_MS = 320;

interface IdleWindow {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
}

export default function MascotAnimation({
  action,
  width,
  height,
  framed,
  contentFit = "contain",
  contentPosition,
  style,
  imageStyle,
  accessibilityLabel,
  adaptive,
  eager = false,
  priority = "normal",
  motion = "auto",
  defer = false,
}: MascotAnimationProps) {
  const [animationFailed, setAnimationFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const [deferredReady, setDeferredReady] = useState(
    () => !defer || Platform.OS !== "web",
  );
  const loadStartedAt = useRef(Date.now());
  const networkQuality = useNetworkProfile();
  const reducedMotion = usePrefersReducedMotion();
  const { ref, inView } = useInViewport();

  const meta = MASCOT_META[action];
  const resolvedWidth = width ?? (height ? height * meta.aspectRatio : 120);
  const resolvedHeight = height ?? resolvedWidth / meta.aspectRatio;
  const showFrame = framed ?? meta.opaque;

  const isWeb = Platform.OS === "web";
  const adaptiveEnabled = adaptive ?? isWeb;
  const webSources =
    adaptiveEnabled && isWeb ? mascotWebImages?.[action] ?? null : null;

  useEffect(() => {
    setAnimationFailed(false);
    setFallbackFailed(false);
  }, [action]);

  useEffect(() => {
    if (deferredReady || !isWeb) return;

    const idleWindow =
      typeof window === "undefined"
        ? null
        : (window as unknown as IdleWindow);
    if (!idleWindow) {
      setDeferredReady(true);
      return;
    }

    if (typeof idleWindow.requestIdleCallback === "function") {
      const handle = idleWindow.requestIdleCallback(
        () => setDeferredReady(true),
        { timeout: DEFER_TIMEOUT_MS },
      );
      return () => idleWindow.cancelIdleCallback?.(handle);
    }

    const timer = setTimeout(() => setDeferredReady(true), DEFER_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [deferredReady, isWeb]);

  const decision = selectMascotSource({
    isWeb,
    hasWebSources: webSources != null,
    inView: inView && (!defer || deferredReady),
    network: networkQuality,
    reducedMotion,
    motion,
    animationFailed,
  });

  const source = fallbackFailed
    ? images.yuinxLogoTrans
    : decision === "animated" && webSources
      ? webSources.animated
      : decision === "poster" && webSources
        ? webSources.poster
        : gamificationImages[action];

  const sourceKey = fallbackFailed ? "fallback" : decision;

  useEffect(() => {
    loadStartedAt.current = Date.now();
  }, [sourceKey]);

  const handleLoad = useCallback(() => {
    if (!isWeb || sourceKey !== "animated") return;
    if (Date.now() - loadStartedAt.current > SLOW_LOAD_MS) {
      markConnectionSlow();
    }
  }, [isWeb, sourceKey]);

  const handleError = useCallback(() => {
    if (sourceKey === "animated") {
      setAnimationFailed(true);
      return;
    }
    setFallbackFailed(true);
  }, [sourceKey]);

  return (
    <View
      ref={ref}
      style={[
        styles.container,
        showFrame && styles.frame,
        { width: resolvedWidth, height: resolvedHeight },
        style,
      ]}
    >
      <Image
        source={source}
        placeholder={decision === "animated" ? webSources?.poster : undefined}
        style={[styles.image, imageStyle]}
        contentFit={contentFit}
        contentPosition={contentPosition}
        autoplay
        useAppleWebpCodec={false}
        recyclingKey={action}
        priority={priority}
        loading={eager ? "eager" : "lazy"}
        transition={120}
        onLoad={handleLoad}
        onError={handleError}
        accessibilityLabel={accessibilityLabel ?? MASCOT_LABELS[action]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  frame: {
    backgroundColor: appTheme.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: appTheme.border,
    borderRadius: 20,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
