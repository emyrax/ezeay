import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "../hooks/useTheme";
import type { StudySuggestion, StudySuggestionType } from "../types/study";

interface Props {
  visible: boolean;
  suggestions: StudySuggestion[] | null;
  loading: boolean;
  error: string | null;
  pageLabel: string;
  sourceLabel: string;
  roomLabel: string;
  onClose: () => void;
  onShuffle: () => void;
  onRetry: () => void;
}

const TYPE_META: Record<
  StudySuggestionType,
  { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }
> = {
  mnemonic: { icon: "bulb-outline", label: "Memory trick", color: "#38BDF8" },
  analogy: { icon: "git-compare-outline", label: "Analogy", color: "#A855F7" },
  story: { icon: "book-outline", label: "Story", color: "#F59E0B" },
  examTip: { icon: "school-outline", label: "Exam tip", color: "#22C55E" },
  hook: { icon: "flame-outline", label: "Hook", color: "#EF4444" },
  connection: { icon: "link-outline", label: "Real-world link", color: "#8B5CF6" },
};

export default function StudySuggestModal({
  visible,
  suggestions,
  loading,
  error,
  pageLabel,
  sourceLabel,
  roomLabel,
  onClose,
  onShuffle,
  onRetry,
}: Props) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (visible) setExpanded(null);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: theme.surface, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Make it stick</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                AI study coach ideas for {pageLabel}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {loading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.stateText, { color: theme.textSecondary }]}>
                  Cooking up ideas…
                </Text>
              </View>
            ) : error ? (
              <View style={styles.stateBox}>
                <Ionicons name="cloud-offline-outline" size={36} color={theme.textMuted} />
                <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
                <Pressable
                  onPress={onRetry}
                  style={[styles.retryBtn, { backgroundColor: theme.primary }]}
                >
                  <Text style={styles.retryText}>Try Again</Text>
                </Pressable>
              </View>
            ) : suggestions && suggestions.length > 0 ? (
              suggestions.map((s, i) => {
                const meta = TYPE_META[s.type] ?? TYPE_META.hook;
                const isOpen = expanded === s.title;
                return (
                  <Pressable
                    key={`${s.type}_${i}`}
                    onPress={() => setExpanded(isOpen ? null : s.title)}
                    style={[
                      styles.suggestionCard,
                      { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                    ]}
                  >
                    <View style={styles.suggestionTop}>
                      <View style={[styles.suggestionIcon, { backgroundColor: meta.color + "22" }]}>
                        <Ionicons name={meta.icon} size={18} color={meta.color} />
                      </View>
                      <View style={styles.suggestionTextWrap}>
                        <Text style={[styles.suggestionLabel, { color: meta.color }]}>
                          {meta.label}
                        </Text>
                        <Text style={[styles.suggestionTitle, { color: theme.text }]}>
                          {s.title}
                        </Text>
                      </View>
                      <Ionicons
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={theme.textMuted}
                      />
                    </View>
                    {isOpen && (
                      <Text style={[styles.suggestionBody, { color: theme.textSecondary }]}>
                        {s.body}
                      </Text>
                    )}
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.stateBox}>
                <Text style={[styles.stateText, { color: theme.textSecondary }]}>
                  No suggestions yet.
                </Text>
              </View>
            )}
          </ScrollView>

          {!loading && !error && suggestions && suggestions.length > 0 && (
            <Pressable
              onPress={onShuffle}
              style={[styles.shuffleBtn, { backgroundColor: theme.primary }]}
            >
              <Ionicons name="shuffle" size={18} color="#FFFFFF" />
              <Text style={styles.shuffleText}>Shuffle ideas</Text>
            </Pressable>
          )}

          <View style={styles.footerNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.footerText, { color: theme.textMuted }]} numberOfLines={2}>
              {roomLabel}
            </Text>
            <Text style={[styles.footerModel, { color: theme.textMuted }]} numberOfLines={1}>
              {sourceLabel}
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "78%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 10,
    paddingBottom: 8,
  },
  stateBox: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 40,
  },
  stateText: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  retryBtn: {
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  suggestionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  suggestionTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  suggestionBody: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  shuffleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 24,
    paddingVertical: 12,
    marginTop: 12,
  },
  shuffleText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
  },
  footerModel: {
    fontSize: 11,
    fontWeight: "700",
    maxWidth: 140,
  },
});