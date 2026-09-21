import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fontFamily } from "../../constants/themes";
import { useAuth } from "../../contexts/AuthContext";
import { useThemeColors } from "../../hooks/useTheme";
import { api } from "../../lib/api";
import { eventBus } from "../../lib/eventBus";
import {
  cancelScheduledNotification,
  notificationsAvailable,
  openNotificationSettings,
  requestNotificationPermissions,
  scheduleDateNotification,
} from "../../lib/notifications";
import { dateToKey, suggestImportantTasks } from "../../lib/scheduleSuggest";
import type { ScheduleTask } from "../../store/scheduleStore";
import {
  tasksForDate,
  useScheduleStore,
} from "../../store/scheduleStore";

export default function ScheduleScreen() {
  const theme = useThemeColors();
  const router = useRouter();
  const { getToken } = useAuth();

  const tasks = useScheduleStore((s) => s.tasks);
  const addTask = useScheduleStore((s) => s.addTask);
  const toggleTask = useScheduleStore((s) => s.toggleTask);
  const removeTask = useScheduleStore((s) => s.removeTask);
  const applyReminder = useScheduleStore((s) => s.applyReminder);
  const clearNotification = useScheduleStore((s) => s.clearNotification);

  const todayKey = dateToKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  const [suggesting, setSuggesting] = useState(false);
  const [timePickerTask, setTimePickerTask] = useState<ScheduleTask | null>(
    null,
  );
  const [pendingTime, setPendingTime] = useState(new Date());

  const weekDays = useMemo(() => {
    const start = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + i,
      );
      return {
        key: dateToKey(d),
        day: d.getDate(),
        weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
        isToday: i === 0,
      };
    });
  }, []);

  const selectedLabel = useMemo(() => {
    if (selectedDate === todayKey) return "Today";
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return dt.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, [selectedDate, todayKey]);

  const dayTasks = tasksForDate(tasks, selectedDate);
  const doneCount = dayTasks.filter((t) => t.done).length;

  const suggestedIds = useMemo(() => new Set(Object.keys(suggestions)), [
    suggestions,
  ]);
  const sortedTasks = dayTasks.filter(
    (t) => suggestedIds.has(t.id) && !t.done,
  );

  const handleAdd = () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    addTask({ date: selectedDate, title });
    setNewTaskTitle("");
  };

  const handleToggle = (task: ScheduleTask) => {
    const willBeDone = !task.done;
    if (willBeDone && task.notifiedId) {
      cancelScheduledNotification(task.notifiedId);
      clearNotification(task.id);
    }
    toggleTask(task.id);
  };

  const handleRemove = (task: ScheduleTask) => {
    Alert.alert("Delete Task", `Remove "${task.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (task.notifiedId) {
            cancelScheduledNotification(task.notifiedId);
            clearNotification(task.id);
          }
          removeTask(task.id);
        },
      },
    ]);
  };

  const openReminder = (task: ScheduleTask) => {
    if (!notificationsAvailable()) {
      Alert.alert(
        "Reminders",
        "Reminders need a development build — Expo Go doesn't support notifications.",
      );
      return;
    }
    let base = new Date();
    const match = task.time ? /^(\d{2}):(\d{2})$/.exec(task.time) : null;
    if (match) {
      base.setHours(Number(match[1]), Number(match[2]), 0, 0);
    } else {
      base.setHours(base.getHours() + 1, 0, 0, 0);
    }
    setPendingTime(base);
    setTimePickerTask(task);
  };

  const confirmReminder = async (chosen: Date) => {
    const task = timePickerTask;
    if (!task) return;

    const [y, m, d] = task.date.split("-").map(Number);
    const target = new Date(
      y || new Date().getFullYear(),
      (m || 1) - 1,
      d || 1,
      chosen.getHours(),
      chosen.getMinutes(),
      0,
      0,
    );
    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 1);
    }

    const granted = await requestNotificationPermissions();
    if (!granted) {
      setTimePickerTask(null);
      Alert.alert(
        "Reminders are off",
        "Enable notifications to set a reminder for this task.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => openNotificationSettings() },
        ],
      );
      return;
    }

    if (task.notifiedId) {
      await cancelScheduledNotification(task.notifiedId);
    }

    const timeString =
      `${String(chosen.getHours()).padStart(2, "0")}:` +
      `${String(chosen.getMinutes()).padStart(2, "0")}`;
    const body =
      `Reminder · ${target.toLocaleString("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      })}`;
    const notifiedId = await scheduleDateNotification({
      title: task.title,
      body,
      date: target,
      data: { taskId: task.id, taskDate: task.date },
    });
    if (notifiedId) {
      applyReminder(task.id, timeString, notifiedId);
      eventBus.emit("toast:success", { title: "Reminder set" });
    }
    setTimePickerTask(null);
  };

  const clearReminder = async (task: ScheduleTask) => {
    if (task.notifiedId) await cancelScheduledNotification(task.notifiedId);
    clearNotification(task.id);
    eventBus.emit("toast:success", { title: "Reminder cleared" });
    setTimePickerTask(null);
  };

  const handleSuggest = async () => {
    const undoneCount = dayTasks.filter((t) => !t.done).length;
    const local = suggestImportantTasks(dayTasks);
    setSuggestions(Object.fromEntries(local.map((s) => [s.id, s.reason])));
    if (undoneCount === 0) return;

    setSuggesting(true);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await api.schedule.suggest(
        {
          date: selectedDate,
          tasks: dayTasks.map((t) => ({
            id: t.id,
            title: t.title,
            time: t.time,
            done: t.done,
          })),
        },
        token,
      );
      const next: Record<string, string> = {};
      for (const s of res.suggestions.slice(0, 5)) next[s.id] = s.reason;
      setSuggestions(next);
    } catch {
      eventBus.emit("toast:error", {
        title: "Cloud suggestions unavailable — showing smart picks",
      });
    } finally {
      setSuggesting(false);
    }
  };

  const selectDay = (key: string) => {
    setSelectedDate(key);
    setSuggestions({});
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={goBack}
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={20}
              color={theme.text}
            />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: theme.text }]}>Schedule</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {selectedLabel}
            </Text>
          </View>
          {dayTasks.length > 0 && (
            <Text style={[styles.doneCount, { color: theme.textMuted }]}>
              {doneCount}/{dayTasks.length}
            </Text>
          )}
        </View>

        <View style={styles.dayStrip}>
          {weekDays.map((d) => {
            const active = d.key === selectedDate;
            return (
              <Pressable
                key={d.key}
                onPress={() => selectDay(d.key)}
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: active ? theme.primary : theme.surface,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayWeekday,
                    { color: active ? "#FFFFFF" : theme.textSecondary },
                  ]}
                >
                  {d.isToday ? "Today" : d.weekday}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    { color: active ? "#FFFFFF" : theme.text },
                  ]}
                >
                  {d.day}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View
          style={[
            styles.inputRow,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
        >
          <MaterialCommunityIcons
            name="plus"
            size={18}
            color={theme.textMuted}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            placeholder="Add a task…"
            placeholderTextColor={theme.textMuted}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <Pressable
            onPress={handleAdd}
            disabled={!newTaskTitle.trim()}
            style={[
              styles.addButton,
              {
                backgroundColor: newTaskTitle.trim()
                  ? theme.primary
                  : theme.border,
              },
            ]}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {dayTasks.length > 0 && (
          <Pressable
            onPress={handleSuggest}
            disabled={suggesting}
            style={({ pressed }) => [
              styles.suggestButton,
              {
                backgroundColor: theme.primaryLight,
                borderColor: theme.primary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            {suggesting ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <MaterialCommunityIcons
                name="star-outline"
                size={16}
                color={theme.primary}
              />
            )}
            <Text style={[styles.suggestText, { color: theme.primary }]}>
              {suggesting ? "Thinking…" : "Suggest important ones"}
            </Text>
            <Text style={[styles.suggestHint, { color: theme.textMuted }]}>
              AI + smart ranking
            </Text>
          </Pressable>
        )}

        {sortedTasks.length > 0 && (
          <View
            style={[
              styles.suggestBanner,
              {
                backgroundColor: theme.primaryLight,
                borderColor: theme.primary + "45",
              },
            ]}
          >
            <MaterialCommunityIcons name="star" size={14} color={theme.primary} />
            <Text style={[styles.suggestBannerText, { color: theme.text }]}>
              Suggested priorities for {selectedLabel.toLowerCase()}
            </Text>
          </View>
        )}

        {dayTasks.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <MaterialCommunityIcons
              name="calendar-blank-outline"
              size={32}
              color={theme.textMuted}
            />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Nothing planned{selectedDate === todayKey ? " for today" : ""}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
              Add a task above to plan your day.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sortedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                reason={suggestions[task.id]}
                theme={theme}
                suggested
                onToggle={() => handleToggle(task)}
                onRemove={() => handleRemove(task)}
                onReminder={() => openReminder(task)}
              />
            ))}
            {dayTasks
              .filter((t) => !suggestedIds.has(t.id) || t.done)
              .map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  reason={suggestions[task.id]}
                  theme={theme}
                  onToggle={() => handleToggle(task)}
                  onRemove={() => handleRemove(task)}
                  onReminder={() => openReminder(task)}
                />
              ))}
          </View>
        )}
      </ScrollView>

      {timePickerTask && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setTimePickerTask(null)}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {timePickerTask.title}
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                Set a reminder time
              </Text>

              <DateTimePicker
                value={pendingTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                is24Hour
                onValueChange={(_event, date) => {
                  if (Platform.OS === "android") {
                    setTimePickerTask(null);
                    confirmReminder(date);
                    return;
                  }
                  setPendingTime(date);
                }}
                onDismiss={() => {
                  if (Platform.OS === "android") setTimePickerTask(null);
                }}
              />

              {Platform.OS === "ios" && (
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() =>
                      timePickerTask.time
                        ? clearReminder(timePickerTask)
                        : setTimePickerTask(null)
                    }
                    style={[
                      styles.modalActionBtn,
                      {
                        backgroundColor: theme.danger + "20",
                        borderColor: theme.danger + "40",
                      },
                    ]}
                  >
                    <Text style={[styles.modalActionDanger, { color: theme.danger }]}>
                      {timePickerTask.time ? "Clear" : "Cancel"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmReminder(pendingTime)}
                    style={[
                      styles.modalActionBtn,
                      { backgroundColor: theme.primary },
                    ]}
                  >
                    <Text style={[styles.modalActionPrimary, { color: "#FFFFFF" }]}>
                      Set Reminder
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function TaskRow({
  task,
  reason,
  theme,
  suggested,
  onToggle,
  onRemove,
  onReminder,
}: {
  task: ScheduleTask;
  reason?: string;
  theme: ReturnType<typeof useThemeColors>;
  suggested?: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onReminder: () => void;
}) {
  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
        ...styles.taskRow,
      }}
    >
      <Pressable
        onPress={onToggle}
        style={[
          styles.checkBox,
          {
            borderColor: task.done ? theme.primary : theme.borderLight,
            backgroundColor: task.done ? theme.primary : "transparent",
          },
        ]}
        hitSlop={8}
      >
        {task.done && (
          <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
        )}
      </Pressable>

      <View style={styles.taskBody}>
        <Text
          style={[
            styles.taskTitle,
            {
              color: task.done ? theme.textMuted : theme.text,
              textDecorationLine: task.done ? "line-through" : "none",
            },
          ]}
        >
          {task.title}
        </Text>
        <View style={styles.taskMeta}>
          {task.time && (
            <View style={[styles.metaChip, { backgroundColor: theme.surfaceAlt }]}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={11}
                color={theme.textMuted}
              />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {task.time}
              </Text>
            </View>
          )}
          {reason ? (
            <View style={[styles.metaChip, { backgroundColor: theme.primaryLight }]}>
              <MaterialCommunityIcons
                name={suggested ? "star" : "star-outline"}
                size={11}
                color={theme.primary}
              />
              <Text style={[styles.metaText, { color: theme.primary }]}>
                {reason}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Pressable onPress={onReminder} hitSlop={8} style={styles.taskAction}>
        <MaterialCommunityIcons
          name={task.time ? "bell" : "bell-outline"}
          size={19}
          color={task.time ? theme.primary : theme.textMuted}
        />
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={8} style={styles.taskAction}>
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={19}
          color={theme.textMuted}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    fontFamily,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily,
    marginTop: 2,
  },
  doneCount: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily,
  },
  dayStrip: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  dayChip: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 52,
  },
  dayWeekday: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily,
    paddingVertical: 14,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  suggestButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 8,
  },
  suggestText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily,
  },
  suggestHint: {
    fontSize: 11,
    fontFamily,
    marginLeft: "auto",
  },
  suggestBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 6,
  },
  suggestBannerText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily,
    marginTop: 4,
    textAlign: "center",
  },
  list: {
    gap: 10,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  checkBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  taskBody: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily,
  },
  taskMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
  },
  metaText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily,
  },
  taskAction: {
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    fontFamily,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily,
    marginTop: 2,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  modalActionBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalActionDanger: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily,
  },
  modalActionPrimary: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily,
  },
});