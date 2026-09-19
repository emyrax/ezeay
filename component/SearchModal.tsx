import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeColors } from "../hooks/useTheme";
import { useCourseStore } from "../store/courseStore";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SearchModal({ visible, onClose }: Props) {
  const theme = useThemeColors();
  const router = useRouter();
  const { getToken } = useAuth();
  const courses = useCourseStore((s) => s.courses);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"courses" | "users">("courses");
  const [users, setUsers] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const filteredCourses = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q),
    );
  }, [query, courses]);

  const handleSearchUsers = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setUsers([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const token = await getToken();
      if (token) {
        const result = await api.users.search(q.trim(), token);
        setUsers(result);
      }
    } catch {
      setUsers([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleCoursePress = (courseId: string) => {
    onClose();
    router.push(`/(course)/${courseId}/chapters`);
  };

  const handleUserPress = (uid: string) => {
    onClose();
    router.push(`/(tabs)/profile?userId=${uid}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
        <View style={[styles.modal, { backgroundColor: theme.bg }]}>
          <View style={styles.header}>
            <View style={[styles.searchInputRow, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={theme.textMuted} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={query}
                onChangeText={(q) => {
                  if (tab === "users") handleSearchUsers(q);
                  else setQuery(q);
                }}
                placeholder={tab === "courses" ? "Search courses..." : "Search users..."}
                placeholderTextColor={theme.textMuted}
                autoFocus
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => { setQuery(""); setUsers([]); }}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.cancelText, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, tab === "courses" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
              onPress={() => { setTab("courses"); setUsers([]); }}
            >
              <Text style={[styles.tabText, { color: tab === "courses" ? theme.primary : theme.textMuted }]}>
                Courses
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === "users" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
              onPress={() => { setTab("users"); setQuery(""); setUsers([]); }}
            >
              <Text style={[styles.tabText, { color: tab === "users" ? theme.primary : theme.textMuted }]}>
                Users
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.results}>
            {tab === "courses" ? (
              query.trim() === "" ? (
                <Text style={[styles.hint, { color: theme.textMuted }]}>Start typing to search courses</Text>
              ) : filteredCourses.length === 0 ? (
                <Text style={[styles.hint, { color: theme.textMuted }]}>No courses found</Text>
              ) : (
                filteredCourses.map((course) => (
                  <TouchableOpacity
                    key={course.id}
                    style={[styles.resultItem, { borderBottomColor: theme.border }]}
                    onPress={() => handleCoursePress(course.id)}
                  >
                    <View style={[styles.resultIcon, { backgroundColor: theme.primary + "20" }]}>
                      <MaterialCommunityIcons name="book-open-variant" size={22} color={theme.primary} />
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>
                        {course.title}
                      </Text>
                      <Text style={[styles.resultSub, { color: theme.textMuted }]} numberOfLines={1}>
                        {course.category} · {course.difficulty}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
                  </TouchableOpacity>
                ))
              )
            ) : (
              <>
                {searchingUsers ? (
                  <ActivityIndicator style={{ marginTop: 20 }} color={theme.primary} />
                ) : query.trim() === "" ? (
                  <Text style={[styles.hint, { color: theme.textMuted }]}>Start typing to search users</Text>
                ) : users.length === 0 ? (
                  <Text style={[styles.hint, { color: theme.textMuted }]}>No users found</Text>
                ) : (
                  users.map((user) => (
                    <TouchableOpacity
                      key={user.uid}
                      style={[styles.resultItem, { borderBottomColor: theme.border }]}
                      onPress={() => handleUserPress(user.uid)}
                    >
                      <View style={[styles.resultIcon, { backgroundColor: theme.accent + "20" }]}>
                        <MaterialCommunityIcons name="account" size={22} color={theme.accent} />
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={[styles.resultTitle, { color: theme.text }]} numberOfLines={1}>
                          {user.displayName || "Unknown"}
                        </Text>
                        <Text style={[styles.resultSub, { color: theme.textMuted }]} numberOfLines={1}>
                          {user.headline || user.email || ""}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.textMuted} />
                    </TouchableOpacity>
                  ))
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  modal: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  searchInputRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15 },
  cancelText: { fontSize: 15, fontWeight: "600" },
  tabRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 16,
  },
  tab: { paddingBottom: 8 },
  tabText: { fontSize: 15, fontWeight: "600" },
  results: { flex: 1 },
  hint: { textAlign: "center", marginTop: 40, fontSize: 14 },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 15, fontWeight: "600" },
  resultSub: { fontSize: 12, marginTop: 2 },
});
