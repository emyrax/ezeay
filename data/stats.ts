export const DAILY_ACTIVITY_GOAL = 10;

export interface DayActivity {
  date: string;
  count: number;
}

export interface PeriodSummary {
  xpEarned: number;
  coursesCompleted: number;
  streakDays: number;
  bountiesClaimed: number;
  subtopicsCompleted: number;
}

export function getWeekCount(dates: DayActivity[], weekStart: string): number {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return dates
    .filter((d) => {
      const dt = new Date(d.date);
      return dt >= start && dt < end;
    })
    .reduce((sum, d) => sum + d.count, 0);
}

export function getMonthCount(dates: DayActivity[], month: string): number {
  const [y, m] = month.split("-").map(Number);
  return dates
    .filter((d) => {
      const dt = new Date(d.date);
      return dt.getFullYear() === y && dt.getMonth() + 1 === m;
    })
    .reduce((sum, d) => sum + d.count, 0);
}

export function emptyPeriodSummary(): PeriodSummary {
  return {
    xpEarned: 0,
    coursesCompleted: 0,
    streakDays: 0,
    bountiesClaimed: 0,
    subtopicsCompleted: 0,
  };
}
