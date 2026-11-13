import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { safeFont } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";

export type ExploreTab = "threads" | "resources" | "reels" | "other";

const TABS: { key: ExploreTab; label: string }[] = [
  { key: "threads", label: "Threads" },
  { key: "resources", label: "Resources" },
  { key: "reels", label: "Reels" },
  { key: "other", label: "Other" },
];

interface ExploreTabsProps {
  active: ExploreTab;
  onChange: (tab: ExploreTab) => void;
}

export default function ExploreTabs({ active, onChange }: ExploreTabsProps) {
  const colors = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[
              styles.tab,
              {
                backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                borderColor: selected ? colors.primary : colors.border,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`Show ${tab.label}`}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? "#FFFFFF" : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: {
    flexGrow: 0,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  tab: {
    minHeight: 34,
    paddingHorizontal: 15,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "800",
  },
});
