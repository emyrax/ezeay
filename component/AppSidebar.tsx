import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter, useSegments } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { images } from "../constants/images";
import { NAV } from "../constants/layout";
import { NOTES_HREF, TAB_ITEMS } from "../constants/navigation";
import { useResponsive } from "../hooks/useResponsive";
import { useThemeColors } from "../hooks/useTheme";
import { withAlpha } from "../lib/color";
import { deriveHandle } from "../lib/identity";
import { useUserStore } from "../store/userStore";
import CommunityAvatar from "./CommunityAvatar";

export default function AppSidebar() {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { sidebarExpanded } = useResponsive();
  const profile = useUserStore((state) => state.profile);
  const currentPath = pathname === "" ? "/" : pathname;
  const isNotesActive = segments[0] === "(notes)";
  const handle = deriveHandle(profile?.displayName, profile?.uid ?? "");
  const role = profile?.isPro ? "PRO" : "LEARNER";

  return (
    <View
      style={[
        styles.rail,
        sidebarExpanded ? styles.railExpanded : styles.railCompact,
        {
          backgroundColor: theme.tabBg,
          borderRightColor: theme.tabBorder,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <View style={[styles.brand, sidebarExpanded && styles.brandExpanded]}>
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
        {sidebarExpanded ? (
          <View style={styles.brandCopy}>
            <Text style={[styles.brandTitle, { color: theme.text }]}>Yuinx</Text>
            <Text style={[styles.brandSubtitle, { color: theme.textMuted }]}>
              Learning threads
            </Text>
          </View>
        ) : null}
      </View>

      {sidebarExpanded && profile ? (
        <View
          style={[
            styles.profileCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <CommunityAvatar uid={profile.uid} photoURL={profile.photoURL} size={42} />
          <View style={styles.profileCopy}>
            <Text style={[styles.profileName, { color: theme.text }]} numberOfLines={1}>
              {profile.displayName ?? "Scholar"}
            </Text>
            <Text style={[styles.profileHandle, { color: theme.textMuted }]} numberOfLines={1}>
              @{handle}
            </Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: theme.primary + "1F" }]}>
            <Text style={[styles.roleText, { color: theme.primary }]}>{role}</Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.nav, sidebarExpanded && styles.navExpanded]}>
        {TAB_ITEMS.map((item) => {
          const active = currentPath === item.href;
          return (
            <Pressable
              key={item.name}
              onPress={() => router.navigate(item.href)}
              style={[
                styles.item,
                sidebarExpanded ? styles.itemExpanded : styles.itemCompact,
                sidebarExpanded && active && { backgroundColor: theme.surface },
              ]}
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
                  sidebarExpanded ? styles.labelExpanded : styles.labelCompact,
                  {
                    color: active ? theme.tabActive : theme.tabInactive,
                    fontWeight: active ? "700" : "500",
                  },
                ]}
                numberOfLines={1}
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
        style={[
          styles.item,
          sidebarExpanded ? styles.itemExpanded : styles.itemCompact,
          sidebarExpanded && isNotesActive && { backgroundColor: theme.surface },
        ]}
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
            sidebarExpanded ? styles.labelExpanded : styles.labelCompact,
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
    borderRightWidth: 1,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    zIndex: 30,
  },
  railCompact: {
    width: NAV.sidebarWidth,
    alignItems: "center",
  },
  railExpanded: {
    width: NAV.sidebarExpandedWidth,
    paddingHorizontal: 14,
  },
  brand: {
    marginBottom: 28,
  },
  brandExpanded: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 6,
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
  brandCopy: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    marginBottom: 16,
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 13,
    fontWeight: "700",
  },
  profileHandle: {
    fontSize: 11,
    marginTop: 1,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  nav: {
    width: "100%",
    alignItems: "center",
    gap: 6,
  },
  navExpanded: {
    alignItems: "stretch",
  },
  item: {
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 16,
  },
  itemCompact: {
    width: 76,
  },
  itemExpanded: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 10,
    minHeight: 48,
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
    letterSpacing: 0.4,
  },
  labelCompact: {
    marginTop: 4,
  },
  labelExpanded: {
    fontSize: 13,
    flex: 1,
    marginTop: 0,
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
