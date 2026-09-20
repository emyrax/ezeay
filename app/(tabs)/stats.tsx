import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import ErrorBoundary from "../../component/ErrorBoundary";
import ExploreReels, { ReelsOpeningOverlay } from "../../component/ExploreReels";
import ScreenContainer from "../../component/ScreenContainer";
import { useAuth } from "../../contexts/AuthContext";
import { useEnrollmentStore } from "../../store/courseEnrollmentStore";
import { useProgressStore } from "../../store/courseProgressStore";

export default function ExploreScreen() {
  const { profile, getToken } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [exploreRefresh, setExploreRefresh] = useState(0);
  const [opening, setOpening] = useState(false);

  const hydrateProgress = useCallback(() => {
    useProgressStore.getState().loadProgress();
  }, []);

  useEffect(() => {
    hydrateProgress();
    if (profile) {
      const state = useEnrollmentStore.getState();
      if (!state.loaded && !state.loading) {
        state.fetchEnrollments(profile.uid, getToken);
      }
    }
  }, [profile, getToken, hydrateProgress]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setExploreRefresh((n) => n + 1);
  }, []);

  const handleRefreshDone = useCallback(() => {
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.root}>
      <ErrorBoundary>
        <ScreenContainer>
          <ExploreReels
            refreshKey={exploreRefresh}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onRefreshDone={handleRefreshDone}
            onOpeningChange={setOpening}
          />
          <View style={{ height: 100 }} />
        </ScreenContainer>
         
      </ErrorBoundary>

      <ReelsOpeningOverlay visible={opening} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});