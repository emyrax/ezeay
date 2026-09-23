import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import ModelDetailSheet from "../../component/ModelDetailSheet";
import ModelPickerSheet from "../../component/ModelPickerSheet";
import OfflineAICard from "../../component/OfflineAICard";
import type { CustomThemeColors } from "../../constants/themes";
import {
  THEME_IDS,
  fontFamily,
  themeModes,
  themeNames,
  themes,
} from "../../constants/themes";
import { useAuth } from "../../contexts/AuthContext";
import { useThemeColors } from "../../hooks/useTheme";
import { api } from "../../lib/api";
import {
  AI_MODELS,
  AI_PROVIDER_LABELS,
  effectiveRating,
  getModelOption,
  sortModels,
  type AiModelOption,
  type AiProvider,
} from "../../lib/providers/modelRegistry";
import { AI_PROVIDERS, useAiKeysStore } from "../../store/aiKeysStore";
import { useModelRatingStore } from "../../store/modelRatingStore";
import { useModelStore } from "../../store/modelStore";
import {
  useOfflineStore,
  type OfflineStatus,
} from "../../store/offlineStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useThemeStore } from "../../store/themeStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type ProviderStatus = "ready" | "needs-key" | "unknown";

const SWATCHES = [
  "#000000",
  "#1a1a2e",
  "#16213e",
  "#0f3460",
  "#533483",
  "#e94560",
  "#ff6b6b",
  "#ffa07a",
  "#ffd700",
  "#ffeb3b",
  "#7bed9f",
  "#2ed573",
  "#00d2d3",
  "#00a8ff",
  "#48dbfb",
  "#0984e3",
  "#6c5ce7",
  "#a29bfe",
  "#fd79a8",
  "#636e72",
];

const CUSTOM_FIELDS: { key: keyof CustomThemeColors; label: string }[] = [
  { key: "bg", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
  { key: "textSecondary", label: "Text Secondary" },
  { key: "primary", label: "Primary Accent" },
  { key: "accent", label: "Secondary Accent" },
  { key: "border", label: "Border" },
  { key: "tabActive", label: "Tab Active" },
];

const PROVIDER_ICONS: Record<
  AiProvider,
  ComponentProps<typeof MaterialCommunityIcons>["name"]
> = {
  gemini: "google",
  openai: "snake",
  anthropic: "star-four-points-outline",
  openrouter: "network",
  offline: "chip",
};

const PROVIDER_ORDER: AiProvider[] = [
  "offline",
  "gemini",
  "openai",
  "anthropic",
  "openrouter",
];

function modelStatusLabel(
  provider: AiProvider | undefined,
  status: ProviderStatus,
  offlineStatus: OfflineStatus,
): string {
  if (provider === "offline") {
    if (offlineStatus === "ready" || offlineStatus === "downloaded")
      return "Installed";
    if (offlineStatus === "downloading") return "Downloading…";
    return "Not installed";
  }
  if (status === "ready") return "Ready";
  if (status === "unknown") return "Checking…";
  return "Add key";
}

function SectionCard({
  title,
  icon,
  children,
  theme,
}: {
  title: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  children: React.ReactNode;
  theme: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View
      style={[
        st.card,
        { backgroundColor: theme.glass, borderColor: theme.borderLight },
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

function ThemeTile({
  label,
  isActive,
  onPress,
  checkColor,
  checkColorOn,
  children,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  checkColor: string;
  checkColorOn: string;
  children: React.ReactNode;
}) {
  const theme = useThemeColors();
  return (
    <Pressable
      style={st.themeSwatch}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isActive }}
    >
      <View
        style={[
          st.themePreview,
          { borderColor: isActive ? theme.text : "transparent" },
        ]}
      >
        {children}
        {isActive && (
          <View style={[st.themeCheck, { backgroundColor: checkColor }]}>
            <MaterialIcons name="check" size={12} color={checkColorOn} />
          </View>
        )}
      </View>
      <Text
        style={[
          st.themeLabel,
          {
            color: isActive ? theme.text : theme.textSecondary,
            fontWeight: isActive ? "700" : "400",
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useThemeColors();

  const { themeId, setTheme, customTheme, saveCustomTheme, deleteCustomTheme } =
    useThemeStore();
  const {
    courseNotifications,
    reminderNotifications,
    toggleCourseNotifications,
    toggleReminderNotifications,
  } = useSettingsStore();

  const { selectedModel, setSelectedModel } = useModelStore();
  const { getToken, profile } = useAuth();
  const { loadKeys, setKey, clearKey } = useAiKeysStore();
  const keys = useAiKeysStore((s) => s.keys);
  const offlineStatus = useOfflineStore((s) => s.status);

  const [serverKeys, setServerKeys] = useState<
    Partial<Record<AiProvider, boolean>>
  >({});
  const [serverKeysError, setServerKeysError] = useState(false);
  const [candidateModel, setCandidateModel] = useState<AiModelOption | null>(
    null,
  );
  const [editingKeyProvider, setEditingKeyProvider] = useState<AiProvider | null>(
    null,
  );
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

  useEffect(() => {
    loadKeys();
    let active = true;
    getToken()
      .then((token) => {
        if (!token) return;
        return api.ai
          .providers(token)
          .then((res) => {
            if (!active) return;
            const status: Partial<Record<AiProvider, boolean>> = {};
            for (const provider of AI_PROVIDERS) {
              status[provider] =
                res.providers[provider]?.serverKeyConfigured ?? false;
            }
            setServerKeys(status);
            setServerKeysError(false);
          })
          .catch((err: unknown) => {
            if (!active) return;
            console.warn("[Settings] Failed to fetch AI provider status:", err);
            setServerKeysError(true);
          });
      })
      .catch(() => {
        if (active) setServerKeysError(true);
      });
    return () => {
      active = false;
    };
  }, [getToken, loadKeys]);

  const providerStatus = useCallback(
    (provider: AiProvider): ProviderStatus => {
      if (provider === "offline") {
        if (offlineStatus === "ready" || offlineStatus === "downloaded")
          return "ready";
        if (offlineStatus === "downloading") return "unknown";
        return "needs-key";
      }
      if (keys[provider]) return "ready";
      if (serverKeysError) return "unknown";
      return serverKeys[provider] ? "ready" : "needs-key";
    },
    [keys, serverKeys, serverKeysError, offlineStatus],
  );

  const userRatings = useModelRatingStore((s) => s.ratings);

  const modelGroups = useMemo(() => {
    return PROVIDER_ORDER.map((provider) => ({
      provider,
      models: sortModels(
        AI_MODELS.filter((m) => m.provider === provider),
        userRatings,
      ),
    })).filter((group) => group.models.length > 0);
  }, [userRatings]);

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

  const [showEditor, setShowEditor] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [editorName, setEditorName] = useState(customTheme?.name ?? "My Theme");
  const [editColors, setEditColors] = useState<CustomThemeColors>(
    customTheme?.colors ?? {
      bg: theme.bg,
      surface: theme.surface,
      text: theme.text,
      textSecondary: theme.textSecondary,
      primary: theme.primary,
      accent: theme.accent,
      border: theme.border,
      tabActive: theme.tabActive,
    },
  );
  const [pickingField, setPickingField] = useState<
    keyof CustomThemeColors | null
  >(null);
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

  const handleSaveCustom = useCallback(() => {
    if (!editorName.trim()) {
      Alert.alert(
        "Name required",
        "Please enter a name for your custom theme.",
      );
      return;
    }
    saveCustomTheme(editorName.trim(), editColors);
    setShowEditor(false);
  }, [editorName, editColors, saveCustomTheme]);

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
      "This will remove all notes, courses, progress, trophies, and settings. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            try {
              const keys = [
                "@yuinx_notes_v1",
                "@yuinx_courses_v1",
                "@yuinx_course_progress_v1",
                "@yuinx_enrollments_v1",
                "@yuinx_study_v1",
                "@yuinx_bounties_v1",
                "@yuinx_user_trophies_v1",
                "yuinx-theme",
                "@yuinx_settings_v1",
                "@yuinx_model_v1",
              ];
              await AsyncStorage.multiRemove(keys);
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
          style={[st.backBtn, { backgroundColor: theme.glass, borderColor: theme.borderLight }]}
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
                color="#FFFFFF"
              />
            </View>
            <Text style={st.heroKicker}>YUINX</Text>
          </View>
          <Text style={st.heroTitle}>Make Yuinx yours</Text>
          <Text style={st.heroSubtitle}>
            Your AI model, themes, offline mode &amp; privacy — all in one
            place.
          </Text>
        </LinearGradient>

        {/* Personalize */}
        <Text style={[st.groupKicker, { color: theme.textMuted }]}>
          Personalize
        </Text>
        <SectionCard title="Appearance" icon="palette-outline" theme={theme}>
          <Text style={[st.themeGroupLabel, { color: theme.textMuted }]}>
            Dark
          </Text>
          <View style={st.themeRow}>
            {THEME_IDS.filter((id) => themeModes[id] === "dark").map((id) => {
              const t = themes[id];
              const isActive = themeId === id;
              return (
                <ThemeTile
                  key={id}
                  label={themeNames[id]}
                  isActive={isActive}
                  onPress={() => setTheme(id)}
                  checkColor={t.primary}
                  checkColorOn="#FFF"
                >
                  <View style={[st.themePresetBody, { backgroundColor: t.bg }]}>
                    <LinearGradient
                      colors={[t.gradientStart, t.gradientMid, t.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={st.themePreviewBar}
                    />
                    <View style={st.themePreviewDots}>
                      <View
                        style={[st.themeDot, { backgroundColor: t.primary }]}
                      />
                      <View
                        style={[st.themeDot, { backgroundColor: t.accent }]}
                      />
                    </View>
                  </View>
                </ThemeTile>
              );
            })}
          </View>
          <View
            style={[
              st.themeGroupSpacer,
              { backgroundColor: theme.borderLight },
            ]}
          />
          <Text style={[st.themeGroupLabel, { color: theme.textMuted }]}>
            Light
          </Text>
          <View style={st.themeRow}>
            {THEME_IDS.filter((id) => themeModes[id] === "light").map((id) => {
              const t = themes[id];
              const isActive = themeId === id;
              return (
                <ThemeTile
                  key={id}
                  label={themeNames[id]}
                  isActive={isActive}
                  onPress={() => setTheme(id)}
                  checkColor={t.primary}
                  checkColorOn="#FFF"
                >
                  <View style={[st.themePresetBody, { backgroundColor: t.bg }]}>
                    <LinearGradient
                      colors={[t.gradientStart, t.gradientMid, t.gradientEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={st.themePreviewBar}
                    />
                    <View style={st.themePreviewDots}>
                      <View
                        style={[st.themeDot, { backgroundColor: t.primary }]}
                      />
                      <View
                        style={[st.themeDot, { backgroundColor: t.accent }]}
                      />
                    </View>
                  </View>
                </ThemeTile>
              );
            })}
          </View>
          <View style={st.themeRow}>
            <ThemeTile
              label={customTheme?.name || "Custom"}
              isActive={themeId === "custom"}
              onPress={() => {
                setShowEditor(true);
                if (!customTheme) {
                  setEditColors({
                    bg: theme.bg,
                    surface: theme.surface,
                    text: theme.text,
                    textSecondary: theme.textSecondary,
                    primary: theme.primary,
                    accent: theme.accent,
                    border: theme.border,
                    tabActive: theme.tabActive,
                  });
                  setEditorName("My Theme");
                }
              }}
              checkColor={theme.text}
              checkColorOn={theme.bg}
            >
              <View
                style={[
                  st.themePresetBody,
                  { backgroundColor: customTheme?.colors.bg ?? theme.bg },
                ]}
              >
                <LinearGradient
                  colors={
                    customTheme
                      ? [customTheme.colors.primary, customTheme.colors.accent]
                      : [theme.primary, theme.accent]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={st.themePreviewBar}
                />
                <View style={st.themePreviewDots}>
                  <MaterialIcons
                    name="palette"
                    size={15}
                    color={
                      themeId === "custom" ? theme.text : theme.textSecondary
                    }
                  />
                </View>
              </View>
            </ThemeTile>
          </View>
          {customTheme && (
            <Pressable
              style={[st.deleteThemeBtn, { borderColor: theme.border }]}
              onPress={() => {
                Alert.alert(
                  "Delete Custom Theme",
                  `Delete "${customTheme.name}" and reset to Graphite?`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: deleteCustomTheme,
                    },
                  ],
                );
              }}
            >
              <Text style={[st.deleteThemeText, { color: theme.danger }]}>
                Delete Custom Theme
              </Text>
            </Pressable>
          )}
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
              { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight },
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
                  style={[st.ratingChip, { backgroundColor: theme.accent + "1A" }]}
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
            Add a key for any provider to unlock its free &amp; paid models.
            You only need a key where the server doesn&apos;t have one.
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
                      style={[st.aiKeyEditorLabel, { color: theme.textSecondary }]}
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
                        <Text style={[st.aiKeySavedText, { color: theme.text }]}>
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
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={st.aiKeySaveText}>Save</Text>
                        )}
                      </Pressable>
                    </View>
                    {keyError ? (
                      <Text
                        style={[st.aiKeyError, { color: theme.danger }]}
                      >
                        {keyError}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </SectionCard>

        {/* Offline AI */}
        <SectionCard title="Offline AI" icon="chip" theme={theme}>
          <OfflineAICard />
        </SectionCard>

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
        <SectionCard title="Data Management" icon="database-outline" theme={theme}>
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
        <SectionCard title="About Yuinx" icon="information-outline" theme={theme}>
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

      {/* Custom Theme Editor Modal */}
      {showEditor && (
        <Modal
          visible
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => {
            setShowEditor(false);
            setPickingField(null);
          }}
        >
          <View style={[st.modalOverlay, { backgroundColor: theme.glass }]}>
            <View style={[st.modalContent, { backgroundColor: theme.surface }]}>
              <View style={st.modalHeader}>
                <Text style={[st.modalTitle, { color: theme.text }]}>
                  {customTheme ? "Edit" : "Create"} Custom Theme
                </Text>
                <Pressable onPress={() => setShowEditor(false)}>
                  <MaterialIcons
                    name="close"
                    size={22}
                    color={theme.textSecondary}
                  />
                </Pressable>
              </View>
              <ScrollView
                style={st.editorScroll}
                showsVerticalScrollIndicator={false}
              >
                <Text style={[st.fieldLabel, { color: theme.textSecondary }]}>
                  Theme Name
                </Text>
                <TextInput
                  style={[
                    st.editorInput,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.surfaceAlt,
                    },
                  ]}
                  value={editorName}
                  onChangeText={setEditorName}
                  placeholder="My Theme"
                  placeholderTextColor={theme.textMuted}
                />
                {CUSTOM_FIELDS.map(({ key, label }) => (
                  <Pressable
                    key={key}
                    style={[st.colorRow, { borderBottomColor: theme.border }]}
                    onPress={() => setPickingField(key)}
                  >
                    <Text style={[st.colorRowLabel, { color: theme.text }]}>
                      {label}
                    </Text>
                    <View style={st.colorRowRight}>
                      <View
                        style={[
                          st.colorPreview,
                          { backgroundColor: editColors[key] },
                        ]}
                      />
                      <Text
                        style={[st.colorValue, { color: theme.textSecondary }]}
                      >
                        {editColors[key]}
                      </Text>
                    </View>
                  </Pressable>
                ))}
                {pickingField && (
                  <View
                    style={[st.pickerSection, { borderTopColor: theme.border }]}
                  >
                    <Text style={[st.fieldLabel, { color: theme.textSecondary }]}>
                      Pick color for:{" "}
                      {CUSTOM_FIELDS.find((f) => f.key === pickingField)?.label}
                    </Text>
                    <View style={st.swatchGrid}>
                      {SWATCHES.map((swatch) => (
                        <Pressable
                          key={swatch}
                          style={[
                            st.swatch,
                            {
                              backgroundColor: swatch,
                              borderColor:
                                editColors[pickingField] === swatch
                                  ? theme.text
                                  : "transparent",
                              borderWidth:
                                editColors[pickingField] === swatch ? 2 : 0,
                            },
                          ]}
                          onPress={() =>
                            setEditColors((prev) => ({
                              ...prev,
                              [pickingField]: swatch,
                            }))
                          }
                        />
                      ))}
                    </View>
                    <View style={st.hexRow}>
                      <Text style={[st.hexPrefix, { color: theme.textMuted }]}>
                        #
                      </Text>
                      <TextInput
                        style={[
                          st.hexInput,
                          {
                            color: theme.text,
                            borderColor: theme.border,
                            backgroundColor: theme.surfaceAlt,
                          },
                        ]}
                        value={editColors[pickingField].replace("#", "")}
                        onChangeText={(val) => {
                          const clean = val
                            .replace(/[^0-9a-fA-F]/g, "")
                            .slice(0, 6);
                          if (clean.length <= 6)
                            setEditColors((prev) => ({
                              ...prev,
                              [pickingField]: `#${clean || "000000"}`,
                            }));
                        }}
                        placeholder="000000"
                        placeholderTextColor={theme.textMuted}
                        maxLength={6}
                        autoCapitalize="none"
                      />
                      <Pressable
                        style={[st.doneBtn, { backgroundColor: theme.primary }]}
                        onPress={() => setPickingField(null)}
                      >
                        <Text style={st.doneBtnText}>Done</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
                <View style={st.editorActions}>
                  <Pressable
                    style={[st.saveBtn, { backgroundColor: theme.primary }]}
                    onPress={handleSaveCustom}
                  >
                    <Text style={st.saveBtnText}>
                      {customTheme ? "Update Theme" : "Save Theme"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[st.cancelBtn, { borderColor: theme.border }]}
                    onPress={() => {
                      setShowEditor(false);
                      setPickingField(null);
                    }}
                  >
                    <Text
                      style={[st.cancelBtnText, { color: theme.textSecondary }]}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

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
  headerTitle: { fontSize: 18, fontWeight: "700", fontFamily, flex: 1, marginLeft: 12 },
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
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "rgba(255,255,255,0.85)",
    fontFamily,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily,
    marginTop: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.85)",
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

  themeGroupLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 10,
    fontFamily,
  },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  themeGroupSpacer: { height: 1, marginVertical: 16 },
  themeSwatch: { alignItems: "center", width: (SCREEN_WIDTH - 96) / 3 },
  themePreview: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  themePresetBody: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  themePreviewBar: {
    position: "absolute",
    top: 12,
    left: 6,
    right: 6,
    height: 6,
    borderRadius: 3,
  },
  themePreviewDots: {
    position: "absolute",
    bottom: 7,
    flexDirection: "row",
    gap: 5,
  },
  themeDot: { width: 7, height: 7, borderRadius: 3.5 },
  themeCheck: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  themeLabel: { fontSize: 11, textAlign: "center", fontFamily },
  deleteThemeBtn: {
    marginTop: 12,
    borderTopWidth: 1,
    paddingTop: 12,
    alignItems: "center",
  },
  deleteThemeText: { fontSize: 12, fontWeight: "600", fontFamily },

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
    color: "#FFF",
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

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", fontFamily },
  editorScroll: { maxHeight: 600 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
    fontFamily,
  },
  editorInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 16,
    fontFamily,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  colorRowLabel: { fontSize: 14, fontWeight: "500", fontFamily },
  colorRowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  colorValue: { fontSize: 12, fontWeight: "600", fontFamily },
  pickerSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  hexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  hexPrefix: { fontSize: 16, fontWeight: "700" },
  hexInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    fontFamily,
  },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  doneBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  editorActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 15, fontWeight: "700" },
});