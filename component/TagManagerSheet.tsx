import React, { useMemo, useState } from "react";
import {
  Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { NoteTag } from "../types/note";
import type { ThemeColors } from "../constants/themes";
import ColorPalette, { COLORS } from "./ColorPalette";

interface Props {
  visible: boolean;
  tags: NoteTag[];
  notes: { tags: string[] }[];
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onCreate: (name: string, color: string) => void;
  onColorChange: (id: string, color: string) => void;
  onClose: () => void;
  theme: ThemeColors;
}

function TagManagerSheet({
  visible, tags, notes, onRename, onDelete, onCreate, onColorChange, onClose, theme,
}: Props) {
  const [search, setSearch] = useState("");
  const [expandedColor, setExpandedColor] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createColor, setCreateColor] = useState(COLORS[0]);
  const [showCreate, setShowCreate] = useState(false);

  const noteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of notes) for (const t of n.tags) counts[t] = (counts[t] || 0) + 1;
    return counts;
  }, [notes]);

  const filteredTags = useMemo(() => {
    let result = [...tags].sort((a, b) => a.name.localeCompare(b.name));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q));
    }
    return result;
  }, [tags, search]);

  const handleCreate = () => {
    const name = createName.trim();
    if (!name) return;
    onCreate(name, createColor);
    setCreateName("");
    setCreateColor(COLORS[0]);
    setShowCreate(false);
  };

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Manage Tags</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBar, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search tags..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <MaterialCommunityIcons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {filteredTags.map((tag) => (
            <View key={tag.id}>
              <View style={[styles.row, { borderBottomColor: theme.borderLight }]}>
                <TouchableOpacity
                  onPress={() => setExpandedColor(expandedColor === tag.id ? null : tag.id)}
                  style={[styles.colorDot, { backgroundColor: tag.color }]}
                />
                <Text style={[styles.name, { color: theme.text }]}>{tag.name}</Text>
                <Text style={[styles.count, { color: theme.textMuted }]}>
                  {noteCounts[tag.id] || 0}
                </Text>
                <TouchableOpacity
                  onPress={() => { onClose(); onRename(tag.id, tag.name); }}
                  style={styles.action}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { onClose(); onDelete(tag.id); }}
                  style={styles.action}
                >
                  <MaterialCommunityIcons name="delete-outline" size={18} color={theme.danger} />
                </TouchableOpacity>
              </View>
              {expandedColor === tag.id && (
                <View style={[styles.paletteRow, { backgroundColor: theme.surfaceAlt }]}>
                  <ColorPalette
                    onSelect={(color) => {
                      onColorChange(tag.id, color);
                      setExpandedColor(null);
                    }}
                    selectedColor={tag.color}
                    theme={theme}
                  />
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {showCreate ? (
          <View style={[styles.createSection, { borderTopColor: theme.borderLight }]}>
            <TextInput
              style={[styles.createInput, { color: theme.text, backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}
              placeholder="Tag name..."
              placeholderTextColor={theme.textMuted}
              value={createName}
              onChangeText={setCreateName}
              autoFocus
            />
            <ColorPalette
              onSelect={setCreateColor}
              selectedColor={createColor}
              theme={theme}
            />
            <View style={styles.createActions}>
              <TouchableOpacity onPress={() => { setShowCreate(false); setCreateName(""); }} style={styles.cancelBtn}>
                <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.createBtn, { backgroundColor: theme.primary, opacity: createName.trim() ? 1 : 0.5 }]} onPress={handleCreate} disabled={!createName.trim()}>
                <Text style={styles.createBtnText}>Create Tag</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.createTagBtn} onPress={() => setShowCreate(true)}>
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color={theme.primary} />
            <Text style={[styles.createTagText, { color: theme.primary }]}>Create new tag</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
    justifyContent: "flex-end",
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
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: "700" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, height: 40 },
  list: { maxHeight: 300 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  colorDot: { width: 20, height: 20, borderRadius: 10 },
  name: { flex: 1, fontSize: 15, fontWeight: "600" },
  count: { fontSize: 12, fontWeight: "500", marginRight: 8, minWidth: 30, textAlign: "right" },
  action: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  paletteRow: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  createSection: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
    gap: 8,
  },
  createInput: {
    fontSize: 15,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  createActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  cancelText: { fontSize: 14, fontWeight: "600" },
  createBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  createBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  createTagBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
  },
  createTagText: { fontSize: 14, fontWeight: "600" },
});

export default TagManagerSheet;
