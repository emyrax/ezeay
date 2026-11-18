import { useEffect, useState, type ReactNode } from "react";
import {
  I18nManager,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { initI18n } from "../lib/i18n";
import { isRTL } from "../lib/i18n/languages";
import { useLanguageStore } from "../store/languageStore";

interface I18nProviderProps {
  children: ReactNode;
}

function applyWebDirection(language: string) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.documentElement.dir = isRTL(language) ? "rtl" : "ltr";
}

function applyNativeDirection(language: string): boolean {
  if (Platform.OS === "web") return false;
  const shouldUseRTL = isRTL(language);
  if (I18nManager.isRTL === shouldUseRTL) {
    I18nManager.allowRTL(shouldUseRTL);
    return false;
  }
  I18nManager.allowRTL(shouldUseRTL);
  I18nManager.forceRTL(shouldUseRTL);
  return true;
}

function RTLRestartDialog({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{t("common.restartTitle")}</Text>
          <Text style={styles.message}>{t("common.restartMessage")}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.button}
          >
            <Text style={styles.buttonLabel}>{t("common.understood")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function I18nProvider({ children }: I18nProviderProps) {
  const appLanguage = useLanguageStore((state) => state.appLanguage);
  const hydrated = useLanguageStore((state) => state.hydrated);
  const [restartRequired, setRestartRequired] = useState(false);

  initI18n(appLanguage);

  useEffect(() => {
    initI18n(appLanguage);
    applyWebDirection(appLanguage);
    if (applyNativeDirection(appLanguage)) {
      setRestartRequired(true);
    }
  }, [appLanguage]);

  if (!hydrated) {
    return <View style={styles.hydrationScreen} />;
  }

  return (
    <>
      {children}
      <RTLRestartDialog
        visible={restartRequired}
        onClose={() => setRestartRequired(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  hydrationScreen: {
    flex: 1,
    backgroundColor: "#152A4D",
  },
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(3, 10, 24, 0.72)",
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1F3A5F",
    backgroundColor: "#152A4D",
    padding: 22,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  message: {
    color: "#B7C7DB",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  button: {
    alignSelf: "flex-end",
    borderRadius: 12,
    backgroundColor: "#95D0FD",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  buttonLabel: {
    color: "#0B1B33",
    fontSize: 14,
    fontWeight: "700",
  },
});
