import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_GOALS_KEY = "pendingLearningGoals";

export async function savePendingGoals(goals: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_GOALS_KEY, JSON.stringify(goals));
  } catch (err) {
    console.warn("[pendingGoals] save failed:", err);
  }
}

export async function consumePendingGoals(): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_GOALS_KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(PENDING_GOALS_KEY);
    const goals = JSON.parse(raw) as string[];
    return Array.isArray(goals) ? goals : null;
  } catch (err) {
    console.warn("[pendingGoals] consume failed:", err);
    return null;
  }
}