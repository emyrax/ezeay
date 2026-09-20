import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useThemeColors } from "../../hooks/useTheme";
import { useAuth } from "../../contexts/AuthContext";
import { useFlashcardStore } from "../../store/flashcardStore";

export default function FlashcardsScreen() {
  const theme = useThemeColors();
  const router = useRouter();
  const { getToken } = useAuth();
  const { cards, loading, error, fetchCards, clearError } = useFlashcardStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCards(true, getToken);
  }, [fetchCards, getToken]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCards(true, getToken);
    setRefreshing(false);
  }, [fetchCards, getToken]);

  const dueCount = cards.length;

  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof cards>();
    for (const c of cards) {
      const key = c.sourceTitle || "Flashcards";
      const list = map.get(key) ?? [];
      list.push(c);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [cards]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <MaterialCommunityIcons name="chevron-left" size={26} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Flashcards</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.summaryIcon, { backgroundColor: theme.primary + "20" }]}>
            <MaterialCommunityIcons name="cards-outline" size={24} color={theme.primary} />
          </View>
          <Text style={[styles.summaryNumber, { color: theme.text }]}>{dueCount}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
            cards due now
          </Text>
          <Pressable
            disabled={dueCount === 0}
            onPress={() => router.push("/(study)/flashcards/review")}
            style={[
              styles.reviewBtn,
              { backgroundColor: dueCount > 0 ? theme.primary : theme.border },
            ]}
          >
            <Text style={styles.reviewBtnText}>
              {dueCount > 0 ? "Start Review" : "All caught up"}
            </Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={grouped}
        keyExtractor={([title]) => title}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: theme.danger + "15", borderColor: theme.danger }]}>
                <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
                <Pressable
                  onPress={clearError}
                  hitSlop={8}
                  style={styles.errorDismiss}
                >
                  <MaterialCommunityIcons name="close" size={16} color={theme.danger} />
                </Pressable>
              </View>
            ) : null}
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>DUE FLASHCARDS</Text>
          </>
        }
        renderItem={({ item }) => {
          const [title, list] = item;
          return (
            <View style={[styles.groupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.groupHeader}>
                <MaterialCommunityIcons
                  name="book-open-variant"
                  size={16}
                  color={theme.textSecondary}
                />
                <Text style={[styles.groupTitle, { color: theme.text }]} numberOfLines={1}>
                  {title}
                </Text>
                <View style={[styles.countBadge, { backgroundColor: theme.primary + "20" }]}>
                  <Text style={[styles.countText, { color: theme.primary }]}>{list.length}</Text>
                </View>
              </View>
              {list.slice(0, 3).map((c) => (
                <Text
                  key={c.id}
                  style={[styles.cardPreview, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {c.front}
                </Text>
              ))}
              {list.length > 3 && (
                <Text style={[styles.moreText, { color: theme.textMuted }]}>
                  +{list.length - 3} more
                </Text>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="cards" size={56} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No flashcards due right now.
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
                Generate flashcards from any study material to start.
              </Text>
            </View>
          )
        }
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
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
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  summaryRow: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 40,
    fontWeight: "800",
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  reviewBtn: {
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
  },
  reviewBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  listContent: {
    padding: 20,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  errorDismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  countBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: "800",
  },
  cardPreview: {
    fontSize: 13,
  },
  moreText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingState: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 50,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});