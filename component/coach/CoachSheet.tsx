import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { coachColors, coachFont } from "../../constants/coachTheme";

interface CoachSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  headerAction?: ReactNode;
}

export default function CoachSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  headerAction,
}: CoachSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 12) + 14 },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.head}>
            <View style={styles.headCopy}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {headerAction}
            <Pressable
              onPress={onClose}
              style={styles.close}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <MaterialCommunityIcons
                name="close"
                size={17}
                color={coachColors.textSecondary}
              />
            </Pressable>
          </View>
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(17, 24, 39, 0.32)",
  },
  sheet: {
    maxHeight: "82%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: coachColors.surface,
    paddingHorizontal: 20,
    shadowColor: coachColors.shadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 18,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: coachColors.borderStrong,
    marginTop: 10,
    marginBottom: 14,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 14,
  },
  headCopy: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: coachFont.bold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: coachColors.text,
  },
  subtitle: {
    fontFamily: coachFont.regular,
    fontSize: 12,
    lineHeight: 17,
    color: coachColors.textMuted,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: coachColors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingBottom: 4,
    gap: 8,
  },
});
