import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useSegments } from "expo-router";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NAV } from "../constants/layout";
import { NOTES_HREF, TAB_ITEMS, type TabItem } from "../constants/navigation";
import { useThemeColors } from "../hooks/useTheme";
import { withAlpha } from "../lib/color";

function TabButton({
  route,
  isFocused,
  isNotesActive,
  onPress,
  tab,
  theme,
}: {
  route: { name: string };
  isFocused: boolean;
  isNotesActive: boolean;
  onPress: () => void;
  tab: TabItem | undefined;
  theme: ReturnType<typeof useThemeColors>;
}) {
  const showActive = isFocused && !isNotesActive;
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

export default function ResponsiveTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const router = useRouter();
  const segments = useSegments();
  const isNotesActive = segments[0] === "(notes)";

  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isNotesActive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      glowAnim.setValue(0.3);
    }
  }, [isNotesActive, glowAnim]);

  const leftRoutes = state.routes.slice(0, 2);
  const rightRoutes = state.routes.slice(2);

  const renderTab = (route: (typeof state.routes)[number], index: number) => {
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
        isNotesActive={isNotesActive}
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
        {leftRoutes.map((route, i) => renderTab(route, i))}

        <View style={styles.midSpacer}>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
        </View>

        {rightRoutes.map((route, i) => renderTab(route, i + 2))}

        <View style={styles.centerOuter} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.glowRing,
              {
                backgroundColor: theme.tabActive,
                opacity: isNotesActive ? glowAnim : 0,
              },
            ]}
          />
          <Pressable
            onPress={() => router.push(NOTES_HREF)}
            onPressIn={() =>
              Animated.spring(pressScale, {
                toValue: 0.88,
                useNativeDriver: true,
              }).start()
            }
            onPressOut={() =>
              Animated.spring(pressScale, {
                toValue: 1,
                friction: 3,
                useNativeDriver: true,
              }).start()
            }
          >
            <Animated.View
              style={[
                styles.centerBtn,
                {
                  shadowColor: theme.tabInactive,
                  shadowOpacity: 0.7,
                  transform: [{ scale: pressScale }],
                },
              ]}
            >
              <LinearGradient
                colors={[theme.accent, theme.tabInactive]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.centerGradient, { borderColor: theme.tabInactive }]}
              >
                <View style={[styles.resultIcon, styles.centerLogo]}>
                  <MaterialCommunityIcons
                    name="notebook-multiple"
                    size={22}
                    color={theme.primary}
                  />
                </View>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </View>
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
  resultIcon: {
    color: "#fff",
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 8,
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
  midSpacer: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    width: 1,
    height: 28,
    opacity: 0.3,
    borderRadius: 1,
  },
  centerOuter: {
    position: "absolute",
    top: -24,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  glowRing: {
    position: "absolute",
    top: -4,
    width: 70,
    height: 70,
    borderRadius: 34,
    opacity: 1,
  },
  centerBtn: {
    width: 60,
    height: 60,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 12,
  },
  centerGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    overflow: "hidden",
  },
  centerLogo: {
    width: 34,
    height: 34,
  },
});
