import assert from "node:assert/strict";
import { test } from "node:test";
import { gradeQuiz, QUIZ_PASS_PERCENT } from "./grade";
import type { QuizQuestion } from "../../types/learning";

function question(index: number, correctAnswerIndex: number): QuizQuestion {
  return {
    id: `q${index}`,
    question: `Question ${index}`,
    options: ["A", "B", "C", "D"],
    correctAnswerIndex,
    explanation: "Because.",
  };
}

const questions = [question(1, 0), question(2, 1), question(3, 2), question(4, 3), question(5, 0)];

test("gradeQuiz passes at 80 percent", () => {
  const grade = gradeQuiz(questions, { 0: 0, 1: 1, 2: 2, 3: 3, 4: 1 });
  assert.equal(grade.correctCount, 4);
  assert.equal(grade.score, 80);
  assert.equal(grade.passed, true);
  assert.equal(grade.results[4], false);
});

test("gradeQuiz fails below 80 percent", () => {
  const grade = gradeQuiz(questions, { 0: 0, 1: 1, 2: 1, 3: 1, 4: 1 });
  assert.equal(grade.correctCount, 2);
  assert.equal(grade.score, 40);
  assert.equal(grade.passed, false);
  assert.equal(QUIZ_PASS_PERCENT, 80);
});

test("gradeQuiz handles empty quizzes", () => {
  const grade = gradeQuiz([], {});
  assert.equal(grade.total, 0);
  assert.equal(grade.score, 0);
  assert.equal(grade.passed, false);
});
