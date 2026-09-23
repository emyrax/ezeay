import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useThemeColors } from "../hooks/useTheme";
import { images } from "../constants/images";
import ProgressBar from "./ProgressBar";

const CONFETTI_COLORS = ["#38BDF8", "#F59E0B", "#34D399", "#A78BFA", "#FB7185"];

interface ConfettiPieceConfig {
  id: number;
  x: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  spin: number;
}

interface QuizRewardOverlayProps {
  visible: boolean;
  score?: number;
  total?: number;
  title?: string;
  subtitle?: string;
  accentColor?: string;
  progressCount?: number;
  progressTotal?: number;
  progressLabel?: string;
  progressHint?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onRequestClose?: () => void;
  children?: React.ReactNode;
}

function ConfettiPiece({ x, size, color, delay, duration, spin }: ConfettiPieceConfig) {
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

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 560] });
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

export default function QuizRewardOverlay({
  visible,
  score,
  total,
  title,
  subtitle,
  accentColor,
  progressCount,
  progressTotal,
  progressLabel,
  progressHint,
  primaryLabel = "Continue",
  onPrimary,
  secondaryLabel,
  onSecondary,
  onRequestClose,
  children,
}: QuizRewardOverlayProps) {
  const theme = useThemeColors();
  const accent = accentColor ?? theme.success;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rings = useRef([new Animated.Value(0), new Animated.Value(0)]).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const pct = total && total > 0 && score !== undefined ? Math.round((score / total) * 100) : 0;

  const confetti = useMemo<ConfettiPieceConfig[]>(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: 3 + Math.random() * 92,
        size: 5 + Math.random() * 7,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 900,
        duration: 2300 + Math.random() * 1500,
        spin: (Math.random() * 2 - 1) * 240,
      })),
    [],
  );

  useEffect(() => {
    if (!visible) return;
    if (Platform.OS !== "web") {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // haptics are best-effort
      }
    }
    backdropOpacity.setValue(0);
    Animated.timing(backdropOpacity, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
    logoScale.setValue(0.3);
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
      ring.setValue(0);
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
  }, [visible, backdropOpacity, logoScale, floatAnim, rings]);

  const ringStyle = (ring: Animated.Value) => ({
    transform: [
      {
        scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] }),
      },
    ],
    opacity: ring.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.55, 0.35, 0] }),
  });

  const showScore = score !== undefined && total !== undefined && total > 0;
  const hasProgress =
    progressCount !== undefined && progressTotal !== undefined && progressTotal > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onRequestClose ?? onPrimary ?? onSecondary}
    >
      <Animated.View style={[styles.backdropWrap, { opacity: backdropOpacity }]}>
        <View style={styles.confettiArea} pointerEvents="none">
          {confetti.map((c) => (
            <ConfettiPiece key={c.id} {...c} />
          ))}
        </View>

        <View style={styles.stage}>
          {rings.map((ring, i) => (
            <Animated.View
              key={i}
              style={[styles.ring, { borderColor: accent }, ringStyle(ring)]}
            />
          ))}
          <Animated.View
            style={[
              styles.logoHalo,
              {
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -7],
                    }),
                  },
                ],
              },
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

        <Text style={[styles.title, { color: accent }]}>{title ?? "Quiz Passed!"}</Text>
        {showScore && (
          <Text style={[styles.score, { color: theme.text }]}>
            {score} / {total} · {pct}%
          </Text>
        )}
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {subtitle ??
            (pct === 100
              ? "Perfect score. Absolutely nailed it."
              : "Great work — you've mastered this.")}
        </Text>

        {hasProgress && (
          <View style={[styles.progressCard, { backgroundColor: theme.surfaceAlt }]}>
            <View style={styles.progressRow}>
              <Text style={[styles.progressLabel, { color: theme.text }]}>
                {progressLabel ?? `${progressCount} of ${progressTotal} complete`}
              </Text>
              <Text style={[styles.progressHint, { color: accent }]}>
                {progressHint ?? `${progressTotal - progressCount} to go`}
              </Text>
            </View>
            <ProgressBar
              progress={progressCount / progressTotal}
              trackColor={theme.border}
              filledColors={[accent, theme.accent] as [string, string]}
              height={10}
              borderRadius={5}
            />
          </View>
        )}

        {children}

        <View style={styles.actions}>
          {secondaryLabel && onSecondary && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: theme.surfaceAlt }]}
              onPress={onSecondary}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryLabel, { color: theme.textSecondary }]}>
                {secondaryLabel}
              </Text>
            </TouchableOpacity>
          )}
          {onPrimary && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: accent }]}
              onPress={onPrimary}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryLabel}>{primaryLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropWrap: {
    flex: 1,
    backgroundColor: "rgba(6, 10, 18, 0.94)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confettiArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },
  confettiPiece: {
    position: "absolute",
    top: 0,
  },
  stage: {
    width: 168,
    height: 168,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  ring: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  logoHalo: {
    position: "absolute",
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: {
    width: 72,
    height: 72,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  score: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  progressCard: {
    width: "100%",
    borderRadius: 16,
    padding: 14,
    marginTop: 22,
    gap: 10,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
  progressHint: {
    fontSize: 12,
    fontWeight: "700",
  },
  actions: {
    width: "100%",
    marginTop: 20,
    gap: 10,
  },
  primaryBtn: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryBtn: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
});