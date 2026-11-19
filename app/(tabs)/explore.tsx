import { StyleSheet, View } from "react-native";
import ErrorBoundary from "../../component/ErrorBoundary";
import ThreadFeedScreen from "../../component/ThreadFeedScreen";
import { useThemeColors } from "../../hooks/useTheme";

export default function ExploreScreen() {
  const theme = useThemeColors();

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ErrorBoundary>
        <ThreadFeedScreen variant="explore" />
      </ErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
