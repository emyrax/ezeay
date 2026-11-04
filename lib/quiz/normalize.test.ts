import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeQuizQuestions } from "./normalize";

describe("normalizeQuizQuestions", () => {
  it("normalizes numeric and text correct answers", () => {
    const questions = normalizeQuizQuestions({
      questions: [
        {
          id: "q1",
          question: "Capital of France?",
          options: ["Paris", "Rome", "Berlin", "Madrid"],
          correctAnswer: 0,
        },
        {
          question: "2 + 2?",
          options: ["3", "4", "5", "6"],
          answer: "4",
        },
      ],
    });

    assert.equal(questions.length, 2);
    assert.equal(questions[0]?.correctAnswer, 0);
    assert.equal(questions[1]?.correctAnswer, 1);
    assert.equal(questions[1]?.id, "q2");
    assert.equal(questions[1]?.explanation, "");
  });

  it("drops invalid answers instead of defaulting to the first option", () => {
    const questions = normalizeQuizQuestions({
      questions: [
        {
          question: "Broken",
          options: ["A", "B", "C", "D"],
          correctAnswer: -1,
        },
        {
          question: "Out of range",
          options: ["A", "B", "C", "D"],
          correctAnswer: 9,
        },
      ],
    });

    assert.deepEqual(questions, []);
  });

  it("accepts nested quiz objects and filters malformed entries", () => {
    const questions = normalizeQuizQuestions(
      {
        quiz: {
          questions: [
            {
              question: "Valid?",
              options: ["Yes", "No"],
              correctAnswer: 0,
              explanation: "It is valid.",
            },
            { question: "No options", options: [], correctAnswer: 0 },
          ],
        },
      },
      { maxQuestions: 5 },
    );

    assert.equal(questions.length, 1);
    assert.equal(questions[0]?.explanation, "It is valid.");
  });

  it("can require exactly four options", () => {
    const input = {
      questions: [
        { question: "Two", options: ["A", "B"], correctAnswer: 0 },
        { question: "Four", options: ["A", "B", "C", "D"], correctAnswer: 1 },
      ],
    };

    assert.equal(
      normalizeQuizQuestions(input, { requireExactlyFour: true }).length,
      1,
    );
    assert.equal(normalizeQuizQuestions(input).length, 2);
  });

  it("caps the number of questions", () => {
    const questions = normalizeQuizQuestions(
      {
        questions: Array.from({ length: 8 }, (_, index) => ({
          question: `Question ${index + 1}`,
          options: ["A", "B", "C", "D"],
          correctAnswer: index % 4,
        })),
      },
      { maxQuestions: 3 },
    );

    assert.equal(questions.length, 3);
  });
});
