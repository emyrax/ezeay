import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useThemeColors } from "../../hooks/useTheme";
import { images } from "../../constants/images";
import ThemeIcon from "./ThemeIcon";

export interface AiQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface AiQuizViewProps {
  questions: AiQuizQuestion[];
  onComplete?: () => void;
}

const CONFETTI_COLORS = ["#38BDF8", "#F59E0B", "#34D399", "#A78BFA", "#FB7185"];

interface Confetti {
  id: number;
  x: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  spin: number;
}

function QuizCelebration({ score, total }: { score: number; total: number }) {
  const theme = useThemeColors();
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rings = useRef([new Animated.Value(0), new Animated.Value(0)]).current;
  const pct = Math.round((score / total) * 100);

  const confetti = useMemo<Confetti[]>(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        x: 3 + Math.random() * 92,
        size: 5 + Math.random() * 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 900,
        duration: 2300 + Math.random() * 1500,
        spin: (Math.random() * 2 - 1) * 240,
      })),
    [],
  );

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 4,
      tension: 120,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    rings.forEach((ring, i) => {
      Animated.loop(
        Animated.timing(ring, {
          toValue: 1,
          duration: 2400,
          delay: i * 950,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ).start();
    });
  }, [logoScale, floatAnim, rings]);

  const ringStyle = (ring: Animated.Value) => ({
    transform: [
      {
        scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] }),
      },
    ],
    opacity: ring.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.55, 0.35, 0] }),
  });

  return (
    <View style={styles.celebrateWrap}>
      <View style={styles.confettiArea} pointerEvents="none">
        {confetti.map((c) => (
          <ConfettiPiece key={c.id} {...c} />
        ))}
      </View>

      <View style={styles.logoStage}>
        {rings.map((ring, i) => (
          <Animated.View
            key={i}
            style={[
              styles.ring,
              { borderColor: theme.success },
              ringStyle(ring),
            ]}
          />
        ))}
        <Animated.View
          style={[
            styles.logoHalo,
            { transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }] },
          ]}
        >
          <Animated.View
            style={[
              styles.logoCircle,
              { backgroundColor: theme.surface, borderColor: theme.borderLight },
              { transform: [{ scale: logoScale }] },
            ]}
          >
            <Image source={images.yuinxLogoTrans} style={styles.logoImg} contentFit="contain" />
          </Animated.View>
        </Animated.View>
      </View>

      <Text style={[styles.congratsTitle, { color: theme.success }]}>Quiz Passed!</Text>
      <Text style={[styles.congratsScore, { color: theme.text }]}>
        {score} / {total} · {pct}%
      </Text>
      <Text style={[styles.congratsSub, { color: theme.textMuted }]}>
        {pct === 100 ? "Perfect score. Absolutely nailed it." : "Great work — you've mastered this note."}
      </Text>
    </View>
  );
}

function ConfettiPiece({ x, size, color, delay, duration, spin }: Confetti) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [anim, duration, delay]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 200] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${spin}deg`] });
  const opacity = anim.interpolate({ inputRange: [0, 0.75, 1], outputRange: [0.95, 0.9, 0] });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left: `${x}%`,
          width: size,
          height: size * 1.6,
          borderRadius: size / 4,
          backgroundColor: color,
          opacity,
          transform: [{ translateY }, { rotate }],
        },
      ]}
    />
  );
}

export default function AiQuizView({ questions, onComplete }: AiQuizViewProps) {
  const theme = useThemeColors();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (questions.length === 0) return null;

  const question = questions[index];
  const passed = score / questions.length >= 0.75;

  const handleSelect = (optionIndex: number) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    if (optionIndex === question.correctAnswer) {
      setScore((s) => s + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setDone(true);
      onComplete?.();
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
    }
  };

  const restart = () => {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  };

  if (done) {
    if (passed) {
      return (
        <View>
          <QuizCelebration score={score} total={questions.length} />
          <Pressable
            onPress={restart}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.primaryLabel}>Retake quiz</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.doneWrap}>
        <ThemeIcon sf="checkmark.seal" material="check-decagram" size={44} color={theme.warning} />
        <Text style={[styles.doneTitle, { color: theme.text }]}>
          {score} / {questions.length}
        </Text>
        <Text style={[styles.doneSub, { color: theme.textMuted }]}>
          {score === questions.length
            ? "Perfect score. Nailed it."
            : "Aim for 75% to pass. Re-read the note and try again."}
        </Text>
        <Pressable
          onPress={restart}
          style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.primaryLabel}>Retake quiz</Text>
        </Pressable>
      </View>
    );
  }

  const optionColor = (optionIndex: number) => {
    if (selected === null) return theme.surface;
    if (optionIndex === question.correctAnswer) return theme.success;
    if (optionIndex === selected) return theme.danger;
    return theme.surface;
  };

  return (
    <View>
      <View style={[styles.headerRow, { borderBottomColor: theme.borderLight }]}>
        <Text style={[styles.progress, { color: theme.textMuted }]}>
          Question {index + 1} of {questions.length}
        </Text>
        <Text style={[styles.score, { color: theme.primary }]}>Score {score}</Text>
      </View>
      <Text style={[styles.question, { color: theme.text }]}>{question.question}</Text>
      <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
        {question.options.map((option, i) => {
          const color = optionColor(i);
          const borderColor =
            selected !== null && (i === question.correctAnswer || i === selected)
              ? color
              : theme.borderLight;
          const labelColor =
            selected !== null &&
            (i === question.correctAnswer ||
              (i === selected && optionIndexHasError(i)))
              ? "#FFFFFF"
              : theme.text;
          return (
            <Pressable
              key={i}
              disabled={selected !== null}
              onPress={() => handleSelect(i)}
              style={[styles.option, { backgroundColor: color, borderColor }]}
            >
              <Text style={[styles.optionLabel, { color: labelColor }]}>{option}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {selected !== null &&
        question.correctAnswer >= 0 &&
        selected !== question.correctAnswer && (
          <View
            style={[
              styles.reveal,
              { backgroundColor: theme.danger + "14", borderColor: theme.danger + "55" },
            ]}
          >
            <ThemeIcon sf="lightbulb.fill" material="lightbulb-on-outline" size={15} color={theme.danger} />
            <Text style={[styles.revealLabel, { color: theme.text }]}>
              Correct answer:{" "}
              <Text style={[styles.revealStrong, { color: theme.success }]}>
                {question.options[question.correctAnswer]}
              </Text>
            </Text>
          </View>
        )}
      <View style={styles.spacer} />
      <Pressable
        disabled={selected === null}
        onPress={handleNext}
        style={[
          styles.primaryBtn,
          { backgroundColor: theme.primary },
          selected === null && { opacity: 0.4 },
        ]}
      >
        <Text style={styles.primaryLabel}>
          {index + 1 >= questions.length ? "See results" : "Next question"}
        </Text>
      </Pressable>
    </View>
  );

  function optionIndexHasError(i: number) {
    return i === selected && i !== question.correctAnswer;
  }
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  progress: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk",
  },
  score: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk",
  },
  question: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 23,
    marginBottom: 14,
    fontFamily: "SpaceGrotesk",
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "SpaceGrotesk",
  },
  reveal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  revealLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "SpaceGrotesk",
  },
  revealStrong: {
    fontWeight: "700",
  },
  spacer: {
    height: 8,
  },
  primaryBtn: {
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  primaryLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk",
  },
  doneWrap: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8,
  },
  doneTitle: {
    fontSize: 30,
    fontWeight: "800",
    fontFamily: "SpaceGrotesk",
  },
  doneSub: {
    fontSize: 13,
    textAlign: "center",
    fontFamily: "SpaceGrotesk",
  },
  celebrateWrap: {
    alignItems: "center",
    paddingTop: 34,
    paddingBottom: 18,
  },
  confettiArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 210,
    overflow: "hidden",
  },
  confettiPiece: {
    position: "absolute",
    top: 0,
  },
  logoStage: {
    width: 132,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  ring: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
  },
  logoHalo: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: {
    width: 64,
    height: 64,
  },
  congratsTitle: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "SpaceGrotesk",
  },
  congratsScore: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk",
    marginTop: 4,
  },
  congratsSub: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    fontFamily: "SpaceGrotesk",
  },
});