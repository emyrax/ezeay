import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AiQuizView from "../../component/notes/AiQuizView";
import { fontFamily } from "../../constants/themes";
import { useAuth } from "../../contexts/AuthContext";
import { useThemeColors } from "../../hooks/useTheme";
import { TutorHero } from "../../component/tutor/TutorHero";
import { track } from "../../lib/analytics";
import { api } from "../../lib/api";
import { generateTutorQuiz } from "../../lib/tutor/quiz";
import { examLabel } from "../../data/exams";
import { useModelStore } from "../../store/modelStore";
import { useStudyStore } from "../../store/studyStore";
import type { TutorQuiz } from "../../types/tutor";

type QuizSource = "materials" | "topic";

const SUGGESTIONS = [
  "Photosynthesis",
  "Quadratic equations",
  "Essay writing",
  "Periodic table",
  "Human digestion",
];

export default function TutorQuizScreen() {
  const theme = useThemeColors();
  const router = useRouter();
  const { user, profile, getToken } = useAuth();
  const selectedModel = useModelStore((state) => state.selectedModel);
  const materials = useStudyStore((state) => state.materials);
  const materialsLoaded = useStudyStore((state) => state.loaded);
  const materialsLoading = useStudyStore((state) => state.loading);
  const fetchMaterials = useStudyStore((state) => state.fetchMaterials);

  const [source, setSource] = useState<QuizSource>("materials");
  const [topic, setTopic] = useState("");
  const [examType, setExamType] = useState("");
  const [quiz, setQuiz] = useState<TutorQuiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (materialsLoaded) return;
    const userId = profile?.uid ?? user?.uid;
    if (!userId) return;
    fetchMaterials(userId, getToken).catch(() => {});
  }, [fetchMaterials, getToken, materialsLoaded, profile?.uid, user?.uid]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.tutor.preferences.get(token);
        if (!cancelled) setExamType(res.preferences.examType ?? "");
      } catch {
        // the quiz still works without a saved exam preference
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const startMaterialsQuiz = (materialId: string, title: string) => {
    track("tutor_quiz_started", { source: "materials", questions: 0 });
    router.push(`/(study)/${materialId}/quiz?from=tutor&title=${encodeURIComponent(title)}`);
  };

  const generate = async () => {
    const cleanTopic = topic.trim();
    if (cleanTopic.length < 3) {
      setError("Enter a topic with at least 3 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    setQuiz(null);
    try {
      const nextQuiz = await generateTutorQuiz(
        {
          topic: cleanTopic,
          examType: examType.trim() || undefined,
          mode: "general",
        },
        getToken,
        selectedModel,
      );
      setQuiz(nextQuiz);
      track("tutor_quiz_started", {
        source: "topic",
        questions: nextQuiz.questions.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quiz generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setQuiz(null);
    setError(null);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Practice quiz</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
            Check what you know
          </Text>
        </View>
        <View style={styles.headerButton} />
      </View>
      <TutorHero
        icon="book-open-variant"
        headline="Practice quiz"
        subhead="Check what you know"
        action={{
          label: "Start",
          onPress: () => {},
          accessibilityLabel: "Start quiz",
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.segment, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {(["materials", "topic"] as QuizSource[]).map((item) => {
            const active = source === item;
            return (
              <Pressable
                key={item}
                onPress={() => {
                  setSource(item);
                  setError(null);
                }}
                style={[
                  styles.segmentItem,
                  { backgroundColor: active ? theme.primary : "transparent" },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? "#FFFFFF" : theme.textSecondary },
                  ]}
                >
                  {item === "materials" ? "My materials" : "Any topic"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {source === "materials" ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Pick a study material
            </Text>
            <Text style={[styles.sectionHint, { color: theme.textMuted }]}>
              Quizzes from your own notes keep your XP and daily goal progress.
            </Text>

            {materialsLoading && materials.length === 0 ? (
              <View style={styles.center}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : materials.length === 0 ? (
              <View style={[styles.empty, { borderColor: theme.border }]}>
                <MaterialCommunityIcons
                  name="book-open-variant"
                  size={26}
                  color={theme.textMuted}
                />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  No study materials yet
                </Text>
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  Upload a PDF or note in Study, then come back to practice.
                </Text>
                <Pressable
                  onPress={() => router.push("/(study)")}
                  style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryButtonText}>Go to Study</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.materialList}>
                {materials.map((material) => (
                  <Pressable
                    key={material.id}
                    onPress={() => startMaterialsQuiz(material.id, material.title)}
                    style={[
                      styles.materialCard,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Start quiz on ${material.title}`}
                  >
                    <View style={[styles.materialIcon, { backgroundColor: theme.primaryLight }]}>
                      <MaterialCommunityIcons
                        name="file-document-outline"
                        size={20}
                        color={theme.primary}
                      />
                    </View>
                    <View style={styles.materialMain}>
                      <Text
                        style={[styles.materialTitle, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {material.title}
                      </Text>
                      <Text style={[styles.materialMeta, { color: theme.textMuted }]}>
                        {material.type?.toUpperCase() || "MATERIAL"}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color={theme.textMuted}
                    />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            {quiz ? (
              <>
                <View style={styles.quizHeader}>
                  <View style={styles.quizHeaderMain}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      {quiz.topic}
                    </Text>
                    <Text style={[styles.sectionHint, { color: theme.textMuted }]}>
                      {quiz.questions.length} questions
                    </Text>
                  </View>
                  <Pressable
                    onPress={reset}
                    style={[styles.smallButton, { borderColor: theme.border }]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>
                      New quiz
                    </Text>
                  </Pressable>
                </View>
                <AiQuizView
                  questions={quiz.questions}
                  onComplete={({ correct, total }) =>
                    track("tutor_quiz_completed", {
                      source: "topic",
                      correct,
                      total,
                    })
                  }
                />
              </>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  What do you want to practise?
                </Text>
                <Text style={[styles.sectionHint, { color: theme.textMuted }]}>
                  {examType.trim()
                    ? `Enter any ${examLabel(examType)} topic. The Tutor will create 5 exam-style questions.`
                    : "Enter any topic. The Tutor will create 5 exam-style questions."}
                </Text>
                <TextInput
                  value={topic}
                  onChangeText={(next) => {
                    setTopic(next);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Chemical bonding"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  returnKeyType="go"
                  onSubmitEditing={generate}
                  accessibilityLabel="Quiz topic"
                />
                <View style={styles.chipRow}>
                  {SUGGESTIONS.map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      onPress={() => setTopic(suggestion)}
                      style={[
                        styles.chip,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                      ]}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.chipText, { color: theme.textSecondary }]}>
                        {suggestion}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {error ? (
                  <View
                    style={[
                      styles.errorBox,
                      {
                        backgroundColor: theme.danger + "18",
                        borderColor: theme.danger + "55",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="alert-circle-outline"
                      size={18}
                      color={theme.danger}
                    />
                    <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={generate}
                  disabled={loading}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: loading ? theme.border : theme.primary },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Generate quiz"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="lightning-bolt" size={19} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Generate quiz</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontFamily,
    fontSize: 11,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    borderRadius: 9,
  },
  segmentText: {
    fontFamily,
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  sectionHint: {
    fontFamily,
    fontSize: 12,
    lineHeight: 18,
  },
  center: {
    paddingVertical: 32,
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginTop: 4,
  },
  emptyTitle: {
    fontFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  emptyText: {
    fontFamily,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  materialList: {
    gap: 8,
    marginTop: 2,
  },
  materialCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  materialIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  materialMain: {
    flex: 1,
  },
  materialTitle: {
    fontFamily,
    fontSize: 13,
    fontWeight: "600",
  },
  materialMeta: {
    fontFamily,
    fontSize: 10,
    marginTop: 2,
  },
  quizHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  quizHeaderMain: {
    flex: 1,
    gap: 2,
  },
  smallButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  smallButtonText: {
    fontFamily,
    fontSize: 11,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    fontFamily,
    fontSize: 14,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily,
    fontSize: 11,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    flex: 1,
    fontFamily,
    fontSize: 12,
    lineHeight: 17,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily,
    fontSize: 14,
    fontWeight: "700",
  },
});
