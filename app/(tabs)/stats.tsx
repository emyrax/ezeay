import { StyleSheet, View } from "react-native";
import ErrorBoundary from "../../component/ErrorBoundary";
import ThreadFeedScreen from "../../component/ThreadFeedScreen";

export default function ExploreScreen() {
  return (
    <View style={styles.root}>
      <ErrorBoundary>
        <ThreadFeedScreen />
      </ErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
