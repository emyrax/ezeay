import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "../hooks/useTheme";
import type { StudyQuiz, QuizResult } from "../types/study";

interface Props {
  quizzes: StudyQuiz[];
  onComplete: (results: QuizResult[]) => void;
}

export default function StudyQuizView({ quizzes, onComplete }: Props) {
  const theme = useThemeColors();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const quiz = quizzes[currentIndex];
  if (!quiz) {
    onComplete(results);
    return null;
  }

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
    setShowResult(true);
  };

  const handleNext = () => {
    const correct = selectedAnswer === quiz.correctAnswer;
    const result: QuizResult = {
      quizId: quiz.id,
      selectedAnswer: selectedAnswer ?? 0,
      correct,
    };
    const newResults = [...results, result];
    setResults(newResults);
    setSelectedAnswer(null);
    setShowResult(false);

    if (currentIndex + 1 >= quizzes.length) {
      onComplete(newResults);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const isCorrect = showResult && selectedAnswer === quiz.correctAnswer;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.progressRow}>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {currentIndex + 1} / {quizzes.length}
        </Text>
        <View style={styles.dots}>
          {quizzes.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i < results.length
                      ? results[i].correct
                        ? theme.success
                        : theme.danger
                      : i === currentIndex
                        ? theme.primary
                        : theme.border,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Text style={styles.question}>{quiz.question}</Text>

      <View style={styles.optionsWrap}>
        {quiz.options.map((option, i) => {
          let optionStyle = {};
          let icon: keyof typeof Ionicons.glyphMap | undefined;

          if (showResult) {
            if (i === quiz.correctAnswer) {
              optionStyle = { borderColor: theme.success, backgroundColor: theme.success + "15" };
              icon = "checkmark-circle";
            } else if (i === selectedAnswer && i !== quiz.correctAnswer) {
              optionStyle = { borderColor: theme.danger, backgroundColor: theme.danger + "15" };
              icon = "close-circle";
            } else {
              optionStyle = { opacity: 0.5 };
            }
          } else if (selectedAnswer === i) {
            optionStyle = { borderColor: theme.primary, backgroundColor: theme.primary + "15" };
          }

          return (
            <Pressable
              key={i}
              onPress={() => handleSelect(i)}
              style={[styles.option, { borderColor: theme.border }, optionStyle]}
            >
              <View style={styles.optionRow}>
                <View
                  style={[
                    styles.optionLetter,
                    {
                      backgroundColor:
                        showResult && i === quiz.correctAnswer
                          ? theme.success
                          : showResult && i === selectedAnswer
                            ? theme.danger
                            : theme.border,
                    },
                  ]}
                >
                  <Text style={styles.optionLetterText}>
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.optionText,
                    {
                      color:
                        showResult && i === quiz.correctAnswer
                          ? theme.success
                          : showResult && i === selectedAnswer
                            ? theme.danger
                            : "#FFFFFF",
                    },
                  ]}
                >
                  {option}
                </Text>
                {icon && (
                  <Ionicons
                    name={icon}
                    size={20}
                    color={i === quiz.correctAnswer ? theme.success : theme.danger}
                    style={styles.optionIcon}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {showResult && (
        <View style={styles.feedbackWrap}>
          <Text
            style={[
              styles.feedbackText,
              { color: isCorrect ? theme.success : theme.danger },
            ]}
          >
            {isCorrect ? "Correct!" : `Wrong answer`}
          </Text>
          <Pressable
            onPress={handleNext}
            style={[styles.nextBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.nextBtnText}>
              {currentIndex + 1 >= quizzes.length ? "See Results" : "Next Question"}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "700",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  question: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 16,
  },
  optionsWrap: {
    gap: 10,
  },
  option: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionLetterText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  optionIcon: {
    marginLeft: 8,
  },
  feedbackWrap: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: "700",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nextBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
