import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { hero, safeFont } from "../../constants/themes";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const MAX_GOALS = 6;

const PRESET_GOALS = [
  "Learn a new language",
  "Career growth",
  "Academic study",
  "Build a side project",
  "Creative skills",
  "AI & technology",
  "Health & wellness",
  "Start a business",
  "General curiosity",
];

const SLIDES = [
  {
    id: "welcome",
    attention: "low",
  },
  {
    id: "features",
    attention: "medium",
  },
  {
    id: "ready",
    attention: "high",
  },
];

const FEATURES = [
  {
    icon: "compass-outline" as const,
    title: "Personalized Learning",
    desc: "AI crafts a unique path around your curiosity and goals",
    color: hero.primary,
  },
  {
    icon: "trophy-outline" as const,
    title: "Gamified Quests",
    desc: "Earn rewards, track streaks, and unlock achievements",
    color: hero.success,
  },
  {
    icon: "trending-up" as const,
    title: "Track Progress",
    desc: "Real-time metrics that show how far you have come",
    color: hero.accent,
  },
];

function FloatingParticles() {
  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT * 0.6,
      size: 3 + Math.random() * 5,
      delay: Math.random() * 2000,
      duration: 2500 + Math.random() * 3000,
      opacity: 0.15 + Math.random() * 0.2,
    })),
  ).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <FloatingDot key={p.id} {...p} />
      ))}
    </View>
  );
}

function FloatingDot({
  x, y, size, delay, duration, opacity,
}: {
  x: number; y: number; size: number; delay: number; duration: number; opacity: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: duration / 2,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [anim, duration, delay]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const scale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.4, 1],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: hero.primary,
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    />
  );
}

function SlideWelcome({
  onContinue,
  visible,
}: {
  onContinue: () => void;
  visible: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
    }
  }, [visible, fadeAnim, slideAnim, pulseAnim]);

  if (!visible) return <View style={styles.slide} />;

  return (
    <Pressable style={styles.slide} onPress={onContinue}>
      <FloatingParticles />
      <Animated.View
        style={[
          styles.welcomeContent,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.brandIconWrap}>
          <MaterialCommunityIcons name="infinity" size={48} color={hero.primary} />
        </View>
        <Text style={styles.welcomeTitle}>Yuinx</Text>
        <Text style={styles.welcomeTagline}>
          Your gamified learning companion
        </Text>
        <Text style={styles.welcomeDesc}>
          Built around your curiosity — one quest at a time
        </Text>
      </Animated.View>

      <Animated.View
        style={[styles.tapHint, { opacity: pulseAnim }]}
        pointerEvents="none"
      >
        <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.5)" />
        <Text style={styles.tapHintText}>Tap to continue</Text>
      </Animated.View>
    </Pressable>
  );
}

function SlideFeatures({
  visible,
  onComplete,
}: {
  visible: boolean;
  onComplete: () => void;
}) {
  const [spotlightIndex, setSpotlightIndex] = useState(-1);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const spotlightAnim = useRef(FEATURES.map(() => new Animated.Value(0.3))).current;
  const [showContinue, setShowContinue] = useState(false);

  useEffect(() => {
    if (!visible) {
      fadeAnim.setValue(0);
      cardAnims.forEach((a) => a.setValue(0));
      spotlightAnim.forEach((a) => a.setValue(0.3));
      setSpotlightIndex(-1);
      setShowContinue(false);
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const sequence = Animated.stagger(300, cardAnims.map((anim, i) =>
      Animated.spring(anim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ));

    sequence.start(() => {
      setSpotlightIndex(0);
    });
  }, [visible, fadeAnim, cardAnims, spotlightAnim]);

  useEffect(() => {
    if (spotlightIndex < 0 || spotlightIndex >= FEATURES.length) return;

    const interval = setInterval(() => {
      setSpotlightIndex((prev) => {
        const next = prev + 1;
        if (next >= FEATURES.length) {
          clearInterval(interval);
          setTimeout(() => setShowContinue(true), 400);
          return prev;
        }
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [spotlightIndex]);

  useEffect(() => {
    if (spotlightIndex >= 0 && spotlightIndex < FEATURES.length) {
      Animated.spring(spotlightAnim[spotlightIndex], {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: false,
      }).start();

      spotlightAnim.forEach((anim, i) => {
        if (i !== spotlightIndex) {
          Animated.timing(anim, {
            toValue: 0.2,
            duration: 300,
            useNativeDriver: false,
          }).start();
        }
      });
    }
  }, [spotlightIndex, spotlightAnim]);

  if (!visible) return <View style={styles.slide} />;

  return (
    <View style={styles.slide}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.featuresTitle}>Your Journey Awaits</Text>
        <Text style={styles.featuresSubtitle}>
          Everything you need to stay motivated
        </Text>
      </Animated.View>

      <View style={styles.featuresList}>
        {FEATURES.map((feat, i) => (
          <Animated.View
            key={feat.title}
            style={[
              styles.featureCard,
              {
                opacity: cardAnims[i],
                transform: [
                  {
                    translateX: cardAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [60, 0],
                    }),
                  },
                  {
                    scale: cardAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.featureGlow,
                {
                  backgroundColor: feat.color,
                  opacity: spotlightAnim[i] || 0,
                },
              ]}
            />
            <View style={[styles.featureIconWrap, { backgroundColor: feat.color + "20" }]}>
              <Ionicons name={feat.icon} size={24} color={feat.color} />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>{feat.title}</Text>
              <Text style={styles.featureDesc}>{feat.desc}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {showContinue && (
        <Animated.View style={styles.featuresContinueWrap}>
          <Pressable style={styles.featuresContinueBtn} onPress={onComplete}>
            <Text style={styles.featuresContinueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

function SlideReady({ visible }: { visible: boolean }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      ).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible, fadeAnim, scaleAnim, glowAnim]);

  const handleGetStarted = () => {
    router.push("/login");
  };

  if (!visible) return <View style={styles.slide} />;

  return (
    <LinearGradient
      colors={[hero.gradientStart, hero.gradientMid, hero.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.slide}
    >
      <Animated.View
        style={[
          styles.readyContent,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.readyIconWrap}>
          <MaterialCommunityIcons name="star" size={64} color="#fff" />
        </View>
        <Text style={styles.readyTitle}>Ready to Begin?</Text>
        <Text style={styles.readyDesc}>
          Your personalized learning journey starts now. One quest at a time.
        </Text>

        <Animated.View
          style={{
            shadowColor: hero.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: glowAnim.interpolate({
              inputRange: [0.5, 1],
              outputRange: [0.3, 0.8],
            }),
            shadowRadius: glowAnim.interpolate({
              inputRange: [0.5, 1],
              outputRange: [12, 28],
            }),
            elevation: 10,
          }}
        >
          <Pressable style={styles.readyButton} onPress={handleGetStarted}>
            <Text style={styles.readyButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={22} color="#fff" />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
}

function GoalsSetup({
  getToken,
  updateProfile,
}: {
  getToken: () => Promise<string | null>;
  updateProfile: (updates: { learningGoals: string[]; onBoarded: true }) => void;
}) {
  const { profile } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGoal = (goal: string) => {
    setSelected((prev) => {
      if (prev.includes(goal)) return prev.filter((g) => g !== goal);
      if (prev.length >= MAX_GOALS) return prev;
      return [...prev, goal];
    });
    if (error) setError(null);
  };

  const addCustomGoal = () => {
    const text = custom.trim();
    if (!text) return;
    if (!selected.includes(text)) {
      toggleGoal(text);
    }
    setCustom("");
  };

  const handleStart = () => {
    if (!profile || selected.length === 0 || saving) return;
    setSaving(true);
    setError(null);

    updateProfile({ learningGoals: selected, onBoarded: true });

    getToken()
      .then((token) => {
        if (!token) return;
        return api.users.update(
          profile.uid,
          { onBoarded: true },
          token,
        );
      })
      .catch((err: any) => {
        console.warn("[GoalsSetup] server save failed:", err);
      });

    router.replace("/(tabs)");
  };

  return (
    <LinearGradient
      colors={[hero.gradientStart, hero.gradientMid, hero.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.goalsContainer}
    >
      <KeyboardAvoidingView
        style={styles.goalsContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.goalsContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.goalsBrand}>
          <MaterialCommunityIcons name="compass-outline" size={40} color={hero.primary} />
        </View>
        <Text style={styles.goalsTitle}>What do you want to learn?</Text>
        <Text style={styles.goalsSubtitle}>
          Pick up to {MAX_GOALS} goals so Yuinx can shape your path around your curiosity.
        </Text>

        <View style={styles.chipsWrap}>
          {PRESET_GOALS.map((goal) => {
            const isSelected = selected.includes(goal);
            return (
              <Pressable
                key={goal}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleGoal(goal)}
              >
                {isSelected && <Ionicons name="checkmark-circle" size={16} color="#fff" />}
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {goal}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            value={custom}
            onChangeText={(t) => {
              setCustom(t);
              if (error) setError(null);
            }}
            placeholder="Add your own goal…"
            placeholderTextColor="rgba(255,255,255,0.4)"
            maxLength={60}
            returnKeyType="done"
            onSubmitEditing={addCustomGoal}
          />
          <Pressable
            style={[styles.customAddBtn, !custom.trim() && styles.customAddBtnDisabled]}
            onPress={addCustomGoal}
            disabled={!custom.trim()}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        {error && <Text style={styles.goalsError}>{error}</Text>}

        <Pressable
          style={[
            styles.goalsButton,
            (selected.length === 0 || saving) && styles.goalsButtonDisabled,
          ]}
          onPress={handleStart}
          disabled={selected.length === 0 || saving}
        >
          {saving ? (
            <ActivityIndicator color={hero.surface} />
          ) : (
            <>
              <Text style={styles.goalsButtonText}>
                {selected.length > 0
                  ? `Start Learning (${selected.length})`
                  : "Pick at least one goal"}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={hero.surface} />
            </>
          )}
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

export default function OnboardingScreen() {
  const { user, profile, getToken, updateProfile } = useAuth();
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<import("react-native").FlatList<any>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false },
  );

  const onMomentumEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(idx);
  };

  const goToSlide = (idx: number) => {
    scrollRef.current?.scrollToOffset({ offset: idx * SCREEN_WIDTH, animated: true });
  };

  const renderSlide = ({ item }: { item: (typeof SLIDES)[0]; index: number }) => {
    const isVisible = SLIDES.indexOf(item) === currentIndex;

    switch (item.id) {
      case "welcome":
        return <SlideWelcome visible={isVisible} onContinue={() => goToSlide(1)} />;
      case "features":
        return <SlideFeatures visible={isVisible} onComplete={() => goToSlide(2)} />;
      case "ready":
        return <SlideReady visible={isVisible} />;
      default:
        return null;
    }
  };

  if (user && profile && !profile.onBoarded) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <GoalsSetup getToken={getToken} updateProfile={updateProfile} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Animated.FlatList
        ref={scrollRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
        bounces={false}
      />

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === currentIndex ? hero.primary : "rgba(255,255,255,0.2)",
                width: i === currentIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  // Welcome slide
  welcomeContent: {
    alignItems: "center",
    zIndex: 10,
  },
  brandIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: hero.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: hero.primary + "30",
  },
  welcomeTitle: {
    fontFamily: safeFont,
    fontSize: 42,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
    marginBottom: 12,
  },
  welcomeTagline: {
    fontFamily: safeFont,
    fontSize: 18,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginBottom: 8,
  },
  welcomeDesc: {
    fontFamily: safeFont,
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  tapHint: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
    gap: 4,
  },
  tapHintText: {
    fontFamily: safeFont,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },

  // Features slide
  featuresTitle: {
    fontFamily: safeFont,
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 6,
  },
  featuresSubtitle: {
    fontFamily: safeFont,
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    marginBottom: 32,
  },
  featuresList: {
    gap: 14,
    width: "100%",
    maxWidth: 360,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    gap: 14,
  },
  featureGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
    borderRadius: 20,
  },
  featureIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: safeFont,
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 3,
  },
  featureDesc: {
    fontFamily: safeFont,
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 18,
  },
  featuresContinueWrap: {
    marginTop: 32,
    width: "100%",
    maxWidth: 360,
  },
  featuresContinueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: hero.primary,
    paddingVertical: 16,
    borderRadius: 16,
  },
  featuresContinueText: {
    fontFamily: safeFont,
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  // Ready slide
  readyContent: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  readyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  readyTitle: {
    fontFamily: safeFont,
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  readyDesc: {
    fontFamily: safeFont,
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
    maxWidth: 300,
  },
  readyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fff",
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 50,
    minWidth: 240,
  },
  readyButtonText: {
    fontFamily: safeFont,
    fontSize: 18,
    fontWeight: "700",
    color: hero.surface,
  },

  // Dots
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingBottom: 40,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Goals setup
  goalsContainer: {
    flex: 1,
  },
  goalsContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  goalsBrand: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: hero.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: hero.primary + "30",
    marginBottom: 20,
  },
  goalsTitle: {
    fontFamily: safeFont,
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
  },
  goalsSubtitle: {
    fontFamily: safeFont,
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 320,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
    maxWidth: 360,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  chipSelected: {
    backgroundColor: hero.primary,
    borderColor: hero.primary,
  },
  chipText: {
    fontFamily: safeFont,
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  chipTextSelected: {
    color: "#fff",
  },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    maxWidth: 360,
    marginBottom: 16,
  },
  customInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 18,
    color: "#fff",
    fontFamily: safeFont,
    fontSize: 14,
  },
  customAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: hero.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  customAddBtnDisabled: {
    opacity: 0.4,
  },
  goalsError: {
    fontFamily: safeFont,
    fontSize: 13,
    color: "#FF6B6B",
    textAlign: "center",
    marginBottom: 12,
  },
  goalsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fff",
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 50,
    minWidth: 260,
    marginTop: 8,
  },
  goalsButtonDisabled: {
    opacity: 0.5,
  },
  goalsButtonText: {
    fontFamily: safeFont,
    fontSize: 17,
    fontWeight: "700",
    color: hero.surface,
  },
});
