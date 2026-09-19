import type { Level } from "../types/level";

const levelData: Omit<Level, "id">[] = [
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

export const LEVELS: Level[] = levelData.map((l) => ({
  ...l,
  id: `level_${l.levelNumber}`,
}));

export function getLevel(levelNumber: number): Level | undefined {
  return LEVELS.find((l) => l.levelNumber === levelNumber);
}

export function getNextLevel(levelNumber: number): Level | undefined {
  return LEVELS.find((l) => l.levelNumber === levelNumber + 1);
}

export function getRankName(levelNumber: number): string {
  return getLevel(levelNumber)?.rankName ?? "Spark";
}

export function getHighestLevel(): Level {
  return LEVELS[LEVELS.length - 1];
}

export const MAX_LEVEL = 50;
