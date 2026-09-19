import { useCallback, useRef, useState } from "react";
import ErrorBoundary from "../../component/ErrorBoundary";
import ExploreReels from "../../component/ExploreReels";
import ScreenContainer from "../../component/ScreenContainer";

export default function ExploreScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [exploreRefresh, setExploreRefresh] = useState(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setExploreRefresh((n) => n + 1);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => setRefreshing(false), 800);
  }, []);

  return (
    <ErrorBoundary>
      <ScreenContainer>
        <ExploreReels
          refreshKey={exploreRefresh}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      </ScreenContainer>
    </ErrorBoundary>
  );
}