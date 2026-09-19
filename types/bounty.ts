export type BountyDifficulty = 'easy' | 'medium' | 'hard'
export type BountyStatus = 'active' | 'completed' | 'claimed' | 'expired'

export interface Bounty {
  id: string
  title: string
  description: string
  difficulty: BountyDifficulty
  rewardXP: number
  rewardCoins: number
  completionCondition: string
  courseId: string | null
  courseTitle: string | null
  status: BountyStatus
  progress: number
  generatedAt: number
  expiresAt: number
}
