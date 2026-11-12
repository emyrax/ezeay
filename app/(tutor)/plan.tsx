import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PlanForm, {
  type PlanFormValues,
} from "../../component/tutor/PlanForm";
import PlanTimeline from "../../component/tutor/PlanTimeline";
import { fontFamily } from "../../constants/themes";
import { useAuth } from "../../contexts/AuthContext";
import { useThemeColors } from "../../hooks/useTheme";
import { TutorScreenHeader } from "../../component/tutor/TutorScreenHeader";
import { track } from "../../lib/analytics";
import { api, friendlyError } from "../../lib/api";
import { planSummary, planTaskInputs } from "../../lib/tutor/plan";
import { useScheduleStore } from "../../store/scheduleStore";
import { useTutorPlanStore } from "../../store/tutorPlanStore";

function dateAfter(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultValues(): PlanFormValues {
  return {
    examType: "",
    examDate: dateAfter(30),
    preferredTime: "18:00",
    subjects: [],
    daysPerWeek: 4,
    minutesPerDay: 45,
  };
}

export default function TutorPlanScreen() {
  const theme = useThemeColors();
  const router = useRouter();
  const { getToken } = useAuth();
  const plan = useTutorPlanStore((state) => state.plan);
  const savedInput = useTutorPlanStore((state) => state.input);
  const savedKeys = useTutorPlanStore((state) => state.savedKeys);
  const setPlan = useTutorPlanStore((state) => state.setPlan);
  const markSaved = useTutorPlanStore((state) => state.markSaved);
  const tasks = useScheduleStore((state) => state.tasks);
  const addTask = useScheduleStore((state) => state.addTask);

  const [values, setValues] = useState<PlanFormValues>(() => {
    const base = defaultValues();
    if (!savedInput) return base;
    return {
      ...base,
      examType: savedInput.examType,
      examDate: savedInput.examDate,
      subjects: savedInput.subjects,
      daysPerWeek: savedInput.daysPerWeek,
      minutesPerDay: savedInput.minutesPerDay,
    };
  });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showForm = !plan || editing;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await api.tutor.preferences.get(token);
        if (cancelled) return;
        setValues((current) => ({
          ...current,
          examType: res.preferences.examType ?? current.examType,
          examDate: res.preferences.examDate ?? current.examDate,
        }));
      } catch {
        // Preferences are optional; the form keeps its defaults.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  const updateValues = (patch: Partial<PlanFormValues>) => {
    setValues((current) => ({ ...current, ...patch }));
  };

  const editPlan = () => {
    if (savedInput) {
      setValues((current) => ({
        ...current,
        examType: savedInput.examType,
        examDate: savedInput.examDate,
        subjects: savedInput.subjects,
        daysPerWeek: savedInput.daysPerWeek,
        minutesPerDay: savedInput.minutesPerDay,
      }));
    }
    setEditing(true);
  };

  const generate = async () => {
    if (!values.subjects.length) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again.");
      const res = await api.tutor.plan(
        {
          examType: values.examType,
          examDate: values.examDate,
          subjects: values.subjects,
          daysPerWeek: values.daysPerWeek,
          minutesPerDay: values.minutesPerDay,
        },
        token,
      );
      setPlan(res.plan, {
        examType: values.examType,
        examDate: values.examDate,
        subjects: values.subjects,
        daysPerWeek: values.daysPerWeek,
        minutesPerDay: values.minutesPerDay,
      });
      setEditing(false);
      track("tutor_plan_created", {
        sessions: res.plan.slots.length,
        daysPerWeek: values.daysPerWeek,
        savedToSchedule: false,
      });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const saveToSchedule = () => {
    if (!plan) return;
    const result = planTaskInputs(plan, tasks, savedKeys, values.preferredTime);
    if (result.tasks.length === 0) {
      Alert.alert(
        "Already saved",
        "Every session in this plan is already in your Schedule.",
      );
      return;
    }

    const summary = planSummary(plan);
    Alert.alert(
      "Add to Schedule?",
      `Add ${result.tasks.length} of ${summary.sessions} sessions at ${values.preferredTime}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add",
          onPress: () => {
            for (const task of result.tasks) addTask(task);
            markSaved(result.keys);
            Alert.alert(
              "Added to Schedule",
              `${result.tasks.length} sessions were added.`,
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <TutorScreenHeader
        title="Study plan"
        subtitle="Built around your exam date"
        leftAction={{
          label: "Back",
          icon: "arrow-left",
          onPress: () => router.back(),
          accessibilityLabel: "Go back",
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {plan && !showForm ? (
          <>
            <View style={[styles.intro, { backgroundColor: theme.primaryLight, borderColor: theme.primary + "44" }]}>
              <MaterialCommunityIcons name="calendar-check" size={22} color={theme.primary} />
              <Text style={[styles.introText, { color: theme.textSecondary }]}>
                {plan.slots.length} sessions until {plan.examDate}. Save them to your
                Schedule to get reminders.
              </Text>
            </View>
            <PlanTimeline plan={plan} savedKeys={savedKeys} />
            <Pressable
              onPress={saveToSchedule}
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Save plan to Schedule"
            >
              <MaterialCommunityIcons name="calendar-plus" size={19} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Save to Schedule</Text>
            </Pressable>
            <Pressable
              onPress={editPlan}
              style={[styles.secondaryButton, { borderColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel="Edit plan details"
            >
              <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>
                Edit plan details
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            {!plan ? (
              <Text style={[styles.lead, { color: theme.textSecondary }]}>
                Tell the Tutor what you are preparing for. It will build a realistic
                weekly rhythm with focused sessions for each subject.
              </Text>
            ) : null}
            <PlanForm
              value={values}
              onChange={updateValues}
              onSubmit={generate}
              loading={loading}
              error={error}
            />
            {plan && showForm ? (
              <Pressable
                onPress={() => setEditing(false)}
                style={styles.cancelLink}
                accessibilityRole="button"
              >
                <Text style={[styles.cancelLinkText, { color: theme.textMuted }]}>
                  Cancel editing
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontFamily,
    fontSize: 11,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  lead: {
    fontFamily,
    fontSize: 13,
    lineHeight: 20,
  },
  intro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  introText: {
    flex: 1,
    fontFamily,
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontFamily,
    fontSize: 13,
    fontWeight: "600",
  },
  cancelLink: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  cancelLinkText: {
    fontFamily,
    fontSize: 12,
  },
});
