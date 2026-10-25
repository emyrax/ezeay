import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "../../hooks/useTheme";
import type { LessonCheckpoint } from "../../types/lesson";

interface Props {
  checkpoint: LessonCheckpoint;
  initiallySolved?: boolean;
  continueLabel: string;
  onSolved: () => void;
  onContinue: () => void;
}

export default function LessonCheckpointCard({
  checkpoint,
  initiallySolved = false,
  continueLabel,
  onSolved,
  onContinue,
}: Props) {
  const theme = useThemeColors();
  const [selected, setSelected] = useState<number | null>(
    initiallySolved ? checkpoint.correct : null,
  );
  const [checked, setChecked] = useState(initiallySolved);
  const isCorrect = checked && selected === checkpoint.correct;

  const handleSelect = (index: number) => {
    if (isCorrect) return;
    setSelected(index);
    setChecked(false);
  };

  const handleCheck = () => {
    if (selected === null || isCorrect) return;
    const correct = selected === checkpoint.correct;
    setChecked(true);
    if (correct) {
      onSolved();
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
    } else {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      ).catch(() => undefined);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: isCorrect ? theme.success + "55" : theme.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: isCorrect
                ? theme.success + "16"
                : theme.warning + "16",
            },
          ]}
        >
          <Ionicons
            name={isCorrect ? "checkmark-circle" : "flag-outline"}
            size={18}
            color={isCorrect ? theme.success : theme.warning}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.eyebrow, { color: isCorrect ? theme.success : theme.warning }]}>
            {isCorrect ? "Checkpoint cleared" : "Quick checkpoint"}
          </Text>
          <Text style={[styles.question, { color: theme.text }]}>
            {checkpoint.question}
          </Text>
        </View>
      </View>

      <View style={styles.options}>
        {checkpoint.options.map((option, index) => {
          const isSelected = selected === index;
          const showCorrect = checked && index === checkpoint.correct;
          const showWrong = checked && isSelected && index !== checkpoint.correct;
          const borderColor = showCorrect
            ? theme.success
            : showWrong
              ? theme.danger
              : isSelected
                ? theme.primary
                : theme.border;
          const background = showCorrect
            ? theme.success + "12"
            : showWrong
              ? theme.danger + "12"
              : isSelected
                ? theme.primary + "12"
                : theme.surfaceAlt;
          return (
            <TouchableOpacity
              key={`${index}-${option}`}
              style={[
                styles.option,
                { backgroundColor: background, borderColor },
              ]}
              onPress={() => handleSelect(index)}
              disabled={isCorrect}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: isCorrect }}
            >
              <View style={[styles.radio, { borderColor }]}>
                {showCorrect ? (
                  <Ionicons name="checkmark" size={13} color={theme.success} />
                ) : showWrong ? (
                  <Ionicons name="close" size={13} color={theme.danger} />
                ) : isSelected ? (
                  <View
                    style={[styles.radioDot, { backgroundColor: theme.primary }]}
                  />
                ) : null}
              </View>
              <Text style={[styles.optionText, { color: theme.text }]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {checked ? (
        <View
          style={[
            styles.feedback,
            {
              backgroundColor: isCorrect
                ? theme.success + "10"
                : theme.warning + "10",
            },
          ]}
        >
          <Text
            style={[
              styles.feedbackText,
              { color: isCorrect ? theme.success : theme.warning },
            ]}
          >
            {isCorrect
              ? checkpoint.explanation || "That's it. Keep going."
              : "Not quite. Review the slide and try another answer."}
          </Text>
        </View>
      ) : null}

      {isCorrect ? (
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: theme.primary }]}
          onPress={onContinue}
          accessibilityRole="button"
        >
          <Text style={styles.continueText}>{continueLabel}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.checkButton,
            {
              backgroundColor:
                selected === null ? theme.surfaceAlt : theme.primary,
            },
          ]}
          onPress={handleCheck}
          disabled={selected === null}
          accessibilityRole="button"
          accessibilityState={{ disabled: selected === null }}
        >
          <Text
            style={[
              styles.checkText,
              { color: selected === null ? theme.textMuted : "#FFFFFF" },
            ]}
          >
            Check answer
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    marginBottom: 14,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  question: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
  },
  feedback: {
    borderRadius: 12,
    padding: 11,
    marginTop: 12,
  },
  feedbackText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  checkButton: {
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  checkText: {
    fontSize: 13,
    fontWeight: "800",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 13,
    paddingVertical: 12,
    marginTop: 12,
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
