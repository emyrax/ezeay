import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import AppSidebar from "../../component/AppSidebar";
import ResponsiveTabBar from "../../component/ResponsiveTabBar";
import SpinWheel from "../../component/SpinWheel";
import { useResponsive } from "../../hooks/useResponsive";

export default function TabLayout() {
  const { isWebWide } = useResponsive();

  return (
    <View style={[styles.root, isWebWide && styles.rootWide]}>
      {isWebWide ? <AppSidebar /> : null}

      <View style={styles.content}>
        <Tabs
          tabBar={(props) => (isWebWide ? null : <ResponsiveTabBar {...props} />)}
          screenOptions={{ headerShown: false }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="quests" />
          <Tabs.Screen name="stats" />
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
  },
  rootWide: {
    flexDirection: "row",
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
});
