import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import ThemeIcon from "./ThemeIcon";

export interface AiFlashcard {
  front: string;
  back: string;
}

interface AiFlashcardsViewProps {
  cards: AiFlashcard[];
}

export default function AiFlashcardsView({ cards }: AiFlashcardsViewProps) {
  const theme = useThemeColors();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) return null;

  const card = cards[index];

  return (
    <View>
      <View style={[styles.headerRow, { borderBottomColor: theme.borderLight }]}>
        <Text style={[styles.progress, { color: theme.textMuted }]}>
          {index + 1} / {cards.length}
        </Text>
        {flipped && (
          <Text style={[styles.backHint, { color: theme.primary }]}>Answer</Text>
        )}
      </View>
      <Pressable
        onPress={() => setFlipped((v) => !v)}
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderLight }]}
      >
        <View style={styles.cardTop}>
          <ThemeIcon
            sf={flipped ? "arrow.uturn.backward" : "questionmark.circle"}
            material={flipped ? "autorenew" : "help-circle-outline"}
            size={16}
            color={theme.textMuted}
          />
          <Text style={[styles.tapHint, { color: theme.textMuted }]}>
            {flipped ? "Tap to flip" : "Tap to reveal"}
          </Text>
        </View>
        <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.text, { color: theme.text }]}>{flipped ? card.back : card.front}</Text>
        </ScrollView>
      </Pressable>
      <View style={styles.navRow}>
        <Pressable
          disabled={index === 0}
          onPress={() => {
            setIndex((i) => i - 1);
            setFlipped(false);
          }}
          style={[
            styles.navBtn,
            { backgroundColor: theme.surface, borderColor: theme.borderLight },
            index === 0 && { opacity: 0.4 },
          ]}
        >
          <ThemeIcon sf="chevron.left" material="chevron-left" size={18} color={theme.text} />
        </Pressable>
        <Pressable
          disabled={index === cards.length - 1}
          onPress={() => {
            setIndex((i) => i + 1);
            setFlipped(false);
          }}
          style={[
            styles.navBtn,
            { backgroundColor: theme.surface, borderColor: theme.borderLight },
            index === cards.length - 1 && { opacity: 0.4 },
          ]}
        >
          <ThemeIcon sf="chevron.right" material="chevron-right" size={18} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  progress: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk",
  },
  backHint: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk",
  },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    minHeight: 220,
    justifyContent: "center",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tapHint: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk",
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "SpaceGrotesk",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 14,
  },
  navBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});