import type { QuizQuestion } from "../../types/learning";

export const QUIZ_PASS_PERCENT = 80;

export interface QuizGrade {
  correctCount: number;
  total: number;
  score: number;
  passed: boolean;
  results: Record<number, boolean>;
}

export function gradeQuiz(
  questions: QuizQuestion[],
  answers: Record<number, number>,
): QuizGrade {
  const results: Record<number, boolean> = {};
  let correctCount = 0;

  questions.forEach((question, index) => {
    const correct = answers[index] === question.correctAnswerIndex;
    results[index] = correct;
    if (correct) correctCount += 1;
  });

  const total = questions.length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return {
    correctCount,
    total,
    score,
    passed: total > 0 && score >= QUIZ_PASS_PERCENT,
    results,
  };
}
