import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors } from "../hooks/useTheme";
import { useOfflineModelSync } from "../hooks/useOfflineModelSync";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "../lib/tokenCache";
import { useAiKeysStore } from "../store/aiKeysStore";
import { initNotifications } from "../lib/notifications";
import ErrorBoundary from "../component/ErrorBoundary";
import LoadingScreen from "../component/LoadingScreen";
import Toast from "../component/Toast";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  SpaceGrotesk_300Light,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";

initNotifications();
SplashScreen.preventAutoHideAsync();

const SAVED_USER_KEY = "currentUser";

const INPUT_OUTLINE_RESET = `
  input, textarea, select,
  input:hover, textarea:hover, select:hover,
  input:focus, textarea:focus, select:focus,
  input:focus-visible, textarea:focus-visible, select:focus-visible,
  input:active, textarea:active, select:active {
    outline: none !important;
    outline-width: 0 !important;
  }
`;

const styles = StyleSheet.create({
  restoreWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  restoreTitle: {
    fontFamily: "SpaceGrotesk",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  restoreMsg: {
    fontFamily: "SpaceGrotesk",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  restoreButton: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 16,
  },
  restoreButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk",
  },
});

function NavigationGuard() {
  const { user, profile, loading, loadedOnce, accountError, retryAccountLoad } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const theme = useThemeColors();
  const prevReadyRef = useRef<boolean>(false);
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [restoreStuck, setRestoreStuck] = useState(false);
  const [onboardingElapsedFor, setOnboardingElapsedFor] = useState<string | null>(null);
  const strayArmedRef = useRef(false);

  const ready = !!user && !!profile && !loading && loadedOnce && !accountError;
  const becameReady = ready && !prevReadyRef.current;
  prevReadyRef.current = ready;

  // Watchdog: while signed in and data is still loading for 20s, surface a retry
  useEffect(() => {
    if (!user || ready || restoreStuck || accountError) {
      if (stuckTimerRef.current) {
        clearTimeout(stuckTimerRef.current);
        stuckTimerRef.current = null;
      }
      return;
    }

    if (stuckTimerRef.current) return;

    stuckTimerRef.current = setTimeout(() => {
      stuckTimerRef.current = null;
      setRestoreStuck(true);
    }, 20000);

    return () => {
      if (stuckTimerRef.current) {
        clearTimeout(stuckTimerRef.current);
        stuckTimerRef.current = null;
      }
    };
  }, [user, ready, restoreStuck, accountError]);

  // Give the profile loader a brief moment before forcing onboarding, so a
  // just-created profile can land on its first tab without a redirect flash.
  const shouldOnboard = ready && !!profile && !profile.onBoarded;
  const needsOnboarding =
    shouldOnboard && onboardingElapsedFor === profile?.uid;

  useEffect(() => {
    if (!shouldOnboard || !profile?.uid) return;
    const uid = profile.uid;
    const timer = setTimeout(() => setOnboardingElapsedFor(uid), 700);
    return () => clearTimeout(timer);
  }, [shouldOnboard, profile?.uid]);

  // The Clerk OAuth deep-link callback (ezeay://.../oauth-native-callback)
  // re-enters the app and can push a stray route (e.g. (notes)/[noteId]) a beat
  // AFTER the one-shot becameReady redirect already ran. Arm a short "post-auth"
  // window on becameReady; while armed, any non-(tabs) route for a ready user is
  // forced back to home so the stray can never stick. It disarms the moment the
  // tab home renders, so normal in-session navigation is never intercepted.
  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }

    const isPublicPage = !segments[0];
    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";
    const inSettingsGroup = segments[0] === "(settings)";
    const inExploreGroup = segments[0] === "explore";

    if (becameReady) {
      strayArmedRef.current = true;
    }

    if (!user) {
      prevReadyRef.current = false;
      if (loading) return;
      AsyncStorage.removeItem(SAVED_USER_KEY);
      if (!inAuthGroup && !isPublicPage) {
        router.replace("/login");
      }
      return;
    }

    AsyncStorage.setItem(SAVED_USER_KEY, JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    }));

    if (!ready) return;

    if (needsOnboarding && !inAuthGroup) {
      router.replace("/onboarding");
      return;
    }

    if (
      !inTabsGroup &&
      !inSettingsGroup &&
      !inExploreGroup &&
      (becameReady || isPublicPage || strayArmedRef.current)
    ) {
      // dismissAll dispatches POP_TO_TOP unconditionally. During cold start the
      // navigator (and its stack) may not be mounted/registered yet, so the
      // action has no handler and warns. canDismiss() returns false in that
      // case, in which case there is nothing to pop anyway.
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace("/(tabs)");
    } else if (inTabsGroup && strayArmedRef.current) {
      strayArmedRef.current = false;
    }
  }, [user, profile, loading, loadedOnce, ready, becameReady, accountError, needsOnboarding, segments, router]);

  if (user && (accountError || (loading && restoreStuck))) {
    return (
      <View style={[styles.restoreWrap, { backgroundColor: theme.bg }]}>
        <Text style={[styles.restoreTitle, { color: theme.text }]}>
          {"Couldn't load your account"}
        </Text>
        <Text style={[styles.restoreMsg, { color: theme.textMuted }]}>
          {"Check your connection then try again."}
        </Text>
        <Pressable
          style={[styles.restoreButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            setRestoreStuck(false);
            retryAccountLoad();
          }}
        >
          <Text style={styles.restoreButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <LoadingScreen
        message={user ? "Loading your account..." : "Loading Yuinx..."}
      />
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const devFallbackKey = "pk_test_ZXplYXktM2M1NDEuY2xlcmsuYWNjb3VudHMuZGV2JA";
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || (__DEV__ ? devFallbackKey : "");
  if (!publishableKey) {
    throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY — set it in your .env (see .env.example)");
  }
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_300Light,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    useAiKeysStore.getState().loadKeys();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const style = document.createElement("style");
    style.textContent = INPUT_OUTLINE_RESET;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useOfflineModelSync();

  if (!fontsLoaded) return null;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <AuthProvider>
        <ErrorBoundary>
          <NavigationGuard />
          <Toast />
        </ErrorBoundary>
      </AuthProvider>
    </ClerkProvider>
  );
}

