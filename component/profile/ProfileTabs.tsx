import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";
import { withAlpha } from "../../lib/color";
import type { ProfileIconName } from "./types";

export interface ProfileTabItem {
  key: string;
  label: string;
  icon: ProfileIconName;
  count?: number;
}

interface Props {
  tabs: ProfileTabItem[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export default function ProfileTabs({ tabs, activeIndex, onChange }: Props) {
  const theme = useThemeColors();

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight },
      ]}
      accessibilityRole="tablist"
    >
      {tabs.map((tab, index) => {
        const active = index === activeIndex;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(index)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
          >
            {active ? (
              <LinearGradient
                colors={[theme.primary, theme.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activeFill}
              >
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.activeText} numberOfLines={1}>
                  {tab.label}
                </Text>
                {typeof tab.count === "number" && tab.count > 0 ? (
                  <View
                    style={[
                      styles.countBadge,
                      { backgroundColor: withAlpha("#FFFFFF", 0.24) },
                    ]}
                  >
                    <Text style={styles.countTextActive}>{tab.count}</Text>
                  </View>
                ) : null}
              </LinearGradient>
            ) : (
              <View style={styles.inactiveFill}>
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={16}
                  color={theme.textMuted}
                />
                <Text
                  style={[styles.inactiveText, { color: theme.textMuted }]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
                {typeof tab.count === "number" && tab.count > 0 ? (
                  <View
                    style={[
                      styles.countBadge,
                      { backgroundColor: withAlpha(theme.textMuted, 0.16) },
                    ]}
                  >
                    <Text
                      style={[styles.countText, { color: theme.textMuted }]}
                    >
                      {tab.count}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  activeFill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  inactiveFill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  activeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    fontFamily,
    flexShrink: 1,
  },
  inactiveText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily,
    flexShrink: 1,
  },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  countText: {
    fontSize: 9,
    fontWeight: "800",
    fontFamily,
  },
  countTextActive: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    fontFamily,
  },
  pressed: {
    opacity: 0.85,
  },
});
