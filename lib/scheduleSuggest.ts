import type { ScheduleTask } from "../store/scheduleStore";

export interface ScheduleSuggestion {
  id: string;
  reason: string;
}

export function dateToKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function suggestImportantTasks(
  tasks: ScheduleTask[],
  now = new Date(),
  limit = 5,
): ScheduleSuggestion[] {
  const todayKey = dateToKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const ranked = tasks
    .filter((t) => !t.done && t.date === todayKey)
    .map((t) => {
      const match = t.time ? /^\d{2}:\d{2}$/.exec(t.time) : null;
      if (match) {
        const [h, m] = match[0].split(":").map(Number);
        const timeMinutes = h * 60 + m;
        if (timeMinutes >= nowMinutes) {
          return { task: t, score: 1000 - timeMinutes };
        }
        return { task: t, score: 5000 + (nowMinutes - timeMinutes) };
      }
      return { task: t, score: 0 };
    })
    .sort((a, b) => b.score - a.score || a.task.createdAt - b.task.createdAt);

  return ranked.slice(0, limit).map(({ task }) => {
    const match = task.time ? /^\d{2}:\d{2}$/.exec(task.time) : null;
    let reason: string;
    if (!match) {
      reason = "Flexible task — slot it in first";
    } else {
      const [h, m] = match[0].split(":").map(Number);
      const timeMinutes = h * 60 + m;
      reason =
        timeMinutes < nowMinutes
          ? "Overdue — tackle it now"
          : "Next up by time";
    }
    return { id: task.id, reason };
  });
}