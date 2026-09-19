import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "../hooks/useTheme";
import type { StudyMaterial } from "../types/study";

interface Props {
  material: StudyMaterial;
  onPress: () => void;
  onDelete: () => void;
  processing?: boolean;
}

function getTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "image":
    case "timetable":
      return "image-outline";
    case "pdf":
      return "document-text-outline";
    case "doc":
      return "document-text-outline";
    case "txt":
      return "document-outline";
    default:
      return "document-outline";
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case "image":
      return "#38BDF8";
    case "timetable":
      return "#A855F7";
    case "pdf":
      return "#F59E0B";
    case "doc":
      return "#22C55E";
    case "txt":
      return "#64748B";
    default:
      return "#64748B";
  }
}

function formatDate(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function StudyMaterialCard({ material, onPress, onDelete, processing }: Props) {
  const theme = useThemeColors();
  const typeColor = getTypeColor(material.type);
  const biteCount = material.bites?.length ?? 0;
  const isTimetable = material.type === "timetable";

  const handleDelete = () => {
    Alert.alert("Delete Material", `Delete "${material.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  };

  return (
    <Pressable
      onPress={processing ? undefined : onPress}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={styles.cardContent}>
        <View style={[styles.iconWrap, { backgroundColor: typeColor + "20" }]}>
          {processing ? (
            <MaterialCommunityIcons name="loading" size={24} color={theme.accent} />
          ) : (
            <Ionicons name={getTypeIcon(material.type)} size={24} color={typeColor} />
          )}
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {material.title}
          </Text>
          {material.summary ? (
            <Text style={[styles.summary, { color: theme.textSecondary }]} numberOfLines={2}>
              {material.summary}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: theme.textMuted }]}>
              {material.type.toUpperCase()}
            </Text>
            {isTimetable ? (
              <Text style={[styles.metaText, { color: theme.textMuted, marginLeft: 12 }]}>
                Schedule
              </Text>
            ) : (
              <Text style={[styles.metaText, { color: theme.textMuted, marginLeft: 12 }]}>
                {biteCount} {biteCount === 1 ? "bite" : "bites"}
              </Text>
            )}
            <Text style={[styles.metaText, { color: theme.textMuted, marginLeft: 12 }]}>
              {formatDate(material.createdAt)}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleDelete}
          style={[styles.deleteBtn, { backgroundColor: theme.danger + "15" }]}
        >
          <Ionicons name="trash-outline" size={18} color={theme.danger} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 10,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  textWrap: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  summary: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  metaText: {
    fontSize: 10,
    fontWeight: "600",
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});
