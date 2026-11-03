import type { FocusSubtopic, QuizStatus, ThreadQuizSession } from "../../types/learning";
import type { ThreadPost } from "../../types/thread";
import { QUIZ_PASS_PERCENT } from "../quiz/grade";

export function focusItemFromPost(post: ThreadPost): FocusSubtopic {
  return {
    id: post.id,
    postId: post.id,
    courseId: post.courseId,
    courseTitle: post.courseTitle,
    chapterId: post.chapterId,
    chapterIndex: post.chapterIndex,
    chapterTitle: post.chapterTitle,
    subtopicIndex: post.subtopicIndex,
    partNumber: post.partNumber,
    subtopicCount: post.subtopicCount,
    subtopicTitle: post.subtopicTitle,
    summary: post.content,
    addedAt: new Date().toISOString(),
  };
}

export function focusProgress(
  items: FocusSubtopic[],
  isPassed: (item: FocusSubtopic) => boolean,
): { completed: number; total: number; percent: number } {
  const total = items.length;
  const completed = items.filter(isPassed).length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function nextRecommendedFocus(
  items: FocusSubtopic[],
  isPassed: (item: FocusSubtopic) => boolean,
): FocusSubtopic | null {
  return items.find((item) => !isPassed(item)) ?? null;
}

export function quizStatusFor(
  session: ThreadQuizSession | undefined,
  passed: boolean,
  bestScore: number | undefined,
): QuizStatus {
  if (passed) return "passed";
  if (session?.status === "generating") return "generating";
  if (session && session.questions.length > 0) {
    if (session.attempted) {
      const score = session.lastScore ?? bestScore ?? 0;
      return score >= QUIZ_PASS_PERCENT ? "passed" : "failed";
    }
    return "ready";
  }
  if (typeof bestScore === "number" && bestScore < QUIZ_PASS_PERCENT) return "failed";
  return "unattempted";
}
