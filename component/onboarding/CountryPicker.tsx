import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AFRICAN_COUNTRIES } from "../../data/countries";
import type { AfricanCountry } from "../../data/countries";
import {
  landingColors,
  landingFonts,
  landingRadii,
} from "../../constants/landing";
import CountryFlag from "./CountryFlag";

export default function CountryPicker({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string;
  onSelect: (countryName: string) => void;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const isCompact = width < 720;

  const countries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return AFRICAN_COUNTRIES;
    return AFRICAN_COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(q) ||
        country.code.includes(q),
    );
  }, [query]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.panel,
            isCompact
              ? { width: width - 24, maxHeight: height * 0.82 }
              : { width: Math.min(560, width - 48), maxHeight: 620 },
          ]}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>AFRICA</Text>
              <Text style={styles.title}>Choose your country</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close country picker"
            >
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={landingColors.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={landingColors.textSubtle}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search countries"
              placeholderTextColor={landingColors.textSubtle}
              style={styles.searchInput}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={landingColors.textSubtle}
                />
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.count}>
            {countries.length} {countries.length === 1 ? "country" : "countries"}
          </Text>

          <FlatList
            data={countries}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            initialNumToRender={14}
            renderItem={({ item }) => (
              <CountryRow
                country={item}
                selected={selected === item.name}
                onPress={() => {
                  onSelect(item.name);
                  onClose();
                }}
              />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No country found</Text>
                <Text style={styles.emptyText}>Try a different spelling.</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 12 }}
          />
        </View>
      </View>
    </Modal>
  );
}

function CountryRow({
  country,
  selected,
  onPress,
}: {
  country: AfricanCountry;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        pressed && { opacity: 0.75 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <CountryFlag country={country} size={34} />
      <Text style={styles.countryName}>{country.name}</Text>
      <Text style={styles.countryCode}>{country.code.toUpperCase()}</Text>
      {selected ? (
        <MaterialCommunityIcons
          name="check-circle"
          size={20}
          color={landingColors.green}
        />
      ) : (
        <View style={styles.emptyCheck} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: landingColors.overlay,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  panel: {
    backgroundColor: landingColors.panel,
    borderWidth: 1,
    borderColor: landingColors.borderStrong,
    borderRadius: landingRadii.lg,
    padding: 18,
    ...Platform.select({
      web: { boxShadow: "0 24px 80px rgba(0,0,0,0.55)" } as object,
      default: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.45,
        shadowRadius: 36,
        elevation: 18,
      },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    color: landingColors.blueSoft,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.8,
    marginBottom: 4,
  },
  title: {
    color: landingColors.text,
    fontFamily: landingFonts.heading,
    fontSize: 21,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: landingColors.panelAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: landingRadii.md,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: landingColors.bgSoft,
  },
  searchInput: {
    flex: 1,
    color: landingColors.text,
    fontFamily: landingFonts.body,
    fontSize: 15,
  },
  count: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: landingRadii.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowSelected: {
    backgroundColor: "rgba(47,124,255,0.12)",
    borderColor: "rgba(47,124,255,0.32)",
  },
  countryName: {
    flex: 1,
    color: landingColors.text,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 15,
  },
  countryCode: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1,
  },
  emptyCheck: {
    width: 20,
    height: 20,
  },
  empty: {
    paddingVertical: 42,
    alignItems: "center",
  },
  emptyTitle: {
    color: landingColors.text,
    fontFamily: landingFonts.heading,
    fontSize: 16,
  },
  emptyText: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 13,
    marginTop: 4,
  },
});
