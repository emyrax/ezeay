import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SUBJECTS } from "../../data/onboarding";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";
import ExamSelect from "./ExamSelect";

export interface PlanFormValues {
  examType: string;
  examDate: string;
  preferredTime: string;
  subjects: string[];
  daysPerWeek: number;
  minutesPerDay: number;
}

interface PlanFormProps {
  value: PlanFormValues;
  onChange: (patch: Partial<PlanFormValues>) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTime(value: string): Date {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function toTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function tomorrowIso(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toIsoDate(date);
}

function Stepper({
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const theme = useThemeColors();
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <View style={styles.stepperRow}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={[styles.stepper, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Pressable
          onPress={() => onChange(clamp(value - step))}
          style={styles.stepButton}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
        >
          <MaterialCommunityIcons name="minus" size={18} color={theme.text} />
        </Pressable>
        <Text style={[styles.stepValue, { color: theme.text }]}>
          {value} {suffix}
        </Text>
        <Pressable
          onPress={() => onChange(clamp(value + step))}
          style={styles.stepButton}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
        >
          <MaterialCommunityIcons name="plus" size={18} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
}

export default function PlanForm({
  value,
  onChange,
  onSubmit,
  loading,
  error,
}: PlanFormProps) {
  const theme = useThemeColors();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event.type === "dismissed" || !date) return;
    onChange({ examDate: toIsoDate(date) });
  };

  const onTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (event.type === "dismissed" || !date) return;
    onChange({ preferredTime: toTimeString(date) });
  };

  const toggleSubject = (subject: string) => {
    const selected = value.subjects.includes(subject);
    if (!selected && value.subjects.length >= 6) return;
    onChange({
      subjects: selected
        ? value.subjects.filter((item) => item !== subject)
        : [...value.subjects, subject],
    });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Exam <Text style={[styles.sectionHint, { color: theme.textMuted }]}>optional</Text>
      </Text>
      <ExamSelect
        value={value.examType}
        onChange={(examType) => onChange({ examType })}
      />

      <View style={styles.fieldGrid}>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={[styles.field, { backgroundColor: theme.surface, borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel="Choose exam date"
        >
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Exam date</Text>
          <View style={styles.fieldValueRow}>
            <MaterialCommunityIcons name="calendar-month-outline" size={18} color={theme.primary} />
            <Text style={[styles.fieldValue, { color: theme.text }]}>{value.examDate}</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setShowTimePicker(true)}
          style={[styles.field, { backgroundColor: theme.surface, borderColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel="Choose preferred study time"
        >
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Study time</Text>
          <View style={styles.fieldValueRow}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={theme.primary} />
            <Text style={[styles.fieldValue, { color: theme.text }]}>{value.preferredTime}</Text>
          </View>
        </Pressable>
      </View>

      {showDatePicker && (
        <View style={[styles.pickerWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <DateTimePicker
            value={parseDate(value.examDate)}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={parseDate(tomorrowIso())}
            onChange={onDateChange}
            themeVariant="dark"
          />
          {Platform.OS === "ios" && (
            <Pressable onPress={() => setShowDatePicker(false)} style={styles.pickerDone}>
              <Text style={[styles.pickerDoneText, { color: theme.primary }]}>Done</Text>
            </Pressable>
          )}
        </View>
      )}

      {showTimePicker && (
        <View style={[styles.pickerWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <DateTimePicker
            value={parseTime(value.preferredTime)}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onTimeChange}
            themeVariant="dark"
          />
          {Platform.OS === "ios" && (
            <Pressable onPress={() => setShowTimePicker(false)} style={styles.pickerDone}>
              <Text style={[styles.pickerDoneText, { color: theme.primary }]}>Done</Text>
            </Pressable>
          )}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Subjects <Text style={[styles.sectionHint, { color: theme.textMuted }]}>choose up to 6</Text>
      </Text>
      <View style={styles.chipRow}>
        {SUBJECTS.map((subject) => {
          const active = value.subjects.includes(subject);
          return (
            <Pressable
              key={subject}
              onPress={() => toggleSubject(subject)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primary + "26" : theme.surface,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, { color: active ? theme.primary : theme.textSecondary }]}>
                {subject}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Rhythm</Text>
      <Stepper
        label="Study days"
        value={value.daysPerWeek}
        suffix="days/week"
        min={1}
        max={7}
        step={1}
        onChange={(daysPerWeek) => onChange({ daysPerWeek })}
      />
      <Stepper
        label="Session length"
        value={value.minutesPerDay}
        suffix="min/day"
        min={10}
        max={240}
        step={5}
        onChange={(minutesPerDay) => onChange({ minutesPerDay })}
      />

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: theme.danger + "18", borderColor: theme.danger + "55" }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.danger} />
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={onSubmit}
        disabled={loading || value.subjects.length === 0}
        style={[
          styles.submit,
          {
            backgroundColor:
              loading || value.subjects.length === 0 ? theme.border : theme.primary,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Generate study plan"
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <MaterialCommunityIcons name="calendar-check-outline" size={19} color="#FFFFFF" />
            <Text style={styles.submitText}>Generate study plan</Text>
          </>
        )}
      </Pressable>
      {value.subjects.length === 0 ? (
        <Text style={[styles.helper, { color: theme.textMuted }]}>
          Pick at least one subject to generate a plan.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  sectionHint: {
    fontSize: 11,
    fontWeight: "400",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    fontFamily,
    fontSize: 12,
    fontWeight: "600",
  },
  fieldGrid: {
    flexDirection: "row",
    gap: 10,
  },
  field: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  fieldLabel: {
    fontFamily,
    fontSize: 11,
  },
  fieldValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fieldValue: {
    fontFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  pickerWrap: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    paddingBottom: 6,
  },
  pickerDone: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pickerDoneText: {
    fontFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    fontFamily,
    fontSize: 13,
    fontWeight: "600",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  stepButton: {
    width: 40,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    fontFamily,
    fontSize: 12,
    fontWeight: "600",
    minWidth: 92,
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    flex: 1,
    fontFamily,
    fontSize: 12,
    lineHeight: 17,
  },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    minHeight: 50,
    marginTop: 4,
  },
  submitText: {
    color: "#FFFFFF",
    fontFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  helper: {
    fontFamily,
    fontSize: 11,
    textAlign: "center",
  },
});
