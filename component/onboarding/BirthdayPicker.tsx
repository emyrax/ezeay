import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  landingColors,
  landingFonts,
  landingRadii,
} from "../../constants/landing";
import { parseBirthdayDate } from "../../lib/onboarding/steps";

interface BirthdayPickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  error?: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function calculateAge(year: number, month: number, day: number): number {
  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() - (month - 1);
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }
  return age;
}

export default function BirthdayPicker({
  value,
  onChange,
  error,
}: BirthdayPickerProps) {
  const { width, height } = useWindowDimensions();
  const isCompact = width < 720;

  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"year" | "month" | "day">("year");

  // Parse existing value or fallback to year 2005
  const parsed = useMemo(() => parseBirthdayDate(value), [value]);

  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - 13; // Min age is 13
  const minYear = 1950;

  const selectedYear = parsed ? parsed.getFullYear() : 2005;
  const selectedMonth = parsed ? parsed.getMonth() : 0; // 0-indexed
  const selectedDay = parsed ? parsed.getDate() : 1;

  const [tempYear, setTempYear] = useState<number>(selectedYear);
  const [tempMonth, setTempMonth] = useState<number>(selectedMonth);
  const [tempDay, setTempDay] = useState<number>(selectedDay);

  // Sync temp values whenever modal opens or value changes
  function openPicker(tab: "year" | "month" | "day" = "year") {
    setTempYear(selectedYear);
    setTempMonth(selectedMonth);
    setTempDay(selectedDay);
    setActiveTab(tab);
    setModalVisible(true);
  }

  function commitDate(y: number, m: number, d: number) {
    const maxDays = daysInMonth(y, m);
    const validDay = Math.min(d, maxDays);
    const formattedMonth = String(m + 1).padStart(2, "0");
    const formattedDay = String(validDay).padStart(2, "0");
    onChange(`${y}-${formattedMonth}-${formattedDay}`);
  }

  function handleDone() {
    commitDate(tempYear, tempMonth, tempDay);
    setModalVisible(false);
  }

  // Calculate age string if date is set
  const ageDisplay = useMemo(() => {
    if (!parsed) return null;
    const age = calculateAge(
      parsed.getFullYear(),
      parsed.getMonth() + 1,
      parsed.getDate(),
    );
    if (age < 0 || age > 110) return null;
    return age;
  }, [parsed]);

  // Generate list of years
  const yearsList = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [maxYear, minYear]);

  // Generate days array for current month & year
  const daysCount = useMemo(
    () => daysInMonth(tempYear, tempMonth),
    [tempYear, tempMonth],
  );

  const daysList = useMemo(() => {
    const list: number[] = [];
    for (let d = 1; d <= daysCount; d++) {
      list.push(d);
    }
    return list;
  }, [daysCount]);

  return (
    <View style={styles.container}>
      {/* Main interactive display banner */}
      <Pressable
        onPress={() => openPicker(parsed ? "day" : "year")}
        style={({ pressed }) => [
          styles.mainCard,
          error ? styles.mainCardError : null,
          pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Choose date of birth"
      >
        <View style={styles.mainCardLeft}>
          <View
            style={[
              styles.calendarIconWrap,
              parsed ? styles.calendarIconActive : null,
            ]}
          >
            <MaterialCommunityIcons
              name="calendar-account"
              size={24}
              color={parsed ? landingColors.blueSoft : landingColors.textSubtle}
            />
          </View>

          <View style={styles.mainCardText}>
            <Text style={styles.mainCardLabel}>DATE OF BIRTH</Text>
            <Text
              style={[
                styles.mainCardValue,
                !parsed && { color: landingColors.textSubtle },
              ]}
            >
              {parsed
                ? `${MONTH_NAMES[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()}`
                : "Select your birthday"}
            </Text>
          </View>
        </View>

        <View style={styles.mainCardRight}>
          {ageDisplay !== null ? (
            <View style={styles.ageBadge}>
              <Text style={styles.ageBadgeText}>{ageDisplay} yrs old</Text>
            </View>
          ) : (
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={landingColors.textSubtle}
            />
          )}
        </View>
      </Pressable>

      {/* 3 Quick Segment Cards (Day, Month, Year) */}
      <View style={styles.segmentsRow}>
        {/* Day segment */}
        <Pressable
          onPress={() => openPicker("day")}
          style={({ pressed }) => [
            styles.segmentBtn,
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.segmentLabel}>DAY</Text>
          <Text style={styles.segmentValue}>
            {parsed ? parsed.getDate() : "--"}
          </Text>
        </Pressable>

        {/* Month segment */}
        <Pressable
          onPress={() => openPicker("month")}
          style={({ pressed }) => [
            styles.segmentBtn,
            styles.segmentBtnMiddle,
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.segmentLabel}>MONTH</Text>
          <Text style={styles.segmentValue} numberOfLines={1}>
            {parsed ? MONTH_SHORT[parsed.getMonth()] : "--"}
          </Text>
        </Pressable>

        {/* Year segment */}
        <Pressable
          onPress={() => openPicker("year")}
          style={({ pressed }) => [
            styles.segmentBtn,
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.segmentLabel}>YEAR</Text>
          <Text style={styles.segmentValue}>
            {parsed ? parsed.getFullYear() : "----"}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={14}
            color={landingColors.danger}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Date Picker Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setModalVisible(false)}
          />

          <View
            style={[
              styles.modalPanel,
              isCompact
                ? { width: width - 24, maxHeight: height * 0.82 }
                : { width: Math.min(520, width - 48), maxHeight: 580 },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>BIRTHDAY PICKER</Text>
                <Text style={styles.modalTitle}>
                  {MONTH_NAMES[tempMonth]} {tempDay}, {tempYear}
                </Text>
              </View>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                hitSlop={8}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={landingColors.textMuted}
                />
              </Pressable>
            </View>

            {/* Navigation Tabs (Year / Month / Day) */}
            <View style={styles.tabsRow}>
              <Pressable
                onPress={() => setActiveTab("year")}
                style={[
                  styles.tabItem,
                  activeTab === "year" && styles.tabItemActive,
                ]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.tabItemText,
                    activeTab === "year" && styles.tabItemTextActive,
                  ]}
                >
                  Year ({tempYear})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab("month")}
                style={[
                  styles.tabItem,
                  activeTab === "month" && styles.tabItemActive,
                ]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.tabItemText,
                    activeTab === "month" && styles.tabItemTextActive,
                  ]}
                >
                  Month ({MONTH_SHORT[tempMonth]})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab("day")}
                style={[
                  styles.tabItem,
                  activeTab === "day" && styles.tabItemActive,
                ]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.tabItemText,
                    activeTab === "day" && styles.tabItemTextActive,
                  ]}
                >
                  Day ({tempDay})
                </Text>
              </Pressable>
            </View>

            {/* Tab 1: Year Selector */}
            {activeTab === "year" && (
              <View style={styles.tabContent}>
                <Text style={styles.tabSectionTitle}>SELECT YOUR BIRTH YEAR</Text>
                <FlatList
                  data={yearsList}
                  keyExtractor={(item) => String(item)}
                  numColumns={4}
                  columnWrapperStyle={styles.yearsRow}
                  showsVerticalScrollIndicator={false}
                  initialNumToRender={24}
                  renderItem={({ item }) => {
                    const isSelected = tempYear === item;
                    return (
                      <Pressable
                        onPress={() => {
                          setTempYear(item);
                          setActiveTab("month");
                        }}
                        style={[
                          styles.yearGridItem,
                          isSelected && styles.yearGridItemSelected,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.yearItemText,
                            isSelected && styles.yearItemTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  }}
                />
              </View>
            )}

            {/* Tab 2: Month Selector */}
            {activeTab === "month" && (
              <View style={styles.tabContent}>
                <Text style={styles.tabSectionTitle}>SELECT BIRTH MONTH</Text>
                <View style={styles.monthsGrid}>
                  {MONTH_NAMES.map((mName, idx) => {
                    const isSelected = tempMonth === idx;
                    return (
                      <Pressable
                        key={mName}
                        onPress={() => {
                          setTempMonth(idx);
                          setActiveTab("day");
                        }}
                        style={[
                          styles.monthGridItem,
                          isSelected && styles.monthGridItemSelected,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.monthItemName,
                            isSelected && styles.monthItemNameSelected,
                          ]}
                        >
                          {MONTH_SHORT[idx]}
                        </Text>
                        <Text
                          style={[
                            styles.monthItemSub,
                            isSelected && styles.monthItemSubSelected,
                          ]}
                        >
                          {mName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Tab 3: Day Selector */}
            {activeTab === "day" && (
              <View style={styles.tabContent}>
                <Text style={styles.tabSectionTitle}>
                  SELECT DAY IN {MONTH_NAMES[tempMonth].toUpperCase()}{" "}
                  {tempYear}
                </Text>
                <FlatList
                  data={daysList}
                  keyExtractor={(item) => String(item)}
                  numColumns={7}
                  columnWrapperStyle={styles.daysRow}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected = tempDay === item;
                    return (
                      <Pressable
                        onPress={() => setTempDay(item)}
                        style={[
                          styles.dayGridItem,
                          isSelected && styles.dayGridItemSelected,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text
                          style={[
                            styles.dayItemText,
                            isSelected && styles.dayItemTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  }}
                />
              </View>
            )}

            {/* Modal Footer Actions */}
            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.cancelBtn}
                accessibilityRole="button"
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleDone}
                style={styles.confirmBtn}
                accessibilityRole="button"
              >
                <Text style={styles.confirmBtnText}>Confirm Date</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  mainCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(18, 32, 54, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.22)",
    borderRadius: landingRadii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  mainCardError: {
    borderColor: landingColors.danger,
  },
  mainCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  calendarIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarIconActive: {
    backgroundColor: "rgba(56, 189, 248, 0.18)",
  },
  mainCardText: {
    gap: 3,
    flex: 1,
  },
  mainCardLabel: {
    fontSize: 10,
    fontFamily: landingFonts.body,
    fontWeight: "700",
    color: landingColors.blueSoft,
    letterSpacing: 0.5,
  },
  mainCardValue: {
    fontSize: 16,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.text,
  },
  mainCardRight: {
    paddingLeft: 8,
  },
  ageBadge: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.35)",
    borderRadius: landingRadii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ageBadgeText: {
    fontSize: 12,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.blueSoft,
  },
  segmentsRow: {
    flexDirection: "row",
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    backgroundColor: "rgba(18, 32, 54, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: landingRadii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 2,
  },
  segmentBtnMiddle: {
    flex: 1.3,
  },
  segmentLabel: {
    fontSize: 9,
    fontFamily: landingFonts.body,
    fontWeight: "700",
    color: landingColors.textSubtle,
    letterSpacing: 0.5,
  },
  segmentValue: {
    fontSize: 15,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.text,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  errorText: {
    color: landingColors.danger,
    fontSize: 12,
    fontFamily: landingFonts.body,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 5, 10, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalPanel: {
    backgroundColor: "#0E1524",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.28)",
    borderRadius: landingRadii.xl,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalEyebrow: {
    fontSize: 10,
    fontFamily: landingFonts.body,
    fontWeight: "700",
    color: landingColors.blueSoft,
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: landingFonts.heading,
    fontWeight: "600",
    color: landingColors.text,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: landingRadii.sm,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: landingRadii.sm - 2,
  },
  tabItemActive: {
    backgroundColor: "rgba(56, 189, 248, 0.2)",
  },
  tabItemText: {
    fontSize: 12,
    fontFamily: landingFonts.body,
    fontWeight: "500",
    color: landingColors.textMuted,
  },
  tabItemTextActive: {
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tabContent: {
    flex: 1,
    minHeight: 220,
    maxHeight: 280,
    gap: 10,
  },
  tabSectionTitle: {
    fontSize: 10,
    fontFamily: landingFonts.body,
    fontWeight: "700",
    color: landingColors.textSubtle,
    letterSpacing: 0.5,
  },
  yearsRow: {
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  yearGridItem: {
    flex: 1,
    height: 40,
    borderRadius: landingRadii.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  yearGridItemSelected: {
    backgroundColor: "rgba(56, 189, 248, 0.22)",
    borderColor: landingColors.blueSoft,
  },
  yearItemText: {
    fontSize: 13,
    fontFamily: landingFonts.body,
    fontWeight: "500",
    color: landingColors.text,
  },
  yearItemTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  monthGridItem: {
    width: "31%",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: landingRadii.sm,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    gap: 2,
  },
  monthGridItemSelected: {
    backgroundColor: "rgba(56, 189, 248, 0.22)",
    borderColor: landingColors.blueSoft,
  },
  monthItemName: {
    fontSize: 14,
    fontFamily: landingFonts.heading,
    fontWeight: "600",
    color: landingColors.text,
  },
  monthItemNameSelected: {
    color: "#FFFFFF",
  },
  monthItemSub: {
    fontSize: 10,
    fontFamily: landingFonts.body,
    color: landingColors.textSubtle,
  },
  monthItemSubSelected: {
    color: landingColors.blueSoft,
  },
  daysRow: {
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dayGridItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  dayGridItemSelected: {
    backgroundColor: landingColors.blue,
  },
  dayItemText: {
    fontSize: 13,
    fontFamily: landingFonts.body,
    fontWeight: "500",
    color: landingColors.text,
  },
  dayItemTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: landingRadii.sm,
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: landingFonts.body,
    fontWeight: "500",
    color: landingColors.textSubtle,
  },
  confirmBtn: {
    backgroundColor: landingColors.blue,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: landingRadii.sm,
  },
  confirmBtnText: {
    fontSize: 13,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

