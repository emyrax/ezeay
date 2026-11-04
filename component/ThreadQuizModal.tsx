import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { safeFont } from "../constants/themes";
import { useAuth } from "../contexts/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { useThemeColors } from "../hooks/useTheme";
import { gradeQuiz, type QuizGrade } from "../lib/quiz/grade";
import { useProgressStore } from "../store/courseProgressStore";
import { useThreadLearningStore } from "../store/threadLearningStore";
import type { ThreadPost } from "../types/thread";

interface ThreadQuizModalProps {
  visible: boolean;
  post: ThreadPost | null;
  onClose: () => void;
  onPassed?: () => void;
}

export default function ThreadQuizModal({
  visible,
  post,
  onClose,
  onPassed,
}: ThreadQuizModalProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { isTabletUp } = useResponsive();
  const { getToken } = useAuth();
  const sessions = useThreadLearningStore((state) => state.quizSessions);
  const generateQuiz = useThreadLearningStore((state) => state.generateQuiz);
  const resetQuiz = useThreadLearningStore((state) => state.resetQuiz);
  const recordQuizAttempt = useProgressStore((state) => state.recordQuizAttempt);
  const recordQuizScore = useProgressStore((state) => state.recordQuizScore);
  const batchMarkCompleted = useProgressStore((state) => state.batchMarkCompleted);

  const session = post ? sessions[post.id] : undefined;
  const questions = session?.questions ?? [];
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [grade, setGrade] = useState<QuizGrade | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible || !post) return;
    setAnswers({});
    setGrade(null);
    if (!session?.questions.length) {
      void generateQuiz(post, getToken);
    }
  }, [visible, post, session?.questions.length, session?.status, generateQuiz, getToken]);

  const answeredCount = useMemo(
    () => questions.filter((_, index) => typeof answers[index] === "number").length,
    [answers, questions],
  );

  const handleSubmit = useCallback(async () => {
    if (!post || !session || questions.length === 0 || submitting) return;
    setSubmitting(true);
    const nextGrade = gradeQuiz(questions, answers);
    setGrade(nextGrade);
    try {
      await recordQuizAttempt(post.courseId, post.chapterIndex, post.subtopicIndex);
      await recordQuizScore(post.courseId, post.chapterIndex, post.subtopicIndex, nextGrade.score);
      if (nextGrade.passed) {
        await batchMarkCompleted(post.courseId, post.chapterIndex, post.subtopicIndex);
        onPassed?.();
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    answers,
    batchMarkCompleted,
    onPassed,
    post,
    questions,
    recordQuizAttempt,
    recordQuizScore,
    session,
    submitting,
  ]);

  const handleRetry = useCallback(() => {
    setAnswers({});
    setGrade(null);
  }, []);

  if (!post) return null;

  const busy = session?.status === "generating" || submitting;
  const error = session?.error;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.backdrop, isTabletUp && styles.backdropDialog]}>
        <View
          style={[
            styles.sheet,
            isTabletUp ? styles.dialog : styles.bottomSheet,
            {
              backgroundColor: colors.bg,
              borderColor: colors.border,
              paddingTop: isTabletUp ? 20 : insets.top + 12,
              paddingBottom: isTabletUp ? 20 : insets.bottom + 12,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>SUBTOPIC QUIZ</Text>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {post.subtopicTitle}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
                {post.courseTitle || post.chapterTitle} · Module {post.chapterIndex + 1}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surface }]}
              accessibilityRole="button"
              accessibilityLabel="Close quiz"
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          {busy && questions.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.stateTitle, { color: colors.text }]}>
                Building your quiz...
              </Text>
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                Creating questions from this subtopic.
              </Text>
            </View>
          ) : error && questions.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="cloud-offline-outline" size={34} color={colors.textMuted} />
              <Text style={[styles.stateTitle, { color: colors.text }]}>
                Quiz unavailable
              </Text>
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>{error}</Text>
              <Pressable
                onPress={() => {
                  resetQuiz(post.id);
                  void generateQuiz(post, getToken);
                }}
                style={[styles.stateBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.primaryText}>Try again</Text>
              </Pressable>
            </View>
          ) : questions.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="document-text-outline" size={34} color={colors.textMuted} />
              <Text style={[styles.stateTitle, { color: colors.text }]}>
                Quiz isn't ready yet
              </Text>
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                This subtopic needs full lesson content before a quiz can be built.
              </Text>
              <Pressable
                onPress={onClose}
                style={[styles.stateBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.primaryText}>Close</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
              >
                {grade ? (
                  <View
                    style={[
                      styles.resultBanner,
                      {
                        backgroundColor: grade.passed
                          ? colors.success + "14"
                          : colors.danger + "14",
                        borderColor: grade.passed ? colors.success : colors.danger,
                      },
                    ]}
                  >
                    <Ionicons
                      name={grade.passed ? "checkmark-circle" : "refresh-circle"}
                      size={28}
                      color={grade.passed ? colors.success : colors.danger}
                    />
                    <View style={styles.resultCopy}>
                      <Text
                        style={[
                          styles.resultTitle,
                          { color: grade.passed ? colors.success : colors.danger },
                        ]}
                      >
                        {grade.passed ? "Passed" : "Try Again"}
                      </Text>
                      <Text style={[styles.resultText, { color: colors.textSecondary }]}>
                        {grade.correctCount}/{grade.total} correct Â· {grade.score}%
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.progressRow}>
                    <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                      {answeredCount}/{questions.length} answered
                    </Text>
                    <Text style={[styles.passHint, { color: colors.textMuted }]}>
                      80% to pass
                    </Text>
                  </View>
                )}

                {questions.map((question, questionIndex) => {
                  const selected = answers[questionIndex];
                  const result = grade?.results[questionIndex];
                  return (
                    <View
                      key={question.id}
                      style={[
                        styles.questionCard,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.questionText, { color: colors.text }]}>
                        {questionIndex + 1}. {question.question}
                      </Text>
                      <View style={styles.options}>
                        {question.options.map((option, optionIndex) => {
                          const chosen = selected === optionIndex;
                          const correct = grade && optionIndex === question.correctAnswerIndex;
                          const wrong = grade && chosen && !correct;
                          return (
                            <Pressable
                              key={`${question.id}-${optionIndex}`}
                              onPress={() =>
                                !grade &&
                                setAnswers((current) => ({
                                  ...current,
                                  [questionIndex]: optionIndex,
                                }))
                              }
                              style={[
                                styles.option,
                                {
                                  backgroundColor: correct
                                    ? colors.success + "14"
                                    : wrong
                                      ? colors.danger + "14"
                                      : chosen
                                        ? colors.primary + "14"
                                        : colors.surfaceAlt,
                                  borderColor: correct
                                    ? colors.success
                                    : wrong
                                      ? colors.danger
                                      : chosen
                                        ? colors.primary
                                        : colors.border,
                                },
                              ]}
                              disabled={!!grade}
                              accessibilityRole="button"
                              accessibilityState={{ selected: chosen }}
                            >
                              <View
                                style={[
                                  styles.optionIndex,
                                  {
                                    backgroundColor: correct
                                      ? colors.success
                                      : wrong
                                        ? colors.danger
                                        : chosen
                                          ? colors.primary
                                          : colors.border,
                                  },
                                ]}
                              >
                                <Text style={styles.optionIndexText}>
                                  {String.fromCharCode(65 + optionIndex)}
                                </Text>
                              </View>
                              <Text style={[styles.optionText, { color: colors.text }]}>
                                {option}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {grade && question.explanation ? (
                        <View style={[styles.explanation, { backgroundColor: colors.surfaceAlt }]}>
                          <Ionicons name="bulb-outline" size={16} color={colors.info} />
                          <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
                            {question.explanation}
                          </Text>
                        </View>
                      ) : null}
                      {grade && !result ? (
                        <Text style={[styles.answerHint, { color: colors.textMuted }]}>
                          Correct answer: {question.options[question.correctAnswerIndex]}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>

              <View style={[styles.footer, { borderTopColor: colors.border }]}>
                {grade ? (
                  <>
                    <Pressable
                      onPress={handleRetry}
                      style={[styles.secondaryBtn, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.secondaryText, { color: colors.text }]}>
                        Retake
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={grade.passed ? onClose : handleRetry}
                      style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text style={styles.primaryText}>
                        {grade.passed ? "Done" : "Try again"}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={() => void handleSubmit()}
                    disabled={answeredCount !== questions.length || submitting}
                    style={[
                      styles.primaryBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity: answeredCount === questions.length ? 1 : 0.5,
                      },
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryText}>Submit quiz</Text>
                    )}
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
  },
  backdropDialog: {
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  bottomSheet: {
    flex: 1,
    marginTop: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 760,
    height: "86%",
    borderRadius: 24,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: safeFont,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: safeFont,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  subtitle: {
    fontFamily: safeFont,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontFamily: safeFont,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  stateText: {
    fontFamily: safeFont,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  scroll: {
    paddingBottom: 20,
    gap: 12,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "700",
  },
  passHint: {
    fontFamily: safeFont,
    fontSize: 11,
  },
  questionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  questionText: {
    fontFamily: safeFont,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  options: {
    gap: 8,
    marginTop: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    minHeight: 46,
  },
  optionIndex: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIndexText: {
    fontFamily: safeFont,
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  optionText: {
    flex: 1,
    fontFamily: safeFont,
    fontSize: 13,
    lineHeight: 18,
  },
  explanation: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  explanationText: {
    flex: 1,
    fontFamily: safeFont,
    fontSize: 12,
    lineHeight: 17,
  },
  answerHint: {
    fontFamily: safeFont,
    fontSize: 11,
    marginTop: 8,
    fontWeight: "600",
  },
  resultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  resultCopy: {
    flex: 1,
  },
  resultTitle: {
    fontFamily: safeFont,
    fontSize: 16,
    fontWeight: "800",
  },
  resultText: {
    fontFamily: safeFont,
    fontSize: 12,
    marginTop: 1,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stateBtn: {
    minWidth: 150,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryText: {
    fontFamily: safeFont,
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontFamily: safeFont,
    fontSize: 14,
    fontWeight: "700",
  },
});
