import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";
import { withAlpha } from "../../lib/color";
import type { UserProfile } from "../../types/user";
import { getProfileCompletion } from "./profileUtils";
import { createShadow } from "@/lib/shadow";

interface Props {
  profile: UserProfile | null;
  onEdit: () => void;
  compact?: boolean;
}

const RING_SIZE = 66;
const STROKE = 6;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ProfileCompletionCard({
  profile,
  onEdit,
  compact = false,
}: Props) {
  const theme = useThemeColors();
  const { filled, total, pct, missing } = getProfileCompletion(profile);
  const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;
  const complete = pct >= 100;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.borderLight },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={withAlpha(theme.primary, 0.18)}
              strokeWidth={STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              stroke={theme.primary}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          <View style={styles.ringLabel}>
            <Text style={[styles.ringPct, { color: theme.primary }]}>
              {pct}%
            </Text>
          </View>
        </View>

        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>
            Profile strength
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {complete
              ? "Your profile is fully complete."
              : `${filled} of ${total} details filled in`}
          </Text>
        </View>
      </View>

      {!compact && missing.length > 0 ? (
        <View style={styles.suggestions}>
          {missing.map((label) => (
            <View
              key={label}
              style={[
                styles.suggestion,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.borderLight,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="plus"
                size={12}
                color={theme.textMuted}
              />
              <Text
                style={[styles.suggestionText, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [
          styles.cta,
          {
            backgroundColor: complete
              ? withAlpha(theme.success, 0.14)
              : withAlpha(theme.primary, 0.14),
            borderColor: complete
              ? withAlpha(theme.success, 0.32)
              : withAlpha(theme.primary, 0.32),
          },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Edit profile details"
      >
        <MaterialCommunityIcons
          name={complete ? "check-decagram" : "pencil-outline"}
          size={15}
          color={complete ? theme.success : theme.primary}
        />
        <Text
          style={[
            styles.ctaText,
            { color: complete ? theme.success : theme.primary },
          ]}
        >
          {complete ? "Looking great" : "Complete your profile"}
        </Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={16}
          color={complete ? theme.success : theme.primary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    ...createShadow("#000", 0, 12, 20, 0.1),
    elevation: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ringLabel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  ringPct: {
    fontSize: 14,
    fontWeight: "900",
    fontFamily,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily,
    lineHeight: 17,
  },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14,
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  suggestionText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily,
    flexShrink: 1,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
