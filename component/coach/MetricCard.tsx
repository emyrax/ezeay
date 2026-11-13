import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { coachColors, coachFont } from "../../constants/coachTheme";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface MetricCardProps {
  label: string;
  value: string;
  icon: IconName;
  tint: string;
  iconColor: string;
  visual?: ReactNode;
}

export default function MetricCard({
  label,
  value,
  icon,
  tint,
  iconColor,
  visual,
}: MetricCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: tint }]}>
      <View style={styles.visualArea}>
        {visual ?? (
          <View style={styles.badge}>
            <MaterialCommunityIcons name={icon} size={15} color={iconColor} />
          </View>
        )}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    padding: 10,
  },
  visualArea: {
    height: 34,
    justifyContent: "center",
    marginBottom: 5,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.66)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: coachFont.medium,
    fontSize: 10,
    color: coachColors.textMuted,
  },
  value: {
    marginTop: 2,
    fontFamily: coachFont.semibold,
    fontSize: 12,
    color: coachColors.text,
    letterSpacing: -0.15,
  },
});
