import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useProgressStore } from "../store/courseProgressStore";
import { useThemeColors } from "../hooks/useTheme";
import type { Chapter } from "../types/chapter";

interface Props {
  visible: boolean;
  chapter: Chapter | null;
  chapterIndex: number;
  courseId: string;
  onClose: () => void;
  onStart: (chapterIndex: number) => void;
}

export default function ChapterBottomSheet({ visible, chapter, chapterIndex, courseId, onClose, onStart }: Props) {
  const theme = useThemeColors();
  const isQuizPassed = useProgressStore((s) => s.isQuizPassed);

  if (!chapter) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[styles.chapterNumber, { color: theme.primary }]}>
              Chapter {chapter.order || chapterIndex + 1}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{chapter.title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {chapter.description}
          </Text>
          <Text style={[styles.subheading, { color: theme.text }]}>Lesson Plan</Text>
          <ScrollView style={styles.subtopicList} showsVerticalScrollIndicator={false}>
            {chapter.subtopics.map((sub, i) => {
              const completed = isQuizPassed(courseId, chapterIndex, i);
              return (
                <View key={i} style={styles.subtopicRow}>
                  <Ionicons
                    name={completed ? "checkmark-circle" : "ellipse-outline"}
                    size={18}
                    color={completed ? theme.success : theme.textMuted}
                  />
                  <Text
                    style={[
                      styles.subtopicText,
                      { color: completed ? theme.text : theme.textSecondary },
                    ]}
                  >
                    {sub.title}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: theme.primary }]}
            onPress={() => onStart(chapterIndex)}
          >
            <Text style={styles.startBtnText}>Start Chapter</Text>
          </TouchableOpacity>
          <View style={{ height: 20 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: "80%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  chapterNumber: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  subheading: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  subtopicList: {
    maxHeight: 260,
  },
  subtopicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  subtopicText: {
    fontSize: 14,
    flex: 1,
  },
  startBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  startBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
