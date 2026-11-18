import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  landingColors,
  landingFonts,
  landingRadii,
} from "../../constants/landing";
import { findAfricanCountry } from "../../data/countries";
import { getUniversitiesForLocation } from "../../data/universities";
import CountryFlag from "./CountryFlag";

interface UniversitySelectorProps {
  country: string;
  state?: string;
  selectedUniversity: string;
  onSelectUniversity: (university: string) => void;
  onChangeLocation?: () => void;
  error?: string;
}

export default function UniversitySelector({
  country,
  state,
  selectedUniversity,
  onSelectUniversity,
  onChangeLocation,
  error,
}: UniversitySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterByState, setFilterByState] = useState(true);
  const [customList, setCustomList] = useState<string[]>([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customUniName, setCustomUniName] = useState("");

  const africanCountry = findAfricanCountry(country);

  // Universities for specific state vs entire country
  const stateUniversities = useMemo(
    () => getUniversitiesForLocation(country, state),
    [country, state],
  );

  const countryUniversities = useMemo(
    () => getUniversitiesForLocation(country, undefined),
    [country],
  );

  const activePool = useMemo(() => {
    const base =
      state && filterByState && stateUniversities.length > 0
        ? stateUniversities
        : countryUniversities;

    // Combine base with any user custom-added universities
    const combined = [...customList, ...base];
    return Array.from(new Set(combined));
  }, [state, filterByState, stateUniversities, countryUniversities, customList]);

  const filteredUniversities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activePool;
    return activePool.filter((uni) => uni.toLowerCase().includes(q));
  }, [activePool, searchQuery]);

  function handleAddCustom() {
    const trimmed = customUniName.trim();
    if (trimmed) {
      if (!customList.includes(trimmed)) {
        setCustomList((prev) => [trimmed, ...prev]);
      }
      onSelectUniversity(trimmed);
      setCustomUniName("");
      setShowCustomInput(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Location Context Banner */}
      <View style={styles.locationBanner}>
        <View style={styles.locationLeft}>
          {africanCountry ? (
            <CountryFlag country={africanCountry} size={28} />
          ) : (
            <MaterialCommunityIcons
              name="earth"
              size={20}
              color={landingColors.blueSoft}
            />
          )}
          <View style={styles.locationTextWrap}>
            <Text style={styles.locationEyebrow}>FILTERED BY LOCATION</Text>
            <Text style={styles.locationValue} numberOfLines={1}>
              {state ? `${state}, ` : ""}
              {country || "All regions"}
            </Text>
          </View>
        </View>

        {onChangeLocation ? (
          <Pressable
            onPress={onChangeLocation}
            style={({ pressed }) => [
              styles.changeLocationBtn,
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.changeLocationText}>Change</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Selected University Badge */}
      {selectedUniversity ? (
        <View style={styles.selectedBanner}>
          <View style={styles.selectedLeft}>
            <View style={styles.selectedIcon}>
              <MaterialCommunityIcons name="school" size={17} color="#FFFFFF" />
            </View>
            <View style={styles.selectedTextWrap}>
              <Text style={styles.selectedEyebrow}>SELECTED UNIVERSITY</Text>
              <Text style={styles.selectedName} numberOfLines={2}>
                {selectedUniversity}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => onSelectUniversity("")}
            style={styles.clearBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear university selection"
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={landingColors.textSubtle}
            />
          </Pressable>
        </View>
      ) : null}

      {/* State vs Country Toggle if state exists */}
      {state && stateUniversities.length > 0 && countryUniversities.length > stateUniversities.length ? (
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setFilterByState(true)}
            style={[
              styles.toggleTab,
              filterByState && styles.toggleTabActive,
            ]}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="map-marker"
              size={14}
              color={filterByState ? landingColors.blueSoft : landingColors.textSubtle}
            />
            <Text
              style={[
                styles.toggleTabText,
                filterByState && styles.toggleTabTextActive,
              ]}
            >
              In {state} ({stateUniversities.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterByState(false)}
            style={[
              styles.toggleTab,
              !filterByState && styles.toggleTabActive,
            ]}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="earth"
              size={14}
              color={!filterByState ? landingColors.blueSoft : landingColors.textSubtle}
            />
            <Text
              style={[
                styles.toggleTabText,
                !filterByState && styles.toggleTabTextActive,
              ]}
            >
              All {country} ({countryUniversities.length})
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Search Input */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons
          name="magnify"
          size={18}
          color={landingColors.textSubtle}
        />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search university or college..."
          placeholderTextColor={landingColors.textSubtle}
          style={styles.searchInput}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
            <MaterialCommunityIcons
              name="close-circle"
              size={16}
              color={landingColors.textSubtle}
            />
          </Pressable>
        ) : null}
      </View>

      {/* University List */}
      <View style={styles.listSection}>
        <View style={styles.listSectionHeader}>
          <Text style={styles.sectionTitle}>
            UNIVERSITIES ({filteredUniversities.length})
          </Text>
          {customList.length > 0 ? (
            <Text style={styles.customCountBadge}>
              {customList.length} custom added
            </Text>
          ) : null}
        </View>

        <View style={styles.uniList}>
          {filteredUniversities.map((uni) => {
            const isSelected = selectedUniversity === uni;
            const isCustom = customList.includes(uni);
            return (
              <Pressable
                key={uni}
                onPress={() => onSelectUniversity(isSelected ? "" : uni)}
                style={({ pressed }) => [
                  styles.uniCard,
                  isSelected && styles.uniCardSelected,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.uniCardLeft}>
                  <View
                    style={[
                      styles.uniIconWrap,
                      isSelected && styles.uniIconWrapSelected,
                      isCustom && styles.uniIconWrapCustom,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={isCustom ? "star-circle-outline" : "town-hall"}
                      size={18}
                      color={
                        isSelected
                          ? landingColors.blueSoft
                          : isCustom
                            ? landingColors.blueSoft
                            : landingColors.textSubtle
                      }
                    />
                  </View>
                  <View style={styles.uniTextWrap}>
                    <Text
                      style={[
                        styles.uniName,
                        isSelected && styles.uniNameSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {uni}
                    </Text>
                    {isCustom ? (
                      <Text style={styles.customTag}>Custom Added</Text>
                    ) : null}
                  </View>
                </View>

                <MaterialCommunityIcons
                  name={isSelected ? "check-circle" : "circle-outline"}
                  size={20}
                  color={
                    isSelected
                      ? landingColors.blueSoft
                      : landingColors.textSubtle
                  }
                />
              </Pressable>
            );
          })}
        </View>

        {filteredUniversities.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="school-outline"
              size={32}
              color={landingColors.textSubtle}
            />
            <Text style={styles.emptyTitle}>University not found in list</Text>
            <Text style={styles.emptySubtitle}>
              You can easily add your own university name below.
            </Text>
          </View>
        ) : null}
      </View>

      {/* Ability to Add Custom University */}
      <View style={styles.customWrap}>
        {!showCustomInput ? (
          <Pressable
            onPress={() => setShowCustomInput(true)}
            style={({ pressed }) => [
              styles.addUniBtn,
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="plus-circle"
              size={18}
              color={landingColors.blueSoft}
            />
            <Text style={styles.addUniBtnText}>
              Can’t find your university? Add your own
            </Text>
          </Pressable>
        ) : (
          <View style={styles.customCard}>
            <View style={styles.customHeader}>
              <View style={styles.customTitleWrap}>
                <MaterialCommunityIcons
                  name="plus-box"
                  size={16}
                  color={landingColors.blueSoft}
                />
                <Text style={styles.customTitle}>Add your university</Text>
              </View>
              <Pressable
                onPress={() => setShowCustomInput(false)}
                hitSlop={8}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={landingColors.textSubtle}
                />
              </Pressable>
            </View>

            <Text style={styles.customHint}>
              Enter the full name or acronym of your institution:
            </Text>

            <View style={styles.customInputRow}>
              <TextInput
                value={customUniName}
                onChangeText={setCustomUniName}
                placeholder="e.g. Mountain Top University, Ogun"
                placeholderTextColor={landingColors.textSubtle}
                style={styles.customInput}
                autoCapitalize="words"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddCustom}
              />
              <Pressable
                onPress={handleAddCustom}
                disabled={!customUniName.trim()}
                style={({ pressed }) => [
                  styles.customAddBtn,
                  !customUniName.trim() && styles.customAddBtnDisabled,
                  pressed && customUniName.trim() ? { opacity: 0.8 } : null,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.customAddBtnText}>Add & Select</Text>
              </Pressable>
            </View>
          </View>
        )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(18, 32, 54, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.2)",
    borderRadius: landingRadii.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  locationTextWrap: {
    gap: 2,
    flex: 1,
  },
  locationEyebrow: {
    fontSize: 10,
    fontFamily: landingFonts.body,
    fontWeight: "700",
    color: landingColors.blueSoft,
    letterSpacing: 0.5,
  },
  locationValue: {
    fontSize: 14,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.text,
  },
  changeLocationBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: landingRadii.sm,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
  },
  changeLocationText: {
    fontSize: 12,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.blueSoft,
  },
  selectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.35)",
    borderRadius: landingRadii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  selectedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: landingColors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedTextWrap: {
    flex: 1,
    gap: 2,
  },
  selectedEyebrow: {
    fontSize: 9,
    fontFamily: landingFonts.body,
    fontWeight: "700",
    color: landingColors.blueSoft,
    letterSpacing: 0.5,
  },
  selectedName: {
    fontSize: 14,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  clearBtn: {
    padding: 4,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  toggleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: landingRadii.sm,
    backgroundColor: "rgba(22, 38, 64, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  toggleTabActive: {
    backgroundColor: "rgba(56, 189, 248, 0.14)",
    borderColor: "rgba(56, 189, 248, 0.35)",
  },
  toggleTabText: {
    fontSize: 12,
    fontFamily: landingFonts.body,
    fontWeight: "500",
    color: landingColors.textMuted,
  },
  toggleTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(18, 30, 50, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: landingRadii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: landingFonts.body,
    color: landingColors.text,
  },
  listSection: {
    gap: 8,
  },
  listSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: landingFonts.body,
    fontWeight: "700",
    color: landingColors.textSubtle,
    letterSpacing: 0.5,
  },
  customCountBadge: {
    fontSize: 11,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.blueSoft,
  },
  uniList: {
    gap: 6,
  },
  uniCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(18, 32, 54, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: landingRadii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  uniCardSelected: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  uniCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  uniIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  uniIconWrapSelected: {
    backgroundColor: "rgba(56, 189, 248, 0.18)",
  },
  uniIconWrapCustom: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
  },
  uniTextWrap: {
    flex: 1,
    gap: 2,
  },
  uniName: {
    fontSize: 14,
    fontFamily: landingFonts.body,
    fontWeight: "500",
    color: landingColors.text,
  },
  uniNameSelected: {
    fontWeight: "600",
    color: "#FFFFFF",
  },
  customTag: {
    fontSize: 10,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.blueSoft,
  },
  emptyCard: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(18, 32, 54, 0.3)",
    borderRadius: landingRadii.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.textMuted,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: landingFonts.body,
    color: landingColors.textSubtle,
    textAlign: "center",
  },
  customWrap: {
    marginTop: 4,
  },
  addUniBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.22)",
    borderStyle: "dashed",
    borderRadius: landingRadii.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  addUniBtnText: {
    fontSize: 13,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.blueSoft,
  },
  customCard: {
    backgroundColor: "rgba(18, 34, 58, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.35)",
    borderRadius: landingRadii.md,
    padding: 14,
    gap: 10,
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  customTitle: {
    fontSize: 13,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.blueSoft,
  },
  customHint: {
    fontSize: 12,
    fontFamily: landingFonts.body,
    color: landingColors.textSubtle,
  },
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customInput: {
    flex: 1,
    height: 42,
    backgroundColor: "rgba(9, 16, 28, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: landingRadii.sm,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: landingFonts.body,
    color: landingColors.text,
  },
  customAddBtn: {
    backgroundColor: landingColors.blue,
    height: 42,
    paddingHorizontal: 16,
    borderRadius: landingRadii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  customAddBtnDisabled: {
    opacity: 0.4,
  },
  customAddBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: landingFonts.body,
    fontWeight: "600",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  errorText: {
    color: landingColors.danger,
    fontSize: 12,
    fontFamily: landingFonts.body,
  },
});

