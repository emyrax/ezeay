import React, { useMemo, useState } from "react";
import {
  Platform,
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
import {
  getPopularStatesForCountry,
  getStatesForCountry,
} from "../../data/locations";
import CountryFlag from "./CountryFlag";

interface LocationSelectorProps {
  country: string;
  selectedState: string;
  onSelectState: (state: string) => void;
  onChangeCountry: () => void;
  error?: string;
}

export default function LocationSelector({
  country,
  selectedState,
  onSelectState,
  onChangeCountry,
  error,
}: LocationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState("");

  const africanCountry = findAfricanCountry(country);
  const allStates = useMemo(() => getStatesForCountry(country), [country]);
  const popularStates = useMemo(
    () => getPopularStatesForCountry(country),
    [country],
  );

  const filteredStates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allStates;
    return allStates.filter((s) => s.toLowerCase().includes(q));
  }, [allStates, searchQuery]);

  function handleCustomSubmit() {
    const trimmed = customText.trim();
    if (trimmed) {
      onSelectState(trimmed);
      setCustomText("");
      setShowCustomInput(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Country banner */}
      <View style={styles.countryBanner}>
        {africanCountry ? (
          <View style={styles.countryLeft}>
            <CountryFlag country={africanCountry} size={32} />
            <View style={styles.countryInfo}>
              <Text style={styles.countryLabel}>COUNTRY</Text>
              <Text style={styles.countryName}>{africanCountry.name}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.countryLeft}>
            <View style={styles.countryPlaceholder}>
              <MaterialCommunityIcons
                name="earth"
                size={20}
                color={landingColors.blueSoft}
              />
            </View>
            <View style={styles.countryInfo}>
              <Text style={styles.countryLabel}>COUNTRY</Text>
              <Text style={styles.countryName}>
                {country || "None selected"}
              </Text>
            </View>
          </View>
        )}

        <Pressable
          onPress={onChangeCountry}
          style={({ pressed }) => [
            styles.changeCountryBtn,
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Change country"
        >
          <Text style={styles.changeCountryText}>Change</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={16}
            color={landingColors.blueSoft}
          />
        </Pressable>
      </View>

      {/* If no country selected */}
      {!country ? (
        <View style={styles.noCountryBox}>
          <MaterialCommunityIcons
            name="map-marker-question-outline"
            size={36}
            color={landingColors.blueSoft}
          />
          <Text style={styles.noCountryTitle}>Select a country first</Text>
          <Text style={styles.noCountrySubtitle}>
            States and regions will be tailored to your country.
          </Text>
          <Pressable
            onPress={onChangeCountry}
            style={styles.selectCountryCta}
            accessibilityRole="button"
          >
            <Text style={styles.selectCountryCtaText}>Choose Country</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Active selection banner if state is selected */}
          {selectedState ? (
            <View style={styles.selectedBanner}>
              <View style={styles.selectedBannerLeft}>
                <View style={styles.selectedCheck}>
                  <MaterialCommunityIcons
                    name="check"
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
                <View>
                  <Text style={styles.selectedBannerLabel}>CURRENT LOCATION</Text>
                  <Text style={styles.selectedBannerValue}>
                    {selectedState}, {country}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => onSelectState("")}
                style={styles.clearBtn}
                hitSlop={8}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={landingColors.textSubtle}
                />
              </Pressable>
            </View>
          ) : null}

          {/* Popular quick chips */}
          {popularStates.length > 0 && !searchQuery ? (
            <View style={styles.popularSection}>
              <Text style={styles.sectionLabel}>POPULAR REGIONS & CITIES</Text>
              <View style={styles.chipsRow}>
                {popularStates.map((st) => {
                  const isSelected = selectedState === st;
                  return (
                    <Pressable
                      key={st}
                      onPress={() => onSelectState(isSelected ? "" : st)}
                      style={({ pressed }) => [
                        styles.chip,
                        isSelected && styles.chipSelected,
                        pressed && { opacity: 0.8 },
                      ]}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {st}
                      </Text>
                      {isSelected ? (
                        <MaterialCommunityIcons
                          name="check"
                          size={14}
                          color={landingColors.blueSoft}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Search bar */}
          <View style={styles.searchBar}>
            <MaterialCommunityIcons
              name="magnify"
              size={18}
              color={landingColors.textSubtle}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`Search states/regions in ${country}...`}
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

          {/* State cards / list */}
          <View style={styles.statesListWrap}>
            <Text style={styles.sectionLabel}>
              {allStates.length > 0
                ? `ALL STATES & REGIONS (${filteredStates.length})`
                : "REGIONS"}
            </Text>

            <View style={styles.statesGrid}>
              {filteredStates.map((st) => {
                const isSelected = selectedState === st;
                return (
                  <Pressable
                    key={st}
                    onPress={() => onSelectState(isSelected ? "" : st)}
                    style={({ pressed }) => [
                      styles.stateCard,
                      isSelected && styles.stateCardSelected,
                      pressed && { opacity: 0.85 },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.stateCardLeft}>
                      <View
                        style={[
                          styles.stateCardIcon,
                          isSelected && styles.stateCardIconSelected,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="map-marker-outline"
                          size={16}
                          color={
                            isSelected
                              ? landingColors.blueSoft
                              : landingColors.textSubtle
                          }
                        />
                      </View>
                      <Text
                        style={[
                          styles.stateCardName,
                          isSelected && styles.stateCardNameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {st}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name={isSelected ? "check-circle" : "circle-outline"}
                      size={18}
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

            {filteredStates.length === 0 && (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>No matching state found</Text>
                <Text style={styles.emptySubtitle}>
                  You can type and add your custom city or state below.
                </Text>
              </View>
            )}
          </View>

          {/* Custom state entry option */}
          <View style={styles.customSection}>
            {!showCustomInput ? (
              <Pressable
                onPress={() => setShowCustomInput(true)}
                style={({ pressed }) => [
                  styles.addCustomBtn,
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name="plus-circle-outline"
                  size={18}
                  color={landingColors.blueSoft}
                />
                <Text style={styles.addCustomBtnText}>
                  Not on the list? Enter custom state or city
                </Text>
              </Pressable>
            ) : (
              <View style={styles.customInputCard}>
                <View style={styles.customInputHeader}>
                  <Text style={styles.customInputTitle}>
                    Add your custom state or city
                  </Text>
                  <Pressable
                    onPress={() => setShowCustomInput(false)}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={18}
                      color={landingColors.textSubtle}
                    />
                  </Pressable>
                </View>
                <View style={styles.customInputRow}>
                  <TextInput
                    value={customText}
                    onChangeText={setCustomText}
                    placeholder="e.g. Ikeja, Lekki, Kisumu..."
                    placeholderTextColor={landingColors.textSubtle}
                    style={styles.customTextInput}
                    autoCapitalize="words"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleCustomSubmit}
                  />
                  <Pressable
                    onPress={handleCustomSubmit}
                    disabled={!customText.trim()}
                    style={({ pressed }) => [
                      styles.customSubmitBtn,
                      !customText.trim() && styles.customSubmitDisabled,
                      pressed && customText.trim() ? { opacity: 0.8 } : null,
                    ]}
                  >
                    <Text style={styles.customSubmitText}>Set</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </>
      )}

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
  countryBanner: {
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
  countryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  countryPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  countryInfo: {
    gap: 2,
  },
  countryLabel: {
    fontSize: 10,
    fontFamily: landingFonts.body,
    fontWeight: "700",
    color: landingColors.blueSoft,
    letterSpacing: 0.5,
  },
  countryName: {
    fontSize: 15,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.text,
  },
  changeCountryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: landingRadii.sm,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
  },
  changeCountryText: {
    fontSize: 12,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.blueSoft,
  },
  noCountryBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "rgba(18, 32, 54, 0.4)",
    borderRadius: landingRadii.lg,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.15)",
    gap: 8,
  },
  noCountryTitle: {
    fontSize: 16,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.text,
    marginTop: 4,
  },
  noCountrySubtitle: {
    fontSize: 13,
    fontFamily: landingFonts.body,
    color: landingColors.textSubtle,
    textAlign: "center",
  },
  selectCountryCta: {
    marginTop: 8,
    backgroundColor: landingColors.blue,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: landingRadii.sm,
  },
  selectCountryCtaText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: landingFonts.body,
    fontWeight: "600",
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
    paddingVertical: 10,
  },
  selectedBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectedCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: landingColors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedBannerLabel: {
    fontSize: 9,
    fontFamily: landingFonts.body,
    fontWeight: "700",
    color: landingColors.blueSoft,
    letterSpacing: 0.5,
  },
  selectedBannerValue: {
    fontSize: 14,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  clearBtn: {
    padding: 4,
  },
  popularSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: landingFonts.body,
    fontWeight: "700",
    color: landingColors.textSubtle,
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(22, 38, 64, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: landingRadii.pill,
  },
  chipSelected: {
    backgroundColor: "rgba(56, 189, 248, 0.16)",
    borderColor: landingColors.blueSoft,
  },
  chipText: {
    fontSize: 13,
    fontFamily: landingFonts.body,
    fontWeight: "500",
    color: landingColors.textMuted,
  },
  chipTextSelected: {
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
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: landingFonts.body,
    color: landingColors.text,
  },
  statesListWrap: {
    gap: 8,
  },
  statesGrid: {
    gap: 6,
  },
  stateCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(18, 32, 54, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: landingRadii.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  stateCardSelected: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  stateCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  stateCardIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  stateCardIconSelected: {
    backgroundColor: "rgba(56, 189, 248, 0.18)",
  },
  stateCardName: {
    fontSize: 14,
    fontFamily: landingFonts.body,
    fontWeight: "500",
    color: landingColors.text,
    flex: 1,
  },
  stateCardNameSelected: {
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 18,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.textMuted,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: landingFonts.body,
    color: landingColors.textSubtle,
    textAlign: "center",
  },
  customSection: {
    marginTop: 4,
  },
  addCustomBtn: {
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
  addCustomBtnText: {
    fontSize: 13,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.blueSoft,
  },
  customInputCard: {
    backgroundColor: "rgba(18, 34, 58, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    borderRadius: landingRadii.md,
    padding: 12,
    gap: 10,
  },
  customInputHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customInputTitle: {
    fontSize: 12,
    fontFamily: landingFonts.body,
    fontWeight: "600",
    color: landingColors.blueSoft,
  },
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customTextInput: {
    flex: 1,
    height: 40,
    backgroundColor: "rgba(9, 16, 28, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: landingRadii.sm,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: landingFonts.body,
    color: landingColors.text,
  },
  customSubmitBtn: {
    backgroundColor: landingColors.blue,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: landingRadii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  customSubmitDisabled: {
    opacity: 0.4,
  },
  customSubmitText: {
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
