import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import type { SchedulableNotificationTriggerInput } from "expo-notifications";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Easing,
  FlatList,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  Modal as RNModal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import FormatToolbar from "../../component/notes/FormatToolbar";
import GlassSheet from "../../component/notes/GlassSheet";
import InfoTip from "../../component/notes/InfoTip";
import NoteChatSheet from "../../component/notes/NoteChatSheet";
import RichTextEditor, {
  type EditorToolbarState,
  type RichTextEditorHandle,
  HELP_LINES,
} from "../../component/notes/RichTextEditor";
import ThemeIcon from "../../component/notes/ThemeIcon";
import VoicePlayerSheet from "../../component/notes/VoicePlayerSheet";
import RecordingPanel from "../../component/RecordingPanel";
import WaveformView from "../../component/WaveformView";
import { bodyFont } from "../../constants/themes";
import { useAuth } from "../../contexts/AuthContext";
import { useThemeColors } from "../../hooks/useTheme";
import { api, ApiError } from "../../lib/api";
import { deleteFileNoThrow, deleteFilesNoThrow } from "../../lib/mediaCleanup";
import { exportNoteAsPdf } from "../../lib/notes/exportNotePdf";
import type { FormatTool } from "../../lib/notes/formatting";
import { requestNotificationPermissions } from "../../lib/notifications";
import {
  normalizeVolumeLevel,
  speechAbort,
  speechRecognitionAvailable,
  speechRequestPermissions,
  speechStart,
  speechStop,
  speechSupportsRecording,
  subscribeSpeechEvent,
} from "../../lib/speech";
import { useNoteStore } from "../../store/noteStore";
import { useStudyStore } from "../../store/studyStore";
import type {
  AudioClip,
  Note,
  NoteImage,
  NoteTag,
  RepeatType,
} from "../../types/note";

const TAG_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#EC4899",
  "#14B8A6",
];

type NotificationsModule = typeof import("expo-notifications");

let notificationsModule: NotificationsModule | null = null;

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (notificationsModule) return notificationsModule;
  try {
    notificationsModule = await import("expo-notifications");
  } catch (err) {
    if (__DEV__) {
      console.warn("[notes] expo-notifications unavailable:", err);
    }
  }
  return notificationsModule;
}

async function cancelNoteNotification(notificationId: string): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(
    () => {},
  );
}

type IconName = Parameters<typeof ThemeIcon>[0]["material"];

function TagSheet({
  visible,
  noteTags,
  allTags,
  onToggleTag,
  onCreateTag,
  onClose,
}: {
  visible: boolean;
  noteTags: string[];
  allTags: NoteTag[];
  onToggleTag: (id: string) => void;
  onCreateTag: () => void;
  onClose: () => void;
}) {
  const theme = useThemeColors();
  return (
    <GlassSheet
      visible={visible}
      onClose={onClose}
      title="Tags"
      subtitle="Attach tags to this note"
    >
      <View style={styles.sheetTags}>
        {allTags.map((tag) => {
          const selected = noteTags.includes(tag.id);
          return (
            <Pressable
              key={tag.id}
              style={[
                styles.sheetTag,
                {
                  backgroundColor: selected
                    ? tag.color + "20"
                    : theme.surfaceAlt,
                  borderColor: selected ? tag.color : theme.borderLight,
                },
              ]}
              onPress={() => onToggleTag(tag.id)}
            >
              <View
                style={[styles.sheetTagDot, { backgroundColor: tag.color }]}
              />
              <Text
                style={[
                  styles.sheetTagName,
                  { color: selected ? tag.color : theme.textSecondary },
                ]}
              >
                {tag.name}
              </Text>
              {selected && (
                <ThemeIcon
                  sf="checkmark"
                  material="check"
                  size={14}
                  color={tag.color}
                  weight="bold"
                />
              )}
            </Pressable>
          );
        })}
      </View>
      <Pressable style={styles.createTagBtn} onPress={onCreateTag}>
        <ThemeIcon
          sf="plus.circle.fill"
          material="plus-circle-outline"
          size={20}
          color={theme.primary}
        />
        <Text style={[styles.createTagText, { color: theme.primary }]}>
          Create new tag
        </Text>
      </Pressable>
    </GlassSheet>
  );
}

interface OverflowTile {
  key: string;
  sf: string;
  material: IconName;
  label: string;
  sub?: string;
  color?: string;
  danger?: boolean;
  active?: boolean;
}

function PressableTile({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style: object;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 5,
    }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <Pressable
        onPressIn={() => animateTo(0.9)}
        onPressOut={() => animateTo(1)}
        onPress={onPress}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function SectionHeader({
  sf,
  material,
  label,
  count,
  color,
}: {
  sf: string;
  material: IconName;
  label: string;
  count: number;
  color: string;
}) {
  const theme = useThemeColors();
  return (
    <View style={styles.sectionHeader}>
      <View
        style={[styles.sectionHeaderChip, { backgroundColor: color + "1A" }]}
      >
        <ThemeIcon
          sf={sf}
          material={material}
          size={12}
          color={color}
          weight="semibold"
        />
      </View>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <View style={[styles.countPill, { backgroundColor: theme.surfaceAlt }]}>
        <Text style={[styles.countText, { color: theme.textMuted }]}>
          {count}
        </Text>
      </View>
    </View>
  );
}

function OverflowSheet({
  visible,
  hasReminder,
  onOption,
  onClose,
}: {
  visible: boolean;
  hasReminder: boolean;
  onOption: (key: string) => void;
  onClose: () => void;
}) {
  const theme = useThemeColors();

  const actions: OverflowTile[] = [
    {
      key: "export",
      sf: "square.and.arrow.down",
      material: "download-outline",
      label: "Export",
      sub: "Save as a file",
      color: theme.info,
    },
    {
      key: "send-study",
      sf: "graduationcap",
      material: "school-outline",
      label: "Send to Study",
      sub: "Add to materials",
      color: theme.success,
    },
    {
      key: "reminder",
      sf: hasReminder ? "bell.fill" : "bell",
      material: hasReminder ? "alarm" : "alarm-plus",
      label: hasReminder ? "Reminder On" : "Reminder",
      sub: "Schedule a nudge",
      color: theme.warning,
    },
    {
      key: "duplicate",
      sf: "plus.rectangle.on.rectangle",
      material: "content-copy",
      label: "Duplicate",
      sub: "Make a copy",
      color: theme.primary,
    },
  ];

  const renderCard = (opt: OverflowTile) => {
    const color = opt.danger
      ? theme.danger
      : (opt.color ?? theme.textSecondary);
    return (
      <PressableTile
        key={opt.key}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onClose();
          onOption(opt.key);
        }}
        style={[styles.actionCard, { borderColor: theme.borderLight }]}
      >
        <LinearGradient
          colors={[color + "44", color + "0F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.actionBadge,
            { borderColor: color + "2E", shadowColor: color },
          ]}
        >
          <ThemeIcon
            sf={opt.sf}
            material={opt.material}
            size={22}
            color={color}
            weight="semibold"
          />
        </LinearGradient>
        <View style={styles.actionText}>
          <Text
            style={[styles.actionLabel, { color: theme.text }]}
            numberOfLines={1}
          >
            {opt.label}
          </Text>
          {opt.sub && (
            <Text
              style={[styles.actionSub, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              {opt.sub}
            </Text>
          )}
        </View>
      </PressableTile>
    );
  };

  return (
    <GlassSheet
      visible={visible}
      onClose={onClose}
      title="More"
      subtitle="Quick actions"
      cornerRadius={36}
    >
      <View style={styles.cardGrid}>{actions.map(renderCard)}</View>
    </GlassSheet>
  );
}

function TagManagerSheet({
  visible,
  tags,
  notes,
  onRename,
  onDelete,
  onCreate,
  onClose,
}: {
  visible: boolean;
  tags: NoteTag[];
  notes: Note[];
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  const theme = useThemeColors();
  if (!visible) return null;
  const noteCounts: Record<string, number> = {};
  for (const n of notes)
    for (const t of n.tags) noteCounts[t] = (noteCounts[t] || 0) + 1;

  return (
    <GlassSheet
      visible={visible}
      onClose={onClose}
      title="Manage Tags"
      subtitle={`${tags.length} total`}
    >
      <View style={styles.tagManagerList}>
        {tags.map((tag) => (
          <View
            key={tag.id}
            style={[
              styles.tagManagerRow,
              { borderBottomColor: theme.borderLight },
            ]}
          >
            <View style={[styles.mentionDot, { backgroundColor: tag.color }]} />
            <Text
              style={[styles.tagManagerName, { color: theme.text }]}
              numberOfLines={1}
            >
              {tag.name}
            </Text>
            <Text style={[styles.tagManagerCount, { color: theme.textMuted }]}>
              {noteCounts[tag.id] || 0} notes
            </Text>
            <Pressable
              onPress={() => {
                onClose();
                onRename(tag.id, tag.name);
              }}
              style={[
                styles.tagManagerAction,
                { backgroundColor: theme.surfaceAlt },
              ]}
            >
              <ThemeIcon
                sf="pencil"
                material="pencil-outline"
                size={15}
                color={theme.textSecondary}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                onClose();
                onDelete(tag.id);
              }}
              style={[
                styles.tagManagerAction,
                { backgroundColor: theme.danger + "15" },
              ]}
            >
              <ThemeIcon
                sf="trash"
                material="delete-outline"
                size={15}
                color={theme.danger}
              />
            </Pressable>
          </View>
        ))}
      </View>
      <Pressable
        style={styles.createTagBtn}
        onPress={() => {
          onClose();
          onCreate();
        }}
      >
        <ThemeIcon
          sf="plus.circle.fill"
          material="plus-circle-outline"
          size={20}
          color={theme.primary}
        />
        <Text style={[styles.createTagText, { color: theme.primary }]}>
          Create new tag
        </Text>
      </Pressable>
    </GlassSheet>
  );
}

function ReminderSheet({
  visible,
  onClose,
  reminderAt,
  pickDate,
  setPickDate,
  pickHours,
  setPickHours,
  pickMinutes,
  setPickMinutes,
  pickAmPm,
  setPickAmPm,
  repeatType,
  setRepeatType,
  onClear,
  onSet,
}: {
  visible: boolean;
  onClose: () => void;
  reminderAt: number | null;
  pickDate: Date;
  setPickDate: React.Dispatch<React.SetStateAction<Date>>;
  pickHours: number;
  setPickHours: React.Dispatch<React.SetStateAction<number>>;
  pickMinutes: number;
  setPickMinutes: React.Dispatch<React.SetStateAction<number>>;
  pickAmPm: "AM" | "PM";
  setPickAmPm: React.Dispatch<React.SetStateAction<"AM" | "PM">>;
  repeatType: RepeatType;
  setRepeatType: React.Dispatch<React.SetStateAction<RepeatType>>;
  onClear: () => void;
  onSet: () => void;
}) {
  const theme = useThemeColors();

  return (
    <GlassSheet
      visible={visible}
      onClose={onClose}
      title="Set Reminder"
      subtitle="Schedule a notification"
    >
      {reminderAt && (
        <Pressable onPress={onClear} style={styles.clearReminderBtn}>
          <ThemeIcon
            sf="xmark.circle.fill"
            material="close-circle-outline"
            size={18}
            color={theme.danger}
          />
          <Text style={[styles.clearReminderText, { color: theme.danger }]}>
            Clear reminder
          </Text>
        </Pressable>
      )}
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        Quick
      </Text>
      <View style={styles.presetRow}>
        <Pressable
          style={[
            styles.presetChip,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.borderLight,
            },
          ]}
          onPress={() => {
            const now = new Date();
            const d = new Date(now);
            d.setHours(18, 0, 0, 0);
            if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
            setPickDate(d);
            setPickHours(6);
            setPickMinutes(0);
            setPickAmPm("PM");
          }}
        >
          <Text style={[styles.presetLabel, { color: theme.text }]}>
            {new Date().getHours() < 18
              ? "Later today: 6:00 PM"
              : "Tomorrow: 6:00 PM"}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.presetChip,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.borderLight,
            },
          ]}
          onPress={() => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            d.setHours(8, 0, 0, 0);
            setPickDate(d);
            setPickHours(8);
            setPickMinutes(0);
            setPickAmPm("AM");
          }}
        >
          <Text style={[styles.presetLabel, { color: theme.text }]}>
            Tomorrow morning: 8:00 AM
          </Text>
        </Pressable>
      </View>
      <View style={styles.presetRow}>
        {[1, 2].map((hours) => {
          const target = new Date(Date.now() + hours * 3600000);
          return (
            <Pressable
              key={hours}
              style={[
                styles.presetChip,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.borderLight,
                },
              ]}
              onPress={() => {
                setPickDate(target);
                const h = target.getHours();
                setPickHours(h === 0 ? 12 : h > 12 ? h - 12 : h);
                setPickMinutes(target.getMinutes());
                setPickAmPm(h >= 12 ? "PM" : "AM");
              }}
            >
              <Text style={[styles.presetLabel, { color: theme.text }]}>
                In {hours} hour{hours > 1 ? "s" : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        Date
      </Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={Array.from({ length: 14 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          return d;
        })}
        keyExtractor={(d) => d.toDateString()}
        contentContainerStyle={styles.dateRow}
        renderItem={({ item }) => {
          const isSelected = item.toDateString() === pickDate.toDateString();
          return (
            <Pressable
              style={[
                styles.dateChip,
                {
                  backgroundColor: isSelected
                    ? theme.primary
                    : theme.surfaceAlt,
                  borderColor: isSelected ? theme.primary : theme.borderLight,
                },
              ]}
              onPress={() => setPickDate(item)}
            >
              <Text
                style={[
                  styles.dateChipDay,
                  { color: isSelected ? "#FFF" : theme.textSecondary },
                ]}
              >
                {item.toLocaleDateString("en-US", { weekday: "short" })}
              </Text>
              <Text
                style={[
                  styles.dateChipNum,
                  { color: isSelected ? "#FFF" : theme.text },
                ]}
              >
                {item.getDate()}
              </Text>
            </Pressable>
          );
        }}
      />
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        Time
      </Text>
      <View style={styles.timeRow}>
        <Pressable
          style={[styles.timeStepper, { backgroundColor: theme.surfaceAlt }]}
          onPress={() => setPickHours((h) => (h === 12 ? 1 : h + 1))}
        >
          <ThemeIcon
            sf="chevron.up"
            material="chevron-up"
            size={16}
            color={theme.text}
          />
        </Pressable>
        <Text style={[styles.timeValue, { color: theme.text }]}>
          {pickHours}
        </Text>
        <Pressable
          style={[styles.timeStepper, { backgroundColor: theme.surfaceAlt }]}
          onPress={() => setPickHours((h) => (h === 1 ? 12 : h - 1))}
        >
          <ThemeIcon
            sf="chevron.down"
            material="chevron-down"
            size={16}
            color={theme.text}
          />
        </Pressable>
        <Text style={[styles.timeColon, { color: theme.text }]}>:</Text>
        <Pressable
          style={[styles.timeStepper, { backgroundColor: theme.surfaceAlt }]}
          onPress={() => setPickMinutes((m) => (m + 1) % 60)}
        >
          <ThemeIcon
            sf="chevron.up"
            material="chevron-up"
            size={16}
            color={theme.text}
          />
        </Pressable>
        <Text style={[styles.timeValue, { color: theme.text }]}>
          {String(pickMinutes).padStart(2, "0")}
        </Text>
        <Pressable
          style={[styles.timeStepper, { backgroundColor: theme.surfaceAlt }]}
          onPress={() => setPickMinutes((m) => (m - 1 + 60) % 60)}
        >
          <ThemeIcon
            sf="chevron.down"
            material="chevron-down"
            size={16}
            color={theme.text}
          />
        </Pressable>
        <Pressable
          style={[
            styles.ampmToggle,
            {
              backgroundColor:
                pickAmPm === "AM" ? theme.primary : theme.surfaceAlt,
            },
          ]}
          onPress={() => setPickAmPm((p) => (p === "AM" ? "PM" : "AM"))}
        >
          <Text
            style={[
              styles.ampmText,
              { color: pickAmPm === "AM" ? "#FFF" : theme.text },
            ]}
          >
            AM
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.ampmToggle,
            {
              backgroundColor:
                pickAmPm === "PM" ? theme.primary : theme.surfaceAlt,
            },
          ]}
          onPress={() => setPickAmPm((p) => (p === "AM" ? "PM" : "AM"))}
        >
          <Text
            style={[
              styles.ampmText,
              { color: pickAmPm === "PM" ? "#FFF" : theme.text },
            ]}
          >
            PM
          </Text>
        </Pressable>
      </View>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        Repeat
      </Text>
      <View style={styles.repeatRow}>
        {(["none", "daily", "weekly", "monthly"] as const).map((r) => (
          <Pressable
            key={r}
            style={[
              styles.repeatChip,
              {
                backgroundColor:
                  repeatType === r ? theme.primary : theme.surfaceAlt,
              },
            ]}
            onPress={() => setRepeatType(r)}
          >
            <Text
              style={[
                styles.repeatLabel,
                { color: repeatType === r ? "#FFF" : theme.text },
              ]}
            >
              {r === "none" ? "Never" : r.charAt(0).toUpperCase() + r.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={[styles.reminderConfirm, { backgroundColor: theme.primary }]}
        onPress={onSet}
      >
        <Text style={styles.reminderConfirmText}>Set</Text>
      </Pressable>
    </GlassSheet>
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function transcribeErrorMessage(err: unknown): string {
  if (err instanceof ApiError && (err.status === 503 || err.status === 429)) {
    return "AI transcription is temporarily busy. Please try again in a few seconds.";
  }
  return err instanceof Error && err.message
    ? err.message
    : "Could not transcribe audio.";
}

function getDateLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function groupImagesByDate(
  images: NoteImage[],
): { label: string; items: NoteImage[] }[] {
  const groups: Record<string, NoteImage[]> = {};
  for (const img of images) {
    const label = getDateLabel(img.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(img);
  }
  const order = ["Today", "Yesterday"];
  return Object.entries(groups)
    .sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return new Date(b).getTime() - new Date(a).getTime();
    })
    .map(([label, items]) => ({ label, items }));
}

const NOTE_TABS = [
  { key: "editor", label: "Note" },
  { key: "copilot", label: "AI Copilot" },
] as const;

type NoteTab = (typeof NOTE_TABS)[number]["key"];

function NoteSegmentedControl({
  active,
  onChange,
}: {
  active: NoteTab;
  onChange: (tab: NoteTab) => void;
}) {
  const theme = useThemeColors();
  const [width, setWidth] = useState(0);
  const [showNoteHelp, setShowNoteHelp] = useState(false);
  const thumbAnim = useRef(new Animated.Value(0)).current;

  const slotWidth = Math.max(0, (width - 24) / NOTE_TABS.length);

  useEffect(() => {
    const index = NOTE_TABS.findIndex((t) => t.key === active);
    Animated.spring(thumbAnim, {
      toValue: index * (slotWidth + 8),
      useNativeDriver: true,
      damping: 22,
      stiffness: 260,
      mass: 0.9,
    }).start();
  }, [active, slotWidth, thumbAnim]);

  return (
    <View
      style={[
        styles.segmentWrap,
        { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight },
      ]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <Animated.View
          style={[
            styles.segmentThumb,
            {
              width: slotWidth,
              backgroundColor: theme.glass,
              borderColor: theme.borderLight,
              transform: [{ translateX: thumbAnim }],
            },
          ]}
        />
      )}
      {NOTE_TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(tab.key);
            }}
            style={styles.segmentPressable}
          >
            {tab.key === "editor" ? (
              <View style={styles.segmentLabelRow}>
                <Text
                  style={[
                    styles.segmentLabel,
                    {
                      color: isActive ? theme.text : theme.textSecondary,
                      fontWeight: isActive ? "700" : "500",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
                <InfoTip
                  lines={HELP_LINES}
                  open={showNoteHelp}
                  onToggle={() => setShowNoteHelp((v) => !v)}
                  anchor="left"
                  closeSignal={active !== "editor"}
                />
              </View>
            ) : (
              <Text
                style={[
                  styles.segmentLabel,
                  {
                    color: isActive ? theme.text : theme.textSecondary,
                    fontWeight: isActive ? "700" : "500",
                  },
                ]}
              >
                {tab.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function PhotoGallery({
  images: imgs,
  onDelete,
}: {
  images: NoteImage[];
  onDelete: (id: string) => void;
}) {
  const theme = useThemeColors();
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const groups = groupImagesByDate(imgs);

  return (
    <View style={pgStyles.wrapper}>
      {groups.map((group) => (
        <View key={group.label} style={pgStyles.group}>
          <Text style={[pgStyles.groupLabel, { color: theme.textMuted }]}>
            {group.label}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={pgStyles.row}
          >
            {group.items.map((img) => (
              <Pressable
                key={img.id}
                onPress={() => setFullscreenImg(img.uri)}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  Alert.alert("Delete Photo", "Remove this photo?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => onDelete(img.id),
                    },
                  ]);
                }}
              >
                <View
                  style={[
                    pgStyles.thumbWrap,
                    { borderColor: theme.borderLight },
                  ]}
                >
                  <Image
                    source={{ uri: img.uri }}
                    style={pgStyles.thumb}
                    contentFit="cover"
                  />
                  <View style={pgStyles.thumbOverlay}>
                    <ThemeIcon
                      sf="trash"
                      material="delete-outline"
                      size={11}
                      color="#FFFFFF"
                    />
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ))}
      <RNModal
        visible={!!fullscreenImg}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImg(null)}
      >
        <Pressable
          style={pgStyles.fullscreenOverlay}
          onPress={() => setFullscreenImg(null)}
        >
          {fullscreenImg && (
            <Image
              source={{ uri: fullscreenImg }}
              style={pgStyles.fullscreenImg}
              contentFit="contain"
            />
          )}
        </Pressable>
      </RNModal>
    </View>
  );
}

const pgStyles = StyleSheet.create({
  wrapper: { marginTop: 20, gap: 14 },
  group: {},
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 2,
  },
  row: { gap: 10 },
  thumbWrap: {
    width: 96,
    height: 96,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 96, height: 96, backgroundColor: "#14142A" },
  thumbOverlay: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImg: { width: "100%", height: "100%" },
});

export default function NoteEditorScreen() {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const router = useRouter();
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const isNew = !noteId || noteId === "new";
  const { getToken } = useAuth();

  const notes = useNoteStore((s) => s.notes);
  const tags = useNoteStore((s) => s.tags);
  const createNote = useNoteStore((s) => s.createNote);
  const updateNote = useNoteStore((s) => s.updateNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const addTag = useNoteStore((s) => s.addTag);
  const updateTag = useNoteStore((s) => s.updateTag);
  const deleteTag = useNoteStore((s) => s.deleteTag);
  const togglePin = useNoteStore((s) => s.togglePin);
  const indexNote = useNoteStore((s) => s.indexNote);
  const unindexNote = useNoteStore((s) => s.unindexNote);

  const existing = useMemo(
    () => notes.find((n) => n.id === noteId),
    [notes, noteId],
  );
  const [title, setTitle] = useState(existing?.title ?? "");
  const [content, setContent] = useState(existing?.content ?? "");
  const [noteTags, setNoteTags] = useState<string[]>(existing?.tags ?? []);
  const [images, setImages] = useState<NoteImage[]>(existing?.images ?? []);
  const [pinned, setPinned] = useState(existing?.pinned ?? false);
  const [reminderAt, setReminderAt] = useState<number | null>(
    existing?.reminderAt ?? null,
  );
  const [repeatType, setRepeatType] = useState<RepeatType>(
    existing?.repeatType ?? "none",
  );
  const [audioClips, setAudioClips] = useState<AudioClip[]>(
    existing?.audioClips ?? [],
  );
  const [activeTab, setActiveTab] = useState<NoteTab>("editor");
  const [showTags, setShowTags] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [pickDate, setPickDate] = useState(
    existing?.reminderAt ? new Date(existing.reminderAt) : new Date(),
  );
  const [pickHours, setPickHours] = useState(() => {
    const d = existing?.reminderAt ? new Date(existing.reminderAt) : new Date();
    const h = d.getHours();
    return h === 0 ? 12 : h > 12 ? h - 12 : h;
  });
  const [pickMinutes, setPickMinutes] = useState(() => {
    const d = existing?.reminderAt ? new Date(existing.reminderAt) : new Date();
    return d.getMinutes();
  });
  const [pickAmPm, setPickAmPm] = useState<"AM" | "PM">(() => {
    if (existing?.reminderAt)
      return new Date(existing.reminderAt).getHours() >= 12 ? "PM" : "AM";
    return new Date().getHours() >= 12 ? "PM" : "AM";
  });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [tagSuggestions, setTagSuggestions] = useState<NoteTag[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const cursorRef = useRef({ start: 0, end: 0 });
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [editorToolbar, setEditorToolbar] = useState<EditorToolbarState | null>(
    null,
  );
  const formatBarIn = useRef(new Animated.Value(0)).current;
  const [floatingBarH, setFloatingBarH] = useState(0);
  const [sharing, setSharing] = useState(false);
  const recTimerIn = useRef(new Animated.Value(0)).current;

  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(recorder, 100);
  const player = useAudioPlayer(undefined);
  const playerStatus = useAudioPlayerStatus(player);
  const [currentPlayClipId, setCurrentPlayClipId] = useState<string | null>(
    null,
  );
  const [playProgress, setPlayProgress] = useState(0);
  const [playerSheetClip, setPlayerSheetClip] = useState<AudioClip | null>(
    null,
  );
  const [transcribingClipId, setTranscribingClipId] = useState<string | null>(
    null,
  );
  const waveformSamples = useRef<number[]>([]);
  const recordingStartTime = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const hasContentRef = useRef(false);
  const wasAutoCreated = useRef(false);

  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [volumeLevel, setVolumeLevel] = useState(0);
  const finalTextRef = useRef("");
  const interimTextRef = useRef("");
  const recordingModeRef = useRef<"stt" | "fallback">("stt");
  const stopShouldInsertRef = useRef(false);
  const audioFinalizedRef = useRef(false);
  const listeningRef = useRef(false);

  const hasContent = useCallback(() => {
    return (
      title.trim().length > 0 ||
      content.trim().length > 0 ||
      images.length > 0 ||
      audioClips.length > 0
    );
  }, [title, content, images, audioClips]);

  useEffect(() => {
    if (hasContent()) hasContentRef.current = true;
  }, [title, content, images, audioClips, hasContent]);

  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (
      recordingModeRef.current === "fallback" &&
      isRecording &&
      recorderState.metering !== undefined
    ) {
      waveformSamples.current.push(
        Math.max(0, (recorderState.metering + 60) / 60),
      );
      setVolumeLevel(Math.max(0, (recorderState.metering + 60) / 60));
    }
  }, [isRecording, recorderState.metering]);

  useEffect(() => {
    if (!playerStatus.isLoaded || !currentPlayClipId) {
      setPlayProgress(0);
      return;
    }
    if (playerStatus.duration > 0) {
      setPlayProgress(playerStatus.currentTime / playerStatus.duration);
      const realMs = Math.round(playerStatus.duration * 1000);
      setAudioClips((prev) =>
        prev.some((c) => c.id === currentPlayClipId && c.duration === realMs)
          ? prev
          : prev.map((c) =>
              c.id === currentPlayClipId ? { ...c, duration: realMs } : c,
            ),
      );
    }
  }, [
    playerStatus.currentTime,
    playerStatus.duration,
    playerStatus.isLoaded,
    currentPlayClipId,
  ]);

  const resetRecordingUI = useCallback(() => {
    waveformSamples.current = [];
    setRecordingElapsed(0);
    setVolumeLevel(0);
    setLiveTranscript("");
    finalTextRef.current = "";
    interimTextRef.current = "";
    audioFinalizedRef.current = false;
    listeningRef.current = false;
  }, []);

  const handleAbortRecording = useCallback(async () => {
    if (recordingModeRef.current === "stt") {
      speechAbort();
    } else {
      try {
        await recorder.stop();
      } catch {
        /* ignore */
      }
      setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        allowsBackgroundRecording: false,
      }).catch(() => {});
    }
    stopShouldInsertRef.current = false;
    setIsRecording(false);
    resetRecordingUI();
  }, [recorder, resetRecordingUI]);

  useEffect(() => {
    return () => {
      if (isRecording) {
        handleAbortRecording();
      }
    };
  }, [isRecording, handleAbortRecording]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setRecordingElapsed(Date.now() - recordingStartTime.current);
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording || recordingModeRef.current !== "stt") return;
    finalTextRef.current = "";
    interimTextRef.current = "";
    setLiveTranscript("");
    audioFinalizedRef.current = false;
    recordingStartTime.current = Date.now();

    const removeStart = subscribeSpeechEvent("start", () => {
      listeningRef.current = true;
      setRecordingElapsed(0);
    });
    const removeAudioStart = subscribeSpeechEvent("audiostart", (evt) => {
      recordingStartTime.current = evt.timestamp;
      waveformSamples.current = [];
    });
    const removeResult = subscribeSpeechEvent("result", (evt) => {
      const first = evt.results?.[0];
      if (!first) return;
      if (evt.isFinal) {
        finalTextRef.current = [finalTextRef.current, first.transcript]
          .filter(Boolean)
          .join(" ");
        interimTextRef.current = "";
      } else {
        interimTextRef.current = first.transcript;
      }
      setLiveTranscript(
        [finalTextRef.current, interimTextRef.current]
          .filter(Boolean)
          .join(" "),
      );
    });
    const removeVolume = subscribeSpeechEvent("volumechange", (evt) => {
      const level = normalizeVolumeLevel(evt.value);
      setVolumeLevel(level);
      waveformSamples.current.push(level);
    });
    const removeAudioEnd = subscribeSpeechEvent("audioend", (evt) => {
      const uri = evt.uri;
      const duration = Math.max(
        0,
        (evt.timestamp || Date.now()) -
          (recordingStartTime.current || Date.now()),
      );
      if (!audioFinalizedRef.current && uri) {
        audioFinalizedRef.current = true;
        const wf = waveformSamples.current.length
          ? [...waveformSamples.current]
          : [];
        setAudioClips((prev) => [
          ...prev,
          {
            id: `audio_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            uri,
            duration,
            createdAt: Date.now(),
            waveform: wf,
          },
        ]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      waveformSamples.current = [];
    });
    const removeEnd = subscribeSpeechEvent("end", () => {
      listeningRef.current = false;
      setIsRecording(false);
      setVolumeLevel(0);
      setLiveTranscript("");
      const transcript = [finalTextRef.current, interimTextRef.current]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (stopShouldInsertRef.current && transcript) {
        setContent((prev) => {
          const block = `## Transcript\n\n${transcript}`;
          return prev.trimEnd() ? `${prev.trimEnd()}\n\n${block}` : block;
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      stopShouldInsertRef.current = false;
      finalTextRef.current = "";
      interimTextRef.current = "";
    });
    const removeError = subscribeSpeechEvent("error", (evt) => {
      listeningRef.current = false;
      setIsRecording(false);
      setVolumeLevel(0);
      stopShouldInsertRef.current = false;
      finalTextRef.current = "";
      interimTextRef.current = "";
      setLiveTranscript("");
      Alert.alert(
        "Voice input stopped",
        evt.message || "Speech recognition ended unexpectedly.",
      );
    });
    return () => {
      removeStart();
      removeAudioStart();
      removeResult();
      removeVolume();
      removeAudioEnd();
      removeEnd();
      removeError();
    };
  }, [isRecording]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteIdRef = useRef<string | null>(null);
  const lastIndexedRef = useRef<{ title: string; content: string } | null>(
    existing?.title.trim() && existing?.content.trim()
      ? { title: existing.title.trim(), content: existing.content.trim() }
      : null,
  );

  const currentNoteId = useMemo(() => {
    if (editingNoteId) return editingNoteId;
    if (existing?.id) return existing.id;
    return null;
  }, [editingNoteId, existing]);

  useEffect(() => {
    noteIdRef.current = currentNoteId;
  }, [currentNoteId]);

  useEffect(() => {
    if (isNew && !editingNoteId) {
      const id = createNote();
      setEditingNoteId(id);
      wasAutoCreated.current = true;
    }
  }, [isNew, editingNoteId, createNote]);

  const doSave = useCallback(
    (
      t: string,
      c: string,
      tagsArr: string[],
      pin: boolean,
      reminder: number | null,
      rt: RepeatType,
      clips: AudioClip[],
      imgs: NoteImage[],
    ) => {
      const id = noteIdRef.current;
      if (!id) return;
      if (!t.trim() && !c.trim() && imgs.length === 0 && clips.length === 0)
        return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateNote(id, {
          title: t,
          content: c,
          tags: tagsArr,
          pinned: pin,
          reminderAt: reminder,
          repeatType: rt,
          audioClips: clips,
          images: imgs,
        });
        const tTrim = t.trim();
        const cTrim = c.trim();
        const shouldIndex = Boolean(tTrim && cTrim);
        const prevIndexed = lastIndexedRef.current;
        if (shouldIndex) {
          if (
            !prevIndexed ||
            prevIndexed.title !== tTrim ||
            prevIndexed.content !== cTrim
          ) {
            indexNote(id, tTrim, cTrim, getToken);
            lastIndexedRef.current = { title: tTrim, content: cTrim };
          }
        } else if (prevIndexed) {
          unindexNote(id, getToken);
          lastIndexedRef.current = null;
        }
      }, 1500);
    },
    [updateNote, indexNote, unindexNote, getToken],
  );

  useEffect(() => {
    doSave(
      title,
      content,
      noteTags,
      pinned,
      reminderAt,
      repeatType,
      audioClips,
      images,
    );
  }, [
    title,
    content,
    noteTags,
    pinned,
    reminderAt,
    repeatType,
    audioClips,
    images,
    doSave,
  ]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const saveImmediately = useCallback(() => {
    const id = noteIdRef.current;
    if (!id) return;
    if (
      !title.trim() &&
      !content.trim() &&
      images.length === 0 &&
      audioClips.length === 0
    ) {
      if (wasAutoCreated.current) deleteNote(id);
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    updateNote(id, {
      title,
      content,
      tags: noteTags,
      pinned: pinned,
      reminderAt,
      repeatType,
      audioClips,
      images,
    });
  }, [
    title,
    content,
    noteTags,
    pinned,
    reminderAt,
    repeatType,
    audioClips,
    images,
    updateNote,
    deleteNote,
  ]);

  const handleBack = useCallback(() => {
    saveImmediately();
    router.back();
  }, [saveImmediately, router]);

  const handleDelete = useCallback(() => {
    const id = editingNoteId || existing?.id;
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Delete Note", `Delete "${title || "Untitled"}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (existing?.notificationId) {
            cancelNoteNotification(existing.notificationId);
          }
          unindexNote(id, getToken);
          if (existing) {
            deleteFilesNoThrow([
              ...(existing.images ?? []).map((i) => i.uri),
              ...(existing.audioClips ?? []).map((c) => c.uri),
            ]);
          }
          deleteNote(id);
          router.back();
        },
      },
    ]);
  }, [
    editingNoteId,
    existing,
    title,
    deleteNote,
    router,
    unindexNote,
    getToken,
  ]);

  const handleTogglePin = useCallback(() => {
    const id = editingNoteId || existing?.id;
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    togglePin(id);
    setPinned(!pinned);
  }, [editingNoteId, existing?.id, togglePin, pinned]);

  const handleToggleTag = useCallback((tagId: string) => {
    setNoteTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    );
  }, []);

  const handleProcessCompletedTag = useCallback(
    (tagName: string) => {
      if (!tagName) return;
      const existing = tags.find(
        (t) => t.name.toLowerCase() === tagName.toLowerCase(),
      );
      if (existing) {
        if (!noteTags.includes(existing.id)) {
          setNoteTags((prev) => [...prev, existing.id]);
        }
      } else {
        const color = TAG_COLORS[tags.length % TAG_COLORS.length];
        const tag = addTag(tagName, color);
        setNoteTags((prev) => [...prev, tag.id]);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [tags, noteTags, addTag],
  );

  const handleTagInput = useCallback(
    (text: string) => {
      const pos = cursorRef.current.end ?? text.length;
      const beforeCursor = text.slice(0, pos);

      const activeMatch = beforeCursor.match(/#(\w*)$/);
      if (activeMatch) {
        const query = activeMatch[1].toLowerCase();
        setTagQuery(activeMatch[1]);
        const filtered = tags.filter((t) =>
          t.name.toLowerCase().startsWith(query),
        );
        setTagSuggestions(filtered);
        setShowTagSuggestions(true);
      } else {
        const completedMatch = beforeCursor.match(/#(\w+)\s$/);
        if (completedMatch) {
          const tagName = completedMatch[1];
          if (tagName) handleProcessCompletedTag(tagName);
        }
        setShowTagSuggestions(false);
        setTagSuggestions([]);
      }
    },
    [tags, handleProcessCompletedTag],
  );

  const handleCreateFromPanel = useCallback(
    (tagName: string) => {
      const pos = cursorRef.current.end ?? content.length;
      const beforeCursor = content.slice(0, pos);
      const afterCursor = content.slice(pos);
      const match = beforeCursor.match(/#(\w*)$/);
      if (match) {
        const newContent =
          beforeCursor.slice(0, -match[0].length) +
          `#${tagName} ` +
          afterCursor;
        setContent(newContent);
      }
      setShowTagSuggestions(false);
      setTagSuggestions([]);
      const existing = tags.find(
        (t) => t.name.toLowerCase() === tagName.toLowerCase(),
      );
      if (existing) {
        if (!noteTags.includes(existing.id)) {
          setNoteTags((prev) => [...prev, existing.id]);
        }
      } else {
        const color = TAG_COLORS[tags.length % TAG_COLORS.length];
        const tag = addTag(tagName, color);
        setNoteTags((prev) => [...prev, tag.id]);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [content, tags, noteTags, addTag],
  );

  const handleSelectTagSuggestion = useCallback(
    (tag: NoteTag) => {
      const pos = cursorRef.current.end ?? content.length;
      const beforeCursor = content.slice(0, pos);
      const afterCursor = content.slice(pos);
      const match = beforeCursor.match(/#(\w*)$/);
      if (match) {
        const newContent =
          beforeCursor.slice(0, -match[0].length) +
          `#${tag.name} ` +
          afterCursor;
        setContent(newContent);
      }
      if (!noteTags.includes(tag.id)) {
        setNoteTags((prev) => [...prev, tag.id]);
      }
      setShowTagSuggestions(false);
      setTagSuggestions([]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [content, noteTags],
  );

  const handleCreateTag = useCallback(() => {
    Alert.prompt(
      "New Tag",
      "Enter tag name:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: (text?: string) => {
            if (!text?.trim()) return;
            const color = TAG_COLORS[tags.length % TAG_COLORS.length];
            const tag = addTag(text.trim(), color);
            setNoteTags((prev) => [...prev, tag.id]);
            setShowTags(false);
          },
        },
      ],
      "plain-text",
    );
  }, [tags.length, addTag]);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Needed",
        "Camera permission is required to take photos.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      const img: NoteImage = {
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        uri: asset.uri,
        createdAt: Date.now(),
      };
      setImages((prev) => [...prev, img]);
    }
  }, []);

  const handleDeleteImage = useCallback(
    (imageId: string) => {
      const target = images.find((i) => i.id === imageId);
      setImages((prev) => prev.filter((i) => i.id !== imageId));
      if (target) deleteFileNoThrow(target.uri);
    },
    [images],
  );

  const handleSetReminder = useCallback(async () => {
    setShowReminderPicker(false);
    const d = new Date(pickDate);
    let hours = pickHours;
    if (pickAmPm === "PM" && hours !== 12) hours += 12;
    if (pickAmPm === "AM" && hours === 12) hours = 0;
    d.setHours(hours, pickMinutes, 0, 0);
    const reminderTime = d.getTime();
    if (reminderTime <= Date.now()) {
      Alert.alert("Invalid time", "Please pick a future time.");
      return;
    }
    try {
      const id = editingNoteId || existing?.id;
      if (!id) return;
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert(
          "Permission Required",
          "Notification permission is needed to set a reminder. Would you like to open Settings?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      if (existing?.notificationId) {
        await cancelNoteNotification(existing.notificationId);
      }
      const Notifications = await loadNotifications();
      if (!Notifications) {
        Alert.alert(
          "Unavailable",
          "Reminders are not supported in Expo Go. Use a development build.",
        );
        return;
      }
      let trigger: SchedulableNotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: d,
      };
      if (repeatType === "daily") {
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: d.getHours(),
          minute: d.getMinutes(),
        };
      } else if (repeatType === "weekly") {
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: d.getDay() + 1,
          hour: d.getHours(),
          minute: d.getMinutes(),
        };
      } else if (repeatType === "monthly") {
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
          day: d.getDate(),
          hour: d.getHours(),
          minute: d.getMinutes(),
        };
      }
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Note Reminder",
          body: title || "Untitled note",
          data: { noteId: id },
        },
        trigger,
      });
      setReminderAt(reminderTime);
      updateNote(id, { reminderAt: reminderTime, notificationId, repeatType });
    } catch (err) {
      console.error("[NoteEditor] schedule reminder failed:", err);
      Alert.alert("Error", "Failed to set reminder.");
    }
  }, [
    pickDate,
    pickHours,
    pickMinutes,
    pickAmPm,
    repeatType,
    existing,
    editingNoteId,
    title,
    updateNote,
  ]);

  const handleClearReminder = useCallback(() => {
    const id = editingNoteId || existing?.id;
    if (!id) return;
    if (existing?.notificationId) {
      cancelNoteNotification(existing.notificationId);
    }
    setReminderAt(null);
    updateNote(id, { reminderAt: null, notificationId: null });
  }, [editingNoteId, existing, updateNote]);

  const handleStartRecording = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const useStt = speechRecognitionAvailable() && speechSupportsRecording();
      if (useStt) {
        const granted = await speechRequestPermissions();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Microphone access is needed to record audio.",
          );
          return;
        }
        recordingModeRef.current = "stt";
        waveformSamples.current = [];
        finalTextRef.current = "";
        interimTextRef.current = "";
        setLiveTranscript("");
        audioFinalizedRef.current = false;
        stopShouldInsertRef.current = true;
        speechStart({
          lang: "en-US",
          interimResults: true,
          continuous: true,
          addsPunctuation: true,
          recordingOptions: { persist: true },
          volumeChangeEventOptions: { enabled: true, intervalMillis: 70 },
        });
      } else {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Microphone access is needed to record audio.",
          );
          return;
        }
        recordingModeRef.current = "fallback";
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          allowsBackgroundRecording: false,
        });
        waveformSamples.current = [];
        recordingStartTime.current = Date.now();
        await recorder.prepareToRecordAsync();
        recorder.record();
      }
      setIsRecording(true);
    } catch (err) {
      console.error("[NoteEditor] start recording failed:", err);
      Alert.alert(
        "Recording unavailable",
        "Voice recording needs the expo-speech-recognition or expo-audio native module. Run a development build (npx expo run:android / run:ios).",
      );
    }
  }, [recorder]);

  const handleStopRecording = useCallback(async () => {
    stopShouldInsertRef.current = true;
    if (recordingModeRef.current === "stt") {
      speechStop();
      return;
    }
    try {
      await recorder.stop();
    } catch {
      /* ignore */
    }
    const state = recorder.getStatus();
    if (state.url) {
      const wf = waveformSamples.current.length ? waveformSamples.current : [];
      const recordedMs = Math.max(
        state.durationMillis ?? 0,
        Math.max(0, Date.now() - recordingStartTime.current),
      );
      const clip = {
        id: `audio_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        uri: state.url,
        duration: recordedMs,
        createdAt: Date.now(),
        waveform: wf,
      };
      setAudioClips((prev) => [...prev, clip]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsRecording(false);
    resetRecordingUI();
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      allowsBackgroundRecording: false,
    }).catch(() => {});
  }, [recorder, resetRecordingUI]);

  const handleRecordToggle = useCallback(async () => {
    if (isRecording) {
      await handleStopRecording();
    } else {
      await handleStartRecording();
    }
  }, [isRecording, handleStartRecording, handleStopRecording]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev === "active" && nextState !== "active" && isRecording) {
        handleStopRecording();
      }
    });
    return () => sub.remove();
  }, [isRecording, handleStopRecording]);

  const handlePlayClip = useCallback(
    (clip: AudioClip) => {
      if (currentPlayClipId === clip.id) {
        if (playerStatus.playing) {
          player.pause();
        } else {
          player.play();
        }
      } else {
        setCurrentPlayClipId(clip.id);
        player.replace(clip.uri);
        player.play();
      }
    },
    [currentPlayClipId, player, playerStatus.playing],
  );

  const handleDeleteClip = useCallback(
    (clipId: string) => {
      const target = audioClips.find((c) => c.id === clipId);
      setAudioClips((prev) => prev.filter((c) => c.id !== clipId));
      if (currentPlayClipId === clipId) {
        player.pause();
        setCurrentPlayClipId(null);
      }
      if (playerSheetClip?.id === clipId) setPlayerSheetClip(null);
      if (target) deleteFileNoThrow(target.uri);
    },
    [audioClips, currentPlayClipId, player, playerSheetClip],
  );

  const openVoicePlayer = useCallback(
    (clip: AudioClip) => {
      setPlayerSheetClip(clip);
      if (currentPlayClipId === clip.id) {
        if (!playerStatus.playing) player.play();
      } else {
        setCurrentPlayClipId(clip.id);
        player.replace(clip.uri);
        player.play();
      }
    },
    [currentPlayClipId, player, playerStatus.playing],
  );

  const handleSeek = useCallback(
    (seconds: number) => {
      try {
        player.seekTo(seconds);
      } catch (err) {
        console.error("[NoteEditor] seek failed:", err);
      }
    },
    [player],
  );

  const handleDeleteFromPlayer = useCallback(() => {
    if (!playerSheetClip) return;
    Alert.alert("Delete recording", `Delete this voice note?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDeleteClip(playerSheetClip.id),
      },
    ]);
  }, [playerSheetClip, handleDeleteClip]);

  const handleTranscribeClip = useCallback(async () => {
    if (!playerSheetClip) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTranscribingClipId(playerSheetClip.id);
    try {
      const base64 = await new File(playerSheetClip.uri).base64();
      const result = await api.audio.transcribe(
        { base64, mimeType: "audio/mp4" },
        getToken,
      );
      const text = result?.transcript?.trim();
      if (!text) {
        Alert.alert("Empty transcript", "No speech detected in the recording.");
        return;
      }
      setAudioClips((prev) =>
        prev.map((c) =>
          c.id === playerSheetClip.id ? { ...c, transcript: text } : c,
        ),
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error("[NoteEditor] transcribe clip failed:", err);
      Alert.alert("Transcribe failed", transcribeErrorMessage(err));
    } finally {
      setTranscribingClipId(null);
    }
  }, [playerSheetClip, getToken]);

  const handleAddTranscriptToNote = useCallback(() => {
    if (!playerSheetClip?.transcript) return;
    const text = playerSheetClip.transcript;
    setContent((prev) => {
      const pos = cursorRef.current.end ?? prev.length;
      return prev.slice(0, pos) + `\n\n[Transcript]\n${text}` + prev.slice(pos);
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPlayerSheetClip(null);
  }, [playerSheetClip]);

  const handleTranscribeAudio = useCallback(async () => {
    if (audioClips.length === 0) {
      Alert.alert("No audio", "Record an audio clip first to transcribe it.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const inserts: string[] = [];
    try {
      for (const clip of audioClips) {
        const base64 = await new File(clip.uri).base64();
        const result = await api.audio.transcribe(
          { base64, mimeType: "audio/mp4" },
          getToken,
        );
        if (result?.transcript?.trim()) inserts.push(result.transcript.trim());
      }
    } catch (err: any) {
      console.error("[NoteEditor] transcribe failed:", err);
      Alert.alert("Transcribe failed", transcribeErrorMessage(err));
      return;
    }
    if (inserts.length === 0) {
      Alert.alert("Empty transcript", "No speech detected in the recording.");
      return;
    }
    const block = `\n\n[Transcript]\n${inserts.join("\n\n")}`;
    setContent((prev) => {
      const pos = cursorRef.current.end ?? prev.length;
      return prev.slice(0, pos) + block + prev.slice(pos);
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [audioClips, getToken]);

  const handleSendToStudy = useCallback(async () => {
    const text = `${title}\n\n${content}`.trim();
    if (!text) {
      Alert.alert("Nothing to send", "Add some text to your note first.");
      return;
    }
    saveImmediately();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const material = await useStudyStore.getState().processMaterial(
        {
          fileType: "txt",
          sourceType: "note",
          title: title || "Note",
          content: text,
        },
        getToken,
      );
      if (material && material.id && !material.id.startsWith("processing_")) {
        Alert.alert(
          "Sent to Study",
          `"${material.title}" is now in study materials.`,
        );
      }
    } catch (err: any) {
      console.error("[NoteEditor] send-to-study failed:", err);
      Alert.alert("Failed", err.message || "Could not send note to Study.");
    }
  }, [title, content, saveImmediately, getToken]);

  const handleExport = useCallback(async () => {
    saveImmediately();
    const text = `${title || "Note"}\n\n${content}`;
    try {
      const safeName =
        (title || "note").replace(/[^\w]+/g, "_").slice(0, 40) || "note";
      const baseDir =
        Platform.OS === "ios" ? Paths.document.uri : Paths.cache.uri;
      const target = `${baseDir}${safeName}.txt`;
      await new File(target).write(text);
      await Share.share({ url: target, title: title || "Note" });
    } catch (err: any) {
      console.error("[NoteEditor] export failed:", err);
      Alert.alert("Export failed", err.message || "Could not export note.");
    }
  }, [title, content, saveImmediately]);

  const handleShare = useCallback(async () => {
    if (sharing) return;
    saveImmediately();
    setSharing(true);
    let pdfUri: string | null = null;
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available)
        throw new Error("Sharing is not available on this device.");
      const tagNames = noteTags
        .map((id) => tags.find((t) => t.id === id)?.name)
        .filter((name): name is string => Boolean(name));
      pdfUri = await exportNoteAsPdf({
        title,
        content,
        images,
        tags: tagNames,
      });
      await Sharing.shareAsync(pdfUri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: title || "Note",
      });
    } catch (err: any) {
      console.error("[NoteEditor] share as PDF failed:", err);
      try {
        await Share.share({
          message: `${title || "Note"}${content ? `\n\n${content}` : ""}`,
        });
      } catch {
        Alert.alert("Share failed", err?.message || "Could not share note.");
      }
    } finally {
      setSharing(false);
      if (pdfUri) setTimeout(() => deleteFileNoThrow(pdfUri as string), 4000);
    }
  }, [sharing, title, content, images, noteTags, tags, saveImmediately]);

  const handleOverflowOption = useCallback(
    (key: string) => {
      switch (key) {
        case "transcribe":
          handleTranscribeAudio();
          break;
        case "summary":
        case "quiz":
        case "chat":
          setActiveTab("copilot");
          break;
        case "pin":
          handleTogglePin();
          break;
        case "reminder":
          setShowReminderPicker(true);
          break;
        case "send-study":
          handleSendToStudy();
          break;
        case "tags":
          setShowTags(true);
          break;
        case "record":
        case "stop-record":
          handleRecordToggle();
          break;
        case "manage-tags":
          setShowTags(false);
          setShowTagManager(true);
          break;
        case "rename":
          saveImmediately();
          Alert.prompt(
            "Rename",
            "Enter a new title:",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Rename",
                onPress: (text?: string) => {
                  if (text?.trim()) setTitle(text.trim());
                },
              },
            ],
            "plain-text",
            title,
          );
          break;
        case "duplicate": {
          if (
            !title.trim() &&
            !content.trim() &&
            audioClips.length === 0 &&
            images.length === 0
          ) {
            Alert.alert(
              "Nothing to duplicate",
              "Add a title or some content first.",
            );
            break;
          }
          const id = createNote({
            title: title ? `${title} (Copy)` : "",
            content,
            tags: noteTags,
            audioClips: audioClips.map((c) => ({ ...c })),
            images: images.map((i) => ({ ...i })),
            pinned,
            reminderAt,
            repeatType,
          });
          router.replace(`/(notes)/${id}`);
          break;
        }
        case "export":
          handleExport();
          break;
        case "share":
          handleShare();
          break;
        default:
          Alert.alert("Coming soon", `${key} will be available soon.`);
      }
    },
    [
      title,
      content,
      noteTags,
      audioClips,
      handleRecordToggle,
      saveImmediately,
      createNote,
      router,
      handleTranscribeAudio,
      handleSendToStudy,
      handleExport,
      handleShare,
      handleTogglePin,
    ],
  );

  const copilotExistingTags = useMemo(
    () =>
      noteTags
        .map((id) => tags.find((t) => t.id === id)?.name)
        .filter((name): name is string => Boolean(name)),
    [noteTags, tags],
  );

  const floatingBottom =
    (keyboardHeight > 0 ? keyboardHeight : 0) +
    (Platform.OS === "ios" ? insets.bottom : 0);

  const floatingBarIn = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (activeTab === "editor") {
      floatingBarIn.setValue(0);
      Animated.spring(floatingBarIn, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 4,
      }).start();
    }
  }, [activeTab, floatingBarIn]);

  const formatBarVisible =
    activeTab === "editor" &&
    !!editorToolbar?.hasSelection &&
    !isRecording &&
    !aiBusy;

  useEffect(() => {
    if (formatBarVisible) {
      formatBarIn.setValue(0);
      Animated.spring(formatBarIn, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 4,
      }).start();
    } else {
      formatBarIn.setValue(0);
    }
  }, [formatBarVisible, formatBarIn]);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    if (isRecording) {
      pulseAnim.setValue(0);
      loop = Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      );
      loop.start();
    }
    return () => loop?.stop();
  }, [isRecording, pulseAnim]);

  useEffect(() => {
    Animated.spring(recTimerIn, {
      toValue: isRecording ? 1 : 0,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  }, [isRecording, recTimerIn]);

  const iconBtn = ({
    sf,
    material,
    color,
    dim,
    onPress,
  }: {
    sf: string;
    material: IconName;
    color: string;
    dim?: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
    >
      <ThemeIcon
        sf={sf}
        material={material}
        size={20}
        color={color}
        weight={dim ? "regular" : "medium"}
      />
    </Pressable>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.bg }]}
      edges={["top"]}
    >
      <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.headerBtn,
              pressed && { opacity: 0.6 },
            ]}
          >
            <ThemeIcon
              sf="chevron.left"
              material="chevron-left"
              size={24}
              color={theme.primary}
              weight="semibold"
            />
          </Pressable>
        </View>
        <View style={styles.headerCenter}>
          <Text
            style={[styles.headerMeta, { color: theme.textMuted }]}
            numberOfLines={1}
          >
            {existing?.createdAt
              ? getDateLabel(existing.createdAt)
              : "New note"}
            {wordCount > 0
              ? ` · ${wordCount} ${wordCount === 1 ? "word" : "words"}`
              : ""}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {iconBtn({
            sf: pinned ? "pin.fill" : "pin",
            material: pinned ? "pin" : "pin-outline",
            color: pinned ? theme.primary : theme.textSecondary,
            dim: !pinned,
            onPress: handleTogglePin,
          })}
          {iconBtn({
            sf: "trash",
            material: "delete-outline",
            color: theme.danger,
            dim: true,
            onPress: handleDelete,
          })}
        </View>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: theme.borderLight }]}>
        <NoteSegmentedControl active={activeTab} onChange={setActiveTab} />
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === "editor" ? (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <TextInput
              style={[styles.titleInput, { color: theme.text }]}
              placeholder="Title"
              placeholderTextColor={theme.textMuted}
              value={title}
              onChangeText={setTitle}
              contextMenuHidden={Platform.OS === "android"}
            />

            <View
              style={[
                styles.titleUnderline,
                { backgroundColor: theme.primary + "30" },
              ]}
            />

            <RichTextEditor
              ref={editorRef}
              value={content}
              onChange={setContent}
              onTagInput={handleTagInput}
              onSelectionChange={(sel) => {
                cursorRef.current = sel;
              }}
              onToolbarStateChange={setEditorToolbar}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === "Enter") {
                  const pos = cursorRef.current.end ?? content.length;
                  const beforeCursor = content.slice(0, pos);
                  const tagMatch = beforeCursor.match(/#(\w+)$/);
                  if (tagMatch) {
                    handleProcessCompletedTag(tagMatch[1]);
                  }
                }
              }}
              enabled={!aiBusy}
              keyboardVisible={keyboardHeight > 0}
              placeholder="Start writing…"
            />

            {audioClips.length > 0 && (
              <>
                <SectionHeader
                  sf="mic"
                  material="microphone"
                  label="Voice notes"
                  count={audioClips.length}
                  color={theme.primary}
                />
                <View style={styles.audioClipsRow}>
                  {audioClips.map((clip) => (
                    <View key={clip.id} style={styles.audioClipCard}>
                      <WaveformView
                        clip={clip}
                        isPlaying={
                          currentPlayClipId === clip.id && playerStatus.playing
                        }
                        progress={
                          currentPlayClipId === clip.id ? playProgress : 0
                        }
                        totalDurationMs={
                          currentPlayClipId === clip.id &&
                          playerStatus.isLoaded &&
                          playerStatus.duration > 0
                            ? playerStatus.duration * 1000
                            : undefined
                        }
                        onPlay={() => openVoicePlayer(clip)}
                        onDelete={() => handleDeleteClip(clip.id)}
                      />
                    </View>
                  ))}
                </View>
              </>
            )}

            {images.length > 0 && (
              <>
                <SectionHeader
                  sf="photo"
                  material="camera"
                  label="Photos"
                  count={images.length}
                  color={theme.info}
                />
                <PhotoGallery images={images} onDelete={handleDeleteImage} />
              </>
            )}

            {noteTags.length > 0 && (
              <>
                <SectionHeader
                  sf="tag"
                  material="tag"
                  label="Tags"
                  count={noteTags.length}
                  color={theme.warning}
                />
                <View style={styles.tagRow}>
                  {noteTags.map((tagId) => {
                    const tag = tags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <View
                        key={tagId}
                        style={[
                          styles.tagChip,
                          { backgroundColor: tag.color + "20" },
                        ]}
                      >
                        <View
                          style={[
                            styles.tagDot,
                            { backgroundColor: tag.color },
                          ]}
                        />
                        <Text
                          style={[styles.tagChipLabel, { color: tag.color }]}
                        >
                          {tag.name}
                        </Text>
                        <Pressable
                          onPress={() => handleToggleTag(tagId)}
                          hitSlop={6}
                        >
                          <ThemeIcon
                            sf="xmark.circle.fill"
                            material="close-circle"
                            size={14}
                            color={tag.color}
                          />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>
        ) : null}
        <View
          style={{
            flex: 1,
            display: activeTab === "copilot" ? "flex" : "none",
          }}
        >
          <NoteChatSheet
            inline
            visible={activeTab === "copilot"}
            noteId={editingNoteId || existing?.id || ""}
            noteTitle={title}
            noteContent={content}
            images={images}
            existingTags={copilotExistingTags}
            getToken={getToken}
            onBusyChange={setAiBusy}
            onReplaceContent={(text) => {
              setContent(text);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            }}
            onAppendContent={(text) => {
              setContent((prev) =>
                prev.trim() ? `${prev.trimEnd()}\n\n${text}` : text,
              );
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            }}
            onApplyTags={(names) => {
              names.forEach(handleProcessCompletedTag);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            }}
          />
        </View>

        {activeTab === "editor" && showTagSuggestions && (
          <View
            style={[
              styles.tagSuggestionPanel,
              { backgroundColor: theme.glass, borderColor: theme.borderLight },
            ]}
          >
            {tagSuggestions.map((tag) => (
              <Pressable
                key={tag.id}
                style={[
                  styles.tagSuggestionItem,
                  { borderBottomColor: theme.borderLight },
                ]}
                onPress={() => handleSelectTagSuggestion(tag)}
              >
                <View
                  style={[
                    styles.tagSuggestionDot,
                    { backgroundColor: tag.color },
                  ]}
                />
                <Text style={[styles.tagSuggestionName, { color: theme.text }]}>
                  #{tag.name}
                </Text>
                <Text
                  style={[
                    styles.tagSuggestionCount,
                    { color: theme.textSecondary },
                  ]}
                >
                  {noteTags.includes(tag.id) ? "✓" : ""}
                </Text>
              </Pressable>
            ))}
            {tagQuery &&
              !tagSuggestions.some(
                (t) => t.name.toLowerCase() === tagQuery.toLowerCase(),
              ) && (
                <Pressable
                  style={[
                    styles.tagSuggestionItem,
                    { borderBottomColor: theme.borderLight },
                  ]}
                  onPress={() => handleCreateFromPanel(tagQuery)}
                >
                  <ThemeIcon
                    sf="plus.circle.fill"
                    material="plus-circle-outline"
                    size={18}
                    color={theme.primary}
                  />
                  <Text
                    style={[styles.tagSuggestionName, { color: theme.primary }]}
                  >{`Create "#${tagQuery}"`}</Text>
                </Pressable>
              )}
          </View>
        )}

        {activeTab === "editor" && (
          <>
            <RecordingPanel
              visible={isRecording}
              transcript={liveTranscript}
              elapsed={recordingElapsed}
              level={volumeLevel}
              onStop={handleStopRecording}
              onDiscard={handleAbortRecording}
            />
            <View
              pointerEvents="box-none"
              style={[styles.floatingBarWrap, { bottom: floatingBottom }]}
            >
              <Animated.View
                style={[
                  styles.floatingBar,
                  {
                    backgroundColor: theme.glass,
                    borderColor: theme.borderLight,
                    opacity: floatingBarIn,
                    transform: [
                      {
                        translateY: floatingBarIn.interpolate({
                          inputRange: [0, 1],
                          outputRange: [40, 0],
                        }),
                      },
                    ],
                  },
                ]}
                onLayout={(e) => setFloatingBarH(e.nativeEvent.layout.height)}
              >
                <View pointerEvents="none" style={styles.floatingBarEdge} />

                <PressableTile
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleShare();
                  }}
                  style={[
                    styles.floatingBtnSmall,
                    { backgroundColor: theme.surfaceAlt },
                  ]}
                >
                  {sharing ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <ThemeIcon
                      sf="square.and.arrow.up"
                      material="share-variant-outline"
                      size={20}
                      color={theme.textSecondary}
                      weight="medium"
                    />
                  )}
                </PressableTile>

                <PressableTile
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleTakePhoto();
                  }}
                  style={[
                    styles.floatingBtnCamera,
                    { backgroundColor: theme.surfaceAlt },
                  ]}
                >
                  <ThemeIcon
                    sf="camera"
                    material="camera"
                    size={24}
                    color={theme.textSecondary}
                    weight="medium"
                  />
                </PressableTile>

                <PressableTile
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    handleRecordToggle();
                  }}
                  style={[
                    styles.floatingBtnMic,
                    {
                      borderColor: isRecording
                        ? theme.danger + "55"
                        : theme.primary + "33",
                    },
                  ]}
                >
                  <LinearGradient
                    colors={
                      isRecording
                        ? [theme.danger + "E6", theme.danger + "99"]
                        : [theme.primary + "2E", theme.accent + "1F"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 21 }]}
                  />
                  {isRecording && (
                    <Animated.View
                      style={[
                        styles.recordingPulse,
                        { borderColor: theme.danger + "40" },
                        {
                          opacity: pulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 0.6],
                          }),
                          transform: [
                            {
                              scale: pulseAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 1.25],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  )}
                  <ThemeIcon
                    sf={isRecording ? "stop.circle" : "mic"}
                    material={
                      isRecording ? "stop-circle-outline" : "microphone"
                    }
                    size={28}
                    color={isRecording ? "#FFFFFF" : theme.primary}
                    weight="medium"
                  />
                </PressableTile>

                <PressableTile
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowOverflow(true);
                  }}
                  style={[
                    styles.floatingBtnSmall,
                    { backgroundColor: theme.surfaceAlt },
                  ]}
                >
                  <ThemeIcon
                    sf="ellipsis"
                    material="dots-horizontal"
                    size={20}
                    color={theme.textSecondary}
                    weight="bold"
                  />
                </PressableTile>
              </Animated.View>

              <Animated.View
                pointerEvents="none"
                style={[
                  styles.recordingChip,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.borderLight,
                    bottom: floatingBarH + 10,
                    opacity: recTimerIn,
                    transform: [
                      {
                        translateY: recTimerIn.interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 0],
                        }),
                      },
                      {
                        scale: recTimerIn.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.9, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View
                  style={[
                    styles.recordingDot,
                    { backgroundColor: theme.danger },
                  ]}
                />
                <Text style={[styles.recordingTime, { color: theme.danger }]}>
                  {formatDuration(recordingElapsed)}
                </Text>
              </Animated.View>
            </View>

            {formatBarVisible && (
              <FormatToolbar
                anim={formatBarIn}
                activeTools={editorToolbar?.activeTools ?? null}
                hasSelection={!!editorToolbar?.hasSelection}
                onFormat={(tool: FormatTool) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  editorRef.current?.applyFormat(tool);
                }}
                style={{
                  bottom: floatingBottom + floatingBarH + 10,
                }}
              />
            )}
          </>
        )}
      </View>

      <TagSheet
        visible={showTags}
        noteTags={noteTags}
        allTags={tags}
        onToggleTag={handleToggleTag}
        onCreateTag={handleCreateTag}
        onClose={() => setShowTags(false)}
      />

      <OverflowSheet
        visible={showOverflow}
        hasReminder={reminderAt !== null}
        onOption={handleOverflowOption}
        onClose={() => setShowOverflow(false)}
      />

      <VoicePlayerSheet
        clip={playerSheetClip}
        currentTime={
          currentPlayClipId === playerSheetClip?.id
            ? playerStatus.currentTime
            : 0
        }
        totalDuration={
          playerSheetClip &&
          currentPlayClipId === playerSheetClip.id &&
          playerStatus.isLoaded
            ? playerStatus.duration
            : playerSheetClip
              ? playerSheetClip.duration / 1000
              : 0
        }
        isPlaying={
          !!playerSheetClip &&
          currentPlayClipId === playerSheetClip.id &&
          playerStatus.playing
        }
        transcribing={transcribingClipId === playerSheetClip?.id}
        onClose={() => {
          player.pause();
          setPlayerSheetClip(null);
        }}
        onTogglePlay={() => {
          if (playerSheetClip) handlePlayClip(playerSheetClip);
        }}
        onSeek={(seconds) => handleSeek(seconds)}
        onDelete={handleDeleteFromPlayer}
        onTranscribe={() => {
          void handleTranscribeClip();
        }}
        onAddTranscript={handleAddTranscriptToNote}
      />

      <TagManagerSheet
        visible={showTagManager}
        tags={tags}
        notes={notes}
        onRename={(id, name) => {
          const newName = name;
          Alert.prompt(
            "Rename Tag",
            "Enter a new name:",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Rename",
                onPress: (text?: string) => {
                  if (text?.trim()) updateTag(id, { name: text.trim() });
                },
              },
            ],
            "plain-text",
            newName,
          );
        }}
        onDelete={(id) => {
          const tagName = tags.find((t) => t.id === id)?.name || "";
          Alert.alert(
            "Delete Tag",
            `Delete "${tagName}"? It will be removed from all notes.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => deleteTag(id),
              },
            ],
          );
        }}
        onCreate={() => {
          Alert.prompt(
            "New Tag",
            "Enter tag name:",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Create",
                onPress: (text?: string) => {
                  if (!text?.trim()) return;
                  const color = TAG_COLORS[tags.length % TAG_COLORS.length];
                  const tag = addTag(text.trim(), color);
                  setNoteTags((prev) => [...prev, tag.id]);
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                },
              },
            ],
            "plain-text",
          );
        }}
        onClose={() => setShowTagManager(false)}
      />

      <ReminderSheet
        visible={showReminderPicker}
        onClose={() => setShowReminderPicker(false)}
        reminderAt={reminderAt}
        pickDate={pickDate}
        setPickDate={setPickDate}
        pickHours={pickHours}
        setPickHours={setPickHours}
        pickMinutes={pickMinutes}
        setPickMinutes={setPickMinutes}
        pickAmPm={pickAmPm}
        setPickAmPm={setPickAmPm}
        repeatType={repeatType}
        setRepeatType={setRepeatType}
        onClear={handleClearReminder}
        onSet={handleSetReminder}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    height: 50,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { width: 60 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerRight: {
    width: 160,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  headerMeta: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.3,
    fontFamily: bodyFont,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 140 },
  titleInput: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 8,
    padding: 0,
    fontFamily: bodyFont,
  },
  titleUnderline: { height: 2, borderRadius: 1, marginBottom: 18, width: 48 },
  localBannerWrap: { marginBottom: 14 },
  audioClipsRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  audioClipCard: { width: "46%", borderRadius: 24, overflow: "hidden" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  tagChipLabel: { fontSize: 13, fontWeight: "600", fontFamily: bodyFont },
  floatingBarWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    marginBottom: 12,
  },
  floatingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 30,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    gap: 10,
  },
  floatingBarEdge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  floatingBtnSmall: {
    width: 44,
    height: 44,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingBtnCamera: {
    width: 50,
    height: 50,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingBtnMic: {
    width: 60,
    height: 60,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 1.5,
  },
  recordingPulse: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 26,
    borderWidth: 2,
  },
  recordingChip: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  recordingDot: { width: 8, height: 8, borderRadius: 4 },
  recordingTime: {
    fontSize: 15,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    fontFamily: bodyFont,
  },
  sheetTags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sheetTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  sheetTagDot: { width: 8, height: 8, borderRadius: 4 },
  sheetTagName: { fontSize: 14, fontWeight: "600", fontFamily: bodyFont },
  createTagBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
  },
  createTagText: { fontSize: 14, fontWeight: "600", fontFamily: bodyFont },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0,
  },
  actionCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    padding: 14,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionBadge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  actionText: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  actionSub: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
    fontFamily: bodyFont,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionHeaderChip: {
    width: 18,
    height: 18,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  countPill: {
    minWidth: 18,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    fontFamily: bodyFont,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: bodyFont,
  },
  tabBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
    elevation: 8,
  },
  segmentWrap: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    gap: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentThumb: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentPressable: {
    flex: 1,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  segmentLabel: {
    fontSize: 14,
    letterSpacing: 0.1,
    fontFamily: bodyFont,
  },
  segmentLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  presetChip: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  presetLabel: { fontSize: 12, fontWeight: "600", fontFamily: bodyFont },
  dateRow: { gap: 8, paddingVertical: 4 },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    minWidth: 52,
  },
  dateChipDay: { fontSize: 11, fontWeight: "500" },
  dateChipNum: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 4,
  },
  timeStepper: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  timeValue: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
    fontFamily: bodyFont,
  },
  timeColon: { fontSize: 18, fontWeight: "700", marginHorizontal: 2 },
  ampmToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
    marginLeft: 4,
  },
  ampmText: { fontSize: 12, fontWeight: "700" },
  repeatRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  repeatChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  repeatLabel: { fontSize: 12, fontWeight: "600" },
  reminderConfirm: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 13,
    alignItems: "center",
    marginTop: 4,
  },
  reminderConfirmText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: bodyFont,
  },
  clearReminderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    marginBottom: 4,
  },
  clearReminderText: { fontSize: 13, fontWeight: "600", fontFamily: bodyFont },
  mentionDot: { width: 8, height: 8, borderRadius: 4 },
  tagManagerList: { maxHeight: 320 },
  tagManagerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  tagManagerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: bodyFont,
  },
  tagManagerCount: {
    fontSize: 12,
    fontWeight: "500",
    marginRight: 6,
    fontFamily: bodyFont,
  },
  tagManagerAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  tagSuggestionPanel: {
    maxHeight: 190,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  tagSuggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  tagSuggestionDot: { width: 10, height: 10, borderRadius: 5 },
  tagSuggestionName: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    fontFamily: bodyFont,
  },
  tagSuggestionCount: { fontSize: 12, fontWeight: "500" },
});
