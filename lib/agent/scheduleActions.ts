import {
  cancelScheduledNotification,
  requestNotificationPermissions,
  scheduleDateNotification,
} from "../notifications";
import {
  useScheduleStore,
  type ScheduleTask,
  type ScheduleTaskInput,
} from "../../store/scheduleStore";
import type { AgentPendingAction } from "../../types/agent";

export interface ScheduleActionOutcome {
  ok: true;
  summary: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanNumber(value: unknown, min: number, max: number): number | null {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(Math.max(Math.trunc(number), min), max);
}

function taskDate(date: string, time: string): Date | null {
  const dateParts = date.split("-").map(Number);
  const timeParts = time.split(":").map(Number);
  if (dateParts.length !== 3 || timeParts.length !== 2) return null;
  const [year, month, day] = dateParts;
  const [hour, minute] = timeParts;
  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(value.getTime()) ? null : value;
}

function parseTasks(value: unknown): ScheduleTaskInput[] {
  if (!Array.isArray(value)) return [];
  const tasks: ScheduleTaskInput[] = [];
  for (const item of value.slice(0, 60)) {
    const raw = asRecord(item);
    if (!raw) continue;
    const date = cleanText(raw.date, 10);
    const title = cleanText(raw.title, 200);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !title) continue;
    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(cleanText(raw.time, 5))
      ? cleanText(raw.time, 5)
      : undefined;
    const durationMinutes = cleanNumber(raw.durationMinutes, 5, 240);
    const subject = cleanText(raw.subject, 80);
    const notes = cleanText(raw.notes, 500);
    tasks.push({
      date,
      title,
      time,
      durationMinutes: durationMinutes ?? undefined,
      subject: subject || undefined,
      notes: notes || undefined,
    });
  }
  return tasks;
}

async function scheduleReminder(
  task: ScheduleTask,
  reminderMinutes: number,
): Promise<void> {
  if (!task.time || reminderMinutes <= 0) return;
  const start = taskDate(task.date, task.time);
  if (!start) return;
  const when = new Date(start.getTime() - reminderMinutes * 60_000);
  if (when.getTime() <= Date.now()) return;
  const id = await scheduleDateNotification({
    title: task.title,
    body: "Your study session starts soon.",
    date: when,
    data: { taskId: task.id },
  });
  if (id) {
    useScheduleStore.getState().applyReminder(task.id, task.time, id);
  }
}

async function savePlan(args: Record<string, unknown>): Promise<ScheduleActionOutcome> {
  const tasks = parseTasks(args.tasks);
  if (tasks.length === 0) {
    throw new Error("There are no valid study sessions to save.");
  }
  const reminderMinutes = cleanNumber(args.reminderMinutes, 0, 1440) ?? 0;
  const store = useScheduleStore.getState();
  const ids = store.addTasks(
    tasks.map((task) => ({
      ...task,
      agentActionId: typeof args.actionId === "string" ? args.actionId : undefined,
      reminderMinutes,
    })),
  );
  if (ids.length === 0) {
    throw new Error("The study sessions could not be saved.");
  }

  if (reminderMinutes > 0) {
    const allowed = await requestNotificationPermissions();
    if (allowed) {
      const created = useScheduleStore
        .getState()
        .tasks.filter((task) => ids.includes(task.id));
      for (const task of created) {
        await scheduleReminder(task, reminderMinutes).catch(() => undefined);
      }
    }
  }

  return {
    ok: true,
    summary: `Added ${ids.length} study session${ids.length === 1 ? "" : "s"} to your Schedule.`,
  };
}

async function updateTask(
  args: Record<string, unknown>,
): Promise<ScheduleActionOutcome> {
  const taskId = cleanText(args.taskId, 80);
  if (!taskId) throw new Error("The schedule task was not found.");
  const store = useScheduleStore.getState();
  const current = store.tasks.find((task) => task.id === taskId);
  if (!current) throw new Error("That schedule task no longer exists.");

  const patch: Parameters<typeof store.updateTask>[1] = {};
  if (typeof args.date === "string") patch.date = cleanText(args.date, 10);
  if (typeof args.title === "string") patch.title = cleanText(args.title, 200);
  if ("time" in args) {
    patch.time = typeof args.time === "string" ? cleanText(args.time, 5) : undefined;
  }
  if ("durationMinutes" in args) {
    patch.durationMinutes =
      cleanNumber(args.durationMinutes, 5, 240) ?? undefined;
  }
  if ("subject" in args) {
    patch.subject =
      typeof args.subject === "string" ? cleanText(args.subject, 80) : undefined;
  }
  if ("notes" in args) {
    patch.notes =
      typeof args.notes === "string" ? cleanText(args.notes, 500) : undefined;
  }

  await cancelScheduledNotification(current.notifiedId);
  store.updateTask(taskId, patch);
  const updated = useScheduleStore.getState().tasks.find((task) => task.id === taskId);
  if (updated?.time && current.notifiedId) {
    await scheduleReminder(updated, updated.reminderMinutes ?? 10).catch(
      () => undefined,
    );
  }

  return { ok: true, summary: "Updated the task in your Schedule." };
}

async function cancelTasks(
  args: Record<string, unknown>,
): Promise<ScheduleActionOutcome> {
  if (!Array.isArray(args.taskIds)) {
    throw new Error("There are no schedule tasks to remove.");
  }
  const ids = [
    ...new Set(
      args.taskIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim().slice(0, 80))
        .filter(Boolean),
    ),
  ].slice(0, 60);
  if (ids.length === 0) {
    throw new Error("There are no schedule tasks to remove.");
  }

  const store = useScheduleStore.getState();
  let removed = 0;
  for (const id of ids) {
    const task = store.tasks.find((item) => item.id === id);
    if (!task) continue;
    await cancelScheduledNotification(task.notifiedId);
    store.removeTask(id);
    removed += 1;
  }

  return {
    ok: true,
    summary: `Removed ${removed} task${removed === 1 ? "" : "s"} from your Schedule.`,
  };
}

export async function executeScheduleAction(
  action: AgentPendingAction,
): Promise<ScheduleActionOutcome> {
  if (action.execution !== "client") {
    throw new Error("This action is handled by the server.");
  }
  if (action.tool === "save_plan") {
    return savePlan({ ...action.args, actionId: action.id });
  }
  if (action.tool === "update_schedule_task") {
    return updateTask(action.args);
  }
  if (action.tool === "cancel_schedule_task") {
    return cancelTasks(action.args);
  }
  throw new Error("This action is not supported on this device.");
}
