import type { TutorPlan, TutorPlanSlot } from "../../types/tutor";

export interface PlanSummary {
  sessions: number;
  totalMinutes: number;
  subjects: string[];
  firstDate: string | null;
  lastDate: string | null;
}

export interface PlanWeek {
  key: string;
  label: string;
  slots: TutorPlanSlot[];
}

export interface PlanTaskInput {
  date: string;
  title: string;
  time?: string;
}

export interface PlanTaskResult {
  tasks: PlanTaskInput[];
  keys: string[];
  skipped: number;
}

export function planSlotKey(slot: TutorPlanSlot): string {
  return `${slot.date}|${slot.title}`;
}

export function planTaskTitle(slot: TutorPlanSlot): string {
  return `${slot.title} (${slot.minutes} min)`;
}

export function planSummary(plan: TutorPlan): PlanSummary {
  const subjects = [...new Set(plan.slots.map((slot) => slot.subject || "Study"))];
  return {
    sessions: plan.slots.length,
    totalMinutes: plan.slots.reduce((sum, slot) => sum + slot.minutes, 0),
    subjects,
    firstDate: plan.slots[0]?.date ?? null,
    lastDate: plan.slots[plan.slots.length - 1]?.date ?? null,
  };
}

function startOfWeek(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  const day = parsed.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  parsed.setUTCDate(parsed.getUTCDate() - offset);
  return parsed.toISOString().slice(0, 10);
}

function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function groupPlanByWeek(plan: TutorPlan): PlanWeek[] {
  const weeks = new Map<string, TutorPlanSlot[]>();
  for (const slot of plan.slots) {
    const key = startOfWeek(slot.date);
    const existing = weeks.get(key);
    if (existing) existing.push(slot);
    else weeks.set(key, [slot]);
  }

  return [...weeks.entries()].map(([key, slots]) => {
    const end = new Date(`${key}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 6);
    return {
      key,
      label: `${shortDate(key)} - ${shortDate(end.toISOString().slice(0, 10))}`,
      slots,
    };
  });
}

export function planTaskInputs(
  plan: TutorPlan,
  existingTasks: { date: string; title: string }[],
  savedKeys: string[],
  time?: string,
): PlanTaskResult {
  const existing = new Set(existingTasks.map((task) => `${task.date}|${task.title}`));
  const saved = new Set(savedKeys);
  const tasks: PlanTaskInput[] = [];
  const keys: string[] = [];
  let skipped = 0;

  for (const slot of plan.slots) {
    const key = planSlotKey(slot);
    const title = planTaskTitle(slot);
    const scheduleKey = `${slot.date}|${title}`;
    if (saved.has(key) || existing.has(scheduleKey)) {
      skipped += 1;
      continue;
    }
    tasks.push({ date: slot.date, title, time });
    keys.push(key);
  }

  return { tasks, keys, skipped };
}
