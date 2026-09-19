import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Modal } from "react-native";
import { useThemeColors } from "../hooks/useTheme";
import type { TimetableSlot } from "../types/study";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SLOT_COLORS = [
  "#38BDF8", "#A855F7", "#22C55E", "#F59E0B",
  "#EF4444", "#EC4899", "#06B6D4", "#84CC16",
  "#8B5CF6", "#14B8A6", "#F97316", "#6366F1",
];

interface Props {
  slots: TimetableSlot[];
  onUpdate: (slots: TimetableSlot[]) => void;
}

export default function TimetableView({ slots, onUpdate }: Props) {
  const theme = useThemeColors();
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [editForm, setEditForm] = useState({ subject: "", location: "", startTime: "", endTime: "" });

  const weekSlots = DAYS.map((day) => ({
    day,
    slots: slots
      .filter((s) => s.day.toLowerCase() === day.toLowerCase())
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  const handleEdit = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setEditForm({
      subject: slot.subject,
      location: slot.location,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  };

  const handleSave = () => {
    if (!editingSlot) return;
    const updated = slots.map((s) =>
      s.id === editingSlot.id
        ? { ...s, ...editForm }
        : s,
    );
    onUpdate(updated);
    setEditingSlot(null);
  };

  const handleDelete = () => {
    if (!editingSlot) return;
    Alert.alert("Delete Slot", "Remove this timetable slot?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const updated = slots.filter((s) => s.id !== editingSlot.id);
          onUpdate(updated);
          setEditingSlot(null);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Schedule</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gridWrap}>
        {weekSlots.map(({ day, slots: daySlots }, dayIndex) => (
          <View key={day} style={[styles.dayColumn, { borderColor: theme.border }]}>
            <Text style={[styles.dayHeader, { color: theme.primary }]}>
              {day.slice(0, 3)}
            </Text>
            <View style={styles.slotsWrap}>
              {daySlots.length === 0 && (
                <Text style={[styles.emptySlot, { color: theme.textMuted }]}>—</Text>
              )}
              {daySlots.map((slot, slotIndex) => (
                <Pressable
                  key={slot.id}
                  onPress={() => handleEdit(slot)}
                  style={[
                    styles.slotBlock,
                    { backgroundColor: (SLOT_COLORS[(dayIndex * 3 + slotIndex) % SLOT_COLORS.length]) + "25" },
                  ]}
                >
                  <Text style={styles.slotTime}>
                    {slot.startTime} - {slot.endTime}
                  </Text>
                  <Text style={styles.slotSubject} numberOfLines={2}>
                    {slot.subject}
                  </Text>
                  {slot.location ? (
                    <Text style={styles.slotLocation} numberOfLines={1}>
                      {slot.location}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!editingSlot} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={styles.modalTitle}>Edit Slot</Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Subject</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: "#FFFFFF" }]}
                value={editForm.subject}
                onChangeText={(v) => setEditForm({ ...editForm, subject: v })}
                placeholderTextColor="#475569"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Location</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: "#FFFFFF" }]}
                value={editForm.location}
                onChangeText={(v) => setEditForm({ ...editForm, location: v })}
                placeholderTextColor="#475569"
              />
            </View>

            <View style={styles.timeRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Start</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: "#FFFFFF" }]}
                  value={editForm.startTime}
                  onChangeText={(v) => setEditForm({ ...editForm, startTime: v })}
                  placeholder="09:00"
                  placeholderTextColor="#475569"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>End</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: "#FFFFFF" }]}
                  value={editForm.endTime}
                  onChangeText={(v) => setEditForm({ ...editForm, endTime: v })}
                  placeholder="10:30"
                  placeholderTextColor="#475569"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={handleDelete} style={[styles.actionBtn, { backgroundColor: theme.danger + "20" }]}>
                <Ionicons name="trash-outline" size={18} color={theme.danger} />
                <Text style={[styles.actionText, { color: theme.danger }]}>Delete</Text>
              </Pressable>
              <View style={styles.actionRight}>
                <Pressable onPress={() => setEditingSlot(null)} style={[styles.actionBtn, { backgroundColor: theme.border }]}>
                  <Text style={[styles.actionText, { color: theme.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleSave} style={[styles.actionBtn, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.actionText, { color: "#FFFFFF" }]}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  gridWrap: {
    paddingHorizontal: 20,
    gap: 8,
  },
  dayColumn: {
    width: 100,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
  },
  dayHeader: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  slotsWrap: {
    gap: 6,
  },
  emptySlot: {
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 8,
  },
  slotBlock: {
    borderRadius: 8,
    padding: 6,
  },
  slotTime: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "600",
    opacity: 0.8,
  },
  slotSubject: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  slotLocation: {
    color: "#FFFFFF",
    fontSize: 9,
    opacity: 0.6,
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: 14,
  },
  timeRow: {
    flexDirection: "row",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  actionRight: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
