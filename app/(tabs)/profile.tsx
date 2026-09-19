import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator, Animated, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../contexts/AuthContext";
import { useAuth as useClerkAuth } from "@clerk/expo";
import { api } from "../../lib/api";
import { getAvatarUrl } from "../../lib/dicebear";
import * as ImagePicker from "expo-image-picker";
import { AntDesign, MaterialIcons, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeColors } from "../../hooks/useTheme";
import { fontFamily } from "../../constants/themes";
import type { UserProfile, Availability, Education, WorkExperience, Certification } from "../../types/user";
import ErrorBoundary from "../../component/ErrorBoundary";
import ScreenContainer from "../../component/ScreenContainer";
import ProfileInfoSection from "../../component/ProfileInfoSection";
import { useUserStore } from "../../store/userStore";
import { useCheckInStore } from "../../store/checkInStore";
import { useUserTrophyStore } from "../../store/userTrophyStore";
import { getLevelProgress } from "../../services/LevelService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const AVAILABILITY_CONFIG: Record<Availability, { label: string; color: string; icon: string }> = {
  open_to_work: { label: "Open to Work", color: "#22C55E", icon: "briefcase" },
  open_to_learn: { label: "Open to Learn", color: "#3B82F6", icon: "school" },
  open_to_mentor: { label: "Open to Mentor", color: "#8B5CF6", icon: "account-tie" },
  not_looking: { label: "Not Looking", color: "#6B7280", icon: "eye-off" },
};

const PROFILE_FIELDS: ((p: UserProfile) => boolean)[] = [
  (p) => !!p.displayName,
  (p) => !!p.headline,
  (p) => !!p.bio,
  (p) => !!p.location,
  (p) => !!p.industry,
  (p) => !!p.department,
  (p) => !!p.jobTitle,
  (p) => !!p.company,
  (p) => !!p.birthday,
  (p) => !!p.educationLevel,
  (p) => !!p.collarType,
  (p) => !!p.availability,
  (p) => !!p.website,
  (p) => !!p.linkedInUrl,
  (p) => !!p.photoURL,
  (p) => !!(p.skills && p.skills.length > 0),
  (p) => !!(p.tradeSkills && p.tradeSkills.length > 0),
  (p) => !!(p.workExperience && p.workExperience.length > 0),
  (p) => !!(p.education && p.education.length > 0),
  (p) => !!(p.certifications && p.certifications.length > 0),
  (p) => !!(p.languages && p.languages.length > 0),
  (p) => !!(p.interests && p.interests.length > 0),
];

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Present";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function SkillDots({ level, color }: { level: number; color: string }) {
  return (
    <View style={pfStyles.dotRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            pfStyles.dot,
            {
              backgroundColor: i <= level ? color : color + "25",
              width: i <= level ? 8 : 6,
              height: i <= level ? 8 : 6,
              borderRadius: i <= level ? 4 : 3,
            },
          ]}
        />
      ))}
    </View>
  );
}

function AvailabilityBadge({ availability, theme }: { availability?: Availability; theme: ReturnType<typeof useThemeColors> }) {
  if (!availability) return null;
  const config = AVAILABILITY_CONFIG[availability];
  return (
    <View style={[pfStyles.availBadge, { backgroundColor: config.color + "18", borderColor: config.color + "40" }]}>
      <MaterialCommunityIcons name={config.icon as any} size={12} color={config.color} />
      <Text style={[pfStyles.availLabel, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function SectionCard({
  title, children, onEdit, theme,
}: {
  title: string; children: React.ReactNode; onEdit?: () => void; theme: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[pfStyles.sectionCard, { backgroundColor: theme.glass, borderColor: theme.borderLight }]}>
      <View style={pfStyles.sectionHeader}>
        <Text style={[pfStyles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {onEdit && (
          <Pressable onPress={onEdit} style={[pfStyles.editBtn, { backgroundColor: theme.surfaceAlt }]} hitSlop={8}>
            <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function TagRow({ items, color }: { items: string[]; color: string }) {
  return (
    <View style={pfStyles.tagRow}>
      {items.map((item) => (
        <View key={item} style={[pfStyles.tag, { backgroundColor: color + "15", borderColor: color + "30" }]}>
          <Text style={[pfStyles.tagText, { color }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function TimelineCard({
  title, subtitle, period, description, color, icon,
}: {
  title: string; subtitle: string; period: string; description?: string; color: string; icon: string;
}) {
  return (
    <View style={pfStyles.timelineRow}>
      <View style={pfStyles.timelineLeft}>
        <View style={[pfStyles.timelineDot, { backgroundColor: color }]} />
        <View style={[pfStyles.timelineLine, { backgroundColor: color + "20" }]} />
      </View>
      <View style={[pfStyles.timelineCard, { borderLeftColor: color, borderLeftWidth: 2 }]}>
        <View style={pfStyles.timelineHeader}>
          <MaterialCommunityIcons name={icon as any} size={16} color={color} />
          <Text style={[pfStyles.timelineTitle, { color: color }]}>{title}</Text>
        </View>
        <Text style={[pfStyles.timelineSubtitle, { color: color + "CC" }]}>{subtitle}</Text>
        <Text style={[pfStyles.timelinePeriod, { color: color + "88" }]}>{period}</Text>
        {description ? <Text style={pfStyles.timelineDesc} numberOfLines={2}>{description}</Text> : null}
      </View>
    </View>
  );
}

function InfoRow({
  icon, label, value, theme,
}: {
  icon: string; label: string; value?: string | number | null; theme: ReturnType<typeof useThemeColors>;
}) {
  const filled = value !== null && value !== undefined && value !== "";
  return (
    <View style={pfStyles.infoRow}>
      <View style={pfStyles.infoLabelRow}>
        <MaterialCommunityIcons name={icon as any} size={18} color={theme.textMuted} />
        <Text style={[pfStyles.infoLabel, { color: theme.textMuted }]}>{label}</Text>
      </View>
      <Text
        style={[pfStyles.infoValue, { color: filled ? theme.text : theme.textMuted }]}
        numberOfLines={1}
      >
        {filled ? value : "—"}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const profile = useUserStore((s) => s.profile);
  const { getToken } = useClerkAuth();
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const router = useRouter();
  const theme = useThemeColors();

  const [startEditing, setStartEditing] = useState(false);
  const editingProfileRef = useRef(profile);
  useEffect(() => { editingProfileRef.current = profile; }, [profile]);

  const xpAnim = useRef(new Animated.Value(0)).current;
  const levelProgress = useMemo(() => profile ? getLevelProgress(profile.xp, profile.gamingLevel) : null, [profile]);
  const xpProgress = levelProgress?.xpProgress ?? 0;
  const xpForNext = levelProgress?.xpForNext ?? 100;

  const avatarUri = profile?.photoURL || getAvatarUrl(user?.email || "default");

  useEffect(() => { setAvatarError(false); }, [avatarUri]);

  useEffect(() => {
    if (profile && levelProgress) {
      const target = levelProgress.xpForNext > 0 ? levelProgress.xpProgress / levelProgress.xpForNext : 1;
      Animated.timing(xpAnim, {
        toValue: target,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    }
  }, [profile, levelProgress]);

  const handlePickImage = async () => {
    if (!user) {
      Alert.alert("Error", "You must be signed in to upload a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0].uri) {
      setUploading(true);
      try {
        const { uploadImage } = await import("../../lib/cloudinary");
        const downloadURL = await uploadImage(result.assets[0].uri);
        const token = await getToken();
        await api.users.update(user.uid, { photoURL: downloadURL }, token!);
        const currentProfile = useUserStore.getState().profile;
        if (currentProfile) {
          useUserStore.getState().setProfile({ ...currentProfile, photoURL: downloadURL });
        }
        Alert.alert("Success", "Profile picture updated!");
      } catch (error: any) {
        console.error("Upload Error:", error);
        Alert.alert("Error", "Failed to upload image.");
      } finally { setUploading(false); }
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/login");
          } catch (error: any) {
            console.error("Sign out error:", error);
            Alert.alert("Sign Out Failed", error?.message || "Could not sign out. Please try again.");
          }
        },
      },
    ]);
  };

  const xpPercent = xpAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const [activeTab, setActiveTab] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const tabs = ["Info", "Skills & Exp", "Progress"];

  const switchTab = useCallback((index: number) => {
    setActiveTab(index);
    Animated.spring(slideAnim, {
      toValue: index,
      damping: 16,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const allSkills = profile?.skills?.map((s) => ({ name: s, level: Math.ceil(Math.random() * 3 + 2) })) ?? [];

  const checkInStreak = useCheckInStore((s) => s.currentStreak);
  const trophies = useUserTrophyStore((s) => s.trophies);

  const filledCount = useMemo(() => {
    if (!profile) return 0;
    return PROFILE_FIELDS.filter((fn) => fn(profile)).length;
  }, [profile]);
  const completionPct = Math.min(20 + Math.round((filledCount / PROFILE_FIELDS.length) * 80), 100);

  return (
    <ErrorBoundary>
        <ScreenContainer edges={["top"]}>
        <ScrollView contentContainerStyle={pfStyles.scroll} showsVerticalScrollIndicator={false}>
          {startEditing ? (
            <View style={{ paddingHorizontal: 20 }}>
              {profile ? (
                <ProfileInfoSection
                  profile={profile}
                  startEditing={startEditing}
                  onDoneEditing={() => setStartEditing(false)}
                />
              ) : null}
            </View>
          ) : (
          <>
          {/* Cover */}
          <View style={pfStyles.coverWrap}>
            <LinearGradient
              colors={[theme.gradientStart + "60", theme.gradientMid + "30", theme.bg]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={pfStyles.coverGradient}
            />
            <Pressable
              style={[pfStyles.settingsBtn, { backgroundColor: theme.glass }]}
              onPress={() => router.push("/(settings)")}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="cog-outline" size={22} color={theme.text} />
            </Pressable>
          </View>

          {/* Avatar + Identity */}
          <View style={pfStyles.identitySection}>
            <View style={pfStyles.avatarOuter}>
              <View style={[pfStyles.avatarRing, { borderColor: theme.primary + "40" }]} />
              <Pressable onPress={handlePickImage} style={pfStyles.avatarPress}>
                {avatarError ? (
                  <View style={[pfStyles.avatar, pfStyles.avatarPlaceholder, { backgroundColor: theme.border }]}>
                    <AntDesign name="user" size={40} color={theme.textMuted} />
                  </View>
                ) : (
                  <Image
                    source={{ uri: avatarUri }}
                    style={[pfStyles.avatar, { backgroundColor: theme.surface }]}
                    contentFit="cover"
                    onError={() => { console.warn("[Profile] Avatar load failed"); setAvatarError(true); }}
                  />
                )}
                <View style={[pfStyles.cameraBadge, { backgroundColor: theme.primary }]}>
                  {uploading ? <ActivityIndicator color="#fff" size="small" /> : <MaterialIcons name="camera-alt" size={14} color="#fff" />}
                </View>
                {profile?.availability ? (
                  <View style={[pfStyles.availDot, { backgroundColor: AVAILABILITY_CONFIG[profile.availability].color }]} />
                ) : null}
              </Pressable>
            </View>

            <Text style={[pfStyles.displayName, { color: theme.text }]}>
              {profile?.displayName || "Scholar"}
            </Text>

            {profile?.headline ? (
              <Text style={[pfStyles.headline, { color: theme.textSecondary }]}>{profile.headline}</Text>
            ) : null}

            {profile?.bio ? (
              <Text style={[pfStyles.bioBelowName, { color: theme.textSecondary }]} numberOfLines={3}>
                {profile.bio}
              </Text>
            ) : null}

            <View style={pfStyles.metaRow}>
              {profile?.location ? (
                <View style={pfStyles.metaItem}>
                  <Ionicons name="location-outline" size={13} color={theme.textMuted} />
                  <Text style={[pfStyles.metaText, { color: theme.textMuted }]}>{profile.location}</Text>
                </View>
              ) : null}
            </View>

            <AvailabilityBadge availability={profile?.availability} theme={theme} />

            <Pressable
              style={[pfStyles.editProfileBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
              onPress={() => setStartEditing(true)}
            >
              <MaterialCommunityIcons name="account-edit-outline" size={16} color="#FFF" />
              <Text style={pfStyles.editProfileText}>Edit Profile</Text>
            </Pressable>
          </View>

          {/* Stats Bar */}
          <View style={[pfStyles.statsCard, { backgroundColor: theme.glass, borderColor: theme.borderLight }]}>
            <View style={pfStyles.statsRow}>
              <View style={pfStyles.statItem}>
                <Text style={[pfStyles.statValue, { color: theme.primary }]}>{profile?.xp ?? 0}</Text>
                <Text style={[pfStyles.statLabel, { color: theme.textMuted }]}>XP</Text>
              </View>
              <View style={[pfStyles.statDivider, { backgroundColor: theme.borderLight }]} />
              <View style={pfStyles.statItem}>
                <Text style={[pfStyles.statValue, { color: theme.accent }]}>{profile?.gamingLevel ?? 1}</Text>
                <Text style={[pfStyles.statLabel, { color: theme.textMuted }]}>Level</Text>
              </View>
              <View style={[pfStyles.statDivider, { backgroundColor: theme.borderLight }]} />
              <View style={pfStyles.statItem}>
                <Text style={[pfStyles.statValue, { color: theme.warning }]}>{profile?.coins ?? 0}</Text>
                <Text style={[pfStyles.statLabel, { color: theme.textMuted }]}>Coins</Text>
              </View>
              <View style={[pfStyles.statDivider, { backgroundColor: theme.borderLight }]} />
              <View style={pfStyles.statItem}>
                <Text style={[pfStyles.statValue, { color: theme.success }]}>{profile?.rank || "Spark"}</Text>
                <Text style={[pfStyles.statLabel, { color: theme.textMuted }]}>Rank</Text>
              </View>
            </View>
            <View style={pfStyles.xpBarOuter}>
              <Animated.View
                style={[
                  pfStyles.xpBarInner,
                  {
                    width: xpPercent,
                    backgroundColor: theme.primary,
                    shadowColor: theme.primary,
                  },
                ]}
              />
            </View>
            <Text style={[pfStyles.xpLabel, { color: theme.textMuted }]}>
              {xpForNext > 0
                ? `${xpProgress.toLocaleString()} / ${xpForNext.toLocaleString()} XP to next level`
                : "Max level reached"}
            </Text>
          </View>

          {/* Profile Completion */}
          <View style={[pfStyles.completionCard, { backgroundColor: theme.glass, borderColor: theme.borderLight }]}>
            <View style={pfStyles.completionRow}>
              <View style={[pfStyles.completionRing, { borderColor: theme.primary }]}>
                <Text style={[pfStyles.completionPctLabel, { color: theme.primary }]}>{completionPct}%</Text>
              </View>
              <View style={pfStyles.completionInfo}>
                <Text style={[pfStyles.completionTitle, { color: theme.text }]}>Profile {completionPct}% complete</Text>
                <Text style={[pfStyles.completionSub, { color: theme.textMuted }]}>
                  {filledCount} of {PROFILE_FIELDS.length} fields filled
                </Text>
              </View>
            </View>
            <View style={[pfStyles.completionBarOuter, { backgroundColor: theme.border }]}>
              <View style={[pfStyles.completionBarInner, { width: `${completionPct}%`, backgroundColor: theme.primary }]} />
            </View>
          </View>

          {/* Tab Bar */}
          <View style={pfStyles.tabRow}>
            {tabs.map((tab, i) => {
              const active = activeTab === i;
              return (
                <Pressable
                  key={tab}
                  onPress={() => switchTab(i)}
                  style={[
                    pfStyles.tabPill,
                    { borderColor: theme.border },
                    active && { backgroundColor: theme.tabActive, borderColor: theme.tabActive },
                  ]}
                >
                  <Text
                    style={[pfStyles.tabPillText, { color: active ? "#FFFFFF" : theme.tabInactive }]}
                  >
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Animated Panel */}
          <View style={pfStyles.panelOuter}>
            <Animated.View
              style={[
                pfStyles.panelInner,
                {
                  width: SCREEN_WIDTH * 3,
                  transform: [{
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [0, -SCREEN_WIDTH, -SCREEN_WIDTH * 2],
                    }),
                  }],
                },
              ]}
            >
              {/* Panel 0: Info */}
              <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 20 }}>
                {profile ? (
                  <ProfileInfoSection
                    profile={profile}
                    startEditing={startEditing}
                    onDoneEditing={() => setStartEditing(false)}
                  />
                ) : null}
              </View>

              {/* Panel 1: Skills & Exp */}
              <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 20 }}>
                {/* Skills */}
                {profile?.skills && profile.skills.length > 0 ? (
                  <SectionCard title="Skills" theme={theme}>
                    <View style={pfStyles.skillsGrid}>
                      {profile.skills.map((skill) => (
                        <View key={skill} style={[pfStyles.skillCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}>
                          <Text style={[pfStyles.skillName, { color: theme.text }]}>{skill}</Text>
                          <SkillDots level={Math.ceil(Math.random() * 3 + 2)} color={theme.primary} />
                        </View>
                      ))}
                    </View>
                  </SectionCard>
                ) : null}

                {profile?.tradeSkills && profile.tradeSkills.length > 0 ? (
                  <SectionCard title="Trade Skills" theme={theme}>
                    <View style={pfStyles.skillsGrid}>
                      {profile.tradeSkills.map((skill) => (
                        <View key={skill} style={[pfStyles.skillCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}>
                          <Text style={[pfStyles.skillName, { color: theme.text }]}>{skill}</Text>
                          <SkillDots level={Math.ceil(Math.random() * 3 + 2)} color={theme.accent} />
                        </View>
                      ))}
                    </View>
                  </SectionCard>
                ) : null}

                {profile?.workExperience && profile.workExperience.length > 0 ? (
                  <SectionCard title="Experience" theme={theme}>
                    {profile.workExperience.map((exp: WorkExperience) => (
                      <TimelineCard
                        key={exp.id}
                        title={exp.company}
                        subtitle={exp.title}
                        period={`${formatDate(exp.startDate)} — ${exp.isCurrent ? "Present" : formatDate(exp.endDate)}`}
                        description={exp.description}
                        color={theme.primary}
                        icon="briefcase"
                      />
                    ))}
                  </SectionCard>
                ) : null}

                {profile?.education && profile.education.length > 0 ? (
                  <SectionCard title="Education" theme={theme}>
                    {profile.education.map((edu: Education) => (
                      <TimelineCard
                        key={edu.id}
                        title={edu.institution}
                        subtitle={`${edu.degree}${edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ""}`}
                        period={`${formatDate(edu.startDate)} — ${edu.isCurrent ? "Present" : formatDate(edu.endDate)}`}
                        description={edu.description}
                        color={theme.accent}
                        icon="school"
                      />
                    ))}
                  </SectionCard>
                ) : null}

                {profile?.certifications && profile.certifications.length > 0 ? (
                  <SectionCard title="Certifications" theme={theme}>
                    <View style={pfStyles.certGrid}>
                      {profile.certifications.map((cert: Certification) => (
                        <View key={cert.id} style={[pfStyles.certCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}>
                          <MaterialCommunityIcons name="certificate" size={20} color={theme.warning} />
                          <View style={pfStyles.certInfo}>
                            <Text style={[pfStyles.certName, { color: theme.text }]}>{cert.name}</Text>
                            <Text style={[pfStyles.certIssuer, { color: theme.textMuted }]}>{cert.issuer}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </SectionCard>
                ) : null}
              </View>

              {/* Panel 2: Progress */}
              <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 20 }}>
                {/* Courses */}
                {profile?.courses && profile.courses.length > 0 ? (
                  <View style={[pfStyles.sectionCard, { backgroundColor: theme.glass, borderColor: theme.borderLight }]}>
                    <View style={pfStyles.sectionHeader}>
                      <Text style={[pfStyles.sectionTitle, { color: theme.text }]}>Courses</Text>
                    </View>
                    {profile.courses.map((course) => (
                      <View key={course.id} style={[pfStyles.progressCourseCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}>
                        <View style={pfStyles.progressCourseRow}>
                          <MaterialCommunityIcons name={course.icon as any || "book"} size={18} color={theme.primary} />
                          <Text style={[pfStyles.progressCourseTitle, { color: theme.text }]} numberOfLines={1}>{course.title}</Text>
                          <Text style={[pfStyles.progressCoursePct, { color: theme.primary }]}>
                            {Math.round(course.progress ?? 0)}%
                          </Text>
                        </View>
                        <View style={[pfStyles.progressBarBg, { backgroundColor: theme.border }]}>
                          <View style={[pfStyles.progressBarFill, { width: `${Math.round(course.progress ?? 0)}%`, backgroundColor: theme.primary }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={[pfStyles.sectionCard, { backgroundColor: theme.glass, borderColor: theme.borderLight }]}>
                    <Text style={[pfStyles.emptyText, { color: theme.textMuted }]}>No courses yet</Text>
                  </View>
                )}

                {/* Trophies & Streak */}
                <View style={pfStyles.progressMetaRow}>
                  <View style={[pfStyles.progressMetaCard, { backgroundColor: theme.glass, borderColor: theme.borderLight }]}>
                    <MaterialCommunityIcons name="trophy" size={22} color={theme.warning} />
                    <Text style={[pfStyles.progressMetaValue, { color: theme.text }]}>{trophies.length}</Text>
                    <Text style={[pfStyles.progressMetaLabel, { color: theme.textMuted }]}>Trophies</Text>
                  </View>
                  <View style={[pfStyles.progressMetaCard, { backgroundColor: theme.glass, borderColor: theme.borderLight }]}>
                    <MaterialCommunityIcons name="fire" size={22} color={theme.primary} />
                    <Text style={[pfStyles.progressMetaValue, { color: theme.text }]}>{checkInStreak}</Text>
                    <Text style={[pfStyles.progressMetaLabel, { color: theme.textMuted }]}>Day Streak</Text>
                  </View>
                  <View style={[pfStyles.progressMetaCard, { backgroundColor: theme.glass, borderColor: theme.borderLight }]}>
                    <MaterialCommunityIcons name="star" size={22} color={theme.accent} />
                    <Text style={[pfStyles.progressMetaValue, { color: theme.text }]}>{profile?.gamingLevel ?? 1}</Text>
                    <Text style={[pfStyles.progressMetaLabel, { color: theme.textMuted }]}>Level</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          </View>

          {/* Sign Out */}
          <View style={pfStyles.signOutWrap}>
            <Pressable style={pfStyles.signOutRow} onPress={handleSignOut}>
              <View style={[pfStyles.signOutIcon, { backgroundColor: theme.danger + "15" }]}>
                <MaterialIcons name="logout" size={20} color={theme.danger} />
              </View>
              <Text style={[pfStyles.signOutText, { color: theme.text }]}>Sign Out</Text>
              <AntDesign name="right" size={16} color={theme.textMuted} />
            </Pressable>
          </View>

          <Text style={[pfStyles.versionText, { color: theme.textMuted }]}>Version 1.0.0</Text>
          <View style={{ height: 40 }} />
          </>
          )}
        </ScrollView>
      </ScreenContainer>
    </ErrorBoundary>
  );
}

const pfStyles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  coverWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  coverGradient: {
    flex: 1,
  },
  identitySection: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  settingsBtn: {
    position: "absolute",
    top: 12,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarOuter: {
    position: "relative",
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRing: {
    position: "absolute",
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 2,
  },
  avatarPress: {
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "transparent",
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0A0A14",
  },
  availDot: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#0A0A14",
  },
  bioBelowName: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
    fontFamily,
  },
  displayName: { fontSize: 24, fontWeight: "800", marginBottom: 4, fontFamily },
  headline: { fontSize: 15, fontWeight: "500", marginBottom: 8, fontFamily },
  metaRow: { flexDirection: "row", gap: 16, marginBottom: 10, flexWrap: "wrap", justifyContent: "center" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontWeight: "500", fontFamily },
  availBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  availLabel: { fontSize: 11, fontWeight: "700", fontFamily },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  editProfileText: { color: "#FFF", fontSize: 13, fontWeight: "700", fontFamily },

  statsCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  statsRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 14, fontWeight: "900", fontFamily },
  statLabel: { fontSize: 10, fontWeight: "600", marginTop: 2, fontFamily },
  statDivider: { width: 1, height: 32 },
  xpBarOuter: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginBottom: 6,
  },
  xpBarInner: {
    height: "100%",
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  xpLabel: { fontSize: 10, fontWeight: "500", textAlign: "center", fontFamily },

  sectionCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", fontFamily },
  infoHint: { fontSize: 13, fontWeight: "500", textAlign: "center", fontFamily },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  bioText: { fontSize: 13, lineHeight: 20, marginBottom: 10, fontFamily },
  linkRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  linkItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  linkText: { fontSize: 12, fontWeight: "600", fontFamily },

  skillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillCard: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  skillName: { fontSize: 12, fontWeight: "600", fontFamily },
  dotRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  dot: {},

  timelineRow: { flexDirection: "row", marginBottom: 4 },
  timelineLeft: { width: 20, alignItems: "center" },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, marginTop: 4, minHeight: 20 },
  timelineCard: {
    flex: 1,
    marginLeft: 8,
    marginBottom: 12,
    paddingLeft: 10,
    paddingVertical: 2,
  },
  timelineHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  timelineTitle: { fontSize: 14, fontWeight: "700", fontFamily },
  timelineSubtitle: { fontSize: 12, fontWeight: "500", marginBottom: 1, fontFamily },
  timelinePeriod: { fontSize: 11, fontWeight: "500", marginBottom: 4, fontFamily },
  timelineDesc: { fontSize: 12, color: "#9D9DB5", lineHeight: 17, fontFamily },

  certGrid: { gap: 8 },
  certCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  certInfo: { flex: 1 },
  certName: { fontSize: 13, fontWeight: "700", fontFamily },
  certIssuer: { fontSize: 11, fontWeight: "500", marginTop: 1, fontFamily },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  tagText: { fontSize: 11, fontWeight: "600", fontFamily },

  signOutWrap: { marginHorizontal: 20, marginBottom: 4 },
  signOutRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 14,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)",
  },
  signOutIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  signOutText: { flex: 1, fontSize: 16, fontWeight: "700", fontFamily },

  tabRow: { flexDirection: "row", marginHorizontal: 20, gap: 6, marginBottom: 16 },
  tabPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPillText: { fontSize: 12, fontWeight: "700", fontFamily },

  panelOuter: { overflow: "hidden" },
  panelInner: { flexDirection: "row" },

  infoGrid: { gap: 0 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 18,
    gap: 16,
  },
  infoLabelRow: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 120 },
  infoLabel: { fontSize: 16, fontWeight: "600", fontFamily },
  infoValue: { flex: 1, fontSize: 16, fontWeight: "500", textAlign: "right", fontFamily },

  completionCard: { marginHorizontal: 20, borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 16, gap: 10 },
  completionRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  completionRing: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, justifyContent: "center", alignItems: "center" },
  completionPctLabel: { fontSize: 13, fontWeight: "900", fontFamily },
  completionInfo: { flex: 1 },
  completionTitle: { fontSize: 14, fontWeight: "700", fontFamily },
  completionSub: { fontSize: 11, fontWeight: "500", fontFamily },
  completionBarOuter: { height: 4, borderRadius: 2, overflow: "hidden" },
  completionBarInner: { height: "100%", borderRadius: 2 },

  progressCourseCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  progressCourseRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  progressCourseTitle: { flex: 1, fontSize: 13, fontWeight: "600", fontFamily },
  progressCoursePct: { fontSize: 12, fontWeight: "700", fontFamily },
  progressBarBg: { height: 3, borderRadius: 2, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 2 },

  progressMetaRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  progressMetaCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 2,
  },
  progressMetaValue: { fontSize: 20, fontWeight: "900", fontFamily },
  progressMetaLabel: { fontSize: 10, fontWeight: "600", fontFamily },

  emptyText: { fontSize: 14, fontWeight: "500", textAlign: "center", fontFamily },
  versionText: { textAlign: "center", fontSize: 12, marginTop: 16, fontFamily },
});
