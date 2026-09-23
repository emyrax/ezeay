import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import QuizRewardOverlay from "../../../component/QuizRewardOverlay";
import { useThemeColors } from "../../../hooks/useTheme";
import { useAuth } from "../../../contexts/AuthContext";
import { isLocalFlashcard, useFlashcardStore } from "../../../store/flashcardStore";
import { api } from "../../../lib/api";
import type { FlashcardQuality } from "../../../types/flashcard";

function applyLocalReview(
  card: NonNullable<ReturnType<typeof useFlashcardStore.getState>["cards"][number]>,
  quality: FlashcardQuality,
) {
  const now = new Date();
  const addDays = (days: number) =>
    new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  let intervalDays: number;
  let ease: number;
  let repetitions: number;
  let lapses: number;
  let dueAt: string;

  if (quality === 0) {
    intervalDays = 0;
    ease = Math.max(1.3, card.ease - 0.2);
    repetitions = 0;
    lapses = card.lapses + 1;
    dueAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  } else if (quality === 3) {
    intervalDays = card.repetitions === 0 ? 1 : card.intervalDays;
    ease = card.ease;
    repetitions = card.repetitions + 1;
    lapses = card.lapses;
    dueAt = addDays(intervalDays);
  } else {
    intervalDays = card.repetitions === 0 ? 6 : Math.max(6, Math.round(card.intervalDays * card.ease));
    ease = card.ease + 0.15;
    repetitions = card.repetitions + 1;
    lapses = card.lapses;
    dueAt = addDays(intervalDays);
  }

  return {
    id: card.id,
    intervalDays,
    ease,
    repetitions,
    lapses,
    dueAt,
    awardedXp: 0,
  };
}

export default function ReviewScreen() {
  const theme = useThemeColors();
  const router = useRouter();
  const { getToken, refreshProfile } = useAuth();
  const { cards, loading, applyReview } = useFlashcardStore();

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const rewardShownRef = useRef(false);

  const card = cards[index];

  const handleQuality = useCallback(
    async (quality: FlashcardQuality) => {
      if (!card || reviewing) return;
      setReviewing(true);
      try {
const token = await getToken();
      let result: Awaited<ReturnType<typeof api.flashcards.review>> | ReturnType<typeof applyLocalReview>;
      if (isLocalFlashcard(card.id)) {
        result = applyLocalReview(card, quality);
      } else {
        if (!token) return;
        result = await api.flashcards.review(card.id, quality, token);
      }
      applyReview(result);
        setXpEarned((x) => x + result.awardedXp);
        setReviewedCount((c) => c + 1);
        if (result.awardedXp > 0) refreshProfile();
      } catch (err: any) {
        console.error("[ReviewScreen] review failed:", err);
      } finally {
        setReviewing(false);

        if (index + 1 >= cards.length) {
          setDone(true);
          if (!rewardShownRef.current) {
            rewardShownRef.current = true;
            setShowReward(true);
          }
          return;
        }

        if (quality === 0) {
          const list = useFlashcardStore.getState().cards;
          const idx = list.findIndex((c) => c.id === card.id);
          if (idx >= 0) {
            const requeued = [...list.slice(0, idx), ...list.slice(idx + 1), list[idx]];
            useFlashcardStore.setState({ cards: requeued });
          }
        } else {
          setIndex((i) => i + 1);
        }
        setRevealed(false);
      }
    },
    [card, reviewing, index, cards.length, getToken, applyReview, refreshProfile],
  );

  if (loading && cards.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (cards.length === 0 || done) {
    const earned = xpEarned;
    const reviewed = reviewedCount;
    const totalCards = Math.max(cards.length, 1);
    return (
      <View style={styles.container}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.centered}>
          <View
            style={[
              styles.doneCircle,
              { backgroundColor: earned > 0 ? theme.primary + "20" : theme.surfaceAlt },
            ]}
          >
            <MaterialCommunityIcons
              name={earned > 0 ? "trophy-outline" : "check"}
              size={48}
              color={earned > 0 ? theme.primary : theme.textSecondary}
            />
          </View>
          <Text style={[styles.doneTitle, { color: theme.text }]}>Review complete!</Text>
          <Text style={[styles.doneSub, { color: theme.textSecondary }]}>
            {done ? `${reviewed} cards reviewed` : "No cards to review right now."}
            {earned > 0 ? ` · ${earned} XP earned` : ""}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.doneBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.doneBtnText}>Back to Flashcards</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      <QuizRewardOverlay
        visible={showReward && reviewed > 0}
        title="Review complete!"
        subtitle={earned > 0 ? `+${earned} XP earned` : "Strong recall — well done"}
        accentColor={earned > 0 ? theme.primary : theme.success}
        progressCount={Math.min(reviewed, totalCards)}
        progressTotal={totalCards}
        progressLabel="Cards reviewed"
        progressHint={reviewed >= totalCards ? "All reviewed!" : `${totalCards - reviewed} to go`}
        primaryLabel="See Details"
        onPrimary={() => setShowReward(false)}
        secondaryLabel="Back to Flashcards"
        onSecondary={() => router.back()}
        onRequestClose={() => setShowReward(false)}
      >
        <Text style={[styles.motivationText, { color: theme.textMuted }]}>
          {earned > 0
            ? "Great momentum — keep the streak alive!"
            : "You're building a lasting memory. Keep it up!"}
        </Text>
      </QuizRewardOverlay>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <MaterialCommunityIcons name="chevron-left" size={26} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {index + 1} / {cards.length}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <Pressable style={styles.cardArea} onPress={() => setRevealed((v) => !v)}>
        <View
          style={[
            styles.flashcard,
            {
              backgroundColor: theme.surface,
              borderColor: revealed ? theme.primary + "60" : theme.border,
            },
          ]}
        >
          <View style={[styles.revealTag, { backgroundColor: theme.surfaceAlt }]}>
            <MaterialCommunityIcons
              name={revealed ? "refresh" : "eye-outline"}
              size={14}
              color={theme.textMuted}
            />
            <Text style={[styles.revealTagText, { color: theme.textMuted }]}>
              {revealed ? "Tap to show question" : "Tap to reveal answer"}
            </Text>
          </View>
          <Text style={[styles.cardText, { color: theme.text }]}>
            {revealed ? card.back : card.front}
          </Text>
          {!revealed && (
            <Text style={[styles.sourceText, { color: theme.textMuted }]}>
              {card.sourceTitle}
            </Text>
          )}
        </View>
      </Pressable>

      {revealed && (
        <View style={styles.actionsRow}>
          <Pressable
            disabled={reviewing}
            onPress={() => handleQuality(0)}
            style={[styles.actionBtn, { backgroundColor: theme.danger + "18" }]}
          >
            <Text style={[styles.actionPrimary, { color: theme.danger }]}>Again</Text>
            <Text style={[styles.actionSub, { color: theme.textMuted }]}>~1 min</Text>
          </Pressable>
          <Pressable
            disabled={reviewing}
            onPress={() => handleQuality(3)}
            style={[styles.actionBtn, { backgroundColor: theme.warning + "18" }]}
          >
            <Text style={[styles.actionPrimary, { color: theme.warning }]}>Good</Text>
            <Text style={[styles.actionSub, { color: theme.textMuted }]}>1 day</Text>
          </Pressable>
          <Pressable
            disabled={reviewing}
            onPress={() => handleQuality(5)}
            style={[styles.actionBtn, { backgroundColor: theme.success + "18" }]}
          >
            <Text style={[styles.actionPrimary, { color: theme.success }]}>Easy</Text>
            <Text style={[styles.actionSub, { color: theme.textMuted }]}>6 days</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 12,
  },
  doneCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  doneTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  doneSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  doneBtn: {
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  motivationText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 8,
  },
  cardArea: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  flashcard: {
    borderRadius: 28,
    borderWidth: 2,
    minHeight: 340,
    padding: 28,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  revealTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: "absolute",
    top: 16,
    alignSelf: "center",
  },
  revealTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardText: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 28,
  },
  sourceText: {
    fontSize: 12,
    position: "absolute",
    bottom: 16,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    padding: 20,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    gap: 2,
  },
  actionPrimary: {
    fontSize: 15,
    fontWeight: "800",
  },
  actionSub: {
    fontSize: 11,
    fontWeight: "600",
  },
});