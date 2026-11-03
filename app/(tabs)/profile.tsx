import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import ErrorBoundary from "../../component/ErrorBoundary";
import ProfileInfoSection from "../../component/ProfileInfoSection";
import ScreenContainer from "../../component/ScreenContainer";
import ProfileCompletionCard from "../../component/profile/ProfileCompletionCard";
import ProfileHeroCard from "../../component/profile/ProfileHeroCard";
import ProfileProgressPanel from "../../component/profile/ProfileProgressPanel";
import ProfileSignOutCard from "../../component/profile/ProfileSignOutCard";
import ProfileSkillsPanel from "../../component/profile/ProfileSkillsPanel";
import ProfileStatCard from "../../component/profile/ProfileStatCard";
import ProfileTabs, {
  type ProfileTabItem,
} from "../../component/profile/ProfileTabs";
import { BREAKPOINTS } from "../../constants/layout";
import { fontFamily } from "../../constants/themes";
import { useAuth } from "../../contexts/AuthContext";
import { useResponsive, useTabBarInset } from "../../hooks/useResponsive";
import { useThemeColors } from "../../hooks/useTheme";
import { api } from "../../lib/api";
import { getAvatarUrl } from "../../lib/dicebear";
import { eventBus } from "../../lib/eventBus";
import { useCheckInStore } from "../../store/checkInStore";
import { useUserStore } from "../../store/userStore";
import { useUserTrophyStore } from "../../store/userTrophyStore";

export default function ProfileScreen() {
  const { user, signOut, getToken, refreshProfile, loading } = useAuth();
  const profile = useUserStore((s) => s.profile);
  const router = useRouter();
  const theme = useThemeColors();
  const { width } = useWindowDimensions();
  const { isWeb } = useResponsive();
  const tabBarInset = useTabBarInset(96);

  const isDesktop = width >= BREAKPOINTS.laptop;
  const isTablet =
    width >= BREAKPOINTS.tablet && width < BREAKPOINTS.laptop;
  const contentMax = isDesktop ? 1180 : isTablet ? 900 : undefined;

  const [uploading, setUploading] = useState(false);
  const [failedAvatarUri, setFailedAvatarUri] = useState<string | null>(null);
  const [startEditing, setStartEditing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const panelAnim = useRef(new Animated.Value(1)).current;

  const avatarUri = profile?.photoURL || getAvatarUrl(user?.email || "default");
  const avatarError = failedAvatarUri === avatarUri;

  const checkInStreak = useCheckInStore((s) => s.currentStreak);
  const trophies = useUserTrophyStore((s) => s.trophies);

  const skillCount = useMemo(
    () =>
      (profile?.skills?.length ?? 0) + (profile?.tradeSkills?.length ?? 0),
    [profile?.skills?.length, profile?.tradeSkills?.length],
  );
  const courseCount = profile?.courses?.length ?? 0;

  const tabs: ProfileTabItem[] = useMemo(
    () => [
      { key: "info", label: "Info", icon: "account-outline" },
      {
        key: "skills",
        label: "Skills",
        icon: "briefcase-outline",
        count: skillCount,
      },
      {
        key: "progress",
        label: "Progress",
        icon: "chart-line",
        count: courseCount,
      },
    ],
    [skillCount, courseCount],
  );

  useEffect(() => {
    panelAnim.setValue(0);
    Animated.timing(panelAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeTab, startEditing, panelAnim]);

  useEffect(() => {
    if (!user?.uid) return;
    const trophyState = useUserTrophyStore.getState();
    if (!trophyState.loaded && !trophyState.loading) {
      trophyState.fetchTrophies(user.uid, getToken);
    }
    const checkInState = useCheckInStore.getState();
    if (!checkInState.loaded) {
      checkInState.load(user.uid, getToken);
    }
  }, [user?.uid, getToken]);

  const handlePickImage = useCallback(async () => {
    if (!user) {
      Alert.alert(
        "Error",
        "You must be signed in to upload a profile picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    setUploading(true);
    try {
      const { uploadImage } = await import("../../lib/cloudinary");
      const downloadURL = await uploadImage(result.assets[0].uri, getToken);
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      await api.users.update(user.uid, { photoURL: downloadURL }, token);
      const currentProfile = useUserStore.getState().profile;
      if (currentProfile) {
        useUserStore
          .getState()
          .setProfile({ ...currentProfile, photoURL: downloadURL });
      }
      eventBus.emit("toast:success", { title: "Profile picture updated" });
    } catch (error) {
      console.error("[Profile] avatar upload failed:", error);
      Alert.alert("Upload failed", "We couldn't upload that image. Try again.");
    } finally {
      setUploading(false);
    }
  }, [user, getToken]);

  const performSignOut = useCallback(async () => {
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("[Profile] sign out failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Could not sign out. Please try again.";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(message);
      } else {
        Alert.alert("Sign Out Failed", message);
      }
    }
  }, [signOut, router]);

  const handleSignOut = useCallback(() => {
    if (Platform.OS === "web") {
      if (
        typeof window === "undefined" ||
        !window.confirm("Are you sure you want to sign out?")
      ) {
        return;
      }
      void performSignOut();
      return;
    }

    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          void performSignOut();
        },
      },
    ]);
  }, [performSignOut]);

  const handleShare = useCallback(async () => {
    const displayName = profile?.displayName || "My Yuinx profile";
    const lines = [
      `${displayName} on Yuinx`,
      profile?.headline,
      profile?.location ? `Location: ${profile.location}` : null,
      profile?.skills?.length
        ? `Skills: ${profile.skills.slice(0, 6).join(", ")}`
        : null,
      "Learning something new with Yuinx.",
    ].filter(Boolean);

    const message = lines.join("\n");

    try {
      if (isWeb) {
        await Clipboard.setStringAsync(message);
        eventBus.emit("toast:success", { title: "Profile summary copied" });
        return;
      }
      await Share.share({ message, title: displayName });
    } catch (error) {
      console.warn("[Profile] share failed:", error);
    }
  }, [profile, isWeb]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      if (user?.uid) {
        await useUserTrophyStore.getState().fetchTrophies(user.uid, getToken);
      }
    } catch (error) {
      console.warn("[Profile] refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile, user?.uid, getToken]);

  const openEditor = useCallback(() => {
    setStartEditing(true);
  }, []);

  const renderPanel = () => {
    if (!profile) {
      return (
        <View
          style={[
            styles.emptyState,
            { backgroundColor: theme.surface, borderColor: theme.borderLight },
          ]}
        >
          <ActivityIndicator color={theme.primary} />
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            Loading your profile…
          </Text>
        </View>
      );
    }

    if (startEditing || activeTab === 0) {
      return (
        <ProfileInfoSection
          profile={profile}
          startEditing={startEditing}
          onDoneEditing={() => setStartEditing(false)}
          wide={isDesktop}
        />
      );
    }

    if (activeTab === 1) {
      return (
        <ProfileSkillsPanel
          profile={profile}
          wide={isDesktop}
          onEdit={openEditor}
        />
      );
    }

    return (
      <ProfileProgressPanel
        profile={profile}
        trophies={trophies.length}
        streak={checkInStreak}
        wide={isDesktop}
      />
    );
  };

  const panelAnimatedStyle = {
    opacity: panelAnim,
    transform: [
      {
        translateY: panelAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };

  const hero = (
    <ProfileHeroCard
      profile={profile}
      avatarUri={avatarUri}
      avatarError={avatarError}
      uploading={uploading}
      variant={isTablet ? "row" : "stacked"}
      onPickImage={handlePickImage}
      onEdit={openEditor}
      onSettings={() => router.push("/settings")}
      onShare={handleShare}
      onAvatarError={() => setFailedAvatarUri(avatarUri)}
    />
  );

  if (!profile && loading) {
    return (
      <ErrorBoundary>
        <ScreenContainer edges={["top"]} width="full">
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        </ScreenContainer>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <ScreenContainer edges={["top"]} width="full">
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: tabBarInset + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
              progressBackgroundColor={theme.surface}
            />
          }
        >
          <View style={[styles.page, { maxWidth: contentMax }]}>
            <View
              style={[styles.layout, isDesktop && styles.layoutDesktop]}
            >
              {isDesktop ? (
                <View style={styles.rail}>
                  {hero}
                  <ProfileCompletionCard
                    profile={profile}
                    onEdit={openEditor}
                  />
                  <ProfileSignOutCard onSignOut={handleSignOut} />
                </View>
              ) : null}

              <View style={styles.main}>
                {!isDesktop ? hero : null}

                {!startEditing ? (
                  <ProfileStatCard profile={profile} wide={isDesktop} />
                ) : null}

                {!isDesktop && !startEditing ? (
                  <ProfileCompletionCard
                    profile={profile}
                    onEdit={openEditor}
                  />
                ) : null}

                {startEditing ? (
                  <View style={styles.editHeader}>
                    <Text style={[styles.editTitle, { color: theme.text }]}>
                      Edit profile
                    </Text>
                    <Text
                      style={[styles.editSubtitle, { color: theme.textMuted }]}
                    >
                      Keep your details fresh — it helps us personalise your
                      path.
                    </Text>
                  </View>
                ) : (
                  <ProfileTabs
                    tabs={tabs}
                    activeIndex={activeTab}
                    onChange={setActiveTab}
                  />
                )}

                <Animated.View style={[styles.panel, panelAnimatedStyle]}>
                  {renderPanel()}
                </Animated.View>

                {!isDesktop ? (
                  <ProfileSignOutCard onSignOut={handleSignOut} />
                ) : null}
              </View>
            </View>
          </View>
        </ScrollView>
      </ScreenContainer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flexGrow: 1,
  },
  page: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  layout: {
    width: "100%",
    gap: 16,
  },
  layoutDesktop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 24,
    paddingHorizontal: 8,
  },
  rail: {
    width: 340,
    gap: 16,
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 16,
  },
  panel: {
    width: "100%",
  },
  editHeader: {
    gap: 4,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily,
    letterSpacing: -0.2,
  },
  editSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily,
  },
  emptyState: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily,
  },
});
