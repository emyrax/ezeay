import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import type { LayoutChangeEvent } from "react-native";
import type { LessonMotionPreset } from "../../lib/lesson/motion";
import {
  activeNarrationWordIndex,
  buildNarrationWordTimings,
} from "../../lib/lesson/player";

type WordState = 0 | 1 | 2;

export interface NarrationWordLayout {
  y: number;
  height: number;
}

function staticOpacity(state: WordState): number {
  if (state === 2) return 1;
  if (state === 1) return 0.9;
  return 0.72;
}

function wordColor(state: WordState): string {
  if (state === 2) return "#FFFFFF";
  if (state === 1) return "#A1A1AA";
  return "#52525B";
}

interface Props {
  text: string;
  progress: number;
  preset: LessonMotionPreset;
  variant?: "visual" | "text";
  follow?: boolean;
  onActiveWordLayout?: (layout: NarrationWordLayout) => void;
}

const WordToken = memo(function WordToken({
  index,
  word,
  state,
  animate,
  playful,
  fontSize,
  lineHeight,
  onWordLayout,
}: {
  index: number;
  word: string;
  state: WordState;
  animate: boolean;
  playful: boolean;
  fontSize: number;
  lineHeight: number;
  onWordLayout?: (index: number, layout: NarrationWordLayout) => void;
}) {
  const value = useRef(new Animated.Value(state)).current;

  useEffect(() => {
    value.stopAnimation();

    if (!animate) {
      value.setValue(state);
      return;
    }

    const animation = playful
      ? Animated.spring(value, {
          toValue: state,
          friction: 8,
          tension: 110,
          useNativeDriver: true,
        })
      : Animated.timing(value, {
          toValue: state,
          duration: state === 2 ? 220 : 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });

    animation.start();
    return () => animation.stop();
  }, [animate, playful, state, value]);

  return (
    <Animated.Text
      accessible={false}
      onLayout={(event: LayoutChangeEvent) => {
        onWordLayout?.(index, event.nativeEvent.layout);
      }}
      style={[
        styles.word,
        { fontSize, lineHeight, color: wordColor(state) },
        animate
          ? {
              opacity: value.interpolate({
                inputRange: [0, 1, 2],
                outputRange: [0.55, 0.82, 1],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  translateY: value.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [0, 0, -2],
                    extrapolate: "clamp",
                  }),
                },
                {
                  scale: value.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [1, 1, 1.06],
                    extrapolate: "clamp",
                  }),
                },
              ],
            }
          : { opacity: staticOpacity(state) },
        state === 2 && styles.activeWord,
      ]}
    >
      {word}
    </Animated.Text>
  );
});

export default function SyncedNarration({
  text,
  progress,
  preset,
  variant = "visual",
  follow = false,
  onActiveWordLayout,
}: Props) {
  const { width } = useWindowDimensions();
  const timings = useMemo(() => buildNarrationWordTimings(text), [text]);
  const activeIndex = useMemo(
    () => activeNarrationWordIndex(timings, progress),
    [progress, timings],
  );
  const animate = preset.enabled && preset.wordReveal;
  const baseSize = variant === "text" ? width * 0.065 : width * 0.048;
  const maxSize = variant === "text" ? 64 : 46;
  const minSize = variant === "text" ? 32 : 24;
  const fontSize = Math.round(Math.min(maxSize, Math.max(minSize, baseSize)));
  const lineHeight = Math.round(fontSize * 1.42);

  const wordLayoutsRef = useRef<Record<number, NarrationWordLayout>>({});
  const lastReportedTopRef = useRef<number | null>(null);
  const activeIndexRef = useRef(activeIndex);
  const followRef = useRef(follow);
  const onActiveWordLayoutRef = useRef(onActiveWordLayout);

  activeIndexRef.current = activeIndex;
  followRef.current = follow;
  onActiveWordLayoutRef.current = onActiveWordLayout;

  const reportActiveWord = useCallback(() => {
    if (!followRef.current) return;
    const layout = wordLayoutsRef.current[activeIndexRef.current];
    if (!layout || lastReportedTopRef.current === layout.y) return;
    lastReportedTopRef.current = layout.y;
    onActiveWordLayoutRef.current?.(layout);
  }, []);

  const handleWordLayout = useCallback(
    (index: number, layout: NarrationWordLayout) => {
      wordLayoutsRef.current[index] = layout;
      if (index === activeIndexRef.current) reportActiveWord();
    },
    [reportActiveWord],
  );

  useEffect(() => {
    reportActiveWord();
  }, [activeIndex, reportActiveWord]);

  useEffect(() => {
    lastReportedTopRef.current = null;
    reportActiveWord();
  }, [follow, variant, reportActiveWord]);

  if (timings.length === 0) return null;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      style={styles.container}
    >
      <View
        style={[
          styles.row,
          {
            columnGap: Math.round(fontSize * 0.28),
            rowGap: Math.round(lineHeight * 0.14),
          },
          variant === "text" && styles.rowText,
        ]}
      >
        {timings.map((timing, index) => (
          <WordToken
            key={`${index}-${timing.word}`}
            index={index}
            word={timing.word}
            state={index < activeIndex ? 1 : index === activeIndex ? 2 : 0}
            animate={animate}
            playful={preset.style === "playful"}
            fontSize={fontSize}
            lineHeight={lineHeight}
            onWordLayout={handleWordLayout}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  row: {
    width: "100%",
    maxWidth: 860,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  rowText: {
    maxWidth: 1040,
  },
  word: {
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  activeWord: {
    textShadowColor: "rgba(255, 255, 255, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
});
