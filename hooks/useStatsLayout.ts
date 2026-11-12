import { useWindowDimensions } from "react-native";
import { getStatsLayout } from "../lib/statsLayout";

export function useStatsLayout() {
  const { width } = useWindowDimensions();
  return getStatsLayout(width);
}
