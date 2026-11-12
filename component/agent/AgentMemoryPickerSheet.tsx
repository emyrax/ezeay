import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";
import { memoryFileLabel, memoryFileMeta } from "../../lib/agent/memoryFiles";
import type { AgentMemoryRecord } from "../../types/agent";

interface Props {
  visible: boolean;
  memories: AgentMemoryRecord[];
  selectedIds: string[];
  onToggle: (memory: AgentMemoryRecord) => void;
  onClose: () => void;
  onManage: () => void;
}

export default function AgentMemoryPickerSheet({
  visible,
  memories,
  selectedIds,
  onToggle,
  onClose,
  onManage,
}: Props) {
  const theme = useThemeColors();
  const selected = new Set(selectedIds);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismiss} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.bg }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: theme.text }]}>Tag files</Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                Attach memory files to this message
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close file picker"
            >
              <MaterialCommunityIcons name="close" size={22} color={theme.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {memories.length === 0 ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={34}
                  color={theme.textMuted}
                />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  No memory files yet. Upload a PDF, image, document, or audio file to use
                  it as context.
                </Text>
              </View>
            ) : (
              memories.map((memory) => {
                const active = selected.has(memory.id);
                return (
                  <Pressable
                    key={memory.id}
                    onPress={() => onToggle(memory)}
                    style={[
                      styles.row,
                      {
                        backgroundColor: active ? theme.primary + "15" : theme.surface,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        {
                          backgroundColor: active ? theme.primary + "22" : theme.surfaceAlt,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="paperclip"
                        size={18}
                        color={active ? theme.primary : theme.textMuted}
                      />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                        {memoryFileLabel(memory)}
                      </Text>
                      {memory.content ? (
                        <Text
                          style={[styles.rowNote, { color: theme.textSecondary }]}
                          numberOfLines={2}
                        >
                          {memory.content}
                        </Text>
                      ) : null}
                      <Text style={[styles.rowMeta, { color: theme.textMuted }]}>
                        {memoryFileMeta(memory) || "Memory file"}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name={active ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                      size={21}
                      color={active ? theme.primary : theme.textMuted}
                    />
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <Pressable
            onPress={onManage}
            style={[styles.manageButton, { borderColor: theme.border }]}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="database-edit-outline" size={18} color={theme.primary} />
            <Text style={[styles.manageText, { color: theme.primary }]}>
              Manage memory & notes
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    maxHeight: "78%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: 28,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "center",
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontFamily,
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontFamily,
    fontSize: 12,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  empty: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  emptyText: {
    fontFamily,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  rowNote: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
  },
  rowMeta: {
    fontFamily,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 12,
  },
  manageText: {
    fontFamily,
    fontSize: 13,
    fontWeight: "600",
  },
});
