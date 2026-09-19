import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNoteStore } from "../../store/noteStore";
import { useThemeColors } from "../../hooks/useTheme";
import { images } from "../../constants/images";
import { bodyFont } from "../../constants/themes";
import type { Note } from "../../types/note";
import GlassSheet from "../../component/notes/GlassSheet";
import ThemeIcon from "../../component/notes/ThemeIcon";
import ListGridToggle, { NotesLayout } from "../../component/notes/ListGridToggle";
import NoteContextMenu from "../../component/notes/NoteContextMenu";
import NotesLocalOnlyBanner from "../../component/notes/NotesLocalOnlyBanner";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 20 - 20 - CARD_GAP) / 2;
const LAYOUT_KEY = "yuinx_notes_layout";

function formatTimestamp(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

function dateBucketLabel(ts: number): string {
  const diff = Date.now() - ts;
  const day = 86400000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return "Previous 7 Days";
  if (diff < 30 * day) return "Previous 30 Days";
  return "Older";
}

function notePreview(note: Note): string {
  return note.content
    .replace(/[#*`\[\]~>_-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function NoteCard({
  note,
  onPress,
  onLongPress,
  tagColors,
  tagName,
  theme,
  index,
}: {
  note: Note;
  onPress: () => void;
  onLongPress: () => void;
  tagColors: Record<string, string>;
  tagName: Record<string, string>;
  theme: ReturnType<typeof useThemeColors>;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 320, delay: index * 50, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 320, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const preview = notePreview(note).slice(0, 80);
  const firstTagColor = note.tags.length > 0 ? tagColors[note.tags[0]] || theme.primary : theme.primary;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Pressable
        onPress={onPress}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLongPress();
        }}
        delayLongPress={400}
        style={({ pressed }) => [
          styles.noteCard,
          {
            backgroundColor: theme.glass,
            borderColor: theme.borderLight,
            shadowColor: theme.shadow,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
      >
        <View style={[styles.gradientAccent, { backgroundColor: firstTagColor }]} />
        <View style={styles.cardHeader}>
          {note.pinned && <ThemeIcon sf="pin.fill" material="pin" size={12} color={theme.textMuted} />}
          <Text style={[styles.noteTitle, { color: theme.text }]} numberOfLines={1}>
            {note.title || "Untitled"}
          </Text>
        </View>
        <View style={styles.cardMedia}>
          {note.images && note.images[0]?.uri ? (
            <View>
              <Image source={{ uri: note.images[0].uri }} style={styles.cardThumb} resizeMode="cover" />
              {note.audioClips && note.audioClips.length > 0 && (
                <View style={[styles.thumbAudioBadge, { backgroundColor: "rgba(13,17,23,0.72)" }]}>
                  <ThemeIcon sf="waveform" material="waveform" size={10} color={theme.primary} />
                  {note.audioClips.length > 1 && (
                    <Text style={styles.thumbAudioText}>{note.audioClips.length}</Text>
                  )}
                </View>
              )}
            </View>
          ) : note.audioClips && note.audioClips.length > 0 ? (
            <View style={[styles.audioBadge, { backgroundColor: theme.surfaceAlt }]}>
              <ThemeIcon sf="waveform" material="waveform" size={12} color={theme.primary} />
              {note.audioClips.length > 1 && (
                <Text style={[styles.audioCountText, { color: theme.primary }]}>
                  {note.audioClips.length}
                </Text>
              )}
            </View>
          ) : null}
        </View>
        {preview ? (
          <Text style={[styles.notePreview, { color: theme.textSecondary }]} numberOfLines={3}>
            {preview}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={[styles.noteTime, { color: theme.textMuted }]}>{formatTimestamp(note.updatedAt)}</Text>
          {note.tags.length > 0 && (
            <View style={[styles.tagChip, { backgroundColor: (firstTagColor || theme.primary) + "20" }]}>
              <View style={[styles.tagDot, { backgroundColor: firstTagColor }]} />
              <Text style={[styles.tagLabel, { color: firstTagColor }]} numberOfLines={1}>
                {tagName[note.tags[0]] || note.tags[0]}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function NoteRow({
  note,
  onPress,
  onLongPress,
  theme,
  index,
}: {
  note: Note;
  onPress: () => void;
  onLongPress: () => void;
  theme: ReturnType<typeof useThemeColors>;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 260, delay: index * 40, useNativeDriver: true }).start();
  }, [fadeAnim, index]);

  const preview = notePreview(note);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Pressable
        onPress={onPress}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLongPress();
        }}
        delayLongPress={400}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? theme.surfaceAlt : "transparent" },
        ]}
      >
        {note.images && note.images[0]?.uri ? (
          <Image source={{ uri: note.images[0].uri }} style={[styles.rowThumb, { borderColor: theme.borderLight }]} />
        ) : note.audioClips && note.audioClips.length > 0 ? (
          <View style={[styles.rowThumb, styles.rowThumbIcon, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}>
            <ThemeIcon sf="waveform" material="waveform" size={20} color={theme.primary} />
            {note.audioClips.length > 1 && (
              <Text style={[styles.rowThumbCount, { color: theme.primary }]}>
                {note.audioClips.length}
              </Text>
            )}
          </View>
        ) : null}
        <View style={styles.rowBody}>
          <View style={styles.rowTitleLine}>
            {note.pinned && (
              <ThemeIcon sf="pin.fill" material="pin" size={13} color={theme.textMuted} />
            )}
            <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
              {note.title || "Untitled"}
            </Text>
          </View>
          {preview ? (
            <Text style={[styles.rowPreview, { color: theme.textSecondary }]} numberOfLines={2}>
              {preview}
            </Text>
          ) : (
            <Text style={[styles.rowPreview, { color: theme.textMuted }]} numberOfLines={1}>
              No additional text
            </Text>
          )}
        </View>
        <Text style={[styles.rowDate, { color: theme.textMuted }]}>{formatTimestamp(note.updatedAt)}</Text>
      </Pressable>
    </Animated.View>
  );
}

function TagManagerSheet({
  visible,
  tags,
  notes,
  onRename,
  onDelete,
  onCreate,
  onClose,
  theme,
}: {
  visible: boolean;
  tags: { id: string; name: string; color: string }[];
  notes: { tags: string[] }[];
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onClose: () => void;
  theme: ReturnType<typeof useThemeColors>;
}) {
  const [tagSearch, setTagSearch] = useState("");

  const noteCounts: Record<string, number> = {};
  for (const n of notes) for (const t of n.tags) noteCounts[t] = (noteCounts[t] || 0) + 1;
  const filtered = tags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()));

  return (
    <GlassSheet visible={visible} onClose={onClose} title="Manage Tags" subtitle={`${tags.length} total`}>
      <View style={[styles.searchBar, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}>
        <ThemeIcon sf="magnifyingglass" material="magnify" size={16} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search tags…"
          placeholderTextColor={theme.textMuted}
          value={tagSearch}
          onChangeText={setTagSearch}
        />
        {tagSearch ? (
          <Pressable onPress={() => setTagSearch("")} hitSlop={8}>
            <ThemeIcon sf="xmark.circle.fill" material="close-circle" size={16} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.tagManagerList}>
        {filtered.map((tag) => (
          <View key={tag.id} style={[styles.tagManagerRow, { borderBottomColor: theme.borderLight }]}>
            <View style={[styles.mentionDot, { backgroundColor: tag.color }]} />
            <Text style={[styles.tagManagerName, { color: theme.text }]} numberOfLines={1}>
              {tag.name}
            </Text>
            <Text style={[styles.tagManagerCount, { color: theme.textMuted }]}>{noteCounts[tag.id] || 0}</Text>
            <Pressable
              onPress={() => {
                onClose();
                onRename(tag.id, tag.name);
              }}
              style={[styles.tagManagerAction, { backgroundColor: theme.surfaceAlt }]}
            >
              <ThemeIcon sf="pencil" material="pencil-outline" size={15} color={theme.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => {
                onClose();
                onDelete(tag.id);
              }}
              style={[styles.tagManagerAction, { backgroundColor: theme.danger + "15" }]}
            >
              <ThemeIcon sf="trash" material="delete-outline" size={15} color={theme.danger} />
            </Pressable>
          </View>
        ))}
      </View>
      <Pressable
        style={({ pressed }) => [styles.createTagBtn, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => {
          onClose();
          onCreate();
        }}
      >
        <ThemeIcon sf="plus.circle.fill" material="plus-circle-outline" size={20} color={theme.primary} />
        <Text style={[styles.createTagText, { color: theme.primary }]}>Create new tag</Text>
      </Pressable>
    </GlassSheet>
  );
}

const TAG_COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899", "#14B8A6"];

export default function NotesListScreen() {
  const theme = useThemeColors();
  const router = useRouter();
  const notes = useNoteStore((s) => s.notes);
  const tags = useNoteStore((s) => s.tags);
  const createNote = useNoteStore((s) => s.createNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const togglePin = useNoteStore((s) => s.togglePin);
  const updateTag = useNoteStore((s) => s.updateTag);
  const deleteTag = useNoteStore((s) => s.deleteTag);
  const addTag = useNoteStore((s) => s.addTag);
  const loaded = useNoteStore((s) => s.loaded);
  const loadNotes = useNoteStore((s) => s.loadNotes);

  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [longPressNote, setLongPressNote] = useState<Note | null>(null);
  const [layout, setLayout] = useState<NotesLayout>("list");

  const fabScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!loaded) loadNotes();
  }, [loaded, loadNotes]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LAYOUT_KEY).then((value) => {
      if (active && value === "grid") setLayout("grid");
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(LAYOUT_KEY, layout).catch(() => {});
  }, [layout]);

  const tagColors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of tags) map[t.id] = t.color;
    return map;
  }, [tags]);

  const tagName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of tags) map[t.id] = t.name;
    return map;
  }, [tags]);

  const sortedNotes = useMemo(() => {
    let result = [...notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
      );
    }

    if (selectedTag) {
      result = result.filter((n) => n.tags.includes(selectedTag));
    }

    return result;
  }, [notes, search, selectedTag]);

  const isFiltered = search.trim().length > 0 || selectedTag !== null;

  const sections = useMemo(() => {
    if (layout !== "list" || isFiltered) return [];
    const pinned = sortedNotes.filter((n) => n.pinned);
    const others = sortedNotes.filter((n) => !n.pinned);
    const buckets: { title: string; data: Note[] }[] = [];
    for (const n of others) {
      const label = dateBucketLabel(n.updatedAt);
      const last = buckets[buckets.length - 1];
      if (last && last.title === label) last.data.push(n);
      else buckets.push({ title: label, data: [n] });
    }
    const result: { title: string; data: Note[] }[] = [];
    if (pinned.length > 0) result.push({ title: "Pinned", data: pinned });
    return [...result, ...buckets];
  }, [sortedNotes, layout, isFiltered]);

  const handleCreate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    const id = createNote();
    router.push(`/(notes)/${id}`);
  }, [createNote, router, fabScale]);

  const handleDelete = useCallback(
    (note: Note) => {
      setLongPressNote(null);
      Alert.alert("Delete Note", `Delete "${note.title || "Untitled"}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteNote(note.id) },
      ]);
    },
    [deleteNote],
  );

  const handleTogglePin = useCallback(
    (note: Note) => {
      setLongPressNote(null);
      togglePin(note.id);
    },
    [togglePin],
  );

  const renderGridCard = useCallback(
    ({ item, index }: { item: Note; index: number }) => (
      <NoteCard
        note={item}
        onPress={() => router.push(`/(notes)/${item.id}`)}
        onLongPress={() => setLongPressNote(item)}
        tagColors={tagColors}
        tagName={tagName}
        theme={theme}
        index={index}
      />
    ),
    [router, tagColors, tagName, theme],
  );

  const renderRow = useCallback(
    (item: Note, index: number) => (
      <NoteRow
        note={item}
        onPress={() => router.push(`/(notes)/${item.id}`)}
        onLongPress={() => setLongPressNote(item)}
        theme={theme}
        index={index}
      />
    ),
    [router, theme],
  );

  const emptyState = (
    <View style={styles.emptyState}>
      <Image source={images.yuinxLogo} style={styles.emptyLogo} />
      <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
        {isFiltered ? "No notes found" : "No notes yet"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
        {isFiltered ? "Try a different search or filter" : "Start capturing your ideas"}
      </Text>
      {!isFiltered && (
        <Pressable style={[styles.emptyCta, { backgroundColor: theme.primary }]} onPress={handleCreate}>
          <ThemeIcon sf="plus" material="plus" size={18} color="#FFFFFF" />
          <Text style={styles.emptyCtaText}>Create note</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: theme.text }]}>Notes</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <ListGridToggle value={layout} onChange={setLayout} />
          <Pressable
            style={[styles.iconBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}
            onPress={() => setShowTagManager(true)}
          >
            <ThemeIcon sf="tag" material="tag-multiple-outline" size={18} color={theme.textSecondary} />
          </Pressable>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}
            onPress={() => router.back()}
          >
            <ThemeIcon sf="xmark" material="close" size={20} color={theme.text} weight="semibold" />
          </Pressable>
        </View>
      </View>

      <View style={[styles.searchBar, { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight }]}>
        <ThemeIcon sf="magnifyingglass" material="magnify" size={17} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search notes…"
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <ThemeIcon sf="xmark.circle.fill" material="close-circle" size={17} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.localBannerWrap}>
        <NotesLocalOnlyBanner />
      </View>

      <FlatList
        horizontal
        data={[{ id: null, name: "All" } as { id: string | null; name: string }, ...tags]}
        keyExtractor={(item) => item.id ?? "all"}
        showsHorizontalScrollIndicator={false}
        style={styles.tagList}
        contentContainerStyle={styles.tagListContent}
        renderItem={({ item }) => {
          const isSelected = selectedTag === item.id;
          const chipColor = item.id ? tagColors[item.id] || theme.primary : theme.primary;
          return (
            <Pressable
              style={[
                styles.filterChip,
                isSelected
                  ? { backgroundColor: chipColor + "22", borderColor: chipColor }
                  : { backgroundColor: theme.surfaceAlt, borderColor: theme.borderLight },
              ]}
              onPress={() => setSelectedTag(isSelected ? null : item.id)}
            >
              {item.id && <View style={[styles.filterDot, { backgroundColor: tagColors[item.id] || theme.primary }]} />}
              <Text style={[styles.filterLabel, { color: isSelected ? chipColor : theme.textSecondary }]}>
                {item.id ? tagName[item.id] || item.id : "All"}
              </Text>
            </Pressable>
          );
        }}
      />

      {layout === "grid" ? (
        <FlatList
          data={sortedNotes}
          key="grid"
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          renderItem={renderGridCard}
          ListEmptyComponent={emptyState}
        />
      ) : sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) => (
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
              {section.title.toUpperCase()} · {section.data.length}
            </Text>
          )}
          renderItem={({ item, index }) => renderRow(item, index)}
          ListEmptyComponent={emptyState}
        />
      ) : (
        <FlatList
          data={sortedNotes}
          key="list"
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => renderRow(item, index)}
          ListEmptyComponent={emptyState}
        />
      )}

      <Animated.View style={[styles.fabOuter, { transform: [{ scale: fabScale }] }]}>
        <Pressable onPress={handleCreate}>
          <LinearGradient
            colors={[theme.primary, theme.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.fab, { shadowColor: theme.primary }]}
          >
            <ThemeIcon sf="square.and.pencil" material="pencil-plus-outline" size={26} color="#FFFFFF" weight="medium" />
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <NoteContextMenu
        visible={longPressNote !== null}
        isPinned={longPressNote?.pinned ?? false}
        onEdit={() => {
          const note = longPressNote;
          setLongPressNote(null);
          if (note) router.push(`/(notes)/${note.id}`);
        }}
        onPin={() => longPressNote && handleTogglePin(longPressNote)}
        onDelete={() => longPressNote && handleDelete(longPressNote)}
        onClose={() => setLongPressNote(null)}
      />

      <TagManagerSheet
        visible={showTagManager}
        tags={tags}
        notes={notes}
        onRename={(id, name) => {
          Alert.prompt("Rename Tag", "Enter a new name:", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Rename",
              onPress: (text?: string) => {
                if (text?.trim()) updateTag(id, { name: text.trim() });
              },
            },
          ], "plain-text", name);
        }}
        onDelete={(id) => {
          const tagName = tags.find((t) => t.id === id)?.name || "";
          Alert.alert("Delete Tag", `Delete "${tagName}"? It will be removed from all notes.`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteTag(id) },
          ]);
        }}
        onCreate={() => {
          const name = `Tag ${tags.length + 1}`;
          const color = TAG_COLORS[tags.length % TAG_COLORS.length];
          addTag(name, color);
        }}
        onClose={() => setShowTagManager(false)}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: "column" },
  title: { fontSize: 34, fontWeight: "800", letterSpacing: -0.6, fontFamily: bodyFont },
  subtitle: { fontSize: 13, fontWeight: "500", marginTop: 1, fontFamily: bodyFont },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    borderRadius: 11,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, height: 40, fontFamily: bodyFont },
  localBannerWrap: { marginHorizontal: 20, marginBottom: 10 },
  tagList: { maxHeight: 44, marginBottom: 6 },
  tagListContent: { paddingHorizontal: 20, gap: 8, alignItems: "center" },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterLabel: { fontSize: 13, fontWeight: "600", fontFamily: bodyFont },
  gridContent: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 110 },
  gridRow: { gap: CARD_GAP, paddingHorizontal: 10, marginBottom: CARD_GAP },
  noteCard: {
    width: CARD_WIDTH,
    borderRadius: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    overflow: "hidden",
  },
  gradientAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  noteTitle: { fontSize: 14, fontWeight: "700", flex: 1, fontFamily: bodyFont },
  cardMedia: { marginBottom: 6 },
  cardThumb: { width: "100%", height: 80, borderRadius: 12 },
  audioBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 2,
  },
  audioCountText: { fontSize: 10, fontWeight: "700" },
  thumbAudioBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  thumbAudioText: { color: "#FFFFFF", fontSize: 9, fontWeight: "700" },
  rowThumbCount: { position: "absolute", bottom: 3, right: 6, fontSize: 10, fontWeight: "700" },
  notePreview: { fontSize: 12, lineHeight: 16, marginBottom: 8, fontFamily: bodyFont },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
    gap: 6,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    maxWidth: 90,
  },
  tagDot: { width: 5, height: 5, borderRadius: 2.5 },
  tagLabel: { fontSize: 9, fontWeight: "600" },
  noteTime: { fontSize: 11, fontFamily: bodyFont },
  listContent: { paddingHorizontal: 20, paddingBottom: 110 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 6,
    fontFamily: bodyFont,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderRadius: 12,
  },
  rowThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 12,
  },
  rowThumbIcon: { alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1, marginRight: 10 },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  rowTitle: { fontSize: 16, fontWeight: "700", flex: 1, fontFamily: bodyFont },
  rowPreview: { fontSize: 13, lineHeight: 18, fontFamily: bodyFont },
  rowDate: { fontSize: 12, fontFamily: bodyFont },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 90, gap: 12 },
  emptyLogo: { width: 120, height: 120, marginBottom: 8, resizeMode: "contain", opacity: 0.6 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: bodyFont },
  emptySubtitle: { fontSize: 14, fontFamily: bodyFont },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyCtaText: { color: "#FFF", fontSize: 14, fontWeight: "700", fontFamily: bodyFont },
  tagManagerList: { maxHeight: 320 },
  tagManagerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  tagManagerName: { flex: 1, fontSize: 15, fontWeight: "600", fontFamily: bodyFont },
  tagManagerCount: { fontSize: 12, fontWeight: "500", marginRight: 8, fontFamily: bodyFont },
  tagManagerAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  mentionDot: { width: 8, height: 8, borderRadius: 4 },
  createTagBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 12,
  },
  createTagText: { fontSize: 14, fontWeight: "600", fontFamily: bodyFont },
  fabOuter: { position: "absolute", bottom: 34, right: 24, zIndex: 10 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
});