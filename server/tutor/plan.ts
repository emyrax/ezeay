import type { TutorPlan, TutorPlanSlot } from "../../types/tutor";

export interface TutorPlanInput {
  examType: string;
  examDate: string;
  subjects: string[];
  daysPerWeek: number;
  minutesPerDay: number;
  timezone: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildStudyPlan(input: TutorPlanInput, now = new Date()): TutorPlan {
  const examDate = new Date(`${input.examDate}T00:00:00Z`);
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const slots: TutorPlanSlot[] = [];
  const subjects =
    input.subjects.length > 0
      ? input.subjects.map((s) => s.trim()).filter(Boolean)
      : ["Study"];
  const daysPerWeek = Math.min(Math.max(Math.round(input.daysPerWeek), 1), 7);
  const minutesPerDay = Math.min(Math.max(Math.round(input.minutesPerDay), 10), 240);
  const restDays = new Set<number>();

  if (daysPerWeek < 7) {
    for (let day = 0; day < 7 && restDays.size < 7 - daysPerWeek; day++) {
      restDays.add(day);
    }
  }

  let cursor = new Date(start.getTime());
  let index = 0;
  while (cursor.getTime() < examDate.getTime() && slots.length < 180) {
    const weekday = cursor.getUTCDay();
    if (!restDays.has(weekday)) {
      const subject = subjects[index % subjects.length];
      slots.push({
        date: cursor.toISOString().slice(0, 10),
        title: `${subject} study block`,
        minutes: minutesPerDay,
        subject,
      });
      index += 1;
    }
    cursor = new Date(cursor.getTime() + DAY_MS);
  }

  return {
    examType: input.examType,
    examDate: input.examDate,
    timezone: input.timezone,
    slots,
  };
}
