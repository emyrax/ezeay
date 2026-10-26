import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../hooks/useTheme";
import type { LessonMotionPreset } from "../../lib/lesson/motion";
import {
  activeNarrationSentenceIndex,
  splitNarrationSentences,
} from "../../lib/lesson/player";
import MotionReveal from "./MotionReveal";

interface Props {
  text: string;
  clipReady: boolean;
  playing: boolean;
  progress: number;
  preset: LessonMotionPreset;
  replayKey?: string;
}

function NarrationSentence({
  text,
  active,
  animate,
  activeColor,
  idleColor,
  highlightColor,
}: {
  text: string;
  active: boolean;
  animate: boolean;
  activeColor: string;
  idleColor: string;
  highlightColor: string;
}) {
  const highlight = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    highlight.stopAnimation();

    if (!animate) {
      highlight.setValue(active ? 1 : 0);
      return;
    }

    const animation = Animated.timing(highlight, {
      toValue: active ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [active, animate, highlight]);

  return (
    <Animated.Text
      style={{
        color: highlight.interpolate({
          inputRange: [0, 1],
          outputRange: [idleColor, activeColor],
        }),
        backgroundColor: highlight.interpolate({
          inputRange: [0, 1],
          outputRange: [highlightColor + "00", highlightColor + "14"],
        }),
      }}
    >
      {text}
    </Animated.Text>
  );
}

function Equalizer({
  playing,
  enabled,
  color,
}: {
  playing: boolean;
  enabled: boolean;
  color: string;
}) {
  const bars = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  useEffect(() => {
    bars.forEach((bar) => {
      bar.stopAnimation();
      bar.setValue(1);
    });

    if (!playing || !enabled) return;

    const loops = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 90),
          Animated.timing(bar, {
            toValue: 1.8,
            duration: 220 + index * 40,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.45,
            duration: 220 + index * 40,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [bars, enabled, playing]);

  if (!enabled) return null;

  return (
    <View style={[styles.equalizer, { opacity: playing ? 1 : 0.35 }]}>
      {bars.map((bar, index) => (
        <Animated.View
          key={index}
          style={[
            styles.equalizerBar,
            {
              backgroundColor: color,
              transform: [{ scaleY: bar }],
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function LessonNarrationCard({
  text,
  clipReady,
  playing,
  progress,
  preset,
  replayKey,
}: Props) {
  const theme = useThemeColors();
  const sentences = useMemo(() => splitNarrationSentences(text), [text]);
  const activeIndex = useMemo(() => {
    if (!clipReady || (!playing && progress <= 0)) return -1;
    return activeNarrationSentenceIndex(sentences, progress);
  }, [clipReady, playing, progress, sentences]);

  return (
    <MotionReveal
      preset={preset}
      replayKey={replayKey}
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.labelWrap}>
          <Ionicons
            name="volume-high-outline"
            size={16}
            color={theme.primary}
          />
          <Text style={[styles.label, { color: theme.text }]}>Narration</Text>
          <Equalizer
            playing={playing}
            enabled={preset.equalizer}
            color={theme.primary}
          />
        </View>
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          {clipReady ? "Audio ready" : "Create on play"}
        </Text>
      </View>
      <Text
        style={[styles.text, { color: theme.textSecondary }]}
        accessibilityLabel={text}
      >
        {sentences.map((sentence, index) => (
          <React.Fragment key={`${index}-${sentence.slice(0, 12)}`}>
            <NarrationSentence
              text={sentence}
              active={index === activeIndex}
              animate={preset.enabled}
              activeColor={theme.text}
              idleColor={theme.textSecondary}
              highlightColor={theme.primary}
            />
            {index < sentences.length - 1 ? " " : ""}
          </React.Fragment>
        ))}
      </Text>
    </MotionReveal>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  labelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: 10,
    fontWeight: "600",
  },
  text: {
    fontSize: 14,
    lineHeight: 23,
    fontWeight: "500",
  },
  equalizer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 13,
    marginLeft: 2,
  },
  equalizerBar: {
    width: 2.5,
    height: 10,
    borderRadius: 2,
  },
});
