import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../../contexts/AuthContext";
import { useCourseStore } from "../../../../store/courseStore";
import { useProgressStore } from "../../../../store/courseProgressStore";
import { useUserStore } from "../../../../store/userStore";
import { useEnrollmentStore } from "../../../../store/courseEnrollmentStore";
import { api } from "../../../../lib/api";
import ProgressBar from "../../../../component/ProgressBar";
import GlassmorphismToast from "../../../../component/GlassmorphismToast";
import ChapterCompletionDialog from "../../../../component/ChapterCompletionDialog";
import { useSpinStore } from "../../../../store/spinStore";
import { useStatsStore } from "../../../../store/statsStore";
import { useThemeColors } from "../../../../hooks/useTheme";
import ErrorBoundary from "../../../../component/ErrorBoundary";
import SpinWheel from "../../../../component/SpinWheel";
import type { Chapter, Quiz } from "../../../../types/chapter";
import type { ChapterPerformance } from "../../../../store/courseProgressStore";

type QuizState = "idle" | "loading" | "active" | "submitted" | "passed" | "failed";

export default function ChapterScreen() {
  const { courseId, chapterIndex, subtopic } = useLocalSearchParams<{
    courseId: string;
    chapterIndex: string;
    subtopic?: string;
  }>();
  const theme = useThemeColors();
  const { getToken } = useAuth();
  const profile = useUserStore((s) => s.profile);
  const course = useCourseStore((s) => s.getCourseById(courseId ?? ""));
  const {
    isQuizPassed,
    batchMarkCompleted,
    isSubtopicUnlocked,
    getCompletedSubtopicCount,
    getCompletionPercent,
    getProgressDetails,
    recordQuizAttempt,
    recordQuizScore,
    getChapterPerformance,
  } = useProgressStore();
  const addRewards = useUserStore((s) => s.addRewards);
  const getEnrollmentForCourse = useEnrollmentStore((s) => s.getEnrollmentForCourse);
  const updateEnrollmentProgress = useEnrollmentStore((s) => s.updateProgress);
  const enrollInCourse = useEnrollmentStore((s) => s.enroll);

  const chapterIdx = parseInt(chapterIndex ?? "0", 10);

  const chapters = useMemo(() => {
    const raw = course?.chapters;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try { return JSON.parse(raw) as Chapter[]; } catch { return []; }
    }
    return [];
  }, [course?.chapters]);

  const chapter = chapters[chapterIdx] ?? null;

  const subtopics = useMemo(() => chapter?.subtopics ?? [], [chapter]);

  const requestedSubtopic = useMemo(() => {
    if (!subtopic) return null;
    const idx = parseInt(subtopic, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= subtopics.length) return null;
    return idx;
  }, [subtopic, subtopics]);

  const [activeSubtopic, setActiveSubtopic] = useState<number | null>(requestedSubtopic);
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [showContent, setShowContent] = useState(requestedSubtopic !== null);
  const [toast, setToast] = useState<{ visible: boolean; xp: number; coins: number; title: string }>({
    visible: false,
    xp: 0,
    coins: 0,
    title: "",
  });
  const [showCompletion, setShowCompletion] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolledNow, setEnrolledNow] = useState(false);
  const [chapterPerformance, setChapterPerformance] = useState<ChapterPerformance | null>(null);

  const completedCount = getCompletedSubtopicCount(courseId ?? "", chapterIdx);
  const isChapterComplete = completedCount >= subtopics.length && subtopics.length > 0;

  const chapterProgress = subtopics.length > 0 ? completedCount / subtopics.length : 0;

  const totalSubtopics = useMemo(
    () => chapters.reduce((sum, ch) => sum + (ch.subtopics?.length ?? 0), 0),
    [chapters],
  );

  const handleStartSubtopic = useCallback((index: number) => {
    setActiveSubtopic(index);
    setShowContent(true);
    setQuizState("idle");
    setQuiz(null);
    setSelectedAnswers({});
    setResults({});
  }, []);

  const handleEnroll = useCallback(async () => {
    if (!profile || !courseId) return;
    setEnrolling(true);
    const result = await enrollInCourse(profile.uid, courseId, getToken);
    setEnrolling(false);
    if (result.success) {
      setEnrolledNow(true);
      Alert.alert("Enrolled!", "You're now learning this full course.");
    } else {
      Alert.alert("Enrollment failed", result.error ?? "Please try again.");
    }
  }, [profile, courseId, enrollInCourse, getToken]);

  const takeQuizRef = useRef<(() => Promise<void>) | null>(null);

  const handleTakeQuiz = useCallback(async () => {
    if (activeSubtopic === null) return;
    setQuizState("loading");

    const token = await getToken();
    if (!token) {
      Alert.alert("Error", "Not authenticated");
      setQuizState("idle");
      return;
    }

    try {
      const response = await api.subtopics.generateQuiz(
        {
          courseId: courseId ?? "",
          courseTitle: course?.title ?? "",
          chapterIndex: chapterIdx,
          subtopicIndex: activeSubtopic,
          subtopicTitle: subtopics[activeSubtopic]?.title ?? "",
        },
        token,
      );

      setQuiz(response.quiz);
      setQuizState("active");
    } catch (err: any) {
      const message = err?.message || "Failed to generate quiz. Please try again.";
      Alert.alert("Error", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Retry", onPress: () => takeQuizRef.current?.() },
      ]);
      setQuizState("idle");
    }
  }, [activeSubtopic, courseId, chapterIdx, subtopics, course, getToken]);

  takeQuizRef.current = handleTakeQuiz;

  const handleSelectAnswer = useCallback((questionIdx: number, optionIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionIdx]: optionIdx }));
  }, []);

  const handleSubmitQuiz = useCallback(async () => {
    if (!quiz || activeSubtopic === null || !courseId) return;

    const newResults: Record<number, boolean> = {};
    let allCorrect = true;

    quiz.questions.forEach((q, idx) => {
      const isCorrect = selectedAnswers[idx] === q.correctAnswer;
      newResults[idx] = isCorrect;
      if (!isCorrect) allCorrect = false;
    });

    const correctCount = quiz.questions.filter((_, idx) => newResults[idx]).length;
    const score = Math.round((correctCount / quiz.questions.length) * 100);

    setResults(newResults);
    setQuizState("submitted");

    useStatsStore.getState().recordActivity(profile?.uid ?? "", getToken, 1);

    await recordQuizAttempt(courseId, chapterIdx, activeSubtopic);
    await recordQuizScore(courseId, chapterIdx, activeSubtopic, score);

    if (allCorrect) {
      setQuizState("passed");

      await batchMarkCompleted(courseId, chapterIdx, activeSubtopic);

      const token = await getToken();
      if (token) {
        const pct = getCompletionPercent(courseId, totalSubtopics);
        const enrollmentProgress = pct / 100;
        const enrollment = getEnrollmentForCourse(courseId);

        await Promise.all([
          enrollment
            ? updateEnrollmentProgress(
                enrollment.id,
                chapterIdx,
                enrollmentProgress,
                getProgressDetails(courseId),
                () => Promise.resolve(token),
              )
            : Promise.resolve(),
        ]);
      }

      setToast({
        visible: true,
        xp: 0,
        coins: 0,
        title: `Subtopic ${(activeSubtopic ?? 0) + 1} complete!`,
      });

      const newCompletedCount = getCompletedSubtopicCount(courseId, chapterIdx);
      if (newCompletedCount >= subtopics.length && subtopics.length > 0) {
        const performance = getChapterPerformance(courseId, chapterIdx, subtopics.length);
        setChapterPerformance(performance);
        setTimeout(() => {
          setShowCompletion(true);
          setToast({ visible: false, xp: 0, coins: 0, title: "" });
        }, 1000);
      }
    } else {
      setQuizState("failed");
    }
  }, [quiz, activeSubtopic, courseId, chapterIdx, selectedAnswers, getToken, batchMarkCompleted, getCompletedSubtopicCount, subtopics.length, totalSubtopics, getCompletionPercent, getEnrollmentForCourse, updateEnrollmentProgress, getProgressDetails, recordQuizAttempt, recordQuizScore, getChapterPerformance, profile?.uid]);

  const handleRetry = useCallback(() => {
    setSelectedAnswers({});
    setResults({});
    setQuizState("active");
  }, []);

  const handleContinue = useCallback(() => {
    setActiveSubtopic(null);
    setShowContent(false);
    setQuizState("idle");
    setQuiz(null);
  }, []);

  const handleNextSubtopic = useCallback(() => {
    if (activeSubtopic === null || activeSubtopic >= subtopics.length - 1) return;
    const next = activeSubtopic + 1;
    setActiveSubtopic(next);
    setQuizState("idle");
    setQuiz(null);
    setSelectedAnswers({});
    setResults({});
  }, [activeSubtopic, subtopics.length]);

  const handlePrevSubtopic = useCallback(() => {
    if (activeSubtopic === null || activeSubtopic <= 0) return;
    const prev = activeSubtopic - 1;
    setActiveSubtopic(prev);
    setQuizState("idle");
    setQuiz(null);
    setSelectedAnswers({});
    setResults({});
  }, [activeSubtopic]);

  const handleCompletionContinue = useCallback(async () => {
    setShowCompletion(false);
    setActiveSubtopic(null);
    setShowContent(false);
    setQuizState("idle");
    setQuiz(null);

    if (courseId && chapterPerformance) {
      const token = await getToken();
      if (token) {
        await addRewards(chapterPerformance.xp, 0, token);
      }
    }
    setChapterPerformance(null);

    useStatsStore.getState().recordActivity(profile?.uid ?? "", getToken, 2);

    useSpinStore.getState().maybeTrigger("chapter_complete");
  }, [courseId, getToken, addRewards, chapterPerformance, profile?.uid]);

  const dismissToast = useCallback(() => {
    setToast({ visible: false, xp: 0, coins: 0, title: "" });
  }, []);

  if (!chapter) {
    return (
      <ErrorBoundary>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
          <View style={styles.center}>
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>Chapter not found</Text>
          </View>
        </SafeAreaView>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: chapter.title,
            headerStyle: { backgroundColor: theme.bg },
            headerTintColor: theme.text,
            headerBackTitle: "Course",
          }}
        />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: theme.textSecondary }]}>
                Progress
              </Text>
              <Text style={[styles.progressCount, { color: theme.primary }]}>
                {completedCount}/{subtopics.length}
              </Text>
            </View>
            <ProgressBar
              progress={chapterProgress}
              trackColor={theme.surfaceAlt}
              filledColors={[theme.primary, theme.accent]}
              height={8}
              borderRadius={4}
            />
          </View>

          {!showContent && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Subtopics</Text>
              {subtopics.map((subtopic, index) => {
                const unlocked = isSubtopicUnlocked(courseId ?? "", chapterIdx, index);
                const quizPassed = isQuizPassed(courseId ?? "", chapterIdx, index);
                const isActive = activeSubtopic === index;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.subtopicCard,
                      { backgroundColor: theme.surface },
                      !unlocked && styles.subtopicLocked,
                      isActive && { borderColor: theme.primary, borderWidth: 1 },
                    ]}
                    onPress={() => unlocked && handleStartSubtopic(index)}
                    disabled={!unlocked}
                  >
                    <View style={styles.subtopicHeader}>
                      <View
                        style={[
                          styles.subtopicNumber,
                          {
                            backgroundColor: quizPassed
                              ? theme.success + "20"
                              : theme.primary + "20",
                          },
                        ]}
                      >
                        {quizPassed ? (
                          <Ionicons name="checkmark" size={16} color={theme.success} />
                        ) : (
                          <Text style={[styles.subtopicNumberText, { color: theme.primary }]}>
                            {index + 1}
                          </Text>
                        )}
                      </View>
                      <View style={styles.subtopicInfo}>
                        <Text
                          style={[
                            styles.subtopicTitle,
                            { color: quizPassed ? theme.textSecondary : theme.text },
                          ]}
                        >
                          {subtopic.title}
                        </Text>
                      </View>
                      {!unlocked ? (
                        <Ionicons name="lock-closed" size={16} color={theme.textMuted} />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {showContent && activeSubtopic !== null && (
            <View style={styles.contentSection}>
              <View style={styles.contentHeader}>
                <View style={styles.contentTitleWrap}>
                  <Text style={[styles.contentLabel, { color: theme.textMuted }]}>
                    Subtopic {activeSubtopic + 1} of {subtopics.length}
                  </Text>
                  <Text style={[styles.contentTitle, { color: theme.text }]}>
                    {subtopics[activeSubtopic]?.title}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleContinue}>
                  <Text style={[styles.backLink, { color: theme.primary }]}>Back</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.navRow}>
                {activeSubtopic > 0 ? (
                  <TouchableOpacity
                    style={[styles.navPill, { backgroundColor: theme.surfaceAlt }]}
                    onPress={handlePrevSubtopic}
                  >
                    <Ionicons name="chevron-back" size={16} color={theme.textSecondary} />
                    <Text style={[styles.navPillText, { color: theme.textSecondary }]}>Prev</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                <View style={{ flex: 1 }} />
                {activeSubtopic < subtopics.length - 1 ? (
                  <TouchableOpacity
                    style={[styles.navPill, { backgroundColor: theme.surfaceAlt }]}
                    onPress={handleNextSubtopic}
                  >
                    <Text style={[styles.navPillText, { color: theme.textSecondary }]}>Next</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={[styles.contentCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.contentText, { color: theme.textSecondary }]}>
                  {subtopics[activeSubtopic]?.content}
                </Text>
              </View>

              {(() => {
                const alreadyPassed = isQuizPassed(courseId ?? "", chapterIdx, activeSubtopic);
                if (quizState === "idle" && alreadyPassed) {
                  return (
                    <View style={[styles.quizAlreadyPassed, { backgroundColor: theme.success + "12" }]}>
                      <Ionicons name="checkmark-circle" size={22} color={theme.success} />
                      <Text style={[styles.quizAlreadyPassedText, { color: theme.success }]}>
                        Quiz already completed
                      </Text>
                    </View>
                  );
                }
                if (quizState === "idle" && !alreadyPassed) {
                  return (
                    <TouchableOpacity
                      style={[styles.quizButton, { backgroundColor: theme.primary }]}
                      onPress={handleTakeQuiz}
                    >
                      <Ionicons name="help-circle" size={20} color="#FFF" />
                      <Text style={styles.quizButtonText}>Complete & Take Quiz</Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })()}

              {quizState === "loading" && (
                <View style={styles.quizLoading}>
                  <ActivityIndicator color={theme.primary} size="large" />
                  <Text style={[styles.quizLoadingText, { color: theme.textSecondary }]}>
                    Generating quiz questions...
                  </Text>
                </View>
              )}

              {quizState === "active" && quiz && (
                <View style={styles.quizSection}>
                  <Text style={[styles.quizTitle, { color: theme.text }]}>Quiz</Text>
                  {quiz.questions.map((q, qIdx) => (
                    <View key={qIdx} style={styles.questionCard}>
                      <Text style={[styles.questionText, { color: theme.text }]}>
                        {qIdx + 1}. {q.text}
                      </Text>
                      {q.options.map((opt, oIdx) => (
                        <TouchableOpacity
                          key={oIdx}
                          style={[
                            styles.optionButton,
                            { backgroundColor: theme.surfaceAlt },
                            selectedAnswers[qIdx] === oIdx && {
                              backgroundColor: theme.primary + "15",
                              borderColor: theme.primary,
                              borderWidth: 1,
                            },
                          ]}
                          onPress={() => handleSelectAnswer(qIdx, oIdx)}
                        >
                          <View
                            style={[
                              styles.radio,
                              { borderColor: theme.textMuted },
                              selectedAnswers[qIdx] === oIdx && { borderColor: theme.primary },
                            ]}
                          >
                            {selectedAnswers[qIdx] === oIdx && (
                              <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
                            )}
                          </View>
                          <Text style={[styles.optionText, { color: theme.text }]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      { backgroundColor: theme.success },
                      Object.keys(selectedAnswers).length < quiz.questions.length &&
                        styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmitQuiz}
                    disabled={Object.keys(selectedAnswers).length < quiz.questions.length}
                  >
                    <Text style={styles.submitButtonText}>Submit Answers</Text>
                  </TouchableOpacity>
                </View>
              )}

              {quizState === "submitted" && (
                <View style={styles.resultsSection}>
                  {quiz?.questions.map((q, qIdx) => (
                    <View key={qIdx} style={styles.resultRow}>
                      <Ionicons
                        name={results[qIdx] ? "checkmark-circle" : "close-circle"}
                        size={20}
                        color={results[qIdx] ? theme.success : theme.danger}
                      />
                      <Text
                        style={[
                          styles.resultText,
                          { color: results[qIdx] ? theme.success : theme.danger },
                        ]}
                      >
                        {results[qIdx] ? "Correct" : "Wrong"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {quizState === "passed" && (
                <View style={[styles.passedBanner, { backgroundColor: theme.success + "15" }]}>
                  <Ionicons name="trophy" size={32} color={theme.success} />
                  <Text style={[styles.passedText, { color: theme.success }]}>Quiz Passed!</Text>
                  <View style={styles.passedActions}>
                    <TouchableOpacity
                      style={[styles.continueButton, { backgroundColor: theme.success }]}
                      onPress={handleContinue}
                    >
                      <Text style={styles.continueButtonText}>Back to List</Text>
                    </TouchableOpacity>
                    {activeSubtopic !== null && activeSubtopic < subtopics.length - 1 && (
                      <TouchableOpacity
                        style={[styles.nextSubtopicButton, { backgroundColor: theme.primary }]}
                        onPress={handleNextSubtopic}
                      >
                        <Text style={styles.continueButtonText}>Next Subtopic</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {course?.creatorId !== profile?.uid &&
                    !enrolledNow &&
                    !getEnrollmentForCourse(courseId ?? "") && (
                      <TouchableOpacity
                        style={[styles.enrollButton, { backgroundColor: theme.primary }]}
                        onPress={handleEnroll}
                        disabled={enrolling}
                      >
                        {enrolling ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                            <Text style={styles.continueButtonText}>Enroll in Full Course</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                </View>
              )}

              {quizState === "failed" && (
                <View style={[styles.failedBanner, { backgroundColor: theme.surfaceAlt }]}>
                  <Ionicons name="refresh" size={28} color={theme.textSecondary} />
                  <Text style={[styles.failedText, { color: theme.textSecondary }]}>
                    Not quite right. Review and try again.
                  </Text>
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: theme.primary }]}
                    onPress={handleRetry}
                  >
                    <Text style={styles.retryButtonText}>Retry Quiz</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {isChapterComplete && !showContent && (
            <View style={[styles.chapterCompleteBanner, { backgroundColor: theme.primary + "10", borderColor: theme.primary + "30" }]}>
              <Ionicons name="checkmark-done-circle" size={24} color={theme.success} />
              <Text style={[styles.chapterCompleteText, { color: theme.success }]}>
                Chapter Complete!
              </Text>
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>

        <GlassmorphismToast
          visible={toast.visible}
          title={toast.title}
          xp={toast.xp}
          coins={toast.coins}
          onDismiss={dismissToast}
        />

        <ChapterCompletionDialog
          visible={showCompletion}
          performance={chapterPerformance}
          onContinue={handleCompletionContinue}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16 },
  scroll: { padding: 16 },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressCount: {
    fontSize: 14,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  subtopicCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  subtopicLocked: { opacity: 0.4 },
  subtopicHeader: { flexDirection: "row", alignItems: "center" },
  subtopicNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  subtopicNumberText: { fontSize: 12, fontWeight: "700" },
  subtopicInfo: { flex: 1 },
  subtopicTitle: { fontSize: 14, fontWeight: "600" },
  contentSection: { marginTop: 8 },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  contentTitleWrap: { flex: 1, marginRight: 12 },
  contentLabel: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  contentTitle: { fontSize: 18, fontWeight: "800" },
  backLink: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  navPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  navPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  contentCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  contentText: { fontSize: 14, lineHeight: 22 },
  quizButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  quizButtonText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  quizAlreadyPassed: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  quizAlreadyPassedText: {
    fontSize: 14,
    fontWeight: "700",
  },
  quizLoading: { alignItems: "center", padding: 24, gap: 12 },
  quizLoadingText: { fontSize: 14 },
  quizSection: { marginTop: 8 },
  quizTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  questionCard: { marginBottom: 20 },
  questionText: { fontSize: 15, fontWeight: "600", marginBottom: 10 },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionText: { fontSize: 13, flex: 1 },
  submitButton: {
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitButtonText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  resultsSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  resultText: { fontSize: 13, fontWeight: "600" },
  passedBanner: {
    alignItems: "center",
    borderRadius: 16,
    padding: 20,
    gap: 8,
    marginTop: 16,
  },
  passedText: { fontSize: 18, fontWeight: "800" },
  passedActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  continueButton: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  continueButtonText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  nextSubtopicButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
  },
  enrollButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
    alignSelf: "stretch",
  },
  failedBanner: {
    alignItems: "center",
    borderRadius: 16,
    padding: 20,
    gap: 8,
    marginTop: 16,
  },
  failedText: { fontSize: 14, textAlign: "center" },
  retryButton: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
  },
  retryButtonText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  chapterCompleteBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
  },
  chapterCompleteText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
