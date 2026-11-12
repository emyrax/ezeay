import type { ThreadPost, ThreadUser } from "../../types/thread";

export interface DayActivityLike {
  date: string;
  count: number;
}

export interface WeekActivityDay {
  key: string;
  label: string;
  count: number;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getCurrentStreak(
  days: DayActivityLike[],
  today = new Date(),
): number {
  const active = new Set(
    days.filter((day) => day.count > 0).map((day) => day.date),
  );
  const cursor = new Date(today);
  let streak = 0;

  for (let index = 0; index < 366; index += 1) {
    if (!active.has(dateKey(cursor))) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function getWeekActivity(
  days: DayActivityLike[],
  today = new Date(),
): WeekActivityDay[] {
  const byDate = new Map(days.map((day) => [day.date, day.count]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = dateKey(date);
    return {
      key,
      label: date.toLocaleDateString(undefined, { weekday: "narrow" }),
      count: byDate.get(key) ?? 0,
    };
  });
}

export function getRecommendedLearners(
  posts: ThreadPost[],
  viewerId?: string | null,
  limit = 3,
): Array<{ user: ThreadUser; post: ThreadPost }> {
  const byUser = new Map<string, { user: ThreadUser; post: ThreadPost }>();

  for (const post of posts) {
    if (!post.author?.id || post.author.id === viewerId) continue;
    if (!byUser.has(post.author.id)) {
      byUser.set(post.author.id, { user: post.author, post });
    }
  }

  return [...byUser.values()]
    .sort(
      (a, b) =>
        b.user.followersCount - a.user.followersCount ||
        b.user.iqScore - a.user.iqScore,
    )
    .slice(0, Math.max(0, limit));
}
