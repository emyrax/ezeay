import { getLevel, getNextLevel, MAX_LEVEL } from "../data/levels";

export interface LevelUpResult {
  leveledUp: boolean;
  newLevel: number;
  newRank: string;
  coinReward: number;
  xpProgress: number;
  xpForNext: number;
  xpPercent: number;
}

export function getLevelProgress(
  currentXp: number,
  currentLevel: number
): LevelUpResult {
  const current = getLevel(currentLevel);
  const next = getNextLevel(currentLevel);

  if (!current) {
    return {
      leveledUp: false,
      newLevel: 1,
      newRank: "Spark",
      coinReward: 0,
      xpProgress: currentXp,
      xpForNext: 100,
      xpPercent: 0,
    };
  }

  if (currentLevel >= MAX_LEVEL || !next) {
    return {
      leveledUp: false,
      newLevel: currentLevel,
      newRank: current.rankName,
      coinReward: 0,
      xpProgress: currentXp - current.xpRequired,
      xpForNext: 0,
      xpPercent: 100,
    };
  }

  const xpIntoLevel = currentXp - current.xpRequired;
  const xpNeeded = next.xpRequired - current.xpRequired;
  const xpPercent = Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100));

  const leveledUp = currentXp >= next.xpRequired;

  return {
    leveledUp,
    newLevel: leveledUp ? next.levelNumber : currentLevel,
    newRank: leveledUp ? next.rankName : current.rankName,
    coinReward: leveledUp ? next.coinReward : 0,
    xpProgress: xpIntoLevel,
    xpForNext: xpNeeded,
    xpPercent,
  };
}

export function calculateXpAward(
  currentXp: number,
  currentLevel: number,
  xpGained: number
): LevelUpResult {
  const totalXp = currentXp + xpGained;
  return getLevelProgress(totalXp, currentLevel);
}


