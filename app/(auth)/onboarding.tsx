import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
import { savePendingGoals } from "../../lib/pendingGoals";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  { id: "welcome" },
  { id: "features" },
  { id: "goals" },
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

function SlideWelcome({
  visible,
  onContinue,
}: {
  visible: boolean;
  onContinue: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(24);
      scaleAnim.setValue(0.92);
    }
  }, [visible, fadeAnim, slideAnim, scaleAnim]);

  if (!visible) return <View style={styles.slide} />;

  return (
    <View style={styles.slide}>
      <Animated.View
        style={[
          styles.welcomeContent,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Animated.View
          style={[
            styles.brandIconWrap,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <MaterialCommunityIcons name="infinity" size={48} color={hero.primary} />
        </Animated.View>
        <Text style={styles.welcomeTitle}>Yuinx</Text>
        <Text style={styles.welcomeTagline}>
          Your gamified learning companion
        </Text>
        <Text style={styles.welcomeDesc}>
          Built around your curiosity — one quest at a time
        </Text>
      </Animated.View>

      <Animated.View
        style={[styles.actionWrap, { opacity: fadeAnim }]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.continueBtn,
            pressed && styles.btnPressed,
          ]}
          onPress={onContinue}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function SlideFeatures({
  visible,
  onContinue,
}: {
  visible: boolean;
  onContinue: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      Animated.stagger(
        120,
        cardAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            friction: 7,
            tension: 60,
            useNativeDriver: true,
          }),
        ),
      ).start();
    } else {
      fadeAnim.setValue(0);
      cardAnims.forEach((a) => a.setValue(0));
    }
  }, [visible, fadeAnim, cardAnims]);

  if (!visible) return <View style={styles.slide} />;

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.featuresHeader, { opacity: fadeAnim }]}>
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
                    translateY: cardAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [24, 0],
                    }),
                  },
                  {
                    scale: cardAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}
          >
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

      <Animated.View style={[styles.actionWrap, { opacity: fadeAnim }]}>
        <Pressable
          style={({ pressed }) => [
            styles.continueBtn,
            pressed && styles.btnPressed,
          ]}
          onPress={onContinue}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function GoalsSlide({ visible }: { visible: boolean }) {
  const { user, profile, getToken, updateProfile } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(24);
    }
  }, [visible, fadeAnim, slideAnim]);

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

  const handleContinue = () => {
    if (selected.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    const goals = selected;

    if (user && profile) {
      updateProfile({ learningGoals: goals, onBoarded: true });
      getToken()
        .then((token) => {
          if (!token) return;
          return api.users.update(profile.uid, { onBoarded: true }, token);
        })
        .catch((err: any) => {
          console.warn("[GoalsSlide] server save failed:", err);
        });
      router.replace("/(tabs)");
    } else {
      savePendingGoals(goals)
        .catch((err: any) => {
          console.warn("[GoalsSlide] stash failed:", err);
        })
        .finally(() => router.replace("/login"));
    }
  };

  if (!visible) return <View style={styles.slide} />;

  return (
    <View style={styles.slide}>
      <KeyboardAvoidingView
        style={styles.goalsFlex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View
          style={[
            styles.goalsContent,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.goalsBrand}>
            <MaterialCommunityIcons name="compass-outline" size={36} color={hero.primary} />
          </View>
          <Text style={styles.goalsTitle}>What do you want to learn?</Text>
          <Text style={styles.goalsSubtitle}>
            Pick up to {MAX_GOALS} goals so Yuinx can shape your path around your curiosity.
          </Text>

          <ScrollView
            contentContainerStyle={styles.goalsScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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

            <Text style={styles.goalCounter}>
              {selected.length > 0
                ? `${selected.length}/${MAX_GOALS} selected`
                : `Pick at least one goal`}
            </Text>
          </ScrollView>

          <Pressable
            style={[
              styles.goalsButton,
              (selected.length === 0 || saving) && styles.goalsButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={selected.length === 0 || saving}
          >
            {saving ? (
              <ActivityIndicator color={hero.surface} />
            ) : (
              <>
                <Text style={styles.goalsButtonText}>
                  {selected.length > 0
                    ? `Continue to Camp (${selected.length})`
                    : "Pick at least one goal"}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={hero.surface} />
              </>
            )}
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
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
        return <SlideFeatures visible={isVisible} onContinue={() => goToSlide(2)} />;
      case "goals":
        return <GoalsSlide visible={isVisible} />;
      default:
        return null;
    }
  };

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

      <Pressable
        style={styles.skipButton}
        onPress={() => router.replace("/login")}
        hitSlop={12}
      >
        <Text style={styles.skipText}>Skip to Sign In</Text>
      </Pressable>

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
  },
  brandIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    shadowColor: hero.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
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
  actionWrap: {
    marginTop: 40,
    width: "100%",
    maxWidth: 360,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: hero.primary,
    paddingVertical: 16,
    borderRadius: 16,
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  continueBtnText: {
    fontFamily: safeFont,
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  // Features slide
  featuresHeader: {
    alignItems: "center",
    marginBottom: 28,
  },
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
    gap: 14,
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

  // Goals slide
  goalsFlex: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  goalsContent: {
    flex: 1,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    paddingVertical: 8,
  },
  goalsBrand: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    marginBottom: 12,
  },
  goalsTitle: {
    fontFamily: safeFont,
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 6,
  },
  goalsSubtitle: {
    fontFamily: safeFont,
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 12,
    maxWidth: 320,
  },
  goalsScroll: {
    alignItems: "center",
    paddingBottom: 4,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
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
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  chipSelected: {
    backgroundColor: hero.primary,
    borderColor: hero.primary,
  },
  chipText: {
    fontFamily: safeFont,
    fontSize: 13,
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
    marginBottom: 10,
  },
  customInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 50,
    paddingVertical: 11,
    paddingHorizontal: 18,
    color: "#fff",
    fontFamily: safeFont,
    fontSize: 14,
  },
  customAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    marginBottom: 8,
  },
  goalCounter: {
    fontFamily: safeFont,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 10,
  },
  goalsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 50,
    minWidth: 260,
    marginTop: 4,
  },
  goalsButtonDisabled: {
    opacity: 0.5,
  },
  goalsButtonText: {
    fontFamily: safeFont,
    fontSize: 16,
    fontWeight: "700",
    color: hero.surface,
  },

  // Skip
  skipButton: {
    position: "absolute",
    top: 16,
    right: 24,
    zIndex: 10,
    paddingVertical: 6,
  },
  skipText: {
    fontFamily: safeFont,
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },

  // Dots
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});