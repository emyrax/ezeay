import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
} from "react-native";
import { safeFont } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";
import { getThreadFeedChrome } from "../../lib/threads/layout";

export type ExploreTab = "threads" | "resources" | "reels" | "other";

const TABS: { key: ExploreTab; label: string }[] = [
  { key: "threads", label: "Uinx" },
  { key: "resources", label: "Resources" },
  { key: "reels", label: "Reels" },
  { key: "other", label: "Courses" },
];

interface ExploreTabsProps {
  active: ExploreTab;
  onChange: (tab: ExploreTab) => void;
  inset?: number;
  height?: number;
}

export default function ExploreTabs({
  active,
  onChange,
  inset = 16,
  height,
}: ExploreTabsProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const chrome = getThreadFeedChrome(width, height);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={[
        styles.row,
        {
          gap: chrome.tabGap,
          paddingTop: chrome.tabPadTop,
          paddingBottom: chrome.tabPadBottom,
          paddingHorizontal: inset,
        },
      ]}
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
                minHeight: chrome.tabHeight,
                paddingHorizontal: chrome.tabPad,
                borderRadius: chrome.tabHeight / 2,
                backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                borderColor: selected ? colors.primary : colors.border,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`Show ${tab.label}`}
            hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? "#FFFFFF" : colors.textSecondary, fontSize: chrome.tabFont },
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
    width: "100%",
  },
  row: {
    flexDirection: "row",
  },
  tab: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: safeFont,
    fontWeight: "800",
  },
});
