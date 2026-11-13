import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { coachColors, coachFont } from "../../constants/coachTheme";

interface HealthCheckInButtonProps {
  onPress: () => void;
  checkedInToday: boolean;
  streak: number;
  accentColor?: string;
}

export default function HealthCheckInButton({
  onPress,
  checkedInToday,
  streak,
  accentColor = coachColors.accent,
}: HealthCheckInButtonProps) {
  return (
    <TouchableOpacity
      style={styles.trigger}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={
        checkedInToday ? "Daily check-in complete" : "Open daily check-in"
      }
    >
      <LinearGradient
        colors={["#FFFFFF", "#DCEBFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconBg}
      >
        <MaterialCommunityIcons
          name={checkedInToday ? "calendar-check" : "calendar-star"}
          size={16}
          color="#0A1730"
        />
      </LinearGradient>
      {streak > 1 ? (
        <View style={[styles.streakBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.streakText}>{streak}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trigger: {
    position: "relative",
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  streakBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  streakText: {
    fontFamily: coachFont.extrabold,
    color: "#FFFFFF",
    fontSize: 9,
  },
});
