if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {
    // no .env in cwd; rely on real environment variables
  }
}
import { neon } from "@neondatabase/serverless";

const trophyData = [
  { id: "trophy_first_voyage", name: "First Voyage", description: "Complete your first course to unlock", icon: "rocket", conditionType: "courses_completed", conditionValue: 1, coinReward: 50 },
  { id: "trophy_grand_scholar", name: "Grand Scholar", description: "Complete 3 courses to unlock", icon: "book", conditionType: "courses_completed", conditionValue: 3, coinReward: 100 },
  { id: "trophy_apex_graduate", name: "Apex Graduate", description: "Complete 5 courses to unlock", icon: "trophy", conditionType: "courses_completed", conditionValue: 5, coinReward: 200 },
  { id: "trophy_rising_star", name: "Rising Star", description: "Earn 100 XP to unlock", icon: "star", conditionType: "xp_total", conditionValue: 100, coinReward: 25 },
  { id: "trophy_trailblazer", name: "Trailblazer", description: "Earn 1,000 XP to unlock", icon: "map", conditionType: "xp_total", conditionValue: 1000, coinReward: 100 },
  { id: "trophy_xp_champion", name: "XP Champion", description: "Earn 10,000 XP to unlock", icon: "crown", conditionType: "xp_total", conditionValue: 10000, coinReward: 500 },
  { id: "trophy_streak_warrior", name: "Streak Warrior", description: "Maintain a 3-day streak to unlock", icon: "fire", conditionType: "streak_days", conditionValue: 3, coinReward: 50 },
  { id: "trophy_unstoppable", name: "Unstoppable", description: "Maintain a 7-day streak to unlock", icon: "lightning", conditionType: "streak_days", conditionValue: 7, coinReward: 150 },
  { id: "trophy_bounty_hunter", name: "Bounty Hunter", description: "Claim 5 bounties to unlock", icon: "target", conditionType: "bounties_claimed", conditionValue: 5, coinReward: 75 },
  { id: "trophy_master_hunter", name: "Master Hunter", description: "Claim 20 bounties to unlock", icon: "shield", conditionType: "bounties_claimed", conditionValue: 20, coinReward: 200 },
  { id: "trophy_module_master", name: "Module Master", description: "Complete 20 modules to unlock", icon: "layers", conditionType: "modules_completed", conditionValue: 20, coinReward: 100 },
  { id: "trophy_scholar_supreme", name: "Scholar Supreme", description: "Reach gaming level 10 to unlock", icon: "gem", conditionType: "gaming_level", conditionValue: 10, coinReward: 300 },
];

const courseData = [
  {
    id: "course_python_ai",
    title: "Python for AI",
    description: "Master Python fundamentals and build AI-powered applications from scratch.",
    category: "programming",
    difficulty: "Intermediate",
    totalChapters: 20,
    rewardXp: 500,
    icon: "code",
  },
  {
    id: "course_digital_marketing",
    title: "Digital Marketing 101",
    description: "Learn SEO, content marketing, social media strategy, and analytics.",
    category: "marketing",
    difficulty: "Beginner",
    totalChapters: 20,
    rewardXp: 350,
    icon: "trending-up",
  },
  {
    id: "course_data_science",
    title: "Data Science Foundations",
    description: "Explore statistics, data visualization, and machine learning basics.",
    category: "data-science",
    difficulty: "Intermediate",
    totalChapters: 18,
    rewardXp: 600,
    icon: "bar-chart",
  },
  {
    id: "course_web_dev",
    title: "Web Development Bootcamp",
    description: "Build modern web apps with HTML, CSS, JavaScript, and React.",
    category: "programming",
    difficulty: "Beginner",
    totalChapters: 24,
    rewardXp: 700,
    icon: "globe",
  },
  {
    id: "course_ui_ux",
    title: "UI/UX Design Principles",
    description: "Design beautiful, user-centered interfaces with modern tools.",
    category: "design",
    difficulty: "Beginner",
    totalChapters: 14,
    rewardXp: 400,
    icon: "palette",
  },
];

const levelData = [
  { levelNumber: 1, xpRequired: 0, rankName: "Spark", coinReward: 0 },
  { levelNumber: 2, xpRequired: 100, rankName: "Curious", coinReward: 10 },
  { levelNumber: 3, xpRequired: 250, rankName: "Seeker", coinReward: 20 },
  { levelNumber: 4, xpRequired: 500, rankName: "Explorer", coinReward: 35 },
  { levelNumber: 5, xpRequired: 1000, rankName: "Pioneer", coinReward: 50 },
  { levelNumber: 6, xpRequired: 1750, rankName: "Scholar", coinReward: 70 },
  { levelNumber: 7, xpRequired: 2750, rankName: "Adept", coinReward: 90 },
  { levelNumber: 8, xpRequired: 4000, rankName: "Sage", coinReward: 115 },
  { levelNumber: 9, xpRequired: 5500, rankName: "Prodigy", coinReward: 140 },
  { levelNumber: 10, xpRequired: 7500, rankName: "Luminary", coinReward: 170 },
  { levelNumber: 11, xpRequired: 10000, rankName: "Wayfarer", coinReward: 200 },
  { levelNumber: 12, xpRequired: 13000, rankName: "Trailblazer", coinReward: 235 },
  { levelNumber: 13, xpRequired: 16500, rankName: "Pathfinder", coinReward: 270 },
  { levelNumber: 14, xpRequired: 20500, rankName: "Navigator", coinReward: 310 },
  { levelNumber: 15, xpRequired: 25000, rankName: "Voyager", coinReward: 350 },
  { levelNumber: 16, xpRequired: 30500, rankName: "Artisan", coinReward: 400 },
  { levelNumber: 17, xpRequired: 36500, rankName: "Architect", coinReward: 450 },
  { levelNumber: 18, xpRequired: 43000, rankName: "Strategist", coinReward: 500 },
  { levelNumber: 19, xpRequired: 50500, rankName: "Maestro", coinReward: 555 },
  { levelNumber: 20, xpRequired: 59000, rankName: "Virtuoso", coinReward: 610 },
  { levelNumber: 21, xpRequired: 68500, rankName: "Champion", coinReward: 670 },
  { levelNumber: 22, xpRequired: 79000, rankName: "Paragon", coinReward: 730 },
  { levelNumber: 23, xpRequired: 90500, rankName: "Savant", coinReward: 795 },
  { levelNumber: 24, xpRequired: 103000, rankName: "Grandmaster", coinReward: 860 },
  { levelNumber: 25, xpRequired: 117000, rankName: "Legend", coinReward: 930 },
  { levelNumber: 26, xpRequired: 132000, rankName: "Enigma", coinReward: 1000 },
  { levelNumber: 27, xpRequired: 148000, rankName: "Zenith", coinReward: 1075 },
  { levelNumber: 28, xpRequired: 165000, rankName: "Apex", coinReward: 1150 },
  { levelNumber: 29, xpRequired: 183000, rankName: "Transcendent", coinReward: 1230 },
  { levelNumber: 30, xpRequired: 202000, rankName: "Ascendant", coinReward: 1310 },
  { levelNumber: 31, xpRequired: 222000, rankName: "Radiant", coinReward: 1400 },
  { levelNumber: 32, xpRequired: 243000, rankName: "Eternal", coinReward: 1490 },
  { levelNumber: 33, xpRequired: 265000, rankName: "Infinite", coinReward: 1585 },
  { levelNumber: 34, xpRequired: 288000, rankName: "Empyrean", coinReward: 1680 },
  { levelNumber: 35, xpRequired: 312000, rankName: "Sovereign", coinReward: 1780 },
  { levelNumber: 36, xpRequired: 337000, rankName: "Eclipse", coinReward: 1885 },
  { levelNumber: 37, xpRequired: 363000, rankName: "Omega", coinReward: 1990 },
  { levelNumber: 38, xpRequired: 390000, rankName: "Prime", coinReward: 2100 },
  { levelNumber: 39, xpRequired: 418000, rankName: "Singularity", coinReward: 2215 },
  { levelNumber: 40, xpRequired: 447000, rankName: "Cosmos", coinReward: 2335 },
  { levelNumber: 41, xpRequired: 477000, rankName: "Nova", coinReward: 2465 },
  { levelNumber: 42, xpRequired: 508000, rankName: "Nebula", coinReward: 2600 },
  { levelNumber: 43, xpRequired: 540000, rankName: "Stellar", coinReward: 2740 },
  { levelNumber: 44, xpRequired: 573000, rankName: "Astral", coinReward: 2885 },
  { levelNumber: 45, xpRequired: 607000, rankName: "Ethereal", coinReward: 3035 },
  { levelNumber: 46, xpRequired: 642000, rankName: "Celestial", coinReward: 3190 },
  { levelNumber: 47, xpRequired: 678000, rankName: "Divine", coinReward: 3350 },
  { levelNumber: 48, xpRequired: 715000, rankName: "Mystic", coinReward: 3515 },
  { levelNumber: 49, xpRequired: 753000, rankName: "Arcane", coinReward: 3685 },
  { levelNumber: 50, xpRequired: 792000, rankName: "Primeval", coinReward: 3860 },
];

async function seed() {
  const sql = neon(process.env.NEON_DATABASE_URL!);

  for (const level of levelData) {
    const id = `level_${level.levelNumber}`;
    await sql`
      INSERT INTO levels (id, level_number, xp_required, rank_name, coin_reward, created_at)
      VALUES (${id}, ${level.levelNumber}, ${level.xpRequired}, ${level.rankName}, ${level.coinReward}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        level_number = EXCLUDED.level_number,
        xp_required = EXCLUDED.xp_required,
        rank_name = EXCLUDED.rank_name,
        coin_reward = EXCLUDED.coin_reward;
    `;
    console.log(`level_${level.levelNumber} — ${level.rankName}`);
  }

  console.log("Levels seeded!");

  for (const trophy of trophyData) {
    await sql`
      INSERT INTO trophies (id, name, description, icon, condition_type, condition_value, coin_reward, created_at)
      VALUES (${trophy.id}, ${trophy.name}, ${trophy.description}, ${trophy.icon}, ${trophy.conditionType}, ${trophy.conditionValue}, ${trophy.coinReward}, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        icon = EXCLUDED.icon,
        condition_type = EXCLUDED.condition_type,
        condition_value = EXCLUDED.condition_value,
        coin_reward = EXCLUDED.coin_reward;
    `;
    console.log(`${trophy.id} — ${trophy.name}`);
  }

  console.log("Trophies seeded!");

  for (const course of courseData) {
    await sql`
      INSERT INTO courses (id, title, description, category, difficulty, total_chapters, reward_xp, icon, creator_id, created_at)
      VALUES (${course.id}, ${course.title}, ${course.description}, ${course.category}, ${course.difficulty}, ${course.totalChapters}, ${course.rewardXp}, ${course.icon}, 'system', NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        difficulty = EXCLUDED.difficulty,
        total_chapters = EXCLUDED.total_chapters,
        reward_xp = EXCLUDED.reward_xp,
        icon = EXCLUDED.icon,
        creator_id = EXCLUDED.creator_id;
    `;
    console.log(`${course.id} — ${course.title}`);
  }

  console.log("Courses seeded!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
