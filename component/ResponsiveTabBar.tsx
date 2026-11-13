import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useSegments } from "expo-router";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NAV } from "../constants/layout";
import {
  COACH_HREF,
  NOTES_HREF,
  TAB_ITEMS,
  TUTOR_HREF,
  type TabIconName,
  type TabItem,
} from "../constants/navigation";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import { useThemeColors } from "../hooks/useTheme";
import { withAlpha } from "../lib/color";

function TabButton({
  route,
  isFocused,
  isCenterActive,
  onPress,
  tab,
  theme,
}: {
  route: { name: string };
  isFocused: boolean;
  isCenterActive: boolean;
  onPress: () => void;
  tab: TabItem | undefined;
  theme: ReturnType<typeof useThemeColors>;
}) {
  const showActive = isFocused && !isCenterActive;
  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
      accessibilityLabel={tab?.accessibilityLabel}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
    >
      <View
        style={[
          showActive ? styles.iconBoxActive : styles.iconBoxInactive,
          showActive
            ? { shadowColor: theme.tabActive }
            : { backgroundColor: withAlpha(theme.tabInactive, 0.2) },
        ]}
      >
        {showActive ? (
          <LinearGradient
            colors={[theme.tabActive, theme.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientFill}
          >
            <MaterialCommunityIcons
              name={tab?.iconName || "circle"}
              size={22}
              color="#FFFFFF"
            />
          </LinearGradient>
        ) : (
          <MaterialCommunityIcons
            name={tab?.iconName || "circle"}
            size={22}
            color={theme.tabInactive}
          />
        )}
      </View>
      <Text
        style={[
          styles.tabLabel,
          {
            color: showActive ? theme.tabActive : theme.tabInactive,
            fontWeight: showActive ? "700" : "500",
          },
        ]}
      >
        {tab?.title || route.name}
      </Text>
    </Pressable>
  );
}

function CoachTabButton({
  isActive,
  onPress,
  iconName,
  title,
  accessibilityLabel,
  theme,
}: {
  isActive: boolean;
  onPress: () => void;
  iconName: TabIconName;
  title: string;
  accessibilityLabel: string;
  theme: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <View
        style={[
          styles.coachIconBox,
          isActive
            ? [styles.coachIconBoxActive, { shadowColor: theme.tabActive }]
            : { backgroundColor: withAlpha(theme.tabInactive, 0.2) },
        ]}
      >
        {isActive ? (
          <LinearGradient
            colors={[theme.tabActive, theme.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coachGradientFill}
          >
            <MaterialCommunityIcons
              name={iconName}
              size={22}
              color="#FFFFFF"
            />
          </LinearGradient>
        ) : (
          <MaterialCommunityIcons
            name={iconName}
            size={22}
            color={theme.tabInactive}
          />
        )}
      </View>
      <Text
        style={[
          styles.tabLabel,
          {
            color: isActive ? theme.tabActive : theme.tabInactive,
            fontWeight: isActive ? "700" : "500",
          },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export default function ResponsiveTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const router = useRouter();
  const segments = useSegments() as string[];
  const { tutor: tutorEnabled, agent: agentEnabled } = useFeatureFlags();
  const isCoachRoute = segments[0] === "(tabs)" && segments[1] === "coach";
  const isCenterActive = agentEnabled
    ? isCoachRoute
    : tutorEnabled
      ? segments[0] === "(tutor)"
      : segments[0] === "(notes)";
  const centerHref = agentEnabled
    ? COACH_HREF
    : tutorEnabled
      ? TUTOR_HREF
      : NOTES_HREF;

  const centerTitle = agentEnabled ? "YUINX" : tutorEnabled ? "TUTOR" : "NOTES";
  const centerIcon: TabIconName = agentEnabled
    ? "robot-outline"
    : tutorEnabled
      ? "school-outline"
      : "notebook-multiple";
  const centerAccessibilityLabel = agentEnabled
    ? "Open AI Coach"
    : tutorEnabled
      ? "Open AI Tutor"
      : "Open Notes";

  const visibleRoutes = state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => route.name !== "coach");
  const leftRoutes = visibleRoutes.slice(0, 2);
  const rightRoutes = visibleRoutes.slice(2);

  const renderTab = ({
    route,
    index,
  }: (typeof visibleRoutes)[number]) => {
    const isFocused = state.index === index;
    const tab = TAB_ITEMS.find((item) => item.name === route.name);

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TabButton
        key={route.key}
        route={route}
        isFocused={isFocused}
        isCenterActive={isCenterActive}
        onPress={onPress}
        tab={tab}
        theme={theme}
      />
    );
  };

  return (
    <View
      style={[styles.wrap, { bottom: insets.bottom > 0 ? insets.bottom + NAV.tabBarBottomInset : NAV.tabBarBottomInset }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.tabBg,
            borderColor: theme.tabBorder,
            shadowColor: theme.shadow,
          },
        ]}
      >
        {leftRoutes.map((entry) => renderTab(entry))}

        <CoachTabButton
          isActive={isCenterActive}
          onPress={() => {
            if (!isCenterActive) {
              router.push(centerHref as any);
            }
          }}
          iconName={centerIcon}
          title={centerTitle}
          accessibilityLabel={centerAccessibilityLabel}
          theme={theme}
        />

        {rightRoutes.map((entry) => renderTab(entry))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: NAV.tabBarSideInset,
    zIndex: 20,
  },
  container: {
    width: "100%",
    maxWidth: NAV.tabBarMaxWidth,
    height: NAV.tabBarHeight,
    borderRadius: 34,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 8,
  },
  coachIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  coachIconBoxActive: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  coachGradientFill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBoxActive: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden",
  },
  iconBoxInactive: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  gradientFill: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  },
});
