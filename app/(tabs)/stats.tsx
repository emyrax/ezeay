import { StyleSheet, View } from "react-native";
import ErrorBoundary from "../../component/ErrorBoundary";
import ThreadFeedScreen from "../../component/ThreadFeedScreen";
import ScreenContainer from "../../component/ScreenContainer";

export default function ExploreScreen() {
  return (
    <View style={styles.root}>
      <ErrorBoundary>
        <ScreenContainer width="full">
          <ThreadFeedScreen />
        </ScreenContainer>
      </ErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
