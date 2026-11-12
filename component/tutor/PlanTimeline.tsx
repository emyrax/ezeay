import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";
import type { TutorPlan } from "../../types/tutor";
import {
  groupPlanByWeek,
  planSlotKey,
  planSummary,
} from "../../lib/tutor/plan";

interface PlanTimelineProps {
  plan: TutorPlan;
  savedKeys: string[];
}

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export default function PlanTimeline({ plan, savedKeys }: PlanTimelineProps) {
  const theme = useThemeColors();
  const summary = planSummary(plan);
  const weeks = groupPlanByWeek(plan);
  const saved = new Set(savedKeys);

  return (
    <View style={styles.container}>
      <View style={styles.summaryGrid}>
        <SummaryCard
          icon="calendar-multiple"
          label="Sessions"
          value={String(summary.sessions)}
          color={theme.primary}
        />
        <SummaryCard
          icon="clock-outline"
          label="Total time"
          value={formatMinutes(summary.totalMinutes)}
          color={theme.success}
        />
        <SummaryCard
          icon="book-open-page-variant-outline"
          label="Subjects"
          value={String(summary.subjects.length)}
          color={theme.warning}
        />
      </View>

      {weeks.map((week) => (
        <View
          key={week.key}
          style={[styles.weekCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.weekHeader}>
            <Text style={[styles.weekTitle, { color: theme.text }]}>{week.label}</Text>
            <Text style={[styles.weekCount, { color: theme.textMuted }]}>
              {week.slots.length} sessions
            </Text>
          </View>
          {week.slots.map((slot) => {
            const isSaved = saved.has(planSlotKey(slot));
            return (
              <View key={planSlotKey(slot)} style={[styles.slotRow, { borderTopColor: theme.borderLight }]}>
                <View style={styles.slotDate}>
                  <Text style={[styles.slotDay, { color: theme.textSecondary }]}>
                    {formatDay(slot.date)}
                  </Text>
                  <Text style={[styles.slotMinutes, { color: theme.textMuted }]}>
                    {formatMinutes(slot.minutes)}
                  </Text>
                </View>
                <View style={styles.slotMain}>
                  <Text style={[styles.slotTitle, { color: theme.text }]}>{slot.title}</Text>
                  {slot.subject ? (
                    <Text style={[styles.slotSubject, { color: theme.textMuted }]}>{slot.subject}</Text>
                  ) : null}
                </View>
                <MaterialCommunityIcons
                  name={isSaved ? "check-circle" : "circle-outline"}
                  size={20}
                  color={isSaved ? theme.success : theme.border}
                />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  const theme = useThemeColors();
  return (
    <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <Text style={[styles.summaryValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
  },
  summaryValue: {
    fontFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  summaryLabel: {
    fontFamily,
    fontSize: 10,
  },
  weekCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  weekTitle: {
    fontFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  weekCount: {
    fontFamily,
    fontSize: 11,
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  slotDate: {
    width: 78,
  },
  slotDay: {
    fontFamily,
    fontSize: 11,
    fontWeight: "600",
  },
  slotMinutes: {
    fontFamily,
    fontSize: 10,
    marginTop: 2,
  },
  slotMain: {
    flex: 1,
  },
  slotTitle: {
    fontFamily,
    fontSize: 13,
    fontWeight: "600",
  },
  slotSubject: {
    fontFamily,
    fontSize: 10,
    marginTop: 2,
  },
});
