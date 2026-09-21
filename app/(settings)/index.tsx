import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
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
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import ModelDetailSheet from "../../component/ModelDetailSheet";
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
import { useOfflineStore } from "../../store/offlineStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useThemeStore } from "../../store/themeStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

function SectionCard({
  title,
  children,
  theme,
}: {
  title: string;
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
  const { getToken } = useAuth();
  const { loadKeys, clearKey } = useAiKeysStore();
  const keys = useAiKeysStore((s) => s.keys);

  const [serverKeys, setServerKeys] = useState<
    Partial<Record<AiProvider, boolean>>
  >({});
  const [serverKeysError, setServerKeysError] = useState(false);
  const [candidateModel, setCandidateModel] = useState<AiModelOption | null>(
    null,
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

  const offlineStatus = useOfflineStore((s) => s.status);

  const providerStatus = useCallback(
    (provider: AiProvider): "ready" | "needs-key" | "unknown" => {
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
    const order: AiProvider[] = [
      "offline",
      "gemini",
      "openai",
      "anthropic",
      "openrouter",
    ];
    return order
      .map((provider) => ({
        provider,
        models: sortModels(
          AI_MODELS.filter((m) => m.provider === provider),
          userRatings,
        ),
      }))
      .filter((group) => group.models.length > 0);
  }, [userRatings]);

  const currentModel = getModelOption(selectedModel);

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
            } catch (err) {
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
        <Pressable onPress={() => router.back()} style={st.backBtn} hitSlop={8}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={theme.text}
          />
        </Pressable>
        <Text style={[st.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <SectionCard title="Appearance" theme={theme}>
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

        {/* Notifications */}
        <SectionCard title="Notifications" theme={theme}>
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

        {/* AI Model */}
        <SectionCard title="AI Model" theme={theme}>
          <View style={st.aiSubRow}>
            <Text style={[st.aiSubText, { color: theme.textSecondary }]}>
              Choose which model powers course, quiz & study generation.
            </Text>
          </View>
          <Pressable
            style={[
              st.aiModelRow,
              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
            ]}
            onPress={() => setShowModelPicker(true)}
          >
            <View style={st.settingLeft}>
              <MaterialCommunityIcons
                name="brain"
                size={20}
                color={theme.primary}
              />
              <View style={st.aiModelInfo}>
                <Text style={[st.settingLabel, { color: theme.text }]}>
                  {currentModel?.label ?? "Default model"}
                </Text>
                <Text style={[st.aiModelMeta, { color: theme.textSecondary }]}>
                  {currentModel
                    ? `${AI_PROVIDER_LABELS[currentModel.provider]} · ${
                        currentModel.tier === "paid" ? "Paid" : "Free"
                      } · ${
                        providerStatus(currentModel.provider) === "ready"
                          ? "Ready"
                          : providerStatus(currentModel.provider) === "unknown"
                            ? "Checking…"
                            : "Needs key"
                      }`
                    : "gemini::gemini-2.5-flash"}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={theme.textMuted}
            />
          </Pressable>
          <View style={st.aiNoteRow}>
            <MaterialCommunityIcons
              name="information-outline"
              size={14}
              color={theme.textMuted}
            />
            <Text style={[st.aiNoteText, { color: theme.textMuted }]}>
              Tap a model to see what&apos;s needed — add a provider key on the
              server or on this device. Embeddings & thumbnail images always use
              Google Gemini.
            </Text>
          </View>
        </SectionCard>

        {/* Offline AI */}
        <SectionCard title="Offline AI" theme={theme}>
          <OfflineAICard />
        </SectionCard>

        {/* Data Management */}
        <SectionCard title="Data Management" theme={theme}>
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
            <Text style={[st.actionLabel, { color: theme.danger }]}>
              {clearing ? "Clearing..." : "Clear All Local Data"}
            </Text>
          </Pressable>
        </SectionCard>

        {/* About */}
        <SectionCard title="About" theme={theme}>
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
      )}

      {/* AI Model Picker Modal */}
      {showModelPicker && (
        <View style={[st.modalOverlay, { backgroundColor: theme.glass }]}>
          <View style={[st.modalContent, { backgroundColor: theme.surface }]}>
            <View style={st.modalHeader}>
              <Text style={[st.modalTitle, { color: theme.text }]}>
                Choose AI Model
              </Text>
              <Pressable onPress={() => setShowModelPicker(false)}>
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
              {modelGroups.map(({ provider, models }) => (
                <View key={provider} style={st.aiGroup}>
                  <Text style={[st.aiGroupLabel, { color: theme.textSecondary }]}>
                    {AI_PROVIDER_LABELS[provider]}
                  </Text>
                  {models.map((m) => {
                    const active = m.ref === selectedModel;
                    const status = providerStatus(m.provider);
                    const dotColor =
                      status === "ready"
                        ? theme.primary
                        : status === "unknown"
                          ? theme.textMuted
                          : theme.accent;
                    return (
                      <Pressable
                        key={m.ref}
                        style={[st.aiItemRow, { borderBottomColor: theme.border }]}
                        onPress={() => setCandidateModel(m)}
                      >
                        <View
                          style={[st.aiStatusDot, { backgroundColor: dotColor }]}
                        />
                        <View style={st.aiItemInfo}>
                          <View style={st.aiItemTitleRow}>
                            <Text
                              style={[
                                st.aiItemLabel,
                                {
                                  color: theme.text,
                                  fontWeight: active ? "700" : "400",
                                },
                              ]}
                            >
                              {m.label}
                            </Text>
                            <View
                              style={[
                                st.aiTierChip,
                                {
                                  backgroundColor:
                                    m.tier === "paid"
                                      ? theme.accent + "22"
                                      : theme.primary + "22",
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  st.aiTierText,
                                  {
                                    color:
                                      m.tier === "paid"
                                        ? theme.accent
                                        : theme.primary,
                                  },
                                ]}
                              >
                                {m.tier === "paid" ? "PAID" : "FREE"}
                              </Text>
                            </View>
                            {effectiveRating(m, userRatings) != null && (
                              <View style={[st.aiRatingChip, { backgroundColor: theme.accent + "1A" }]}>
                                <MaterialCommunityIcons name="star" size={11} color={theme.accent} />
                                <Text style={[st.aiRatingText, { color: theme.accent }]}>
                                  {effectiveRating(m, userRatings)}
                                </Text>
                              </View>
                            )}
                          </View>
                          {m.note ? (
                            <Text
                              style={[st.aiItemNote, { color: theme.textMuted }]}
                            >
                              {m.note}
                            </Text>
                          ) : null}
                        </View>
                        {active && (
                          <MaterialIcons
                            name="check"
                            size={20}
                            color={theme.primary}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
              <View style={st.aiPickerHint}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={14}
                  color={theme.textMuted}
                />
                <Text style={[st.aiPickerHintText, { color: theme.textMuted }]}>
                  Green dot = ready to use. Tap a model to view its
                  requirements.
                </Text>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      )}

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
    paddingHorizontal: 12,
    height: 48,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", fontFamily },
  scroll: { paddingTop: 16, paddingBottom: 40 },

  card: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
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

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: "600", fontFamily },
  manageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "transparent",
  },
  manageText: { fontSize: 12, fontWeight: "500", flex: 1, fontFamily },

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
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: { fontSize: 14, fontWeight: "600", fontFamily },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoLabel: { fontSize: 14, fontWeight: "500", fontFamily },
  infoValue: { fontSize: 14, fontWeight: "600", fontFamily },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  linkText: { fontSize: 14, fontWeight: "600", fontFamily },

  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
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
  modalTitle: { fontSize: 18, fontWeight: "800" },
  editorScroll: { maxHeight: 600 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
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
  aiSubRow: { marginBottom: 8 },
  aiSubText: { fontSize: 13, fontFamily },
  aiModelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  aiModelInfo: { flex: 1, marginLeft: 4 },
  aiModelMeta: { fontSize: 12, fontFamily, marginTop: 1 },
  aiNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  aiNoteText: { fontSize: 12, fontFamily, flex: 1 },
  aiGroup: { marginBottom: 12 },
  aiGroupLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  aiItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  aiItemInfo: { flex: 1 },
  aiItemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiItemLabel: { fontSize: 14, fontFamily },
  aiTierChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  aiTierText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily,
    textTransform: "uppercase" as const,
  },
  aiRatingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  aiRatingText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily,
  },
  aiItemNote: { fontSize: 11, fontFamily, marginTop: 2 },
  aiStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 2,
  },
  aiPickerHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  aiPickerHintText: { fontSize: 12, fontFamily, flex: 1 },
});
