import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";
import { withAlpha } from "../../lib/color";
import type { Course, UserProfile } from "../../types/user";
import type { ProfileIconName } from "./types";
import { createShadow } from "@/lib/shadow";

interface Props {
  profile: UserProfile | null;
  trophies: number;
  streak: number;
  wide?: boolean;
}

function MilestoneCard({
  icon,
  value,
  label,
  color,
}: {
  icon: ProfileIconName;
  value: number | string;
  label: string;
  color: string;
}) {
  const theme = useThemeColors();
  return (
    <View
      style={[
        styles.milestone,
        {
          backgroundColor: theme.surfaceAlt,
          borderColor: theme.borderLight,
        },
      ]}
    >
      <View
        style={[
          styles.milestoneIcon,
          { backgroundColor: withAlpha(color, 0.14) },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.milestoneValue, { color: theme.text }]}>
        {value}
      </Text>
      <Text style={[styles.milestoneLabel, { color: theme.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

export default function ProfileProgressPanel({
  profile,
  trophies,
  streak,
  wide = false,
}: Props) {
  const theme = useThemeColors();
  const router = useRouter();
  const courses: Course[] = profile?.courses ?? [];

  const coursesCard = (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.borderLight },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View
            style={[
              styles.cardIcon,
              { backgroundColor: withAlpha(theme.primary, 0.14) },
            ]}
          >
            <MaterialCommunityIcons
              name="book-open-variant"
              size={16}
              color={theme.primary}
            />
          </View>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Active courses
          </Text>
        </View>
        <View
          style={[
            styles.countPill,
            { backgroundColor: withAlpha(theme.primary, 0.12) },
          ]}
        >
          <Text style={[styles.countText, { color: theme.primary }]}>
            {courses.length}
          </Text>
        </View>
      </View>

      {courses.length > 0 ? (
        <View style={styles.courseList}>
          {courses.map((course) => {
            const progress = Math.round(course.progress ?? 0);
            return (
              <View
                key={course.id}
                style={[
                  styles.courseRow,
                  {
                    backgroundColor: theme.surfaceAlt,
                    borderColor: theme.borderLight,
                  },
                ]}
              >
                <View
                  style={[
                    styles.courseIcon,
                    { backgroundColor: withAlpha(theme.primary, 0.14) },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={(course.icon as ProfileIconName) || "book"}
                    size={16}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.courseInfo}>
                  <View style={styles.courseTitleRow}>
                    <Text
                      style={[styles.courseTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {course.title}
                    </Text>
                    <Text
                      style={[styles.coursePct, { color: theme.primary }]}
                    >
                      {progress}%
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.courseTrack,
                      { backgroundColor: withAlpha(theme.textMuted, 0.18) },
                    ]}
                  >
                    <View
                      style={[
                        styles.courseFill,
                        {
                          width: `${progress}%`,
                          backgroundColor: theme.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyCourses}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            No active courses yet. Pick a realm and start your first quest.
          </Text>
          <Pressable
            onPress={() => router.push("/explore")}
            style={({ pressed }) => [
              styles.inlineBtn,
              {
                backgroundColor: withAlpha(theme.primary, 0.14),
                borderColor: withAlpha(theme.primary, 0.3),
              },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Explore courses"
          >
            <MaterialCommunityIcons
              name="compass-outline"
              size={15}
              color={theme.primary}
            />
            <Text style={[styles.inlineBtnText, { color: theme.primary }]}>
              Explore courses
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const milestonesCard = (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.borderLight },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View
            style={[
              styles.cardIcon,
              { backgroundColor: withAlpha(theme.warning, 0.14) },
            ]}
          >
            <MaterialCommunityIcons
              name="trophy-outline"
              size={16}
              color={theme.warning}
            />
          </View>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Milestones
          </Text>
        </View>
      </View>

      <View style={styles.milestoneRow}>
        <MilestoneCard
          icon="trophy"
          value={trophies}
          label="Trophies"
          color={theme.warning}
        />
        <MilestoneCard
          icon="fire"
          value={streak}
          label="Day streak"
          color={theme.primary}
        />
        <MilestoneCard
          icon="star-four-points"
          value={profile?.gamingLevel ?? 1}
          label="Level"
          color={theme.accent}
        />
      </View>

      <View style={styles.quickActions}>
        <Pressable
          onPress={() => router.push("/quests")}
          style={({ pressed }) => [
            styles.quickBtn,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.borderLight,
            },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open quests"
        >
          <MaterialCommunityIcons
            name="sword-cross"
            size={16}
            color={theme.text}
          />
          <Text style={[styles.quickBtnText, { color: theme.text }]}>
            Quests
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/explore")}
          style={({ pressed }) => [
            styles.quickBtn,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.borderLight,
            },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open explore"
        >
          <MaterialCommunityIcons
            name="compass-outline"
            size={16}
            color={theme.text}
          />
          <Text style={[styles.quickBtnText, { color: theme.text }]}>
            Explore
          </Text>
        </Pressable>
      </View>
    </View>
  );

  if (!wide) {
    return (
      <View style={styles.stack}>
        {coursesCard}
        {milestonesCard}
      </View>
    );
  }

  return (
    <View style={styles.columns}>
      <View style={styles.coursesColumn}>{coursesCard}</View>
      <View style={styles.sideColumn}>{milestonesCard}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  columns: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  coursesColumn: {
    flex: 1.35,
    minWidth: 0,
  },
  sideColumn: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    ...createShadow("#000", 0, 10, 18, 0.08),
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flexShrink: 1,
  },
  cardIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily,
  },
  countPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 11,
    fontWeight: "800",
    fontFamily,
  },
  courseList: {
    gap: 8,
  },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
  },
  courseIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  courseInfo: {
    flex: 1,
    minWidth: 0,
  },
  courseTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  courseTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    fontFamily,
  },
  coursePct: {
    fontSize: 11,
    fontWeight: "800",
    fontFamily,
  },
  courseTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  courseFill: {
    height: "100%",
    borderRadius: 2,
  },
  emptyCourses: {
    alignItems: "flex-start",
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily,
  },
  inlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inlineBtnText: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily,
  },
  milestoneRow: {
    flexDirection: "row",
    gap: 8,
  },
  milestone: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 3,
  },
  milestoneIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  milestoneValue: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily,
  },
  milestoneLabel: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily,
    textAlign: "center",
  },
  quickActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily,
  },
  pressed: {
    opacity: 0.85,
  },
});
