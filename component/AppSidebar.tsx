import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter, useSegments } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { images } from "../constants/images";
import { NAV } from "../constants/layout";
import { NOTES_HREF, TAB_ITEMS } from "../constants/navigation";
import { useThemeColors } from "../hooks/useTheme";
import { withAlpha } from "../lib/color";

export default function AppSidebar() {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const currentPath = pathname === "" ? "/" : pathname;
  const isNotesActive = segments[0] === "(notes)";

  return (
    <View
      style={[
        styles.rail,
        {
          backgroundColor: theme.tabBg,
          borderRightColor: theme.tabBorder,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <View style={styles.brand}>
        <LinearGradient
          colors={[theme.tabActive, theme.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.brandMark}
        >
          <Image
            source={images.yuinxLogoTrans}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </LinearGradient>
      </View>

      <View style={styles.nav}>
        {TAB_ITEMS.map((item) => {
          const active = currentPath === item.href;
          return (
            <Pressable
              key={item.name}
              onPress={() => router.navigate(item.href)}
              style={styles.item}
              accessibilityRole="tab"
              accessibilityLabel={item.accessibilityLabel}
              accessibilityState={{ selected: active }}
            >
              {active ? (
                <LinearGradient
                  colors={[theme.tabActive, theme.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconActive}
                >
                  <MaterialCommunityIcons name={item.iconName} size={22} color="#FFFFFF" />
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.iconInactive,
                    { backgroundColor: withAlpha(theme.tabInactive, 0.14) },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.iconName}
                    size={22}
                    color={theme.tabInactive}
                  />
                </View>
              )}
              <Text
                style={[
                  styles.label,
                  {
                    color: active ? theme.tabActive : theme.tabInactive,
                    fontWeight: active ? "700" : "500",
                  },
                ]}
              >
                {item.title}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.spacer} />

      <Pressable
        onPress={() => router.push(NOTES_HREF)}
        style={styles.item}
        accessibilityRole="button"
        accessibilityLabel="Open Notes"
      >
        <LinearGradient
          colors={[theme.accent, theme.tabInactive]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.notesButton,
            { borderColor: isNotesActive ? theme.tabActive : theme.tabBorder },
          ]}
        >
          <MaterialCommunityIcons
            name="notebook-multiple"
            size={22}
            color={theme.primary}
          />
        </LinearGradient>
        <Text
          style={[
            styles.label,
            {
              color: isNotesActive ? theme.tabActive : theme.tabInactive,
              fontWeight: isNotesActive ? "700" : "500",
            },
          ]}
        >
          NOTES
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: NAV.sidebarWidth,
    borderRightWidth: 1,
    alignItems: "center",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    zIndex: 30,
  },
  brand: {
    marginBottom: 28,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  nav: {
    width: "100%",
    alignItems: "center",
    gap: 6,
  },
  item: {
    width: 76,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 16,
  },
  iconActive: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  iconInactive: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  spacer: {
    flex: 1,
  },
  notesButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
});
