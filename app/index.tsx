import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { hero, safeFont } from "../constants/themes";
import { images } from "../constants/images";
import { useAuth } from "../contexts/AuthContext";

export default function Index() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

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

  return (
    <View style={styles.container}>
      {/* Background gradient lighting */}
      <LinearGradient
        colors={["#080C14", "#0D1322", "#070A10"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Top brand header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <MaterialCommunityIcons name="infinity" size={24} color={hero.primary} />
            </View>
            <Text style={styles.brandTitle}>Yuinx</Text>
          </View>
        </Animated.View>

        {/* Hero content card */}
        <Animated.View
          style={[
            styles.heroContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.illustrationContainer,
              { transform: [{ translateY: floatTranslate }] },
            ]}
          >
            <View style={styles.glowBackdrop} />
            <Image
              source={images.researching}
              style={styles.illustration}
              resizeMode="contain"
            />
          </Animated.View>

          <View style={styles.textBlock}>
            <View style={styles.pillBadge}>
              <Ionicons name="sparkles" size={13} color={hero.primary} />
              <Text style={styles.pillText}>Gamified Learning Companion</Text>
            </View>
            <Text style={styles.title}>
              Built Around{"\n"}
              <Text style={styles.titleHighlight}>Your Curiosity</Text>
            </Text>
            <Text style={styles.subtitle}>
              Personalized paths, gamified quests, and real mastery. Tailored for your unique ambition.
            </Text>
          </View>
        </Animated.View>

        {/* Apple-style Action Stack */}
        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
            onPress={() => router.push("/onboarding")}
          >
            <LinearGradient
              colors={[hero.gradientStart, hero.gradientMid, hero.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.secondaryBtnPressed,
            ]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.secondaryBtnText}>
              Already have an account?{" "}
              <Text style={styles.secondaryBtnHighlight}>Sign In</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070A10",
  },
  safeArea: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
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
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.28)",
    justifyContent: "center",
    alignItems: "center",
  },
  brandTitle: {
    fontFamily: safeFont,
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
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
    backgroundColor: "rgba(56, 189, 248, 0.15)",
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
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  pillText: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
  },
  title: {
    fontFamily: safeFont,
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 42,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  titleHighlight: {
    color: hero.primary,
  },
  subtitle: {
    fontFamily: safeFont,
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.65)",
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
    shadowColor: hero.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
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
    color: "#FFFFFF",
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
    color: "rgba(255, 255, 255, 0.6)",
  },
  secondaryBtnHighlight: {
    color: hero.primary,
    fontWeight: "700",
  },
});
