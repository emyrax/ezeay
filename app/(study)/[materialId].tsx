import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import StudyBiteView from "../../component/StudyBiteView";
import TimetableView from "../../component/TimetableView";
import StudyChatModal from "../../component/StudyChatModal";
import StudySuggestModal from "../../component/StudySuggestModal";
import { useThemeColors } from "../../hooks/useTheme";
import { useAuth } from "../../contexts/AuthContext";
import { useStudyStore } from "../../store/studyStore";
import { useStudyQuizStore } from "../../store/studyQuizStore";
import { useFlashcardStore } from "../../store/flashcardStore";
import { api, friendlyError } from "../../lib/api";
import { useModelStore } from "../../store/modelStore";
import { getModelOption } from "../../lib/providers/modelRegistry";
import { useBiteSuggestions } from "../../hooks/useBiteSuggestions";
import {
  ensureOfflineActivated,
  isOfflineRef,
  modelErrorMessage,
  offlineGenerateObject,
} from "../../lib/providers/offline";
import { shapeToSchema } from "../../lib/offline/jsonSchema";
import {
  buildStudyCheatsheetPrompt,
  resolveMaterialContent,
} from "../../lib/offline/studyPrompts";
import type { TimetableSlot } from "../../types/study";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function StudyMaterialScreen() {
  const { materialId } = useLocalSearchParams<{ materialId: string }>();
  const theme = useThemeColors();
  const router = useRouter();
  const { getToken } = useAuth();
  const material = useStudyStore((s) => s.getMaterialById(materialId ?? ""));
  const updateMaterial = useStudyStore((s) => s.updateMaterial);

  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [currentBiteIndex, setCurrentBiteIndex] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [cheatsheet, setCheatsheet] = useState("");
  const [cheatsheetLoading, setCheatsheetLoading] = useState(false);
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [flashcardsGenerating, setFlashcardsGenerating] = useState(false);

  const [viewedCount, setViewedCount] = useState(0);
  const viewedRef = useRef(new Set<number>());
  const suggest = useBiteSuggestions();

  const selectedModel = useModelStore((s) => s.selectedModel);
  const modelLabel = getModelOption(selectedModel)?.label ?? selectedModel;
  const offlineActive = isOfflineRef(selectedModel);

  const flatListRef = useRef<FlatList>(null);
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
      const index = viewableItems[0]?.index ?? 0;
      setCurrentBiteIndex(index);
      if (Number.isInteger(index) && index >= 0) {
        viewedRef.current.add(index);
        setViewedCount(viewedRef.current.size);
      }
    },
  ).current;

  if (!material) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
          <Text style={[styles.notFoundText, { color: theme.textSecondary }]}>
            Material not found
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={[styles.backBtnText, { color: theme.text }]}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isTimetable = material.type === "timetable";
  const hasBites = material.bites && material.bites.length > 0;

  const handleSaveEdit = async () => {
    const token = await getToken();
    if (token && editTitle.trim()) {
      await updateMaterial(material.id, { title: editTitle.trim() }, token);
    }
    setShowEdit(false);
  };

  const handleDelete = () => {
    Alert.alert("Delete Material", `Delete "${material.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const token = await getToken();
          if (token) {
            await useStudyStore.getState().deleteMaterial(material.id, token);
            router.back();
          }
        },
      },
    ]);
  };

  const handleTimetableUpdate = async (slots: TimetableSlot[]) => {
    const token = await getToken();
    if (token) {
      await updateMaterial(
        material.id,
        { timetable: { slots } },
        token,
      );
    }
  };

  const handleStartQuiz = () => {
    router.push(`/(study)/${material.id}/quiz`);
  };

  const handleGenerateQuiz = async () => {
    if (quizGenerating) return;
    setQuizGenerating(true);
    try {
      await useStudyQuizStore.getState().generate(material.id, getToken);
      const state = useStudyQuizStore.getState();
      if (state.error) {
        Alert.alert("Quiz generation failed", state.error);
      } else {
        router.push(`/(study)/${material.id}/quiz`);
      }
    } catch (err: any) {
      Alert.alert(
        "Quiz generation failed",
        friendlyError(err, "Could not generate quiz."),
      );
    } finally {
      setQuizGenerating(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (flashcardsGenerating) return;
    setFlashcardsGenerating(true);
    try {
      const result = await useFlashcardStore
        .getState()
        .generateForMaterial(material.id, getToken);
      const storeError = useFlashcardStore.getState().error;
      if (storeError) {
        Alert.alert("Flashcard generation failed", storeError);
        return;
      }
      if (result) {
        router.push("/(study)/flashcards");
      }
    } catch (err: any) {
      Alert.alert(
        "Flashcard generation failed",
        friendlyError(err, "Could not generate flashcards."),
      );
    } finally {
      setFlashcardsGenerating(false);
    }
  };

  const handleGenerateCheatsheet = async () => {
    if (cheatsheetLoading) return;
    setCheatsheetLoading(true);
    try {
      if (isOfflineRef(useModelStore.getState().selectedModel)) {
        const selected = useModelStore.getState().selectedModel;
        await ensureOfflineActivated(selected);
        const { title, content } = await resolveMaterialContent(material.id, getToken);
        const prompt = buildStudyCheatsheetPrompt({ title, content });
        const data = await offlineGenerateObject<{ cheatsheet: string }>(
          shapeToSchema(prompt.jsonShape),
          { system: prompt.system },
        );
        const text = typeof data?.cheatsheet === "string" ? data.cheatsheet.trim() : "";
        setCheatsheet(text ? text : "No cheat sheet generated.");
        setShowCheatsheet(true);
        return;
      }

      const token = await getToken();
      if (!token) return;
      const res = await api.study.generateCheatsheet(material.id, token);
      setCheatsheet(res?.cheatsheet || "No cheat sheet generated.");
      setShowCheatsheet(true);
    } catch (err: any) {
      Alert.alert(
        "Generation failed",
        modelErrorMessage(err) || err.message || "Could not generate cheat sheet.",
      );
    } finally {
      setCheatsheetLoading(false);
    }
  };

  const handleSuggest = () => {
    const bite = material.bites[currentBiteIndex];
    setShowSuggest(true);
    void suggest.generate(material.id, {
      title: bite?.title,
      content: bite?.content,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {material.title}
          </Text>
        </View>
        <Pressable onPress={() => { setEditTitle(material.title); setShowEdit(true); }} style={styles.headerAction}>
          <Ionicons name="pencil" size={20} color={theme.textSecondary} />
        </Pressable>
        <Pressable onPress={handleDelete} style={styles.headerAction}>
          <Ionicons name="trash-outline" size={20} color={theme.danger} />
        </Pressable>
      </View>

      {material.summary ? (
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>SUMMARY</Text>
          <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
            {material.summary}
          </Text>
        </View>
      ) : null}

      {isTimetable && material.timetable ? (
        <TimetableView
          slots={material.timetable.slots}
          onUpdate={handleTimetableUpdate}
        />
      ) : hasBites ? (
        <View style={styles.bitesContainer}>
          <FlatList
            ref={flatListRef}
            data={material.bites}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={SCREEN_WIDTH - 20}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={styles.bitesList}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            renderItem={({ item, index }) => (
              <StudyBiteView
                bite={item}
                index={index}
                total={material.bites.length}
              />
            )}
          />

          <View style={styles.biteFooter}>
            <View style={styles.biteProgressWrap}>
              <View style={styles.biteDots}>
                {material.bites.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.biteDot,
                      {
                        backgroundColor:
                          i === currentBiteIndex ? theme.primary : theme.border,
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={[styles.biteProgressPill, { backgroundColor: theme.surfaceAlt }]}>
                <Ionicons name="book-outline" size={12} color={theme.textMuted} />
                <Text style={[styles.biteProgressText, { color: theme.textMuted }]}>
                  {viewedCount} / {material.bites.length} pages studied
                </Text>
              </View>
            </View>

            <View style={styles.biteActions}>
              <Pressable
                onPress={() => setShowChat(true)}
                style={[styles.askAiBtn, { borderColor: theme.border }]}
              >
                <Ionicons name="sparkles" size={16} color={theme.accent} />
                <Text style={[styles.askAiText, { color: theme.accent }]}>Ask AI</Text>
              </Pressable>
              <Pressable
                onPress={handleStartQuiz}
                style={[styles.quizCta, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="help-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.quizCtaText}>Start Quiz</Text>
              </Pressable>
            </View>

            <View style={styles.aiToolsRow}>
              <Pressable
                onPress={handleSuggest}
                style={[styles.aiToolChip, { backgroundColor: theme.surfaceAlt }]}
              >
                <Ionicons name="bulb-outline" size={14} color={theme.accent} />
                <Text style={[styles.aiToolText, { color: theme.textSecondary }]}>
                  Suggest
                </Text>
              </Pressable>
              <Pressable
                onPress={handleGenerateQuiz}
                disabled={quizGenerating}
                style={[styles.aiToolChip, { backgroundColor: theme.surfaceAlt }]}
              >
                {quizGenerating ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <Ionicons name="sparkles" size={14} color={theme.accent} />
                )}
                <Text style={[styles.aiToolText, { color: theme.textSecondary }]}>
                  Generate Quiz
                </Text>
              </Pressable>
              <Pressable
                onPress={handleGenerateFlashcards}
                disabled={flashcardsGenerating}
                style={[styles.aiToolChip, { backgroundColor: theme.surfaceAlt }]}
              >
                {flashcardsGenerating ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <Ionicons name="card-outline" size={14} color={theme.accent} />
                )}
                <Text style={[styles.aiToolText, { color: theme.textSecondary }]}>
                  Flashcards
                </Text>
              </Pressable>
              <Pressable
                onPress={handleGenerateCheatsheet}
                disabled={cheatsheetLoading}
                style={[styles.aiToolChip, { backgroundColor: theme.surfaceAlt }]}
              >
                {cheatsheetLoading ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <Ionicons name="documents-outline" size={14} color={theme.accent} />
                )}
                <Text style={[styles.aiToolText, { color: theme.textSecondary }]}>
                  Cheat Sheet
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyBites}>
          <Ionicons name="document-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyBitesText, { color: theme.textSecondary }]}>
            No study content extracted yet
          </Text>
        </View>
      )}

      <StudyChatModal
        visible={showChat}
        materialIds={[material.id]}
        materialTitle={material.title}
        getToken={getToken}
        onClose={() => setShowChat(false)}
      />

      <StudySuggestModal
        visible={showSuggest}
        suggestions={suggest.suggestions}
        loading={suggest.loading}
        error={suggest.error}
        pageLabel={`Page ${currentBiteIndex + 1} of ${material.bites.length}`}
        sourceLabel={offlineActive ? "On-device AI · offline" : modelLabel}
        roomLabel="Suggested from your study material — never shared."
        onClose={() => setShowSuggest(false)}
        onShuffle={handleSuggest}
        onRetry={handleSuggest}
      />

      <Modal visible={showCheatsheet} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.cheatsheetModal,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.cheatsheetHeader}>
              <Text style={[styles.cheatsheetTitle, { color: theme.text }]}>
                Cheat Sheet
              </Text>
              <Pressable onPress={() => setShowCheatsheet(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.cheatsheetScroll}>
              <Text style={[styles.cheatsheetText, { color: theme.textSecondary }]}>
                {cheatsheet}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showEdit} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Title</Text>
            <TextInput
              style={[
                styles.editInput,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholderTextColor={theme.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowEdit(false)}
                style={[styles.modalBtn, { backgroundColor: theme.border }]}
              >
                <Text style={[styles.modalBtnText, { color: theme.textSecondary }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSaveEdit}
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  notFound: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
    fontWeight: "600",
  },
  backBtn: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 12,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 20,
  },
  bitesContainer: {
    flex: 1,
    marginTop: 16,
  },
  bitesList: {
    paddingHorizontal: 10,
  },
  biteFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  biteProgressWrap: {
    alignItems: "flex-start",
    gap: 6,
  },
  biteDots: {
    flexDirection: "row",
    gap: 6,
  },
  biteProgressPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  biteProgressText: {
    fontSize: 11,
    fontWeight: "600",
  },
  biteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  biteActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiToolsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  aiToolChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  aiToolText: {
    fontSize: 12,
    fontWeight: "700",
  },
  askAiBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  askAiText: {
    fontSize: 13,
    fontWeight: "700",
  },
  quizCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  quizCtaText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyBites: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyBitesText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  editInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  modalBtn: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  cheatsheetModal: {
    width: "100%",
    maxHeight: "80%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  cheatsheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cheatsheetTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  cheatsheetScroll: {
    flexGrow: 0,
  },
  cheatsheetText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
