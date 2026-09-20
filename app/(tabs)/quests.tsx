import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import DropdownSelect, { DropdownOption } from "../../component/DropdownSelect";
import GradientOutlineContainer from "../../component/GradientOutlineContainer";
import ProgressBar from "../../component/ProgressBar";
import ErrorBoundary from "../../component/ErrorBoundary";
import { images } from "../../constants/images";
import { useThemeColors } from "../../hooks/useTheme";
import { useAuth } from "../../contexts/AuthContext";
import { useNavLock } from "../../lib/guard";
import { useCourseStore } from "../../store/courseStore";
import { useEnrollmentStore } from "../../store/courseEnrollmentStore";
import { useModelStore } from "../../store/modelStore";
import { api } from "../../lib/api";
import {
  AI_MODELS,
  AI_PROVIDER_LABELS,
  getModelOption,
  type AiModelOption,
  type AiProvider,
} from "../../lib/providers/modelRegistry";
import type { GenerateCourseInput } from "../../types/courseGeneration";
import type { UserProfile } from "../../types/user";

const ADD_NEW_INTEREST = "__add_new__";

const DIFFICULTY_OPTIONS: DropdownOption[] = [
  { label: "Beginner", value: "Beginner" },
  { label: "Intermediate", value: "Intermediate" },
  { label: "Advanced", value: "Advanced", locked: true },
];

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function QuestsScreen() {
  const { profile, getToken, updateProfile } = useAuth();
  const theme = useThemeColors();
  const router = useRouter();
  const { navigate } = useNavLock();
  const [refreshing, setRefreshing] = useState(false);
  const generateCourse = useCourseStore((s) => s.generateCourse);
  const generating = useCourseStore((s) => s.generating);
  const fetchCourses = useCourseStore((s) => s.fetchCourses);
  const courseError = useCourseStore((s) => s.error);
  const togglePin = useCourseStore((s) => s.togglePin);
  const toggleFavorite = useCourseStore((s) => s.toggleFavorite);
  const deleteCourse = useCourseStore((s) => s.deleteCourse);
  const enrollments = useEnrollmentStore((s) => s.enrollments);
  const fetchEnrollments = useEnrollmentStore((s) => s.fetchEnrollments);
  const { selectedModel, setSelectedModel } = useModelStore();

  const DOUBLE_TAP_MS = 300;
  const [menuCourse, setMenuCourse] = useState<null | {
    id: string;
    title: string;
    pinned?: boolean;
    favorite?: boolean;
  }>(null);
  const lastPressRef = useRef(0);
  const generateLockRef = useRef(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const generatedSectionYRef = useRef(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [difficulty, setDifficulty] = useState("Beginner");
  const [personalised, setPersonalised] = useState(true);
  const [showModelPicker, setShowModelPicker] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    if (profile) {
      fetchCourses(profile.uid, getToken);
      fetchEnrollments(profile.uid, getToken);
    }
  }, [profile, getToken, fetchCourses, fetchEnrollments]);

  const userId = profile?.uid ?? "";
  const interests = useMemo(() => profile?.interests ?? [], [profile?.interests]);

  const allStoredCourses = useCourseStore((s) => s.courses);
  const getCourseById = useCourseStore((s) => s.getCourseById);
  const upsertCourse = useCourseStore((s) => s.upsertCourse);
  const userCourses = useMemo(
    () =>
      allStoredCourses
        .filter(
          (c) => c.creatorId === userId || c.id.startsWith("generating_"),
        )
        .sort((a, b) => {
          const aPinned = a.pinned ? 1 : 0;
          const bPinned = b.pinned ? 1 : 0;
          if (aPinned !== bPinned) return bPinned - aPinned;
          return (
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
          );
        }),
    [allStoredCourses, userId],
  );

  const enrolledCourses = useMemo(() => {
    if (!userId) return [];
    return enrollments
      .map((e) => allStoredCourses.find((c) => c.id === e.courseId))
      .filter(
        (c): c is NonNullable<typeof c> =>
          !!c &&
          c.creatorId !== userId &&
          !c.id.startsWith("generating_") &&
          (c.chapters?.length ?? 0) > 0,
      );
  }, [enrollments, allStoredCourses, userId]);

  useEffect(() => {
    if (!profile) return;
    const hydrate = async () => {
      const token = await getToken();
      if (!token) return;
      for (const enrollment of enrollments) {
        const existing = getCourseById(enrollment.courseId);
        if (existing && (existing.chapters?.length ?? 0) > 0) continue;
        api.courses
          .getById(enrollment.courseId, token)
          .then((course) => upsertCourse(course))
          .catch(() => {});
      }
    };
    hydrate();
  }, [enrollments, profile, getToken, getCourseById, upsertCourse, allStoredCourses]);

  const interestOptions = useMemo<DropdownOption[]>(
    () => [
      ...interests.map((i) => ({ label: i, value: i })),
      { label: "Add new interest…", value: ADD_NEW_INTEREST },
    ],
    [interests],
  );

  const showCategoryInput = addingCategory || interests.length === 0;
  const activeCategory = category || interests[0] || "";

  const cloudModels = useMemo(() => AI_MODELS.filter((m) => m.provider !== "offline"), []);
  const modelGroups = useMemo(() => {
    const order: AiProvider[] = ["gemini", "openai", "anthropic", "openrouter"];
    return order
      .map((provider) => ({
        provider,
        models: cloudModels.filter((m) => m.provider === provider),
      }))
      .filter((g) => g.models.length > 0);
  }, [cloudModels]);
  const selectedModelLabel = useMemo(
    () => getModelOption(selectedModel)?.label ?? "Default (Gemini 2.5 Flash)",
    [selectedModel],
  );

  const buildLearnerContext = useCallback((p: UserProfile): string | undefined => {
    const parts: string[] = [];
    const add = (field: string, value?: string) => {
      const v = value?.trim();
      if (v) parts.push(`${field}: ${v}`);
    };
    add("Department", p.department);
    add("Level / Year of study", p.level);
    add("Course / Major", p.majorCourse);
    add("Industry", p.industry);
    add("Job title", p.jobTitle);
    add("Company", p.company);
    const skills = (p.skills ?? []).slice(0, 6);
    if (skills.length > 0) parts.push(`Skills: ${skills.join(", ")}`);
    const interestsList = (p.interests ?? []).slice(0, 6);
    if (interestsList.length > 0) parts.push(`Interests: ${interestsList.join(", ")}`);
    const goals = (p.learningGoals ?? []).slice(0, 6);
    if (goals.length > 0) parts.push(`Learning goals: ${goals.join(", ")}`);
    return parts.length > 0 ? parts.join(" · ") : undefined;
  }, []);

  const getEnrollmentForCourse = useCallback(
    (courseId: string) => enrollments.find((e) => e.courseId === courseId),
    [enrollments],
  );

  const filterOptions = useMemo<DropdownOption[]>(
    () => [
      { label: "All Interests", value: "all" },
      { label: "Enrolled", value: "enrolled", icon: "book" },
      { label: "Favourites", value: "favourites", icon: "heart" },
      ...interests.map((i) => ({ label: i, value: i })),
    ],
    [interests],
  );

  const filteredCourses = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    return userCourses.filter((course) => {
      const matchesSearch =
        !term ||
        course.title.toLowerCase().includes(term) ||
        course.description.toLowerCase().includes(term) ||
        course.category.toLowerCase().includes(term);
      const matchesFavourite = activeFilter !== "favourites" || course.favorite === true;
      const matchesEnrolled =
        activeFilter !== "enrolled" || !!getEnrollmentForCourse(course.id);
      const matchesInterest =
        activeFilter === "all" ||
        activeFilter === "enrolled" ||
        activeFilter === "favourites" ||
        normalizeCategory(course.category) === normalizeCategory(activeFilter);
      return matchesSearch && matchesFavourite && matchesEnrolled && matchesInterest;
    });
  }, [userCourses, searchText, activeFilter, getEnrollmentForCourse]);

  const paginatedCourses = filteredCourses.slice(0, visibleCount);
  const hasMore = paginatedCourses.length < filteredCourses.length;

  const isEnrolledFilter = activeFilter === "enrolled";
  const showEnrolledSection = activeFilter === "all" || isEnrolledFilter;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      if (
        contentOffset.y + layoutMeasurement.height >= contentSize.height - 400 &&
        visibleCount < filteredCourses.length
      ) {
        setVisibleCount((c) => Math.min(c + 5, filteredCourses.length));
      }
    },
    [visibleCount, filteredCourses.length],
  );

  const handleGenerate = async () => {
    if (generating) return;
    if (generateLockRef.current) return;
    if (!description.trim()) {
      Alert.alert("Missing Description", "Please describe what you want to learn.");
      return;
    }
    if (!profile) {
      Alert.alert("Not Signed In", "Please sign in to generate a course.");
      return;
    }

    let resolvedCategory: string;
    const typedCategory = customCategory.trim();
    if (showCategoryInput) {
      if (!typedCategory) {
        Alert.alert("Missing Category", "Please enter a category or interest name.");
        return;
      }
      resolvedCategory = typedCategory;
    } else {
      resolvedCategory = activeCategory;
      if (!resolvedCategory) {
        Alert.alert("Missing Category", "Please choose a category.");
        return;
      }
    }

    generateLockRef.current = true;

    // Persist a typed category as a new interest when it isn't already one.
    if (showCategoryInput && typedCategory) {
      const current = profile.interests ?? [];
      const alreadySaved = current.some(
        (i) => i.toLowerCase() === typedCategory.toLowerCase(),
      );
      if (!alreadySaved) {
        const next = [...current, typedCategory];
        updateProfile({ interests: next });
      }
    }

    const input: GenerateCourseInput = {
      prompt: description,
      title: description.trim().split("\n")[0].slice(0, 50),
      description: description.trim(),
      category: resolvedCategory,
      difficulty,
      creatorName: profile.displayName ?? undefined,
      creatorAvatar: profile.photoURL ?? undefined,
      learningGoals: profile.learningGoals,
      personalizationContext: personalised
        ? buildLearnerContext(profile)
        : undefined,
    };

    setDescription("");
    setCustomCategory("");
    setCategory("");
    setAddingCategory(false);
    setSearchText("");
    setActiveFilter("all");
    setVisibleCount(5);
    setShowCreateModal(false);
    generateCourse(input, getToken);
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, generatedSectionYRef.current - 8),
        animated: true,
      });
    }, 120);
  };

  const handleCoursePress = (courseId: string) => {
    navigate(() => router.push(`/(course)/${courseId}/chapters`));
  };

  const handleCardPress = (courseId: string) => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    if (now - lastPressRef.current < DOUBLE_TAP_MS) {
      if (navTimerRef.current) {
        clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
      lastPressRef.current = 0;
      const course = paginatedCourses.find((c) => c.id === courseId);
      if (course) {
        setMenuCourse({
          id: course.id,
          title: course.title,
          pinned: course.pinned,
          favorite: course.favorite,
        });
      }
      return;
    }
    if (longPressRef.current) {
      longPressRef.current = false;
      return;
    }
    lastPressRef.current = now;
    navTimerRef.current = setTimeout(() => handleCoursePress(courseId), 280);
  };

  const handleCardLongPress = (courseId: string) => {
    longPressRef.current = true;
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
    const course = paginatedCourses.find((c) => c.id === courseId);
    if (course) {
      setMenuCourse({
        id: course.id,
        title: course.title,
        pinned: course.pinned,
        favorite: course.favorite,
      });
    }
  };

  useEffect(() => {
    if (!generating) {
      generateLockRef.current = false;
    }
  }, [generating]);

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  const handleTogglePin = async () => {
    if (!menuCourse) return;
    const id = menuCourse.id;
    setMenuCourse({ ...menuCourse, pinned: !menuCourse.pinned });
    try {
      await togglePin(id, getToken);
    } catch (err: any) {
      console.error("[Quests] togglePin failed:", err);
    }
  };

  const handleToggleFavorite = async () => {
    if (!menuCourse) return;
    const id = menuCourse.id;
    setMenuCourse({ ...menuCourse, favorite: !menuCourse.favorite });
    try {
      await toggleFavorite(id, getToken);
    } catch (err: any) {
      console.error("[Quests] toggleFavorite failed:", err);
    }
  };

  const handleDeleteCourse = () => {
    if (!menuCourse) return;
    const course = menuCourse;
    setMenuCourse(null);
    Alert.alert(
      "Delete course?",
      `"${course.title}" will be removed from your quests and can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCourse(course.id, getToken);
            } catch (err: any) {
              Alert.alert("Delete failed", err?.message ?? "Couldn't delete the course. Try again.");
            }
          },
        },
      ],
    );
  };

  const onRefresh = useCallback(async () => {
    if (!profile) return;
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCourses(profile.uid, getToken),
        fetchEnrollments(profile.uid, getToken),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [profile, getToken, fetchCourses, fetchEnrollments]);

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        >
          <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            <Image source={images.brandYuinxTrans} style={styles.brandLogo} />
          </View>
          <View style={styles.userGroup}>
            <View style={styles.gemPill}>
              <Image source={images.goldCoinIcon} style={styles.coinIcon} />
              <Text style={styles.gemText}>{profile?.coins ?? 0} Gems</Text>
            </View>
            <View style={styles.avatarStack}>
              <Image source={images.userProfilePhoto} style={[styles.avatar, { borderColor: theme.accent }]} />
              <View style={[styles.notificationBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.notificationText}>12</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>My AI Quests</Text>

        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: theme.surface }, generating && styles.optionCardDisabled]}
          onPress={() => setShowCreateModal(true)}
          disabled={generating}
          activeOpacity={0.7}
        >
          <View style={styles.optionIconWrap}>
            <Ionicons name="sparkles" size={28} color={theme.accent} />
          </View>
          <View style={styles.optionTextWrap}>
            <Text style={styles.optionTitle}>Generate AI Course</Text>
            <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
              {generating ? "Generating your course…" : "Create a personalized learning quest"}
            </Text>
          </View>
          {generating ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: theme.surface }]}
          activeOpacity={0.7}
        >
          <View style={styles.optionIconWrap}>
            <Ionicons name="people" size={28} color={theme.primary} />
          </View>
          <View style={styles.optionTextWrap}>
            <View style={styles.optionTitleRow}>
              <Text style={styles.optionTitle}>Join a Class</Text>
              <View style={[styles.soonBadge, { backgroundColor: theme.accent + "1F", borderColor: theme.accent + "33" }]}>
                <Text style={[styles.soonBadgeText, { color: theme.accent }]}>Coming Soon</Text>
              </View>
            </View>
            <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>
              Group quests & live sessions — coming soon
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        <Modal
          visible={showCreateModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: theme.bg }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Your AI Quest</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Ionicons name="close-circle" size={28} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.inputBox, { backgroundColor: theme.surfaceAlt }]}>
                  <TextInput
                    placeholder={'Describe what you want to learn...\ne.g., "Master Python Basics"'}
                    placeholderTextColor={theme.textMuted}
                    multiline
                    value={description}
                    onChangeText={setDescription}
                    style={[styles.textInput, styles.textArea]}
                  />
                </View>

                <View style={styles.configRow}>
                  <View style={styles.configCol}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Category</Text>
                    {showCategoryInput ? (
                      <TextInput
                        placeholder={
                          interests.length > 0
                            ? "Enter a new category or interest..."
                            : "Enter a category or interest..."
                        }
                        placeholderTextColor={theme.textMuted}
                        value={customCategory}
                        onChangeText={setCustomCategory}
                        style={[styles.textInput, styles.categoryInput, { backgroundColor: theme.surfaceAlt }]}
                      />
                    ) : (
                      <DropdownSelect
                        options={interestOptions}
                        selected={activeCategory}
                        onSelect={(val) => {
                          if (val === ADD_NEW_INTEREST) {
                            setAddingCategory(true);
                            setCustomCategory("");
                          } else {
                            setCategory(val);
                            setAddingCategory(false);
                          }
                        }}
                      />
                    )}
                  </View>
                  <View style={styles.configCol}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Difficulty</Text>
                    <DropdownSelect
                      options={DIFFICULTY_OPTIONS}
                      selected={difficulty}
                      onSelect={setDifficulty}
                    />
                  </View>
                </View>

                <Pressable
                  style={[styles.modelRow, { backgroundColor: theme.surfaceAlt }]}
                  onPress={() => setShowModelPicker(true)}
                >
                  <View style={styles.modelRowTextWrap}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>AI Model</Text>
                    <Text style={styles.modelRowLabel} numberOfLines={1}>
                      {selectedModelLabel}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color="#FFFFFF" />
                </Pressable>

                <View style={styles.personalisedRow}>
                  <View style={styles.personalisedTextWrap}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Personalised</Text>
                    <Text style={[styles.personalisedSub, { color: theme.textMuted }]}>
                      Tailor the whole course to your department, year of study & profile
                    </Text>
                  </View>
                  <Switch value={personalised} onValueChange={setPersonalised} />
                </View>

                <Pressable onPress={handleGenerate} disabled={generating}>
                  <LinearGradient
                    colors={[theme.accent, theme.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.ctaButton, { shadowColor: theme.accent }, generating && styles.ctaButtonDisabled]}
                  >
                    {generating ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.ctaText}>GENERATE MY COURSE</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showModelPicker}
          animationType="slide"
          transparent
          onRequestClose={() => setShowModelPicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerContainer, { backgroundColor: theme.bg }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select AI Model</Text>
                <TouchableOpacity onPress={() => setShowModelPicker(false)}>
                  <Ionicons name="close-circle" size={28} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {modelGroups.map((group) => (
                  <View key={group.provider}>
                    <Text style={[styles.pickerGroupTitle, { color: theme.textSecondary }]}>
                      {AI_PROVIDER_LABELS[group.provider]}
                    </Text>
                    {group.models.map((m: AiModelOption) => {
                      const active = m.ref === selectedModel;
                      return (
                        <Pressable
                          key={m.ref}
                          style={[
                            styles.pickerItem,
                            { backgroundColor: theme.surfaceAlt },
                            active && { borderColor: theme.primary, borderWidth: 1 },
                          ]}
                          onPress={() => {
                            setSelectedModel(m.ref);
                            setShowModelPicker(false);
                          }}
                        >
                          <View style={styles.pickerItemTextWrap}>
                            <View style={styles.pickerItemTopRow}>
                              <Text style={styles.pickerLabel} numberOfLines={1}>
                                {m.label}
                              </Text>
                              <View
                                style={[
                                  styles.pickerTierChip,
                                  m.tier === "paid"
                                    ? { backgroundColor: "rgba(245,158,11,0.15)" }
                                    : { backgroundColor: "rgba(16,185,129,0.15)" },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.pickerTierText,
                                    { color: m.tier === "paid" ? "#F59E0B" : "#10B981" },
                                  ]}
                                >
                                  {m.tier === "paid" ? "PAID" : "FREE"}
                                </Text>
                              </View>
                            </View>
                            {m.note ? (
                              <Text style={[styles.pickerNote, { color: theme.textMuted }]}>
                                {m.note}
                              </Text>
                            ) : null}
                          </View>
                          {active && <Ionicons name="checkmark" size={20} color={theme.primary} />}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {!isEnrolledFilter && (
          <Text
            style={styles.coursesTitle}
            onLayout={(e) => {
              generatedSectionYRef.current = e.nativeEvent.layout.y;
            }}
          >
            My AI Generated Courses
          </Text>
        )}

        {(userCourses.length > 0 || enrolledCourses.length > 0) && (
          <View style={styles.coursesToolbar}>
            {!isEnrolledFilter && (
              <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="search" size={16} color={theme.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search your courses..."
                  placeholderTextColor={theme.textMuted}
                  value={searchText}
                  onChangeText={(t) => {
                    setSearchText(t);
                    setVisibleCount(5);
                  }}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchText(""); setVisibleCount(5); }} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={styles.filterWrap}>
              <DropdownSelect
                options={filterOptions}
                selected={activeFilter}
                onSelect={(v) => {
                  setActiveFilter(v);
                  setVisibleCount(5);
                }}
              />
            </View>
          </View>
        )}

        {!isEnrolledFilter && userCourses.length === 0 && enrolledCourses.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="rocket-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No courses yet. Describe what you want to learn and generate your first course!
            </Text>
          </View>
        )}

        {!isEnrolledFilter && userCourses.length > 0 && filteredCourses.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name={activeFilter === "favourites" ? "heart-outline" : "search-outline"}
              size={48}
              color={theme.textMuted}
            />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {activeFilter === "favourites"
                ? "No favourite courses yet — long-press a course and choose 'Add to favourites'."
                : "No courses match your search or selected interest."}
            </Text>
          </View>
        )}

        {courseError ? (
          <View style={[styles.errorBanner, { backgroundColor: theme.danger + "15", borderColor: theme.danger }]}>
            <Text style={[styles.errorText, { color: theme.danger }]}>{courseError}</Text>
          </View>
        ) : null}

        {!isEnrolledFilter && (
          <>{paginatedCourses.map((course) => {
          const isGenerating = course.id.startsWith("generating_");
          const enrollment = getEnrollmentForCourse(course.id);
          const progress = enrollment?.progress ?? course.progress ?? 0;
          const chapterCount = course.chapters?.length ?? course.totalChapters ?? 0;
          const courseAge = formatCourseAge(course.createdAt);

          if (isGenerating) {
            return (
              <View
                key={course.id}
                style={[styles.courseCard, styles.skeletonCard, { backgroundColor: theme.surface }]}
              >
                <View style={styles.courseCardContent}>
                  <View style={styles.courseInfo}>
                    <View style={styles.skeletonTitle} />
                    <View style={[styles.skeletonBar, { width: "60%", marginTop: 8 }]} />
                    <View style={[styles.skeletonBar, { width: "40%", marginTop: 6 }]} />
                    <View style={styles.skeletonMeta}>
                      <View style={[styles.skeletonTag, { width: 60 }]} />
                      <View style={[styles.skeletonTag, { width: 80 }]} />
                    </View>
                  </View>
                  <View style={styles.courseAction}>
                    <ActivityIndicator color={theme.accent} size="small" />
                    <Text style={[styles.continueText, { color: theme.textMuted, marginTop: 8 }]}>
                      Generating...
                    </Text>
                  </View>
                </View>
              </View>
            );
          }

          return (
            <GradientOutlineContainer
              key={course.id}
              gradientColors={
                course.difficulty === "Beginner"
                  ? ["rgba(76, 175, 80, 0.2)", "rgba(6, 182, 212, 0.2)"]
                  : course.difficulty === "Intermediate"
                    ? ["rgba(255, 152, 0, 0.2)", "rgba(139, 92, 246, 0.2)"]
                    : ["rgba(244, 67, 54, 0.2)", "rgba(236, 72, 153, 0.2)"]
              }
              style={styles.courseCard}
            >
              <Pressable onPress={() => handleCardPress(course.id)} onLongPress={() => handleCardLongPress(course.id)}>
                <View style={styles.courseCardContent}>
                  <View style={styles.courseInfo}>
                    <View style={styles.courseTitleRow}>
                      <Text style={styles.courseTitle}>{course.title}</Text>
                      {course.pinned && (
                        <View style={styles.menuIndicator}>
                          <Ionicons name="push" size={13} color="#F59E0B" />
                        </View>
                      )}
                      {course.favorite && (
                        <View style={styles.favouriteBadge}>
                          <Ionicons name="heart" size={13} color="#FB7185" />
                        </View>
                      )}
                      <View style={styles.activeBadge}>
                        <Text style={[styles.activeBadgeText, { color: theme.success }]}>
                          {enrollment?.isCompleted ? "Done" : "Active"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                      Progress: {Math.round(progress * 100)}%
                    </Text>
                    <ProgressBar
                      progress={progress}
                      trackColor="#222530"
                      filledColors={[theme.accent, theme.primary]}
                      style={styles.progressBar}
                    />
                    <View style={styles.courseMeta}>
                      {courseAge ? (
                        <>
                          <Ionicons name="time-outline" size={14} color={theme.textMuted} />
                          <Text style={[styles.metaText, { color: theme.textMuted }]}>{courseAge}</Text>
                        </>
                      ) : null}
                      <MaterialCommunityIcons
                        name={
                          course.difficulty === "Beginner"
                            ? "sprout"
                            : course.difficulty === "Intermediate"
                              ? "shield-star"
                              : "sword-cross"
                        }
                        size={14}
                        color={
                          course.difficulty === "Beginner"
                            ? theme.success
                            : course.difficulty === "Intermediate"
                              ? "#F59E0B"
                              : "#F44336"
                        }
                        style={courseAge ? { marginLeft: 12 } : undefined}
                      />
                      <Text style={[styles.metaText, { color: theme.textSecondary }]}>{course.difficulty}</Text>
                      <Text style={[styles.metaText, { marginLeft: 16, color: theme.textSecondary }]}>
                        {chapterCount} chapters
                      </Text>
                      {course.creatorName && course.creatorId !== "system" && (
                        <Text style={[styles.metaText, { marginLeft: 16, color: theme.textSecondary }]}>
                          by {course.creatorName}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.courseAction}>
                    <View style={[styles.courseIconCircle, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                      <Ionicons
                        name={getCourseIcon(course.category)}
                        size={28}
                        color={theme.accent}
                      />
                    </View>
                    <Text style={[styles.continueText, { color: theme.info }]}>
                      {enrollment?.isCompleted ? "REVIEW" : progress > 0 ? "RESUME" : "START"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </GradientOutlineContainer>
          );
        })}
          {hasMore && (
            <View style={styles.loadMoreRow}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={[styles.loadMoreText, { color: theme.textSecondary }]}>
                Loading more courses...
              </Text>
            </View>
          )}
          </>
        )}

          {showEnrolledSection && (enrolledCourses.length > 0 || isEnrolledFilter) && (
            <>
              <Text style={styles.coursesTitle}>Enrolled</Text>
              {isEnrolledFilter && enrolledCourses.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="book-outline" size={48} color={theme.textMuted} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No enrolled courses yet — courses you join from other creators will appear here.
                  </Text>
                </View>
              )}
              {enrolledCourses.map((course) => {
                const enrollment = getEnrollmentForCourse(course.id);
                const progress = enrollment?.progress ?? 0;
                const chapterCount = course.chapters?.length ?? 0;
                return (
                  <GradientOutlineContainer
                    key={course.id}
                    gradientColors={
                      course.difficulty === "Beginner"
                        ? ["rgba(76, 175, 80, 0.2)", "rgba(6, 182, 212, 0.2)"]
                        : course.difficulty === "Intermediate"
                          ? ["rgba(255, 152, 0, 0.2)", "rgba(139, 92, 246, 0.2)"]
                          : ["rgba(244, 67, 54, 0.2)", "rgba(236, 72, 153, 0.2)"]
                    }
                    style={styles.courseCard}
                  >
                    <Pressable onPress={() => handleCoursePress(course.id)}>
                      <View style={styles.courseCardContent}>
                        <View style={styles.courseInfo}>
                          <View style={styles.courseTitleRow}>
                            <Text style={styles.courseTitle} numberOfLines={1}>
                              {course.title}
                            </Text>
                            {course.creatorName && (
                              <Text
                                style={[
                                  styles.metaText,
                                  { color: theme.textMuted, fontWeight: "600" },
                                ]}
                                numberOfLines={1}
                              >
                                by {course.creatorName}
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                            Progress: {Math.round(progress * 100)}%
                          </Text>
                          <ProgressBar
                            progress={progress}
                            trackColor="#222530"
                            filledColors={[theme.accent, theme.primary]}
                            style={styles.progressBar}
                          />
                          <View style={styles.courseMeta}>
                            <MaterialCommunityIcons
                              name={
                                course.difficulty === "Beginner"
                                  ? "sprout"
                                  : course.difficulty === "Intermediate"
                                    ? "shield-star"
                                    : "sword-cross"
                              }
                              size={14}
                              color={
                                course.difficulty === "Beginner"
                                  ? theme.success
                                  : course.difficulty === "Intermediate"
                                    ? "#F59E0B"
                                    : "#F44336"
                              }
                            />
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                              {course.difficulty}
                            </Text>
                            <Text
                              style={[styles.metaText, { marginLeft: 16, color: theme.textSecondary }]}
                            >
                              {chapterCount} chapters
                            </Text>
                          </View>
                        </View>
                        <View style={styles.courseAction}>
                          <View
                            style={[styles.courseIconCircle, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                          >
                            <Ionicons
                              name={getCourseIcon(course.category)}
                              size={28}
                              color={theme.accent}
                            />
                          </View>
                          <Text style={[styles.continueText, { color: theme.info }]}>
                            {enrollment?.isCompleted
                              ? "REVIEW"
                              : progress > 0
                                ? "RESUME"
                                : "START"}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  </GradientOutlineContainer>
                );
              })}
            </>
          )}

          <View style={{ height: 80 }} />

        </ScrollView>
      <Modal
          visible={!!menuCourse}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuCourse(null)}
        >
          <View style={styles.sheetOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuCourse(null)} />
            <View style={[styles.sheetCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={1}>
                {menuCourse?.title}
              </Text>

              <Pressable style={styles.sheetRow} onPress={handleTogglePin}>
                <Ionicons
                  name={menuCourse?.pinned ? "push" : "push-outline"}
                  size={18}
                  color={menuCourse?.pinned ? "#F59E0B" : theme.textSecondary}
                />
                <Text style={[styles.sheetRowLabel, { color: theme.text }]}>
                  {menuCourse?.pinned ? "Unpin" : "Pin to top"}
                </Text>
              </Pressable>

              <Pressable style={styles.sheetRow} onPress={handleToggleFavorite}>
                <Ionicons
                  name={menuCourse?.favorite ? "heart" : "heart-outline"}
                  size={18}
                  color={menuCourse?.favorite ? "#FB7185" : theme.textSecondary}
                />
                <Text style={[styles.sheetRowLabel, { color: theme.text }]}>
                  {menuCourse?.favorite ? "Remove from favourites" : "Add to favourites"}
                </Text>
              </Pressable>

              <View style={[styles.sheetDivider, { backgroundColor: theme.border }]} />

              <Pressable style={styles.sheetRow} onPress={handleDeleteCourse}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={[styles.sheetRowLabel, { color: "#EF4444" }]}>Delete course</Text>
              </Pressable>

              <Pressable
                style={[styles.sheetCancelBtn, { backgroundColor: theme.surfaceAlt }]}
                onPress={() => setMenuCourse(null)}
              >
                <Text style={[styles.sheetCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

function getCourseIcon(category: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    programming: "code-slash",
    marketing: "trending-up",
    "data-science": "bar-chart",
    design: "color-palette",
    business: "briefcase",
    "personal-dev": "star",
  };
  return icons[category] || "book";
}

function formatCourseAge(createdAt?: string | null): string {
  if (!createdAt) return "";
  const ms = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day > 1 ? "s" : ""} ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} week${wk > 1 ? "s" : ""} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} month${mo > 1 ? "s" : ""} ago`;
  const yr = Math.floor(day / 365);
  return `${yr} year${yr > 1 ? "s" : ""} ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 12,
  },
  brandBlock: { flexDirection: "row", alignItems: "center" },
  brandLogo: { width: 100, height: 28, resizeMode: "contain" },
  userGroup: { flexDirection: "row", alignItems: "center" },
  gemPill: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginRight: 12,
  },
  coinIcon: { width: 18, height: 18 },
  gemText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700", marginLeft: 4 },
  avatarStack: { position: "relative" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  notificationBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  notificationText: { color: "#FFFFFF", fontSize: 8, fontWeight: "700" },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginHorizontal: 20,
    marginTop: 24,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  optionCardDisabled: { opacity: 0.6 },
  optionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  optionTextWrap: { flex: 1 },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  soonBadge: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  soonBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  optionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  optionSubtitle: { fontSize: 12, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  inputBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.3)",
    padding: 12,
    marginTop: 12,
    height: 140,
  },
  textInput: { color: "#FFFFFF", fontSize: 14 },
  textArea: { flex: 1, padding: 0, textAlignVertical: "top" },
  categoryInput: { height: 36, padding: 8, borderRadius: 8, fontSize: 13 },
  configRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 10,
  },
  configCol: { flex: 1 },
  fieldLabel: { fontSize: 12, marginBottom: 6 },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 14,
  },
  modelRowTextWrap: { flex: 1, marginRight: 8 },
  modelRowLabel: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  personalisedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  personalisedTextWrap: { flex: 1, marginRight: 12 },
  personalisedSub: { fontSize: 11, marginTop: 2 },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  pickerContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  pickerGroupTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  pickerItemTextWrap: { flex: 1 },
  pickerItemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", flex: 1 },
  pickerTierChip: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
  pickerTierText: { fontSize: 9, fontWeight: "700" },
  pickerNote: { fontSize: 11, marginTop: 3 },
  ctaButton: {
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  ctaButtonDisabled: { opacity: 0.6 },
  ctaText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  coursesTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 28,
  },
  coursesToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    marginLeft: 8,
    padding: 0,
    height: "100%",
  },
  filterWrap: {
    width: 150,
  },
  loadMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 40, gap: 12 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  courseCard: { marginHorizontal: 20, marginTop: 14 },
  courseCardContent: { flexDirection: "row", justifyContent: "space-between" },
  courseInfo: { flex: 1, justifyContent: "space-between" },
  courseTitleRow: { flexDirection: "row", alignItems: "center" },
  courseTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", flex: 1 },
  menuIndicator: {
    marginLeft: 6,
  },
  favouriteBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251, 113, 133, 0.14)",
    shadowColor: "#FB7185",
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  activeBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  activeBadgeText: { fontSize: 10, fontWeight: "700" },
  progressLabel: { fontSize: 12, marginTop: 4 },
  progressBar: { marginTop: 6 },
  courseMeta: { flexDirection: "row", alignItems: "center", marginTop: 12, flexWrap: "wrap" },
  metaText: { fontSize: 11, marginLeft: 4 },
  courseAction: { alignItems: "center", justifyContent: "space-between", marginLeft: 12 },
  courseIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  continueText: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
  },
  skeletonCard: {
    borderRadius: 16,
    padding: 16,
    opacity: 0.6,
  },
  skeletonTitle: {
    height: 18,
    width: "70%",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
  },
  skeletonBar: {
    height: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 4,
  },
  skeletonMeta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  skeletonTag: {
    height: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 4,
  },
  errorBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 14,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  sheetRowLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  sheetCancelBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
