import { Stack, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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

initNotifications();
SplashScreen.preventAutoHideAsync();

const SAVED_USER_KEY = "currentUser";

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

    if (!inTabsGroup && (becameReady || isPublicPage || strayArmedRef.current)) {
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
  }, [user, profile, loading, loadedOnce, ready, becameReady, accountError, segments, router]);

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

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_ZXplYXktM2M1NDEuY2xlcmsuYWNjb3VudHMuZGV2JA";
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_300Light,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    useAiKeysStore.getState().loadKeys();
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

