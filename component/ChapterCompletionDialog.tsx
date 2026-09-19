import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useTheme";
import type { ChapterPerformance } from "../store/courseProgressStore";

interface Props {
  visible: boolean;
  performance: ChapterPerformance | null;
  onContinue: () => void;
}

export default function ChapterCompletionDialog({
  visible,
  performance,
  onContinue,
}: Props) {
  const theme = useThemeColors();
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, damping: 10, stiffness: 180, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.5);
      opacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const tierColors: Record<string, string> = {
    perfect: "#FFD700",
    great: "#38BDF8",
    good: "#4ADE80",
    average: "#FBBF24",
    low: "#F87171",
  };

  const accentColor = performance ? tierColors[performance.tier] || theme.warning : theme.warning;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onContinue}>
      <Pressable style={styles.backdrop} onPress={onContinue}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.borderLight,
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <View style={[styles.emojiWrap, { backgroundColor: accentColor + "20" }]}>
            <Text style={styles.emoji}>{performance?.emoji ?? "🎉"}</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>
            {performance?.message ?? "Complete!"}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {performance?.subtitle ?? "Great work!"}
          </Text>

          {performance ? (
            <View style={[styles.statsRow, { backgroundColor: theme.surfaceAlt }]}>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {performance.stats.avgScore}%
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Avg Score</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {performance.stats.perfectCount}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Perfect</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {performance.stats.totalRetries}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Retries</Text>
              </View>
            </View>
          ) : null}

          {performance && performance.xp > 0 ? (
            <View style={[styles.xpBadge, { backgroundColor: accentColor + "20" }]}>
              <Ionicons name="sparkles" size={18} color={accentColor} />
              <Text style={[styles.xpText, { color: accentColor }]}>+{performance.xp} XP</Text>
            </View>
          ) : (
            <Text style={[styles.noXpNote, { color: theme.textMuted }]}>Keep practicing!</Text>
          )}

          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: theme.primary }]}
            onPress={onContinue}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  emojiWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    width: "100%",
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    marginVertical: 4,
  },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  xpText: {
    fontSize: 16,
    fontWeight: "800",
  },
  noXpNote: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 20,
  },
  continueBtn: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  continueBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
