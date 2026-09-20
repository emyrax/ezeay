import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import StudyQuizView from "../../../component/StudyQuizView";
import { useThemeColors } from "../../../hooks/useTheme";
import { useAuth } from "../../../contexts/AuthContext";
import { useStudyStore } from "../../../store/studyStore";
import { useStudyQuizStore } from "../../../store/studyQuizStore";
import { api } from "../../../lib/api";
import type { QuizResult, StudyQuiz } from "../../../types/study";

export default function StudyQuizScreen() {
  const { materialId } = useLocalSearchParams<{ materialId: string }>();
  const theme = useThemeColors();
  const router = useRouter();
  const { getToken, refreshProfile } = useAuth();
  const material = useStudyStore((s) => s.getMaterialById(materialId ?? ""));
  const storeQuestions = useStudyQuizStore((s) => s.questions);
  const storeMaterialId = useStudyQuizStore((s) => s.materialId);
  const storeLoading = useStudyQuizStore((s) => s.loading);
  const storeError = useStudyQuizStore((s) => s.error);
  const generateQuiz = useStudyQuizStore((s) => s.generate);
  const [results, setResults] = useState<QuizResult[] | null>(null);
  const [started, setStarted] = useState(false);
  const [awardedXp, setAwardedXp] = useState<number | null>(null);
  const completionRef = useRef(false);

  const allQuizzes = useMemo<StudyQuiz[]>(() => {
    if (storeQuestions && storeMaterialId === materialId && storeQuestions.length > 0) {
      return storeQuestions;
    }
    if (!material?.bites) return [];
    const quizzes: StudyQuiz[] = [];
    const seen = new Set<string>();
    for (const bite of material.bites) {
      for (const q of bite.quizzes) {
        if (!seen.has(q.id)) {
          seen.add(q.id);
          quizzes.push(q);
        }
      }
    }
    return quizzes;
  }, [material, storeQuestions, storeMaterialId, materialId]);

  const handleGenerate = async () => {
    try {
      await generateQuiz(materialId ?? "", getToken);
      if (!useStudyQuizStore.getState().error) {
        setResults(null);
      }
    } catch (err: any) {
      Alert.alert(
        "Quiz generation failed",
        err?.message || "Could not generate quiz questions. Try again.",
      );
    }
  };

  const handleComplete = async (quizResults: QuizResult[]) => {
    setResults(quizResults);
    if (completionRef.current || allQuizzes.length === 0) return;
    completionRef.current = true;
    const correct = quizResults.filter((r) => r.correct).length;
    try {
      const token = await getToken();
      if (token) {
        const res = await api.study.completeQuiz(
          materialId ?? "",
          { correct, total: allQuizzes.length },
          token,
        );
        setAwardedXp(res.awardedXp);
        refreshProfile();
      }
    } catch (err: any) {
      console.error("[QuizScreen] completeQuiz failed:", err);
    }
  };

  if (!material) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.danger} />
          <Text style={[styles.notFoundText, { color: theme.textSecondary }]}>
            Material not found
          </Text>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (allQuizzes.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Quiz</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.notFound}>
          <Ionicons name="help-circle-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.notFoundText, { color: theme.textSecondary }]}>
            No quiz questions yet. Generate a fresh AI quiz from this material.
          </Text>
          {storeError && !storeLoading && (
            <Text style={[styles.generateError, { color: theme.danger }]}>{storeError}</Text>
          )}
          <Pressable
            onPress={handleGenerate}
            disabled={storeLoading}
            style={[
              styles.generateBtn,
              { backgroundColor: storeLoading ? theme.border : theme.primary },
            ]}
          >
            {storeLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                <Text style={styles.generateBtnText}>Generate Quiz with AI</Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const correctCount = results?.filter((r) => r.correct).length ?? 0;
  const totalQuestions = allQuizzes.length;
  const score = results ? Math.round((correctCount / totalQuestions) * 100) : 0;

  if (results) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <ScrollView contentContainerStyle={styles.resultsContent}>
          <View style={styles.scoreCircle}>
            <Text
              style={[
                styles.scoreValue,
                {
                  color:
                    score >= 80
                      ? theme.success
                      : score >= 50
                        ? theme.warning
                        : theme.danger,
                },
              ]}
            >
              {score}%
            </Text>
            <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>
              {correctCount} / {totalQuestions} correct
            </Text>
            {awardedXp != null && awardedXp > 0 && (
              <View style={[styles.xpPill, { backgroundColor: theme.success + "20" }]}>
                <Ionicons name="flash" size={14} color={theme.success} />
                <Text style={[styles.xpPillText, { color: theme.success }]}>
                  +{awardedXp} XP
                </Text>
              </View>
            )}
          </View>

          <View style={styles.resultsList}>
            {allQuizzes.map((q, i) => {
              const result = results.find((r) => r.quizId === q.id);
              const isCorrect = result?.correct ?? false;
              return (
                <View
                  key={q.id}
                  style={[
                    styles.resultItem,
                    {
                      backgroundColor: theme.surface,
                      borderColor: isCorrect ? theme.success + "40" : theme.danger + "40",
                    },
                  ]}
                >
                  <View style={styles.resultHeader}>
                    <Ionicons
                      name={isCorrect ? "checkmark-circle" : "close-circle"}
                      size={20}
                      color={isCorrect ? theme.success : theme.danger}
                    />
                    <Text style={[styles.resultQuestion, { color: "#FFFFFF" }]}>
                      Q{i + 1}
                    </Text>
                  </View>
                  <Text style={[styles.resultQuestionText, { color: theme.textSecondary }]}>
                    {q.question}
                  </Text>
                  <Text
                    style={[
                      styles.resultAnswer,
                      { color: isCorrect ? theme.success : theme.danger },
                    ]}
                  >
                    Your answer: {q.options[result?.selectedAnswer ?? 0]}
                  </Text>
                  {!isCorrect && (
                    <Text style={[styles.correctAnswer, { color: theme.success }]}>
                      Correct answer: {q.options[q.correctAnswer]}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={() => router.back()}
            style={[styles.doneBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.doneBtnText}>Back to Study</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!started) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Quiz</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.startView}>
          <View style={[styles.startCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="help-circle" size={48} color={theme.primary} />
            <Text style={styles.startTitle}>Ready to Test Your Knowledge?</Text>
            <Text style={[styles.startDesc, { color: theme.textSecondary }]}>
              {totalQuestions} questions from {'\u201C'}{material.title}{'\u201D'}
            </Text>
            <Pressable
              onPress={() => setStarted(true)}
              style={[styles.startBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.startBtnText}>Start Quiz</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {material.title} — Quiz
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.quizContent}>
        <StudyQuizView quizzes={allQuizzes} onComplete={handleComplete} />
      </ScrollView>
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
  notFound: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 40,
  },
  notFoundText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
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
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 10,
  },
  generateBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  generateError: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
  xpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  xpPillText: {
    fontSize: 13,
    fontWeight: "800",
  },
  startView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  startCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 30,
    alignItems: "center",
    width: "100%",
    gap: 16,
  },
  startTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  startDesc: {
    fontSize: 14,
    textAlign: "center",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 8,
  },
  startBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  quizContent: {
    paddingBottom: 40,
  },
  resultsContent: {
    paddingBottom: 40,
  },
  scoreCircle: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: "800",
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  resultsList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  resultItem: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  resultQuestion: {
    fontSize: 14,
    fontWeight: "700",
  },
  resultQuestionText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  resultAnswer: {
    fontSize: 12,
    fontWeight: "600",
  },
  correctAnswer: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  doneBtn: {
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 20,
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
