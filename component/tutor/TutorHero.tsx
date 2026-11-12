import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface TutorHeroProps {
  icon: IconName;
  headline: string;
  subhead: string;
  action?: {
    label: string;
    onPress: () => void;
    accessibilityLabel?: string;
  };
}

export function TutorHero({ icon, headline, subhead, action }: TutorHeroProps) {
  const theme = useThemeColors();

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <LinearGradient
        colors={[theme.tabActive, theme.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.icon}
      >
        <MaterialCommunityIcons name={icon} size={24} color="#FFFFFF" />
      </LinearGradient>

      <View style={styles.copy}>
        <Text style={[styles.headline, { color: theme.text }]} numberOfLines={1}>
          {headline}
        </Text>
        <Text style={[styles.subhead, { color: theme.textMuted }]} numberOfLines={2}>
          {subhead}
        </Text>
      </View>

      {action ? (
        <Pressable
          onPress={action.onPress}
          style={[styles.action, { backgroundColor: theme.primary }]}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel ?? action.label}
        >
          <Text style={styles.actionText}>{action.label}</Text>
          <MaterialCommunityIcons name="arrow-right" size={15} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}

export default TutorHero;

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  headline: {
    fontFamily,
    fontSize: 16,
    fontWeight: "700",
  },
  subhead: {
    fontFamily,
    fontSize: 12,
    lineHeight: 17,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  actionText: {
    color: "#FFFFFF",
    fontFamily,
    fontSize: 12,
    fontWeight: "700",
  },
});
