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
import {
  getCoachOverlayMode,
  type CoachOverlayPreference,
} from "../../lib/coach/overlay";
import { useResponsive } from "../../hooks/useResponsive";

interface CoachSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  headerAction?: ReactNode;
  presentation?: CoachOverlayPreference;
}

export default function CoachSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  headerAction,
  presentation = "auto",
}: CoachSheetProps) {
  const insets = useSafeAreaInsets();
  const { width, isWeb } = useResponsive();
  const mode = getCoachOverlayMode({ width, isWeb, preference: presentation });
  const isSheet = mode === "sheet";
  const isPanel = mode === "panel";

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isSheet ? "slide" : "fade"}
      statusBarTranslucent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View
        style={[
          styles.root,
          isSheet ? styles.rootSheet : isPanel ? styles.rootPanel : styles.rootPopup,
        ]}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            isSheet
              ? { paddingBottom: Math.max(insets.bottom, 12) + 14 }
              : styles.floating,
            isPanel ? styles.panel : isSheet ? styles.mobileSheet : styles.popup,
          ]}
        >
          {isSheet ? <View style={styles.handle} /> : null}
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
            style={[styles.body, isPanel && styles.bodyPanel]}
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
  },
  rootSheet: {
    justifyContent: "flex-end",
  },
  rootPopup: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  rootPanel: {
    justifyContent: "center",
    alignItems: "flex-end",
    paddingVertical: 16,
    paddingRight: 24,
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
    backgroundColor: coachColors.surface,
    paddingHorizontal: 20,
    shadowColor: coachColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 18,
  },
  mobileSheet: {
    width: "100%",
    maxHeight: "82%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  popup: {
    width: 460,
    maxWidth: "100%",
    maxHeight: "82%",
    borderRadius: 28,
  },
  panel: {
    width: 380,
    maxWidth: "100%",
    maxHeight: "92%",
    borderRadius: 28,
  },
  floating: {
    paddingTop: 18,
    paddingBottom: 20,
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
    flexShrink: 1,
  },
  bodyPanel: {
    flexGrow: 1,
  },
  bodyContent: {
    paddingBottom: 4,
    gap: 8,
  },
});
