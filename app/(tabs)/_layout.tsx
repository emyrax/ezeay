import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import AppSidebar from "../../component/AppSidebar";
import ResponsiveTabBar from "../../component/ResponsiveTabBar";
import SpinWheel from "../../component/SpinWheel";
import { appTheme } from "../../constants/themes";
import { useResponsive } from "../../hooks/useResponsive";

export default function TabLayout() {
  const { showSidebar } = useResponsive();

  return (
    <View style={[styles.root, showSidebar && styles.rootWide]}>
      {showSidebar ? <AppSidebar /> : null}

      <View style={styles.content}>
        <Tabs
          tabBar={(props) => (showSidebar ? null : <ResponsiveTabBar {...props} />)}
          screenOptions={{ headerShown: false }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="quests" />
          <Tabs.Screen name="explore" />
          <Tabs.Screen name="profile" />
        </Tabs>
      </View>

      <SpinWheel />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: appTheme.bg,
  },
  rootWide: {
    flexDirection: "row",
  },
  content: {
    flex: 1,
    minWidth: 0,
    backgroundColor: appTheme.bg,
  },
});
