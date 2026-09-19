import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useTheme";
import { ALL_APPS, getMaxVisibleApps, getVisibleApps, useQuickAppStore } from "../store/quickAppStore";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AppManagerSheet({ visible, onClose }: Props) {
  const theme = useThemeColors();
  const { width } = useWindowDimensions();
  const visibleIds = useQuickAppStore((s) => s.visibleIds);
  const addApp = useQuickAppStore((s) => s.addApp);
  const removeApp = useQuickAppStore((s) => s.removeApp);
  const moveUp = useQuickAppStore((s) => s.moveUp);
  const moveDown = useQuickAppStore((s) => s.moveDown);
  const resetToDefaults = useQuickAppStore((s) => s.resetToDefaults);
  const [limitBanner, setLimitBanner] = useState(false);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxApps = getMaxVisibleApps(width);
  const visibleApps = getVisibleApps(visibleIds);
  const availableApps = ALL_APPS.filter((a) => !visibleIds.includes(a.id));
  const atLimit = visibleApps.length >= maxApps;

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  function showLimitBanner() {
    setLimitBanner(true);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setLimitBanner(false), 3500);
  }

  function hideLimitBanner() {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setLimitBanner(false);
  }

  function handleAdd(id: string) {
    if (atLimit) {
      showLimitBanner();
      return;
    }
    hideLimitBanner();
    addApp(id);
  }

  function handleRemove(id: string) {
    hideLimitBanner();
    removeApp(id);
  }

  function handleReset() {
    hideLimitBanner();
    resetToDefaults();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Customise Apps</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="eye-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                Visible Apps ({visibleApps.length}/{maxApps})
              </Text>
            </View>

            {visibleApps.map((app) => (
              <View
                key={app.id}
                style={[styles.row, { borderBottomColor: theme.borderLight }]}
              >
                <View style={[styles.iconBox, { backgroundColor: `${theme.primary}20` }]}>
                  <MaterialCommunityIcons name={app.icon as any} size={20} color={theme.primary} />
                </View>
                <Text style={[styles.label, { color: theme.text }]}>{app.label}</Text>
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => moveUp(app.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="chevron-up" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => moveDown(app.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="chevron-down" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => handleRemove(app.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons name="close-circle-outline" size={18} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
              <MaterialCommunityIcons name="plus-circle-outline" size={18} color={theme.textSecondary} />
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                Available Apps ({availableApps.length})
              </Text>
            </View>

            {limitBanner && (
              <View style={[styles.banner, { borderColor: theme.primary + "40", backgroundColor: theme.primary + "18" }]}>
                <MaterialCommunityIcons name="information-outline" size={18} color={theme.primary} />
                <Text style={[styles.bannerText, { color: theme.text }]}>
                  Up to {maxApps} apps fit on this screen. Remove one from Visible Apps to add another.
                </Text>
                <TouchableOpacity onPress={hideLimitBanner} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            {availableApps.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                All apps are in your quick access list
              </Text>
            ) : (
              <View style={styles.grid}>
                {availableApps.map((app) => (
                  <TouchableOpacity
                    key={app.id}
                    style={[styles.gridItem, { backgroundColor: theme.surfaceAlt }, atLimit && styles.gridItemDisabled]}
                    activeOpacity={atLimit ? 1 : 0.7}
                    onPress={() => handleAdd(app.id)}
                  >
                    <View style={[styles.gridIconBox, { backgroundColor: `${theme.primary}20` }]}>
                      <MaterialCommunityIcons name={app.icon as any} size={24} color={atLimit ? theme.textMuted : theme.primary} />
                    </View>
                    <Text style={[styles.gridLabel, { color: atLimit ? theme.textMuted : theme.text }]}>{app.label}</Text>
                    <MaterialCommunityIcons name={atLimit ? "lock" : "plus-circle"} size={18} color={atLimit ? theme.textMuted : theme.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: theme.border }]}
              onPress={handleReset}
            >
              <MaterialCommunityIcons name="restore" size={18} color={theme.textMuted} />
              <Text style={[styles.resetText, { color: theme.textMuted }]}>Reset to defaults</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  body: {
    flexGrow: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  smallBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    gap: 8,
  },
  gridIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  gridLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
  },
  gridItemDisabled: {
    opacity: 0.45,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  resetText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
