import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface ScheduleTask {
  id: string;
  date: string;
  title: string;
  time?: string;
  durationMinutes?: number;
  subject?: string;
  notes?: string;
  agentActionId?: string;
  reminderMinutes?: number;
  done: boolean;
  notifiedId?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface ScheduleTaskInput {
  date: string;
  title: string;
  time?: string;
  durationMinutes?: number;
  subject?: string;
  notes?: string;
  agentActionId?: string;
  reminderMinutes?: number;
}

export type ScheduleTaskPatch = Partial<
  Pick<
    ScheduleTask,
    | "date"
    | "title"
    | "time"
    | "durationMinutes"
    | "subject"
    | "notes"
    | "agentActionId"
    | "reminderMinutes"
  >
>;

interface ScheduleState {
  tasks: ScheduleTask[];
  addTask: (input: ScheduleTaskInput) => string;
  addTasks: (inputs: ScheduleTaskInput[]) => string[];
  toggleTask: (id: string) => void;
  updateTask: (id: string, patch: ScheduleTaskPatch) => void;
  removeTask: (id: string) => void;
  removeTasksByAgentAction: (actionId: string) => string[];
  applyReminder: (id: string, time: string, notifiedId: string) => void;
  clearNotification: (id: string) => void;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

let taskCounter = 0;

function makeTaskId(): string {
  taskCounter += 1;
  return `task_${Date.now().toString(36)}_${taskCounter}`;
}

function cleanText(value: string | undefined, maxLength: number): string | undefined {
  const text = value?.replace(/\u0000/g, "").trim().slice(0, maxLength);
  return text ? text : undefined;
}

function cleanNumber(
  value: number | undefined,
  min: number,
  max: number,
): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  return Math.min(Math.max(Math.trunc(value as number), min), max);
}

function cleanTaskInput(input: ScheduleTaskInput): ScheduleTaskInput | null {
  const date = input.date.trim();
  const title = cleanText(input.title, 200);
  if (!DATE_PATTERN.test(date) || !title) return null;
  const time = TIME_PATTERN.test(input.time?.trim() ?? "")
    ? input.time?.trim()
    : undefined;
  return {
    date,
    title,
    time,
    durationMinutes: cleanNumber(input.durationMinutes, 5, 240),
    subject: cleanText(input.subject, 80),
    notes: cleanText(input.notes, 500),
    agentActionId: cleanText(input.agentActionId, 80),
    reminderMinutes: cleanNumber(input.reminderMinutes, 0, 1440),
  };
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      tasks: [],
      addTask: (input) => {
        const [id] = get().addTasks([input]);
        return id ?? "";
      },
      addTasks: (inputs) => {
        const now = Date.now();
        const created: ScheduleTask[] = [];
        for (const input of inputs.slice(0, 60)) {
          const clean = cleanTaskInput(input);
          if (!clean) continue;
          created.push({
            ...clean,
            id: makeTaskId(),
            done: false,
            createdAt: now,
            updatedAt: now,
          });
        }
        if (created.length > 0) {
          set((s) => ({ tasks: [...s.tasks, ...created] }));
        }
        return created.map((task) => task.id);
      },
      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, done: !t.done, updatedAt: Date.now() } : t,
          ),
        })),
      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((task) => {
            if (task.id !== id) return task;
            return {
              ...task,
              ...patch,
              title:
                patch.title !== undefined
                  ? cleanText(patch.title, 200) ?? task.title
                  : task.title,
              time:
                patch.time !== undefined
                  ? TIME_PATTERN.test(patch.time ?? "")
                    ? patch.time
                    : undefined
                  : task.time,
              subject:
                patch.subject !== undefined
                  ? cleanText(patch.subject, 80)
                  : task.subject,
              notes:
                patch.notes !== undefined
                  ? cleanText(patch.notes, 500)
                  : task.notes,
              durationMinutes:
                patch.durationMinutes !== undefined
                  ? cleanNumber(patch.durationMinutes, 5, 240)
                  : task.durationMinutes,
              reminderMinutes:
                patch.reminderMinutes !== undefined
                  ? cleanNumber(patch.reminderMinutes, 0, 1440)
                  : task.reminderMinutes,
              updatedAt: Date.now(),
            };
          }),
        })),
      removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      removeTasksByAgentAction: (actionId) => {
        const removed = get().tasks.filter(
          (task) => task.agentActionId === actionId,
        );
        if (removed.length === 0) return [];
        const ids = new Set(removed.map((task) => task.id));
        set((s) => ({ tasks: s.tasks.filter((task) => !ids.has(task.id)) }));
        return [...ids];
      },
      applyReminder: (id, time, notifiedId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, time, notifiedId, updatedAt: Date.now() } : t,
          ),
        })),
      clearNotification: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, notifiedId: undefined } : t,
          ),
        })),
    }),
    {
      name: "yuinx-schedule",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export function tasksForDate(
  tasks: ScheduleTask[],
  date: string,
): ScheduleTask[] {
  return tasks
    .filter((t) => t.date === date)
    .sort((a, b) => {
      const timeA = a.time ?? "24:00";
      const timeB = b.time ?? "24:00";
      return timeA.localeCompare(timeB);
    });
}