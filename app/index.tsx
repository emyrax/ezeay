import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
    Animated,
    Easing,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MascotAnimation from "../component/MascotAnimation";
import MascotStage from "../component/mascot/MascotStage";
import { safeFont } from "../constants/themes";
import { useAuth } from "../contexts/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { useThemeColors } from "../hooks/useTheme";
import { createShadow } from "@/lib/shadow";

export default function Index() {
  return <NativeWelcome />;
}

function NativeWelcome() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { isWebWide } = useResponsive();
  const theme = useThemeColors();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && profile && !loading) {
      router.replace("/(tabs)");
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle breathing float for illustration
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fadeAnim, slideAnim, floatAnim]);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const illustration = (
    <Animated.View
      style={[
        styles.illustrationContainer,
        isWebWide && styles.illustrationContainerWide,
        { transform: [{ translateY: floatTranslate }] },
      ]}
    >
      <View
        style={[styles.glowBackdrop, { backgroundColor: theme.primaryLight }]}
      />
      <MascotAnimation
        action="mascot_emitting_energy"
        width={260}
        height={260}
        framed={false}
        contentFit="contain"
        style={styles.illustration}
      />
    </Animated.View>
  );

  const copy = (
    <View style={[styles.textBlock, isWebWide && styles.textBlockWide]}>
      <View
        style={[
          styles.pillBadge,
          {
            backgroundColor: theme.primaryLight,
            borderColor: theme.border,
          },
        ]}
      >
        <Ionicons name="sparkles" size={13} color={theme.primary} />
        <Text style={[styles.pillText, { color: theme.text }]}>
          Gamified Learning Companion
        </Text>
      </View>
      <Text
        style={[styles.title, isWebWide && styles.titleWide, { color: theme.text }]}
      >
        Built Around{"\n"}
        <Text style={[styles.titleHighlight, { color: theme.primary }]}>
          Your Curiosity
        </Text>
      </Text>
      <Text
        style={[
          styles.subtitle,
          isWebWide && styles.subtitleWide,
          { color: theme.textSecondary },
        ]}
      >
        Personalized paths, gamified quests, and real mastery. Tailored for your
        unique ambition.
      </Text>
    </View>
  );

  const footer = (
    <Animated.View
      style={[
        styles.footer,
        isWebWide && styles.footerWide,
        { opacity: fadeAnim },
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.primaryBtn,
          createShadow(theme.primary, 0, 4, 10, 0.25),
          pressed && styles.primaryBtnPressed,
        ]}
        onPress={() => router.push("/onboarding")}
      >
        <LinearGradient
          colors={[theme.gradientStart, theme.gradientMid, theme.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryBtnGradient}
        >
          <Text style={[styles.primaryBtnText, { color: theme.bg }]}>
            Get Started
          </Text>
          <Ionicons name="arrow-forward" size={18} color={theme.bg} />
        </LinearGradient>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.secondaryBtn,
          pressed && styles.secondaryBtnPressed,
        ]}
        onPress={() => router.push("/login")}
      >
        <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>
          Already have an account?{" "}
          <Text style={[styles.secondaryBtnHighlight, { color: theme.primary }]}>
            Sign In
          </Text>
        </Text>
      </Pressable>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Background gradient lighting */}
      <LinearGradient
        colors={[theme.bg, theme.surface, theme.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isWebWide && styles.scrollContentWide,
          ]}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Top brand header */}
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <View style={styles.brandRow}>
              <MascotStage
                action="mascot_waving"
                width={34}
                height={38}
                variant="mark"
                contentPosition="top"
                stageColor={theme.surface}
                fadeColor={theme.bg}
              />
              <Text style={[styles.brandTitle, { color: theme.text }]}>
                Yuinx
              </Text>
            </View>
          </Animated.View>

          {isWebWide ? (
            <View style={styles.heroWide}>
              {illustration}
              <View style={styles.textColumnWide}>
                {copy}
                {footer}
              </View>
            </View>
          ) : (
            <>
              <Animated.View
                style={[
                  styles.heroContent,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                {illustration}
                {copy}
              </Animated.View>
              {footer}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  scrollContentWide: {
    justifyContent: "center",
    paddingVertical: 32,
  },
  heroWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 64,
    width: "100%",
    maxWidth: 1100,
    alignSelf: "center",
    paddingVertical: 32,
  },
  textColumnWide: {
    flex: 1,
    maxWidth: 440,
    alignItems: "flex-start",
    gap: 28,
  },
  illustrationContainerWide: {
    width: 420,
    height: 360,
  },
  textBlockWide: {
    alignItems: "flex-start",
    maxWidth: 440,
    marginTop: 0,
  },
  titleWide: {
    fontSize: 46,
    lineHeight: 54,
    textAlign: "left",
  },
  subtitleWide: {
    fontSize: 16,
    textAlign: "left",
  },
  footerWide: {
    alignSelf: "flex-start",
  },
  header: {
    paddingTop: 8,
    alignItems: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandTitle: {
    fontFamily: safeFont,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  heroContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  illustrationContainer: {
    width: 280,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  glowBackdrop: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    transform: [{ scale: 1.2 }],
  },
  illustration: {
    width: "100%",
    height: "100%",
  },
  textBlock: {
    alignItems: "center",
    maxWidth: 340,
    marginTop: 18,
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  pillText: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontFamily: safeFont,
    fontSize: 34,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 42,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  titleHighlight: {},
  subtitle: {
    fontFamily: safeFont,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  footer: {
    gap: 12,
    paddingBottom: 16,
    width: "100%",
    maxWidth: 380,
    alignSelf: "center",
  },
  primaryBtn: {
    borderRadius: 18,
    overflow: "hidden",
    elevation: 4,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 18,
  },
  primaryBtnText: {
    fontFamily: safeFont,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnPressed: {
    opacity: 0.7,
  },
  secondaryBtnText: {
    fontFamily: safeFont,
    fontSize: 14,
  },
  secondaryBtnHighlight: {
    fontWeight: "700",
  },
});
