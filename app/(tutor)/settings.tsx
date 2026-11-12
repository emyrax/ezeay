import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { fontFamily } from "../../constants/themes";
import { useAuth } from "../../contexts/AuthContext";
import { useThemeColors } from "../../hooks/useTheme";
import { api, friendlyError } from "../../lib/api";
import {
  memoryFileLabel,
  memoryFileMeta,
  pickMemoryFile,
  uploadMemoryFile,
} from "../../lib/agent/memoryFiles";
import type { AgentMemoryRecord } from "../../types/agent";

const MEMORY_KINDS = ["fact", "preference", "goal", "file"];

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; memory: AgentMemoryRecord };

export default function AgentSettingsScreen() {
  const router = useRouter();
  const theme = useThemeColors();
  const { getToken } = useAuth();
  const [memories, setMemories] = useState<AgentMemoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorKind, setEditorKind] = useState("fact");
  const [editorContent, setEditorContent] = useState("");

  const load = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const res = await api.agent.memories.list(token);
      setMemories(res.memories);
      setError(null);
    } catch (err) {
      setError(friendlyError(err, "Could not load agent memories."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getToken()
      .then((token) => {
        if (cancelled || !token) return;
        return load(token);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [getToken, load]);

  const openCreate = () => {
    setEditorKind("fact");
    setEditorContent("");
    setEditor({ mode: "create" });
  };

  const openEdit = (memory: AgentMemoryRecord) => {
    setEditorKind(memory.kind || "fact");
    setEditorContent(memory.content);
    setEditor({ mode: "edit", memory });
  };

  const closeEditor = () => {
    if (saving) return;
    setEditor(null);
  };

  const saveEditor = async () => {
    if (!editor || saving) return;
    const content = editorContent.trim();
    if (!content) {
      setError("Add a note so you can recognize this memory later.");
      return;
    }
    const token = await getToken();
    if (!token) return;

    setSaving(true);
    try {
      if (editor.mode === "create") {
        const res = await api.agent.memories.create(
          { kind: editorKind, content },
          token,
        );
        setMemories((prev) => [res.memory, ...prev]);
      } else {
        const res = await api.agent.memories.update(
          editor.memory.id,
          { kind: editorKind, content },
          token,
        );
        setMemories((prev) =>
          prev.map((memory) =>
            memory.id === res.memory.id ? res.memory : memory,
          ),
        );
      }
      setEditor(null);
      setError(null);
    } catch (err) {
      setError(friendlyError(err, "Could not save that memory."));
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async () => {
    if (uploading) return;
    const token = await getToken();
    if (!token) return;

    try {
      const file = await pickMemoryFile();
      if (!file) return;
      setUploading(true);
      const result = await uploadMemoryFile(file, token);
      setMemories((prev) => [
        result.memory,
        ...prev.filter((memory) => memory.id !== result.memory.id),
      ]);
      setEditorKind(result.memory.kind || "file");
      setEditorContent(result.memory.content);
      setEditor({ mode: "edit", memory: result.memory });
      setError(null);
      if (result.extractionFailed) {
        Alert.alert(
          "File saved",
          "We could not read text from this file, so the agent will only use your note about it.",
        );
      }
    } catch (err) {
      setError(friendlyError(err, "Could not upload that file."));
    } finally {
      setUploading(false);
    }
  };

  const remove = (memory: AgentMemoryRecord) => {
    Alert.alert(
      "Delete memory?",
      memoryFileLabel(memory),
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const token = await getToken();
            if (!token) return;
            try {
              await api.agent.memories.remove(memory.id, token);
              setMemories((prev) => prev.filter((item) => item.id !== memory.id));
              setError(null);
            } catch (err) {
              setError(friendlyError(err, "Could not delete that memory."));
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: theme.text }]}>Agent memory</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Notes and files the agent can use
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.actions}>
          <Pressable
            onPress={openCreate}
            style={[styles.actionButton, { borderColor: theme.border }]}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="note-plus-outline" size={17} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.textSecondary }]}>
              Add note
            </Text>
          </Pressable>
          <Pressable
            onPress={uploadFile}
            disabled={uploading}
            style={[styles.actionButton, { borderColor: theme.border }]}
            accessibilityRole="button"
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <MaterialCommunityIcons name="paperclip" size={17} color={theme.primary} />
            )}
            <Text style={[styles.actionText, { color: theme.textSecondary }]}>
              {uploading ? "Uploading..." : "Upload file"}
            </Text>
          </Pressable>
        </View>

        {error ? (
          <Text style={[styles.error, { color: theme.warning }]}>{error}</Text>
        ) : null}
        {loading ? (
          <ActivityIndicator color={theme.primary} />
        ) : memories.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textMuted }]}>
            No memories yet. Add a note or upload a PDF, image, document, or audio file
            the agent can use as context.
          </Text>
        ) : (
          memories.map((memory) => {
            const isFile = Boolean(memory.fileUrl);
            return (
              <View
                key={memory.id}
                style={[
                  styles.row,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: isFile ? theme.primary + "18" : theme.surfaceAlt },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={isFile ? "file-document-outline" : "brain"}
                    size={19}
                    color={isFile ? theme.primary : theme.textMuted}
                  />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowKind, { color: theme.primary }]}>
                    {isFile ? memoryFileLabel(memory) : memory.kind}
                  </Text>
                  <Text
                    style={[styles.rowContent, { color: theme.textSecondary }]}
                    numberOfLines={4}
                  >
                    {memory.content || "No note yet — tap edit to add one."}
                  </Text>
                  {isFile ? (
                    <Text style={[styles.rowMeta, { color: theme.textMuted }]}>
                      {memoryFileMeta(memory) || "Memory file"}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.rowActions}>
                  <Pressable
                    onPress={() => openEdit(memory)}
                    style={styles.rowButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${memoryFileLabel(memory)}`}
                  >
                    <MaterialCommunityIcons
                      name="pencil-outline"
                      size={18}
                      color={theme.textMuted}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => remove(memory)}
                    style={styles.rowButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${memoryFileLabel(memory)}`}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={18}
                      color={theme.danger}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={Boolean(editor)}
        transparent
        animationType="slide"
        onRequestClose={closeEditor}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismiss} onPress={closeEditor} />
          <View style={[styles.editorSheet, { backgroundColor: theme.bg }]}>
            <View style={styles.editorHandle} />
            <Text style={[styles.editorTitle, { color: theme.text }]}>
              {editor?.mode === "create" ? "New memory" : "Edit memory"}
            </Text>
            {editor?.mode === "edit" && editor.memory.fileUrl ? (
              <Text style={[styles.editorFile, { color: theme.textMuted }]}>
                {editor.memory.fileName || editor.memory.kind}
              </Text>
            ) : null}

            <Text style={[styles.editorLabel, { color: theme.textMuted }]}>Type</Text>
            <View style={styles.kindRow}>
              {MEMORY_KINDS.map((kind) => {
                const active = editorKind === kind;
                return (
                  <Pressable
                    key={kind}
                    onPress={() => setEditorKind(kind)}
                    style={[
                      styles.kindChip,
                      {
                        backgroundColor: active ? theme.primary + "22" : theme.surface,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.kindText,
                        { color: active ? theme.primary : theme.textMuted },
                      ]}
                    >
                      {kind}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.editorLabel, { color: theme.textMuted }]}>Note</Text>
            <TextInput
              value={editorContent}
              onChangeText={setEditorContent}
              placeholder="What should the agent remember about this?"
              placeholderTextColor={theme.textMuted}
              style={[
                styles.editorInput,
                {
                  color: theme.text,
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              multiline
              maxLength={400}
              editable={!saving}
            />

            <View style={styles.editorActions}>
              <Pressable
                onPress={closeEditor}
                style={[styles.cancelButton, { borderColor: theme.border }]}
                accessibilityRole="button"
              >
                <Text style={[styles.cancelText, { color: theme.textSecondary }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={saveEditor}
                disabled={saving}
                style={[
                  styles.saveButton,
                  { backgroundColor: saving ? theme.surfaceAlt : theme.primary },
                ]}
                accessibilityRole="button"
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontFamily,
    fontSize: 19,
    fontWeight: "700",
  },
  subtitle: {
    fontFamily: "sans-serif",
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
  },
  actionText: {
    fontFamily: "sans-serif",
    fontSize: 12,
    fontWeight: "600",
  },
  error: {
    fontFamily: "sans-serif",
    fontSize: 12,
  },
  empty: {
    fontFamily: "sans-serif",
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCopy: {
    flex: 1,
    gap: 3,
  },
  rowKind: {
    fontFamily: "sans-serif",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  rowContent: {
    fontFamily: "sans-serif",
    fontSize: 13,
    lineHeight: 18,
  },
  rowMeta: {
    fontFamily: "sans-serif",
    fontSize: 10,
    marginTop: 1,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowButton: {
    width: 32,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalDismiss: {
    flex: 1,
  },
  editorSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  editorHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  editorTitle: {
    fontFamily,
    fontSize: 18,
    fontWeight: "700",
  },
  editorFile: {
    fontFamily: "sans-serif",
    fontSize: 12,
    marginTop: 4,
  },
  editorLabel: {
    fontFamily: "sans-serif",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 6,
  },
  kindRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  kindChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  kindText: {
    fontFamily: "sans-serif",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  editorInput: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 94,
    maxHeight: 170,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "sans-serif",
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  editorActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  cancelText: {
    fontFamily: "sans-serif",
    fontSize: 13,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  saveText: {
    fontFamily: "sans-serif",
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
