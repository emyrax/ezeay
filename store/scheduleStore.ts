import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface ScheduleTask {
  id: string;
  date: string;
  title: string;
  time?: string;
  done: boolean;
  notifiedId?: string;
  createdAt: number;
}

interface ScheduleState {
  tasks: ScheduleTask[];
  addTask: (input: { date: string; title: string; time?: string }) => string;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  applyReminder: (id: string, time: string, notifiedId: string) => void;
  clearNotification: (id: string) => void;
}

let taskCounter = 0;

function makeTaskId(): string {
  taskCounter += 1;
  return `task_${Date.now().toString(36)}_${taskCounter}`;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set) => ({
      tasks: [],
      addTask: ({ date, title, time }) => {
        const id = makeTaskId();
        const cleanTitle = title.trim().slice(0, 200);
        set((s) => ({
          tasks: [
            ...s.tasks,
            {
              id,
              date,
              title: cleanTitle,
              time,
              done: false,
              createdAt: Date.now(),
            },
          ],
        }));
        return id;
      },
      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),
      removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      applyReminder: (id, time, notifiedId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, time, notifiedId } : t,
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