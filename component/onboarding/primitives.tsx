import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { TextInputProps } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  landingColors,
  landingFonts,
  landingRadii,
} from "../../constants/landing";
import type { OnboardingStep } from "../../types/onboarding";

export function StepHeader({ step }: { step: OnboardingStep }) {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>{step.eyebrow.toUpperCase()}</Text>
      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.subtitle}>{step.subtitle}</Text>
      {step.optional ? (
        <View style={styles.optionalPill}>
          <Text style={styles.optionalText}>Optional</Text>
        </View>
      ) : null}
    </View>
  );
}

export const TextField = React.forwardRef<
  TextInput,
  TextInputProps & { label?: string; error?: string }
>(function TextField({ label, error, style, ...props }, ref) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={landingColors.textSubtle}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

export function ChoiceCard({
  icon,
  title,
  description,
  selected,
  onPress,
}: {
  icon: string;
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceCard,
        selected && styles.choiceCardSelected,
        pressed && { opacity: 0.82 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View
        style={[
          styles.choiceIcon,
          selected && { backgroundColor: "rgba(47,124,255,0.18)" },
        ]}
      >
        <MaterialCommunityIcons
          name={icon as never}
          size={20}
          color={selected ? landingColors.blueSoft : landingColors.textMuted}
        />
      </View>
      <View style={styles.choiceTextWrap}>
        <Text style={styles.choiceTitle}>{title}</Text>
        {description ? (
          <Text style={styles.choiceDescription}>{description}</Text>
        ) : null}
      </View>
      <MaterialCommunityIcons
        name={selected ? "check-circle" : "circle-outline"}
        size={20}
        color={selected ? landingColors.blue : landingColors.textSubtle}
      />
    </Pressable>
  );
}

export function SelectChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && { opacity: 0.8 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
      {selected ? (
        <MaterialCommunityIcons
          name="check"
          size={15}
          color={landingColors.blueSoft}
        />
      ) : null}
    </Pressable>
  );
}

export function InlineError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.inlineError}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={16}
        color={landingColors.danger}
      />
      <Text style={styles.inlineErrorText}>{message}</Text>
    </View>
  );
}

export function SelectionCount({
  count,
  max,
  label,
}: {
  count: number;
  max: number;
  label: string;
}) {
  return (
    <Text style={styles.selectionCount}>
      {count}/{max} {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 10,
  },
  eyebrow: {
    color: landingColors.blueSoft,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 2,
  },
  title: {
    color: landingColors.text,
    fontFamily: landingFonts.display,
    fontSize: 31,
    lineHeight: 37,
    letterSpacing: -0.8,
  },
  subtitle: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 560,
  },
  optionalPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: landingRadii.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: landingColors.border,
  },
  optionalText: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  fieldWrap: {
    gap: 8,
  },
  fieldLabel: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  input: {
    minHeight: 54,
    borderRadius: landingRadii.md,
    borderWidth: 1,
    borderColor: landingColors.borderStrong,
    backgroundColor: landingColors.bgSoft,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: landingColors.text,
    fontFamily: landingFonts.body,
    fontSize: 16,
  },
  inputError: {
    borderColor: landingColors.danger,
  },
  errorText: {
    color: landingColors.danger,
    fontFamily: landingFonts.body,
    fontSize: 12,
  },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: landingRadii.md,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: landingColors.panel,
  },
  choiceCardSelected: {
    borderColor: "rgba(47,124,255,0.55)",
    backgroundColor: "rgba(47,124,255,0.08)",
  },
  choiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceTextWrap: {
    flex: 1,
    gap: 2,
  },
  choiceTitle: {
    color: landingColors.text,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 15,
  },
  choiceDescription: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: landingRadii.pill,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: landingColors.panel,
  },
  chipSelected: {
    borderColor: "rgba(47,124,255,0.55)",
    backgroundColor: "rgba(47,124,255,0.13)",
  },
  chipText: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 13,
  },
  chipTextSelected: {
    color: landingColors.text,
  },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: landingRadii.sm,
    borderWidth: 1,
    borderColor: "rgba(255,92,92,0.28)",
    backgroundColor: "rgba(255,92,92,0.08)",
  },
  inlineErrorText: {
    flex: 1,
    color: landingColors.danger,
    fontFamily: landingFonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  selectionCount: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
