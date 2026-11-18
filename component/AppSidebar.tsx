import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter, useSegments } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NAV } from "../constants/layout";
import {
  COACH_HREF,
  NOTES_HREF,
  TAB_ITEMS,
  TUTOR_HREF,
} from "../constants/navigation";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import { useResponsive } from "../hooks/useResponsive";
import { useThemeColors } from "../hooks/useTheme";
import { images } from "../constants/images";
import { withAlpha } from "../lib/color";
import { deriveHandle } from "../lib/identity";
import { isCoachRoute } from "../lib/navigation";
import { createShadow } from "@/lib/shadow";
import { useUserStore } from "../store/userStore";
import CommunityAvatar from "./CommunityAvatar";

export default function AppSidebar() {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments() as string[];
  const { sidebarExpanded } = useResponsive();
  const profile = useUserStore((state) => state.profile);
  const currentPath = pathname === "" ? "/" : pathname;
  const { tutor: tutorEnabled, agent: agentEnabled } = useFeatureFlags();
  const isCenterActive = agentEnabled
    ? isCoachRoute(segments)
    : tutorEnabled
      ? segments[0] === "(tutor)"
      : segments[0] === "(notes)";
  const centerHref = agentEnabled
    ? COACH_HREF
    : tutorEnabled
      ? TUTOR_HREF
      : NOTES_HREF;
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
          ...createShadow(theme.shadow, 2, 0, 12, 0.18),
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
            <Text style={[styles.brandTitle, { color: theme.text }]}>
              Yuinx
            </Text>
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
          <CommunityAvatar
            uid={profile.uid}
            photoURL={profile.photoURL}
            size={42}
          />
          <View style={styles.profileCopy}>
            <Text
              style={[styles.profileName, { color: theme.text }]}
              numberOfLines={1}
            >
              {profile.displayName ?? "Scholar"}
            </Text>
            <Text
              style={[styles.profileHandle, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              @{handle}
            </Text>
          </View>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: theme.primary + "1F" },
            ]}
          >
            <Text style={[styles.roleText, { color: theme.primary }]}>
              {role}
            </Text>
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
                  <MaterialCommunityIcons
                    name={item.iconName}
                    size={22}
                    color="#FFFFFF"
                  />
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
        onPress={() => router.push(centerHref as any)}
        style={[
          styles.item,
          sidebarExpanded ? styles.itemExpanded : styles.itemCompact,
          sidebarExpanded &&
            isCenterActive && { backgroundColor: theme.surface },
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          agentEnabled
            ? "Open AI Coach"
            : tutorEnabled
              ? "Open AI Tutor"
              : "Open Notes"
        }
      >
        {agentEnabled ? (
          <View
            style={[
              styles.coachSidebarBtn,
              isCenterActive
                ? [
                    styles.coachSidebarBtnActive,
                    {
                      borderColor: theme.tabActive,
                      shadowColor: theme.tabActive,
                    },
                  ]
                : styles.coachSidebarBtnInactive,
            ]}
          >
            <LinearGradient
              colors={
                isCenterActive
                  ? [theme.tabActive, theme.accent]
                  : ["rgba(26, 44, 76, 0.75)", "rgba(14, 25, 45, 0.9)"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coachSidebarGradient}
            >
              <Image
                source={images.gradientQMark}
                style={[
                  styles.coachSidebarLogo,
                  !isCenterActive && { opacity: 0.88 },
                ]}
                resizeMode="contain"
              />
            </LinearGradient>
          </View>
        ) : (
          <LinearGradient
            colors={[theme.accent, theme.tabInactive]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.notesButton,
              { borderColor: isCenterActive ? theme.tabActive : theme.tabBorder },
            ]}
          >
            <MaterialCommunityIcons
              name={
                tutorEnabled
                  ? "school-outline"
                  : "notebook-multiple"
              }
              size={22}
              color={theme.primary}
            />
          </LinearGradient>
        )}
        <View style={sidebarExpanded ? styles.coachLabelRow : null}>
          <Text
            style={[
              styles.label,
              sidebarExpanded ? styles.labelExpanded : styles.labelCompact,
              {
                color: isCenterActive ? theme.tabActive : theme.tabInactive,
                fontWeight: isCenterActive ? "700" : "500",
              },
            ]}
          >
            {agentEnabled ? "COACH" : tutorEnabled ? "TUTOR" : "NOTES"}
          </Text>
          {agentEnabled && sidebarExpanded ? (
            <View
              style={[
                styles.coachAiBadge,
                {
                  backgroundColor: theme.tabActive + "22",
                  borderColor: theme.tabActive + "55",
                },
              ]}
            >
              <Text
                style={[styles.coachAiBadgeText, { color: theme.tabActive }]}
              >
                AI
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    borderRightWidth: 1,
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
  coachSidebarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    overflow: "hidden",
  },
  coachSidebarBtnActive: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  coachSidebarBtnInactive: {
    borderColor: "rgba(56, 189, 248, 0.35)",
    backgroundColor: "rgba(18, 32, 54, 0.9)",
  },
  coachSidebarGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  coachSidebarLogo: {
    width: 26,
    height: 26,
  },
  coachLabelRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 6,
  },
  coachAiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  coachAiBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
