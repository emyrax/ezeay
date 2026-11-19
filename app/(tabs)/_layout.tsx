import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import AppSidebar from "../../component/AppSidebar";
import ResponsiveTabBar from "../../component/ResponsiveTabBar";
import SpinWheel from "../../component/SpinWheel";
import { useResponsive } from "../../hooks/useResponsive";
import { useThemeColors } from "../../hooks/useTheme";

export default function TabLayout() {
  const { showSidebar } = useResponsive();
  const theme = useThemeColors();

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.bg },
        showSidebar && styles.rootWide,
      ]}
    >
      {showSidebar ? <AppSidebar /> : null}

      <View style={[styles.content, { backgroundColor: theme.bg }]}>
        <Tabs
          tabBar={(props) => (showSidebar ? null : <ResponsiveTabBar {...props} />)}
          screenOptions={{ headerShown: false }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="quests" />
          <Tabs.Screen name="explore" />
          <Tabs.Screen name="profile" />
          <Tabs.Screen name="coach" options={{ href: null }} />
        </Tabs>
      </View>

      <SpinWheel />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootWide: {
    flexDirection: "row",
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
});
