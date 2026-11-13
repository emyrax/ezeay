import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AmbientBackground from "./AmbientBackground";

interface CoachScreenProps {
  children: ReactNode;
  maxWidth?: number;
}

export default function CoachScreen({
  children,
  maxWidth = 520,
}: CoachScreenProps) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <AmbientBackground />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={[styles.content, { maxWidth }]}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F6F8F5",
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
  },
});
