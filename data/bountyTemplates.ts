import type { Bounty } from "../types/bounty";
import type { Course } from "../types/course";

interface Template {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  baseXP: number;
  baseCoins: number;
  isCourseBounty: boolean;
  completionHint: string;
}

const COURSE_TEMPLATES: Template[] = [
  {
    title: "Module Master",
    description: "Complete 1 module in {courseTitle}",
    difficulty: "easy",
    baseXP: 3,
    baseCoins: 1,
    isCourseBounty: true,
    completionHint: "complete_1_module",
  },
  {
    title: "Quick Study",
    description: "Spend 15 minutes reviewing {courseTitle}",
    difficulty: "easy",
    baseXP: 2,
    baseCoins: 1,
    isCourseBounty: true,
    completionHint: "study_15min",
  },
  {
    title: "Quiz Ready",
    description: "Score 80%+ on a {courseTitle} quiz",
    difficulty: "medium",
    baseXP: 5,
    baseCoins: 3,
    isCourseBounty: true,
    completionHint: "quiz_80",
  },
  {
    title: "Progress Push",
    description: "Complete {n} modules in {courseTitle}",
    difficulty: "medium",
    baseXP: 6,
    baseCoins: 3,
    isCourseBounty: true,
    completionHint: "complete_n_modules",
  },
  {
    title: "Challenge Run",
    description: "Finish a practice exercise in {courseTitle}",
    difficulty: "hard",
    baseXP: 8,
    baseCoins: 4,
    isCourseBounty: true,
    completionHint: "finish_exercise",
  },
];

const GENERAL_TEMPLATES: Template[] = [
  {
    title: "First Steps",
    description: "Create your first learning course to start your journey",
    difficulty: "medium",
    baseXP: 5,
    baseCoins: 3,
    isCourseBounty: false,
    completionHint: "create_first_course",
  },
  {
    title: "Profile Explorer",
    description: "Complete your profile details to unlock achievements",
    difficulty: "easy",
    baseXP: 3,
    baseCoins: 1,
    isCourseBounty: false,
    completionHint: "complete_profile",
  },
  {
    title: "Curiosity Spark",
    description: "Explore 3 different course areas to discover what interests you",
    difficulty: "medium",
    baseXP: 4,
    baseCoins: 2,
    isCourseBounty: false,
    completionHint: "explore_courses",
  },
  {
    title: "Goal Setter",
    description: "Set a weekly learning goal to stay on track",
    difficulty: "easy",
    baseXP: 2,
    baseCoins: 1,
    isCourseBounty: false,
    completionHint: "set_goal",
  },
  {
    title: "Streak Starter",
    description: "Open the app and check in to start your streak",
    difficulty: "easy",
    baseXP: 1,
    baseCoins: 1,
    isCourseBounty: false,
    completionHint: "open_app",
  },
];

type CourseInfo = Pick<Course, "id" | "title" | "category" | "difficulty" | "totalChapters"> & {
  progress: number;
  completedModules: number;
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function generateFallbackBounties(
  courses: CourseInfo[],
  dateSeed: string,
): Bounty[] {
  const now = Date.now();
  const sixHours = 6 * 60 * 60 * 1000;
  const seedNum = dateSeed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rng = seededRandom(seedNum);
  const rng2 = seededRandom(seedNum + 1);

  const bounties: Bounty[] = [];

  if (courses.length > 0) {
    const shuffled = shuffle(courses, rng);
    const templates = shuffle(COURSE_TEMPLATES, rng2);
    const count = Math.min(3, shuffled.length);

    for (let i = 0; i < count; i++) {
      const template = templates[i % templates.length];
      const course = shuffled[i % shuffled.length];
      const n = randInt(1, 2, rng);
      const xp = Math.min(9, template.baseXP + randInt(-1, 3, rng2));
      const coins = Math.min(5, template.baseCoins + randInt(0, 1, rng));

      bounties.push({
        id: `bounty_fallback_${seedNum}_${i}`,
        title: template.title,
        description: template.description.replace("{courseTitle}", course.title).replace("{n}", String(n)),
        difficulty: template.difficulty,
        rewardXP: Math.max(1, xp),
        rewardCoins: Math.max(1, coins),
        completionCondition: template.completionHint,
        courseId: course.id,
        courseTitle: course.title,
        status: "active",
        progress: 0,
        generatedAt: now,
        expiresAt: now + sixHours,
      });
    }

    while (bounties.length < 3) {
      const fallbackTemplate = GENERAL_TEMPLATES[Math.floor(rng() * GENERAL_TEMPLATES.length)];
      const xp = Math.min(9, fallbackTemplate.baseXP + randInt(-1, 2, rng));
      const coins = Math.min(5, fallbackTemplate.baseCoins + randInt(0, 1, rng2));

      bounties.push({
        id: `bounty_fallback_gen_${seedNum}_${bounties.length}`,
        title: fallbackTemplate.title,
        description: fallbackTemplate.description,
        difficulty: fallbackTemplate.difficulty,
        rewardXP: Math.max(1, xp),
        rewardCoins: Math.max(1, coins),
        completionCondition: fallbackTemplate.completionHint,
        courseId: null,
        courseTitle: null,
        status: "active",
        progress: 0,
        generatedAt: now,
        expiresAt: now + sixHours,
      });
    }
  } else {
    const templates = shuffle(GENERAL_TEMPLATES, rng);
    for (let i = 0; i < Math.min(3, templates.length); i++) {
      const template = templates[i];
      const xp = Math.min(9, template.baseXP + randInt(-1, 2, rng));
      const coins = Math.min(5, template.baseCoins + randInt(0, 1, rng2));

      bounties.push({
        id: `bounty_fallback_gen_${seedNum}_${i}`,
        title: template.title,
        description: template.description,
        difficulty: template.difficulty,
        rewardXP: Math.max(1, xp),
        rewardCoins: Math.max(1, coins),
        completionCondition: template.completionHint,
        courseId: null,
        courseTitle: null,
        status: "active",
        progress: 0,
        generatedAt: now,
        expiresAt: now + sixHours,
      });
    }
  }

  return bounties;
}
