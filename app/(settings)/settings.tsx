import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ModelDetailSheet from "../../component/ModelDetailSheet";
import ModelPickerSheet from "../../component/ModelPickerSheet";
import OfflineAICard from "../../component/OfflineAICard";
import { fontFamily } from "../../constants/themes";
import { useAuth } from "../../contexts/AuthContext";
import {
    modelStatusLabel,
    useAiModelCatalog,
    type ProviderStatus,
} from "../../hooks/useAiModelCatalog";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useThemeColors } from "../../hooks/useTheme";
import {
    LESSON_MOTION_OPTIONS,
    type LessonMotionStyle,
} from "../../lib/lesson/motion";
import {
    AI_PROVIDER_LABELS,
    effectiveRating,
    getModelOption,
    type AiModelOption,
    type AiProvider,
} from "../../lib/providers/modelRegistry";
import { resetUserData } from "../../lib/resetAppState";
import { AI_PROVIDERS, useAiKeysStore } from "../../store/aiKeysStore";
import { useModelRatingStore } from "../../store/modelRatingStore";
import { useModelStore } from "../../store/modelStore";
import { useMotionStore } from "../../store/motionStore";
import { useOfflineStore } from "../../store/offlineStore";
import { useSettingsStore } from "../../store/settingsStore";

const PROVIDER_ICONS: Record<
  AiProvider,
  ComponentProps<typeof MaterialCommunityIcons>["name"]
> = {
  gemini: "google",
  openai: "lightning-bolt-outline",
  anthropic: "star-four-points-outline",
  openrouter: "network",
  offline: "chip",
};

const MOTION_ICONS: Record<
  LessonMotionStyle,
  ComponentProps<typeof MaterialCommunityIcons>["name"]
> = {
  calm: "weather-windy",
  kinetic: "creation",
  playful: "rocket-launch-outline",
};

function SectionCard({
  title,
  icon,
  children,
  theme,
  fullWidth = false,
}: {
  title: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  children: React.ReactNode;
  theme: ReturnType<typeof useThemeColors>;
  fullWidth?: boolean;
}) {
  return (
    <View
      style={[
        st.card,
        { backgroundColor: theme.glass, borderColor: theme.borderLight },
        fullWidth && { marginHorizontal: 0, flex: 1 },
      ]}
    >
      <View style={st.cardHeader}>
        <View style={[st.cardIcon, { backgroundColor: theme.primary + "16" }]}>
          <MaterialCommunityIcons name={icon} size={15} color={theme.primary} />
        </View>
        <Text style={[st.cardTitle, { color: theme.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function MotionStyleOption({
  style,
  label,
  description,
  isActive,
  onPress,
}: {
  style: LessonMotionStyle;
  label: string;
  description: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const theme = useThemeColors();

  return (
    <Pressable
      style={[
        st.motionOption,
        {
          backgroundColor: isActive ? theme.primary + "10" : theme.surfaceAlt,
          borderColor: isActive ? theme.primary + "55" : theme.border,
        },
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${label} lesson motion`}
    >
      <View
        style={[
          st.motionOptionIcon,
          {
            backgroundColor: isActive ? theme.primary + "18" : theme.surface,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={MOTION_ICONS[style]}
          size={18}
          color={isActive ? theme.primary : theme.textSecondary}
        />
      </View>
      <View style={st.motionOptionCopy}>
        <Text style={[st.motionOptionLabel, { color: theme.text }]}>
          {label}
        </Text>
        <Text
          style={[st.motionOptionDescription, { color: theme.textSecondary }]}
        >
          {description}
        </Text>
      </View>
      <View
        style={[
          st.motionRadio,
          { borderColor: isActive ? theme.primary : theme.border },
        ]}
      >
        {isActive ? (
          <View
            style={[st.motionRadioDot, { backgroundColor: theme.primary }]}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const { motionStyle, setMotionStyle } = useMotionStore();
  const reduceMotion = useReducedMotion();
  const {
    courseNotifications,
    reminderNotifications,
    toggleCourseNotifications,
    toggleReminderNotifications,
  } = useSettingsStore();

  const { selectedModel, setSelectedModel } = useModelStore();
  const { getToken, profile } = useAuth();
  const { setKey, clearKey } = useAiKeysStore();
  const {
    keys,
    serverKeys,
    serverKeysError,
    offlineStatus,
    providerStatus,
    userRatings,
    modelGroups,
  } = useAiModelCatalog();

  const [candidateModel, setCandidateModel] = useState<AiModelOption | null>(
    null,
  );
  const [editingKeyProvider, setEditingKeyProvider] =
    useState<AiProvider | null>(null);
  const [keyDraft, setKeyDraft] = useState("");
  const [keySaving, setKeySaving] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const handleToggleKeyEditor = useCallback(
    (provider: AiProvider) => {
      setKeyError(null);
      setKeyDraft(keys[provider] ?? "");
      setEditingKeyProvider((p) => (p === provider ? null : provider));
    },
    [keys],
  );

  const handleSaveProviderKey = useCallback(async () => {
    if (!editingKeyProvider) return;
    if (!keyDraft.trim()) {
      setKeyError("Enter your API key first.");
      return;
    }
    setKeySaving(true);
    setKeyError(null);
    try {
      await setKey(editingKeyProvider, keyDraft);
      setEditingKeyProvider(null);
    } catch (err) {
      setKeyError(
        err instanceof Error ? err.message : "Failed to save this key.",
      );
    } finally {
      setKeySaving(false);
    }
  }, [editingKeyProvider, keyDraft, setKey]);

  const handleRemoveProviderKey = useCallback(
    async (provider: AiProvider) => {
      await clearKey(provider);
      if (editingKeyProvider === provider) setKeyDraft("");
    },
    [clearKey, editingKeyProvider],
  );

  const currentModel = getModelOption(selectedModel);
  const currentStatus: ProviderStatus = currentModel
    ? providerStatus(currentModel.provider)
    : "unknown";
  const currentStatusLabel = modelStatusLabel(
    currentModel?.provider,
    currentStatus,
    offlineStatus,
  );
  const currentTierPaid = currentModel?.tier === "paid";
  const currentRating = currentModel
    ? effectiveRating(currentModel, userRatings)
    : undefined;
  const statusColor =
    currentStatus === "ready"
      ? theme.primary
      : currentStatus === "unknown"
        ? theme.textMuted
        : theme.accent;

  const [showModelPicker, setShowModelPicker] = useState(false);
  const [clearing, setClearing] = useState(false);

  const rateModel = useModelRatingStore((s) => s.rate);
  const [ratingPending, setRatingPending] = useState<string | null>(null);
  const [ratingErrorText, setRatingErrorText] = useState<string | null>(null);

  const handleRate = useCallback(
    async (modelRef: string, value: number) => {
      if (ratingPending) return;
      setRatingPending(modelRef);
      setRatingErrorText(null);
      try {
        const token = await getToken();
        if (!token) return;
        await rateModel(
          modelRef,
          value === 0 ? null : value,
          profile?.uid ?? "",
          token,
        );
      } catch (err) {
        setRatingErrorText(
          err instanceof Error ? err.message : "Could not save your rating.",
        );
      } finally {
        setRatingPending(null);
      }
    },
    [ratingPending, getToken, profile?.uid, rateModel],
  );

  const handleModelSelect = useCallback(
    (model: AiModelOption) => {
      setSelectedModel(model.ref);
      setCandidateModel(null);
      setShowModelPicker(false);
    },
    [setSelectedModel],
  );

  const handleModelInfo = useCallback((model: AiModelOption) => {
    setCandidateModel(model);
  }, []);

  const handleOpenNotificationSettings = useCallback(() => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  }, []);

  const handleClearAllData = useCallback(() => {
    Alert.alert(
      "Clear All Local Data",
      "This will remove all notes, courses, progress, trophies, stats, and settings (including AI model and offline model). This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            try {
              await resetUserData();
              useSettingsStore.getState().reset();
              useModelStore.getState().reset();
              useMotionStore.getState().reset();
              useOfflineStore.getState().reset();
              await AsyncStorage.multiRemove([
                "@yuinx_settings_v1",
                "@yuinx_model_v1",
                "@yuinx_motion_v1",
                "@yuinx_offline_v1",
                "userProfile",
                "currentUser",
              ]);
              for (const provider of AI_PROVIDERS) {
                await clearKey(provider);
              }
              Alert.alert("Done", "All local data has been cleared.");
            } catch {
              Alert.alert("Error", "Failed to clear data.");
            } finally {
              setClearing(false);
            }
          },
        },
      ],
    );
  }, [clearKey]);

  return (
    <SafeAreaView
      style={[st.container, { backgroundColor: theme.bg }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[st.header, { borderBottomColor: theme.borderLight }]}>
        <Pressable
          onPress={() => router.back()}
          style={[
            st.backBtn,
            { backgroundColor: theme.glass, borderColor: theme.borderLight },
          ]}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={theme.text}
          />
        </Pressable>
        <Text style={[st.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={[st.versionChip, { borderColor: theme.borderLight }]}>
          <Text style={[st.versionChipText, { color: theme.textMuted }]}>
            v1.0.0
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={[theme.gradientStart, theme.gradientMid, theme.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={st.hero}
        >
          <View style={st.heroTop}>
            <View style={st.heroIconWrap}>
              <MaterialCommunityIcons
                name="creation"
                size={20}
                color="#152A4D"
              />
            </View>
            <Text style={st.heroKicker}>YUINX</Text>
          </View>
          <Text style={st.heroTitle}>Make Yuinx yours</Text>
          <Text style={st.heroSubtitle}>
            {Platform.OS === "web"
              ? "Your AI model & privacy — all in one place."
              : "Your AI model, offline mode & privacy — all in one place."}
          </Text>
        </LinearGradient>

        {/* Personalize */}
        <Text style={[st.groupKicker, { color: theme.textMuted }]}>
          Personalize
        </Text>
        <SectionCard
          title="Lesson motion"
          icon="animation-outline"
          theme={theme}
        >
          <Text style={[st.motionIntro, { color: theme.textSecondary }]}>
            Choose how lesson slides, narration, diagrams, and checkpoints
            move.
          </Text>
          <View style={st.motionList}>
            {LESSON_MOTION_OPTIONS.map((option) => (
              <MotionStyleOption
                key={option.id}
                style={option.id}
                label={option.label}
                description={option.description}
                isActive={motionStyle === option.id}
                onPress={() => setMotionStyle(option.id)}
              />
            ))}
          </View>
          <View
            style={[
              st.motionNote,
              {
                backgroundColor: reduceMotion
                  ? theme.accent + "12"
                  : theme.surfaceAlt,
                borderColor: reduceMotion
                  ? theme.accent + "35"
                  : theme.borderLight,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="information-outline"
              size={15}
              color={reduceMotion ? theme.accent : theme.textMuted}
            />
            <Text
              style={[
                st.motionNoteText,
                { color: reduceMotion ? theme.accent : theme.textMuted },
              ]}
            >
              {reduceMotion
                ? "System Reduce Motion is on. Lessons will keep motion minimal."
                : "Your device's Reduce Motion setting always takes priority."}
            </Text>
          </View>
        </SectionCard>

        {/* AI & Models */}
        <Text style={[st.groupKicker, { color: theme.textMuted }]}>
          AI &amp; Models
        </Text>
        <SectionCard title="AI Model" icon="creation" theme={theme}>
          <Text style={[st.aiIntro, { color: theme.textSecondary }]}>
            The model that powers quizzes, notes, study, courses &amp; more.
          </Text>
          <Pressable
            style={[
              st.aiHero,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.borderLight,
              },
            ]}
            onPress={() => setShowModelPicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Choose AI model"
          >
            <View
              style={[st.aiHeroIcon, { backgroundColor: theme.primary + "1A" }]}
            >
              <MaterialCommunityIcons
                name="brain"
                size={22}
                color={theme.primary}
              />
            </View>
            <View style={st.aiHeroInfo}>
              <View style={st.aiHeroTitleRow}>
                <Text
                  style={[st.aiHeroLabel, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {currentModel?.label ?? "Default model"}
                </Text>
                <View
                  style={[
                    st.tierChip,
                    {
                      backgroundColor: currentTierPaid
                        ? theme.accent + "22"
                        : theme.primary + "22",
                    },
                  ]}
                >
                  <Text
                    style={[
                      st.tierChipText,
                      { color: currentTierPaid ? theme.accent : theme.primary },
                    ]}
                  >
                    {currentTierPaid ? "PAID" : "FREE"}
                  </Text>
                </View>
              </View>
              <View style={st.aiHeroMetaRow}>
                <Text style={[st.aiHeroMeta, { color: theme.textSecondary }]}>
                  {currentModel
                    ? AI_PROVIDER_LABELS[currentModel.provider]
                    : "Google Gemini"}
                </Text>
                <View
                  style={[
                    st.statusPill,
                    { backgroundColor: statusColor + "18" },
                  ]}
                >
                  <View
                    style={[st.statusDot, { backgroundColor: statusColor }]}
                  />
                  <Text style={[st.statusPillText, { color: statusColor }]}>
                    {currentStatusLabel}
                  </Text>
                </View>
              </View>
            </View>
            <View style={st.aiHeroRight}>
              {currentRating != null && (
                <View
                  style={[
                    st.ratingChip,
                    { backgroundColor: theme.accent + "1A" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="star"
                    size={11}
                    color={theme.accent}
                  />
                  <Text style={[st.ratingChipText, { color: theme.accent }]}>
                    {currentRating}
                  </Text>
                </View>
              )}
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={theme.textMuted}
              />
            </View>
          </Pressable>
          <View style={st.aiNoteRow}>
            <MaterialCommunityIcons
              name="information-outline"
              size={14}
              color={theme.textMuted}
            />
            <Text style={[st.aiNoteText, { color: theme.textMuted }]}>
              Tap a model to see what&apos;s needed — add a provider key on the
              server or on this device. Embeddings &amp; thumbnail images always
              use Google Gemini.
            </Text>
          </View>
        </SectionCard>

        {/* AI API Keys */}
        <SectionCard title="AI API Keys" icon="key-outline" theme={theme}>
          <Text style={[st.aiIntro, { color: theme.textSecondary }]}>
            Add a key for any provider to unlock its free &amp; paid models. You
            only need a key where the server doesn&apos;t have one.
          </Text>
          {AI_PROVIDERS.map((provider) => {
            const hasServerKey =
              !serverKeysError && (serverKeys[provider] ?? false);
            const hasOwnKey = Boolean(keys[provider]);
            const expanded = editingKeyProvider === provider;
            const ready = hasServerKey || hasOwnKey;
            return (
              <View key={provider}>
                <Pressable
                  style={[st.aiKeyRow, { borderBottomColor: theme.border }]}
                  onPress={() => handleToggleKeyEditor(provider)}
                >
                  <View
                    style={[
                      st.aiKeyIconWrap,
                      {
                        backgroundColor: ready
                          ? theme.primary + "15"
                          : theme.border + "40",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={PROVIDER_ICONS[provider]}
                      size={18}
                      color={ready ? theme.primary : theme.textSecondary}
                    />
                  </View>
                  <View style={st.aiKeyInfo}>
                    <Text style={[st.settingLabel, { color: theme.text }]}>
                      {AI_PROVIDER_LABELS[provider]}
                    </Text>
                    <Text
                      style={[st.aiKeyStatus, { color: theme.textSecondary }]}
                    >
                      {serverKeysError
                        ? "Checking…"
                        : hasServerKey
                          ? "Server key configured"
                          : hasOwnKey
                            ? "Key saved on this device"
                            : "No key — add one to unlock models"}
                    </Text>
                  </View>
                  <View
                    style={[
                      st.aiStatusDot,
                      {
                        backgroundColor: serverKeysError
                          ? theme.textMuted
                          : ready
                            ? theme.primary
                            : theme.accent,
                      },
                    ]}
                  />
                  <MaterialCommunityIcons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={theme.textMuted}
                  />
                </Pressable>
                {expanded ? (
                  <View
                    style={[
                      st.aiKeyEditor,
                      {
                        backgroundColor: theme.surfaceAlt,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        st.aiKeyEditorLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Saving here keeps the key only on this device.
                    </Text>
                    {hasOwnKey ? (
                      <View style={st.aiKeySavedRow}>
                        <MaterialCommunityIcons
                          name="shield-check"
                          size={16}
                          color={theme.primary}
                        />
                        <Text
                          style={[st.aiKeySavedText, { color: theme.text }]}
                        >
                          A key is already saved.
                        </Text>
                        <Pressable
                          onPress={() => handleRemoveProviderKey(provider)}
                          hitSlop={8}
                          disabled={keySaving}
                        >
                          <Text
                            style={[st.aiKeyRemove, { color: theme.danger }]}
                          >
                            Remove
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                    <View style={st.aiKeyInputRow}>
                      <TextInput
                        style={[
                          st.aiKeyInput,
                          {
                            color: theme.text,
                            borderColor: theme.border,
                            backgroundColor: theme.surface,
                          },
                        ]}
                        value={keyDraft}
                        onChangeText={setKeyDraft}
                        placeholder={`Paste ${AI_PROVIDER_LABELS[provider]} API key`}
                        placeholderTextColor={theme.textMuted}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!keySaving}
                      />
                      <Pressable
                        style={[
                          st.aiKeySaveBtn,
                          {
                            backgroundColor: keySaving
                              ? theme.border
                              : theme.primary,
                          },
                        ]}
                        onPress={handleSaveProviderKey}
                        disabled={keySaving}
                      >
                        {keySaving ? (
                          <ActivityIndicator size="small" color="#152A4D" />
                        ) : (
                          <Text style={st.aiKeySaveText}>Save</Text>
                        )}
                      </Pressable>
                    </View>
                    {keyError ? (
                      <Text style={[st.aiKeyError, { color: theme.danger }]}>
                        {keyError}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </SectionCard>

        {Platform.OS !== "web" ? (
          <SectionCard title="Offline AI" icon="chip" theme={theme}>
            <OfflineAICard />
          </SectionCard>
        ) : null}

        {/* Notifications */}
        <Text style={[st.groupKicker, { color: theme.textMuted }]}>
          Notifications
        </Text>
        <SectionCard title="Notifications" icon="bell-outline" theme={theme}>
          <View style={st.settingRow}>
            <View style={st.settingLeft}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={20}
                color={theme.textSecondary}
              />
              <Text style={[st.settingLabel, { color: theme.text }]}>
                Course notifications
              </Text>
            </View>
            <Switch
              value={courseNotifications}
              onValueChange={toggleCourseNotifications}
              trackColor={{ false: theme.border, true: theme.primary + "60" }}
              thumbColor={courseNotifications ? theme.primary : theme.textMuted}
            />
          </View>
          <View style={[st.settingRow, { borderBottomWidth: 0 }]}>
            <View style={st.settingLeft}>
              <MaterialCommunityIcons
                name="alarm"
                size={20}
                color={theme.textSecondary}
              />
              <Text style={[st.settingLabel, { color: theme.text }]}>
                Note reminders
              </Text>
            </View>
            <Switch
              value={reminderNotifications}
              onValueChange={toggleReminderNotifications}
              trackColor={{ false: theme.border, true: theme.primary + "60" }}
              thumbColor={
                reminderNotifications ? theme.primary : theme.textMuted
              }
            />
          </View>
          <Pressable
            style={st.manageRow}
            onPress={handleOpenNotificationSettings}
          >
            <MaterialCommunityIcons
              name="cog-outline"
              size={18}
              color={theme.textSecondary}
            />
            <Text style={[st.manageText, { color: theme.textSecondary }]}>
              System notification settings
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={theme.textMuted}
            />
          </Pressable>
        </SectionCard>

        {/* Data */}
        <Text style={[st.groupKicker, { color: theme.textMuted }]}>Data</Text>
        <SectionCard
          title="Data Management"
          icon="database-outline"
          theme={theme}
        >
          <Pressable
            style={[st.actionRow, { borderBottomWidth: 0 }]}
            onPress={handleClearAllData}
            disabled={clearing}
          >
            <View
              style={[
                st.actionIconWrap,
                { backgroundColor: theme.danger + "15" },
              ]}
            >
              <MaterialCommunityIcons
                name="delete-sweep-outline"
                size={20}
                color={theme.danger}
              />
            </View>
            <View style={st.actionInfo}>
              <Text style={[st.actionLabel, { color: theme.danger }]}>
                {clearing ? "Clearing..." : "Clear All Local Data"}
              </Text>
              <Text style={[st.actionHint, { color: theme.textMuted }]}>
                Remove notes, courses, progress, trophies &amp; settings
              </Text>
            </View>
          </Pressable>
        </SectionCard>

        {/* About */}
        <Text style={[st.groupKicker, { color: theme.textMuted }]}>About</Text>
        <SectionCard
          title="About Yuinx"
          icon="information-outline"
          theme={theme}
        >
          <View style={st.infoRow}>
            <Text style={[st.infoLabel, { color: theme.textSecondary }]}>
              Version
            </Text>
            <Text style={[st.infoValue, { color: theme.text }]}>1.0.0</Text>
          </View>
          <Pressable
            style={st.linkRow}
            onPress={() => Linking.openURL("https://yuinx.app/privacy")}
          >
            <Text style={[st.linkText, { color: theme.primary }]}>
              Privacy Policy
            </Text>
            <MaterialCommunityIcons
              name="open-in-new"
              size={16}
              color={theme.primary}
            />
          </Pressable>
          <Pressable
            style={[st.linkRow, { borderBottomWidth: 0 }]}
            onPress={() => Linking.openURL("https://yuinx.app/terms")}
          >
            <Text style={[st.linkText, { color: theme.primary }]}>
              Terms of Service
            </Text>
            <MaterialCommunityIcons
              name="open-in-new"
              size={16}
              color={theme.primary}
            />
          </Pressable>
        </SectionCard>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* AI Model Picker Sheet */}
      <ModelPickerSheet
        visible={showModelPicker}
        selectedModel={selectedModel}
        modelGroups={modelGroups}
        providerStatus={providerStatus}
        userRatings={userRatings}
        ratingPending={ratingPending}
        ratingErrorText={ratingErrorText}
        onRate={handleRate}
        onSelect={handleModelSelect}
        onInfo={handleModelInfo}
        onClose={() => {
          setShowModelPicker(false);
          setCandidateModel(null);
          setRatingErrorText(null);
        }}
      />

      {/* AI Model Detail Sheet */}
      {candidateModel && (
        <ModelDetailSheet
          model={candidateModel}
          visible
          serverConfigured={
            serverKeysError
              ? undefined
              : (serverKeys[candidateModel.provider] ?? false)
          }
          onSelect={(ref) => {
            setSelectedModel(ref);
            setCandidateModel(null);
            setShowModelPicker(false);
          }}
          onClose={() => setCandidateModel(null)}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily,
    flex: 1,
    marginLeft: 12,
  },
  versionChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  versionChipText: { fontSize: 11, fontWeight: "700", fontFamily },

  scroll: { paddingTop: 18, paddingBottom: 40 },

  hero: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 28,
    padding: 20,
    gap: 6,
    overflow: "hidden",
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(21,42,77,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#152A4D",
    fontFamily,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#152A4D",
    fontFamily,
    marginTop: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "#152A4D",
    fontFamily,
  },

  groupKicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginHorizontal: 24,
    marginBottom: 8,
    fontFamily,
  },

  card: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cardIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", fontFamily },

  motionIntro: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    marginBottom: 12,
    fontFamily,
  },
  motionList: { gap: 8 },
  motionOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
  },
  motionOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  motionOptionCopy: { flex: 1, gap: 2 },
  motionOptionLabel: { fontSize: 13, fontWeight: "700", fontFamily },
  motionOptionDescription: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    fontFamily,
  },
  motionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  motionRadioDot: { width: 9, height: 9, borderRadius: 4.5 },
  motionNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  motionNoteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
    fontFamily,
  },

  aiIntro: { fontSize: 13, fontFamily, marginBottom: 12, lineHeight: 18 },
  aiHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  aiHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  aiHeroInfo: { flex: 1, gap: 6 },
  aiHeroTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiHeroLabel: { fontSize: 16, fontWeight: "800", fontFamily, flexShrink: 1 },
  tierChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tierChipText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily,
    textTransform: "uppercase" as const,
  },
  aiHeroMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiHeroMeta: { fontSize: 12, fontFamily },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusPillText: { fontSize: 11, fontWeight: "700", fontFamily },
  aiHeroRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  ratingChipText: { fontSize: 10, fontWeight: "700", fontFamily },
  aiNoteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 12,
  },
  aiNoteText: { fontSize: 12, fontFamily, flex: 1, lineHeight: 16 },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: "600", fontFamily },
  manageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "transparent",
  },
  manageText: { fontSize: 12, fontWeight: "500", flex: 1, fontFamily },

  aiKeyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  aiKeyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  aiKeyInfo: { flex: 1 },
  aiKeyStatus: { fontSize: 12, fontFamily, marginTop: 1 },
  aiStatusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 2 },
  aiKeyEditor: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
    gap: 10,
  },
  aiKeyEditorLabel: { fontSize: 12, fontFamily },
  aiKeySavedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  aiKeySavedText: { fontSize: 13, fontFamily, flex: 1 },
  aiKeyRemove: { fontSize: 13, fontWeight: "700", fontFamily },
  aiKeyInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiKeyInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    fontFamily,
  },
  aiKeySaveBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 68,
  },
  aiKeySaveText: {
    color: "#152A4D",
    fontSize: 13,
    fontWeight: "800",
    fontFamily,
  },
  aiKeyError: { fontSize: 12, fontFamily },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  actionInfo: { flex: 1 },
  actionLabel: { fontSize: 14, fontWeight: "600", fontFamily },
  actionHint: { fontSize: 12, fontFamily, marginTop: 1 },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 14, fontWeight: "500", fontFamily },
  infoValue: { fontSize: 14, fontWeight: "600", fontFamily },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  linkText: { fontSize: 14, fontWeight: "600", fontFamily },

});
