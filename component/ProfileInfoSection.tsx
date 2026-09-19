import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator, Pressable, Linking, Switch, Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeColors } from "../hooks/useTheme";
import { bodyFont } from "../constants/themes";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { searchPlaces, reverseGeocode, searchUniversities, expandBoundsForSearch } from "../lib/geocode";
import type { Bounds, PlaceSuggestion, UniversitySuggestion } from "../lib/geocode";
import { useUserStore } from "../store/userStore";
import type { Education, WorkExperience, Certification, CollarType, Availability, UserProfile } from "../types/user";

const COLLAR_OPTIONS: { value: CollarType; label: string }[] = [
  { value: "white", label: "White Collar" }, { value: "yellow", label: "Yellow Collar" }, { value: "both", label: "Both" },
];
const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: "open_to_work", label: "Open to Work" }, { value: "open_to_learn", label: "Open to Learn" },
  { value: "open_to_mentor", label: "Open to Mentor" }, { value: "not_looking", label: "Not Looking" },
];
const AVAILABILITY_LABELS: Record<string, string> = {
  open_to_work: "Open to Work", open_to_learn: "Open to Learn", open_to_mentor: "Open to Mentor", not_looking: "Not Looking",
};
const EDUCATION_LEVELS = ["High School", "Diploma", "Associate", "Bachelor", "Master", "Doctorate"];

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseBirthday(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const parsed = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

function openUrl(raw?: string | null): (() => void) | undefined {
  const url = raw?.trim();
  if (!url) return undefined;
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return () => {
    Linking.openURL(href).catch(() => Alert.alert("Can't Open", `Unable to open ${href}`));
  };
}

function ViewRow({ icon, label, value, theme, tint, onPress }: {
  icon: string; label: string; value?: string | number | null; theme: ReturnType<typeof useThemeColors>;
  tint?: string; onPress?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = tint ?? theme.primary;
  const filled = value !== null && value !== undefined && value !== "";
  const actionable = filled && !!onPress;
  return (
    <Pressable
      onPress={actionable ? onPress : undefined}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => (pressed && actionable ? { opacity: 0.7 } : undefined)}
      accessibilityRole={actionable ? "button" : undefined}
    >
      <View style={infoStyles.viewRow}>
        <View style={[infoStyles.viewIcon, { backgroundColor: color }]}>
          <MaterialCommunityIcons name={icon as any} size={16} color="#FFFFFF" />
        </View>
        <Text style={[infoStyles.viewLabel, { color: theme.text }]} numberOfLines={1}>{label}</Text>
        <Text style={[infoStyles.viewValue, { color: filled ? theme.textSecondary : theme.textMuted }]} numberOfLines={1}>
          {filled ? value : "—"}
        </Text>
        {actionable ? <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textMuted} /> : null}
      </View>
      {hovered && filled ? (
        <View style={[infoStyles.tooltip, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Text style={[infoStyles.tooltipText, { color: theme.text }]}>{String(value)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function GroupHeader({ title, theme }: { title: string; theme: ReturnType<typeof useThemeColors> }) {
  return <Text style={[infoStyles.groupHeader, { color: theme.textSecondary }]}>{title.toUpperCase()}</Text>;
}

function GroupCard({ theme, children }: {
  theme: ReturnType<typeof useThemeColors>; children: React.ReactNode;
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[infoStyles.groupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {items.map((child, i) => (
        <View key={i}>
          {child}
          {i < items.length - 1 ? <View style={[infoStyles.separator, { backgroundColor: theme.borderLight }]} /> : null}
        </View>
      ))}
    </View>
  );
}

export default function ProfileInfoSection({
  profile, startEditing, onDoneEditing,
}: {
  profile: UserProfile; startEditing: boolean; onDoneEditing: () => void;
}) {
  const theme = useThemeColors();
  const { getToken } = useAuth();
  const setProfile = useUserStore((s) => s.setProfile);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const firstInputRef = useRef<TextInput>(null);
  const placeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uniTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeAbort = useRef<AbortController | null>(null);
  const uniAbort = useRef<AbortController | null>(null);

  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [locationLat, setLocationLat] = useState<number | undefined>(profile.locationLat);
  const [locationLng, setLocationLng] = useState<number | undefined>(profile.locationLng);
  const [locationBounds, setLocationBounds] = useState<Bounds | undefined>(undefined);
  const [locationSearching, setLocationSearching] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [university, setUniversity] = useState(profile.university ?? "");
  const [universitySuggestions, setUniversitySuggestions] = useState<UniversitySuggestion[]>([]);
  const [universitySearching, setUniversitySearching] = useState(false);
  const [universityFocused, setUniversityFocused] = useState(false);
  const [universitySearched, setUniversitySearched] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [geolocateError, setGeolocateError] = useState<string | null>(null);
  const [website, setWebsite] = useState(profile.website ?? "");
  const [linkedInUrl, setLinkedInUrl] = useState(profile.linkedInUrl ?? "");
  const [birthday, setBirthday] = useState(profile.birthday ?? "");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [educationLevel, setEducationLevel] = useState(profile.educationLevel ?? "");
  const [professionalInfoEnabled, setProfessionalInfoEnabled] = useState(profile.professionalInfoEnabled ?? true);
  const [department, setDepartment] = useState(profile.department ?? "");
  const [collarType, setCollarType] = useState<CollarType | null>(profile.collarType ?? null);
  const [availability, setAvailability] = useState<Availability | null>(profile.availability ?? null);
  const [industry, setIndustry] = useState(profile.industry ?? "");
  const [jobTitle, setJobTitle] = useState(profile.jobTitle ?? "");
  const [company, setCompany] = useState(profile.company ?? "");
  const [education, setEducation] = useState<Education[]>(profile.education ?? []);
  const [workExperience, setWorkExperience] = useState<WorkExperience[]>(profile.workExperience ?? []);
  const [tradeSkills, setTradeSkills] = useState<string[]>(profile.tradeSkills ?? []);
  const [certifications, setCertifications] = useState<Certification[]>(profile.certifications ?? []);
  const [yearsOfTradeExperience, setYearsOfTradeExperience] = useState(profile.yearsOfTradeExperience?.toString() ?? "");
  const [skills, setSkills] = useState<string[]>(profile.skills ?? []);
  const [languages, setLanguages] = useState<string[]>(profile.languages ?? []);
  const [interests, setInterests] = useState<string[]>(profile.interests ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [languageInput, setLanguageInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [tradeSkillInput, setTradeSkillInput] = useState("");
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);
  const [editWork, setEditWork] = useState<WorkExperience | null>(null);
  const [editCert, setEditCert] = useState<Certification | null>(null);

  useEffect(() => {
    if (startEditing) {
      setEditMode(true);
      setTimeout(() => firstInputRef.current?.focus(), 400);
    }
  }, [startEditing]);

  function addSkill() { const v = skillInput.trim(); if (v && !skills.includes(v)) setSkills([...skills, v]); setSkillInput(""); }
  function addLanguage() { const v = languageInput.trim(); if (v && !languages.includes(v)) setLanguages([...languages, v]); setLanguageInput(""); }
  function addInterest() { const v = interestInput.trim(); if (v && !interests.includes(v)) setInterests([...interests, v]); setInterestInput(""); }
  function addTradeSkill() { const v = tradeSkillInput.trim(); if (v && !tradeSkills.includes(v)) setTradeSkills([...tradeSkills, v]); setTradeSkillInput(""); }

  useEffect(() => () => {
    if (placeTimer.current) clearTimeout(placeTimer.current);
    if (uniTimer.current) clearTimeout(uniTimer.current);
    placeAbort.current?.abort();
    uniAbort.current?.abort();
  }, []);

  function clearPlaceResults() {
    if (placeTimer.current) clearTimeout(placeTimer.current);
    placeAbort.current?.abort();
    setPlaceSuggestions([]);
    setLocationSearching(false);
  }

  async function runPlaceSearch(q: string) {
    placeAbort.current?.abort();
    const controller = new AbortController();
    placeAbort.current = controller;
    setLocationSearching(true);
    try {
      const res = await searchPlaces(q, 6, controller.signal);
      if (!controller.signal.aborted) { setPlaceSuggestions(res); setGeolocateError(null); }
    } catch {
      if (!controller.signal.aborted) setPlaceSuggestions([]);
    } finally {
      if (!controller.signal.aborted) setLocationSearching(false);
    }
  }

  function onLocationChange(v: string) {
    setLocation(v);
    setLocationLat(undefined);
    setLocationLng(undefined);
    setLocationBounds(undefined);
    if (uniTimer.current) clearTimeout(uniTimer.current);
    uniAbort.current?.abort();
    setUniversitySuggestions([]);
    setUniversitySearching(false);
    setUniversitySearched(false);
    if (placeTimer.current) clearTimeout(placeTimer.current);
    const q = v.trim();
    if (!q) {
      placeAbort.current?.abort();
      setPlaceSuggestions([]);
      setLocationSearching(false);
      return;
    }
    placeTimer.current = setTimeout(() => runPlaceSearch(q), 400);
  }

  function selectPlace(s: PlaceSuggestion) {
    if (placeTimer.current) clearTimeout(placeTimer.current);
    placeAbort.current?.abort();
    setPlaceSuggestions([]);
    setLocationSearching(false);
    setLocation(s.label);
    setLocationLat(s.lat);
    setLocationLng(s.lng);
    const searchBounds = expandBoundsForSearch(s.bounds, s.lat, s.lng);
    setLocationBounds(searchBounds);
    setGeolocateError(null);
    setUniversitySearched(false);
    runUniversityQuery(university.trim(), searchBounds);
  }

  async function runUniversityQuery(q: string, bounds?: Bounds) {
    uniAbort.current?.abort();
    const controller = new AbortController();
    uniAbort.current = controller;
    setUniversitySearching(true);
    try {
      const res = await searchUniversities({ query: q, bounds: bounds ?? locationBounds, signal: controller.signal });
      if (!controller.signal.aborted) setUniversitySuggestions(res);
    } catch {
      if (!controller.signal.aborted) setUniversitySuggestions([]);
    } finally {
      if (!controller.signal.aborted) {
        setUniversitySearching(false);
        setUniversitySearched(true);
      }
    }
  }

  function onUniversityChange(v: string) {
    setUniversity(v);
    if (uniTimer.current) clearTimeout(uniTimer.current);
    const q = v.trim();
    if (!q && !locationBounds) {
      uniAbort.current?.abort();
      setUniversitySuggestions([]);
      setUniversitySearching(false);
      setUniversitySearched(false);
      return;
    }
    if (!q) {
      setUniversitySearching(true);
      uniTimer.current = setTimeout(() => runUniversityQuery(""), 250);
      return;
    }
    setUniversitySearching(true);
    uniTimer.current = setTimeout(() => runUniversityQuery(q), 400);
  }

  function selectUniversity(name: string) {
    if (uniTimer.current) clearTimeout(uniTimer.current);
    uniAbort.current?.abort();
    setUniversity(name);
    setUniversitySuggestions([]);
    setUniversitySearching(false);
    setUniversitySearched(false);
  }

  function onUniversityFocus() {
    setUniversityFocused(true);
    if (uniTimer.current) clearTimeout(uniTimer.current);
    if (!locationBounds && !university.trim()) {
      setUniversitySuggestions([]);
      setUniversitySearching(false);
      setUniversitySearched(false);
      return;
    }
    runUniversityQuery(university.trim());
  }

  async function useMyLocation() {
    if (geolocating) return;
    setGeolocating(true);
    setGeolocateError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setGeolocateError("Location permission is required to use your current location.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      clearPlaceResults();
      const gpsLat = pos.coords.latitude;
      const gpsLng = pos.coords.longitude;
      const s = await reverseGeocode(gpsLat, gpsLng);
      const searchBounds = expandBoundsForSearch(s.bounds, gpsLat, gpsLng);
      setLocation(s.label);
      setLocationLat(gpsLat);
      setLocationLng(gpsLng);
      setLocationBounds(searchBounds);
      setUniversitySearched(false);
      runUniversityQuery(university.trim(), searchBounds);
    } catch {
      setGeolocateError("Couldn't get your current location. Please try again.");
    } finally {
      setGeolocating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) { Alert.alert("Error", "Not authenticated"); return; }
      const data: Record<string, unknown> = {
        displayName: displayName || null, headline: headline || null, bio: bio || null,
        location: location || null,
        locationLat: typeof locationLat === "number" ? locationLat : null,
        locationLng: typeof locationLng === "number" ? locationLng : null,
        university: university || null,
        website: website || null, linkedInUrl: linkedInUrl || null,
        birthday: birthday || null, educationLevel: educationLevel || null,
        professionalInfoEnabled: professionalInfoEnabled, department: department || null,
        collarType: collarType || null, availability: availability || null,
        industry: industry || null, jobTitle: jobTitle || null, company: company || null,
        education: education.length > 0 ? JSON.stringify(education) : null,
        workExperience: workExperience.length > 0 ? JSON.stringify(workExperience) : null,
        tradeSkills: tradeSkills.length > 0 ? tradeSkills : null,
        certifications: certifications.length > 0 ? JSON.stringify(certifications) : null,
        yearsOfTradeExperience: yearsOfTradeExperience ? Number(yearsOfTradeExperience) : null,
        skills: skills.length > 0 ? skills : null,
        languages: languages.length > 0 ? languages : null,
        interests: interests.length > 0 ? interests : null,
      };
      Object.keys(data).forEach((k) => { if (data[k] === null || data[k] === undefined) delete data[k]; });
      await api.users.update(profile.uid, data, token);
      const merged: UserProfile = {
        ...profile,
        displayName: displayName ?? profile.displayName,
        headline: headline ?? profile.headline,
        bio: bio ?? profile.bio,
        location: location ?? profile.location,
        locationLat: locationLat ?? profile.locationLat,
        locationLng: locationLng ?? profile.locationLng,
        university: university ?? profile.university,
        website: website ?? profile.website,
        linkedInUrl: linkedInUrl ?? profile.linkedInUrl,
        birthday: birthday ?? profile.birthday,
        educationLevel: educationLevel ?? profile.educationLevel,
        professionalInfoEnabled: professionalInfoEnabled,
        department: department ?? profile.department,
        collarType: collarType ?? profile.collarType,
        availability: availability ?? profile.availability,
        industry: industry ?? profile.industry,
        jobTitle: jobTitle ?? profile.jobTitle,
        company: company ?? profile.company,
        education, workExperience, tradeSkills, certifications,
        yearsOfTradeExperience: yearsOfTradeExperience ? Number(yearsOfTradeExperience) : profile.yearsOfTradeExperience,
        skills, languages, interests,
      };
      setProfile(merged);
      await AsyncStorage.setItem("userProfile", JSON.stringify(merged));
      setEditMode(false);
      onDoneEditing();
    } catch (err: any) {
      Alert.alert("Save Failed", err.message ?? "Something went wrong");
    } finally { setSaving(false); }
  }

  function handleCancel() {
    setDisplayName(profile.displayName ?? "");
    setHeadline(profile.headline ?? "");
    setBio(profile.bio ?? "");
    setLocation(profile.location ?? "");
    setLocationLat(profile.locationLat);
    setLocationLng(profile.locationLng);
    setLocationBounds(undefined);
    setPlaceSuggestions([]);
    setLocationSearching(false);
    setGeolocateError(null);
    setUniversity(profile.university ?? "");
    setUniversitySuggestions([]);
    setUniversitySearching(false);
    setUniversitySearched(false);
    setWebsite(profile.website ?? "");
    setLinkedInUrl(profile.linkedInUrl ?? "");
    setBirthday(profile.birthday ?? "");
    setEducationLevel(profile.educationLevel ?? "");
    setProfessionalInfoEnabled(profile.professionalInfoEnabled ?? true);
    setDepartment(profile.department ?? "");
    setCollarType(profile.collarType ?? null);
    setAvailability(profile.availability ?? null);
    setIndustry(profile.industry ?? "");
    setJobTitle(profile.jobTitle ?? "");
    setCompany(profile.company ?? "");
    setEducation(profile.education ?? []);
    setWorkExperience(profile.workExperience ?? []);
    setTradeSkills(profile.tradeSkills ?? []);
    setCertifications(profile.certifications ?? []);
    setYearsOfTradeExperience(profile.yearsOfTradeExperience?.toString() ?? "");
    setSkills(profile.skills ?? []);
    setLanguages(profile.languages ?? []);
    setInterests(profile.interests ?? []);
    setEditMode(false);
    onDoneEditing();
  }

  function renderTagInput(items: string[], input: string, setInput: (v: string) => void, onAdd: () => void, onRemove: (i: number) => void, placeholder: string) {
    return (
      <View>
        <View style={infoStyles.tagRow}>
          <TextInput style={[infoStyles.tagInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={input} onChangeText={setInput} placeholder={placeholder} placeholderTextColor={theme.textMuted} onSubmitEditing={onAdd} returnKeyType="done" />
          <TouchableOpacity style={[infoStyles.tagAddBtn, { backgroundColor: theme.primary }]} onPress={onAdd}>
            <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
        {items.length > 0 && (
          <View style={infoStyles.tagList}>
            {items.map((item, i) => (
              <View key={i} style={[infoStyles.tag, { backgroundColor: theme.primary + "20" }]}>
                <Text style={[infoStyles.tagText, { color: theme.text }]}>{item}</Text>
                <TouchableOpacity onPress={() => onRemove(i)}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  function renderProfessionalFields() {
    const showWhite = collarType === "white" || collarType === "both";
    const showYellow = collarType === "yellow" || collarType === "both";
    return (
      <>
        <Text style={[infoStyles.editSectionLabel, { color: theme.text }]}>Professional Info</Text>
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={jobTitle} onChangeText={setJobTitle} placeholder="Job Title" placeholderTextColor={theme.textMuted} />
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={company} onChangeText={setCompany} placeholder="Company" placeholderTextColor={theme.textMuted} />
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={industry} onChangeText={setIndustry} placeholder="Industry" placeholderTextColor={theme.textMuted} />
        {showWhite && (
          <>
            <View style={infoStyles.listBlock}>
              <Text style={[infoStyles.listLabel, { color: theme.textSecondary }]}>Education</Text>
              {education.map((edu, i) => (
                <View key={edu.id} style={[infoStyles.listItem, { backgroundColor: theme.surfaceAlt }]}>
                  <View style={infoStyles.listItemText}>
                    <Text style={[infoStyles.listItemTitle, { color: theme.text }]}>{edu.institution}</Text>
                    <Text style={[infoStyles.listItemSub, { color: theme.textMuted }]}>{edu.degree} in {edu.fieldOfStudy}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setEducation(education.filter((_, j) => j !== i))}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[infoStyles.addItemBtn, { borderColor: theme.border }]} onPress={() => setEditingEducation({ id: generateId(), institution: "", degree: "", fieldOfStudy: "", startDate: "", isCurrent: false })}>
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={theme.primary} />
                <Text style={[infoStyles.addItemText, { color: theme.primary }]}>Add Education</Text>
              </TouchableOpacity>
            </View>
            <View style={infoStyles.listBlock}>
              <Text style={[infoStyles.listLabel, { color: theme.textSecondary }]}>Work Experience</Text>
              {workExperience.map((exp, i) => (
                <View key={exp.id} style={[infoStyles.listItem, { backgroundColor: theme.surfaceAlt }]}>
                  <View style={infoStyles.listItemText}>
                    <Text style={[infoStyles.listItemTitle, { color: theme.text }]}>{exp.title}</Text>
                    <Text style={[infoStyles.listItemSub, { color: theme.textMuted }]}>{exp.company}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setWorkExperience(workExperience.filter((_, j) => j !== i))}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[infoStyles.addItemBtn, { borderColor: theme.border }]} onPress={() => setEditWork({ id: generateId(), company: "", title: "", employmentType: "full-time", startDate: "", isCurrent: false })}>
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={theme.primary} />
                <Text style={[infoStyles.addItemText, { color: theme.primary }]}>Add Experience</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        {showYellow && (
          <>
            <Text style={[infoStyles.editSectionLabel, { color: theme.text }]}>Trade / Craft Info</Text>
            {renderTagInput(tradeSkills, tradeSkillInput, setTradeSkillInput, addTradeSkill, (i) => setTradeSkills(tradeSkills.filter((_, j) => j !== i)), "Add trade skill")}
            <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={yearsOfTradeExperience} onChangeText={setYearsOfTradeExperience} placeholder="Years of experience" placeholderTextColor={theme.textMuted} keyboardType="number-pad" />
            <View style={infoStyles.listBlock}>
              <Text style={[infoStyles.listLabel, { color: theme.textSecondary }]}>Certifications</Text>
              {certifications.map((cert, i) => (
                <View key={cert.id} style={[infoStyles.listItem, { backgroundColor: theme.surfaceAlt }]}>
                  <View style={infoStyles.listItemText}>
                    <Text style={[infoStyles.listItemTitle, { color: theme.text }]}>{cert.name}</Text>
                    <Text style={[infoStyles.listItemSub, { color: theme.textMuted }]}>{cert.issuer}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setCertifications(certifications.filter((_, j) => j !== i))}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[infoStyles.addItemBtn, { borderColor: theme.border }]} onPress={() => setEditCert({ id: generateId(), name: "", issuer: "", issueDate: "" })}>
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={theme.primary} />
                <Text style={[infoStyles.addItemText, { color: theme.primary }]}>Add Certification</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </>
    );
  }

  if (editMode) {
    return (
      <View>
        <View style={infoStyles.editActions}>
          <TouchableOpacity onPress={handleCancel} style={[infoStyles.xBtn, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={[infoStyles.saveBtn, { backgroundColor: theme.primary }]} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={infoStyles.saveText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>

        <Text style={[infoStyles.editSectionLabel, { color: theme.text }]}>Basic Info</Text>
        <TextInput ref={firstInputRef} style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={displayName} onChangeText={setDisplayName} placeholder="Display Name" placeholderTextColor={theme.textMuted} />
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={headline} onChangeText={setHeadline} placeholder="Professional Headline" placeholderTextColor={theme.textMuted} />
        <TextInput style={[infoStyles.input, { ...infoStyles.textArea }, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={bio} onChangeText={setBio} placeholder="Bio" placeholderTextColor={theme.textMuted} multiline numberOfLines={3} />
        <TouchableOpacity style={[infoStyles.input, infoStyles.dateField, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} onPress={() => setShowDatePicker(true)}>
          <Text style={[infoStyles.dateFieldText, { color: parseBirthday(birthday) ? theme.text : theme.textMuted }]}>
            {parseBirthday(birthday)?.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) ?? "Birthday"}
          </Text>
          <MaterialCommunityIcons name="calendar-month" size={18} color={theme.textMuted} />
        </TouchableOpacity>
        {showDatePicker && (
          <View style={[infoStyles.datePickerWrap, { borderColor: theme.border }]}>
            <DateTimePicker
              value={parseBirthday(birthday) ?? new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={new Date()}
              onValueChange={(_event, selected) => {
                if (Platform.OS === "android") setShowDatePicker(false);
                setBirthday(toYmd(selected));
              }}
              onDismiss={() => {
                if (Platform.OS === "android") setShowDatePicker(false);
              }}
            />
            {Platform.OS === "ios" && (
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={[infoStyles.saveBtn, { backgroundColor: theme.primary, marginBottom: 12, alignSelf: "flex-end", marginRight: 12 }]}>
                <Text style={infoStyles.saveText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <Text style={[infoStyles.editSubLabel, { color: theme.textSecondary }]}>Location</Text>
        <View style={infoStyles.geoRow}>
          <TextInput
            style={[infoStyles.input, infoStyles.geoInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
            value={location}
            onChangeText={onLocationChange}
            placeholder="Search your location"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="words"
          />
          <TouchableOpacity style={[infoStyles.geoPinBtn, { backgroundColor: theme.primary }]} onPress={useMyLocation} disabled={geolocating} accessibilityLabel="Use current location">
            {geolocating ? <ActivityIndicator color="#FFF" size="small" /> : <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#FFF" />}
          </TouchableOpacity>
        </View>
        {locationSearching ? <Text style={[infoStyles.suggestionHint, { color: theme.textMuted }]}>Searching…</Text> : null}
        {!locationSearching && geolocateError ? <Text style={[infoStyles.suggestionHint, { color: theme.danger }]}>{geolocateError}</Text> : null}
        {placeSuggestions.length > 0 && (
          <View style={[infoStyles.suggestionBox, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
            {placeSuggestions.map((s, i) => (
              <TouchableOpacity key={i} style={infoStyles.suggestionRow} onPress={() => selectPlace(s)}>
                <MaterialCommunityIcons name="map-marker" size={16} color={theme.primary} />
                <Text style={[infoStyles.suggestionText, { color: theme.text }]} numberOfLines={2}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={[infoStyles.editSubLabel, { color: theme.textSecondary }]}>Education Level</Text>
        <View style={infoStyles.optionRow}>
          {EDUCATION_LEVELS.map((level) => (
            <TouchableOpacity key={level} style={[infoStyles.optionChip, { borderColor: educationLevel === level ? theme.primary : theme.border }, educationLevel === level && { backgroundColor: theme.primary + "20" }]} onPress={() => setEducationLevel(educationLevel === level ? "" : level)}>
              <Text style={[infoStyles.optionChipText, { color: educationLevel === level ? theme.primary : theme.textMuted }]}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[infoStyles.editSubLabel, { color: theme.textSecondary }]}>University</Text>
        <View style={infoStyles.geoRow}>
          <TextInput
            style={[infoStyles.input, infoStyles.geoInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
            value={university}
            onChangeText={onUniversityChange}
            onFocus={onUniversityFocus}
            onBlur={() => setUniversityFocused(false)}
            placeholder="University"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="words"
          />
          {universitySearching ? <View style={infoStyles.geoPinBtn}><ActivityIndicator color={theme.primary} size="small" /></View> : null}
        </View>
        {!locationBounds && universityFocused ? (
          <Text style={[infoStyles.suggestionHint, { color: theme.textMuted }]}>Choose a Location first to find universities near you.</Text>
        ) : null}
        {universitySearching ? <Text style={[infoStyles.suggestionHint, { color: theme.textMuted }]}>Searching universities…</Text> : null}
        {!universitySearching && universitySearched && locationBounds && universitySuggestions.length === 0 && university.trim() === "" ? (
          <Text style={[infoStyles.suggestionHint, { color: theme.textMuted }]}>No universities found near this location. Type a name to use it anyway.</Text>
        ) : null}
        {!universitySearching && (universitySuggestions.length > 0 || university.trim() !== "") && (
          <View style={[infoStyles.suggestionBox, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
            {university.trim() !== "" && !universitySuggestions.some((s) => s.name.toLowerCase() === university.trim().toLowerCase()) && (
              <TouchableOpacity style={infoStyles.suggestionRow} onPress={() => selectUniversity(university.trim())}>
                <MaterialCommunityIcons name="plus-circle-outline" size={16} color={theme.primary} />
                <Text style={[infoStyles.suggestionText, { color: theme.text }]} numberOfLines={2}>Use “{university.trim()}” as the name</Text>
              </TouchableOpacity>
            )}
            {universitySuggestions.map((s, i) => (
              <TouchableOpacity key={i} style={infoStyles.suggestionRow} onPress={() => selectUniversity(s.name)}>
                <MaterialCommunityIcons name="school" size={16} color={theme.primary} />
                <Text style={[infoStyles.suggestionText, { color: theme.text }]} numberOfLines={2}>
                  {s.name}{s.city ? ` — ${s.city}` : ""}{s.city && s.country ? `, ${s.country}` : s.country ? ` — ${s.country}` : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={department} onChangeText={setDepartment} placeholder="Department" placeholderTextColor={theme.textMuted} />
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={website} onChangeText={setWebsite} placeholder="Website URL" placeholderTextColor={theme.textMuted} keyboardType="url" autoCapitalize="none" />
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={linkedInUrl} onChangeText={setLinkedInUrl} placeholder="LinkedIn URL" placeholderTextColor={theme.textMuted} keyboardType="url" autoCapitalize="none" />
        <TextInput editable={false} value={profile.email ?? ""} style={[infoStyles.input, { color: theme.textMuted, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} placeholder="Email (from account)" placeholderTextColor={theme.textMuted} />

        <Text style={[infoStyles.editSectionLabel, { color: theme.text }]}>Professional Info</Text>
        <View style={[infoStyles.toggleRow, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
          <Text style={[infoStyles.toggleLabel, { color: theme.text }]}>Show Professional Info</Text>
          <Switch value={professionalInfoEnabled} onValueChange={setProfessionalInfoEnabled} trackColor={{ false: theme.border, true: theme.primary }} thumbColor={professionalInfoEnabled ? "#FFFFFF" : theme.textMuted} />
        </View>
        {professionalInfoEnabled && (
          <>
            <Text style={[infoStyles.editSubLabel, { color: theme.textSecondary }]}>Collar Type</Text>
            <View style={infoStyles.optionRow}>
              {COLLAR_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.value} style={[infoStyles.optionChip, { borderColor: collarType === opt.value ? theme.primary : theme.border }, collarType === opt.value && { backgroundColor: theme.primary + "20" }]} onPress={() => setCollarType(collarType === opt.value ? null : opt.value)}>
                  <Text style={[infoStyles.optionChipText, { color: collarType === opt.value ? theme.primary : theme.textMuted }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {renderProfessionalFields()}
          </>
        )}

        <Text style={[infoStyles.editSectionLabel, { color: theme.text }]}>Availability</Text>
        <View style={infoStyles.optionRow}>
          {AVAILABILITY_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value} style={[infoStyles.optionChip, { borderColor: availability === opt.value ? theme.primary : theme.border }, availability === opt.value && { backgroundColor: theme.primary + "20" }]} onPress={() => setAvailability(opt.value)}>
              <Text style={[infoStyles.optionChipText, { color: availability === opt.value ? theme.primary : theme.textMuted }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[infoStyles.editSectionLabel, { color: theme.text }]}>Skills</Text>
        {renderTagInput(skills, skillInput, setSkillInput, addSkill, (i) => setSkills(skills.filter((_, j) => j !== i)), "Add a skill")}

        <Text style={[infoStyles.editSectionLabel, { color: theme.text }]}>Languages</Text>
        {renderTagInput(languages, languageInput, setLanguageInput, addLanguage, (i) => setLanguages(languages.filter((_, j) => j !== i)), "Add a language")}

        <Text style={[infoStyles.editSectionLabel, { color: theme.text }]}>Interests</Text>
        {renderTagInput(interests, interestInput, setInterestInput, addInterest, (i) => setInterests(interests.filter((_, j) => j !== i)), "Add an interest")}

        {/* Education sub-modal */}
        <Modal visible={!!editingEducation} transparent animationType="fade">
          {editingEducation && (
            <EducationModal
              education={editingEducation}
              onSave={(edu) => {
                const idx = education.findIndex((e) => e.id === edu.id);
                if (idx >= 0) { const u = [...education]; u[idx] = edu; setEducation(u); } else setEducation([...education, edu]);
                setEditingEducation(null);
              }}
              onClose={() => setEditingEducation(null)}
            />
          )}
        </Modal>

        <Modal visible={!!editWork} transparent animationType="fade">
          {editWork && (
            <WorkModal
              work={editWork}
              onSave={(w) => {
                const idx = workExperience.findIndex((e) => e.id === w.id);
                if (idx >= 0) { const u = [...workExperience]; u[idx] = w; setWorkExperience(u); } else setWorkExperience([...workExperience, w]);
                setEditWork(null);
              }}
              onClose={() => setEditWork(null)}
            />
          )}
        </Modal>

        <Modal visible={!!editCert} transparent animationType="fade">
          {editCert && (
            <CertModal
              certification={editCert}
              onSave={(c) => {
                const idx = certifications.findIndex((cert) => cert.id === c.id);
                if (idx >= 0) { const u = [...certifications]; u[idx] = c; setCertifications(u); } else setCertifications([...certifications, c]);
                setEditCert(null);
              }}
              onClose={() => setEditCert(null)}
            />
          )}
        </Modal>
      </View>
    );
  }

  return (
    <View>
      <GroupHeader title="Basic Info" theme={theme} />
      <GroupCard theme={theme}>
        <ViewRow icon="account" label="Name" value={profile.displayName || profile.email?.split("@")[0] || "Scholar"} theme={theme} />
        <ViewRow icon="cake" label="Birthday" value={profile.birthday ? new Date(profile.birthday).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : undefined} theme={theme} tint={theme.accent} />
        <ViewRow icon="email" label="Email" value={profile.email} theme={theme} tint={theme.info} />
        <ViewRow icon="school" label="Education Level" value={profile.educationLevel} theme={theme} tint={theme.accent} />
        <ViewRow icon="map-marker" label="Location" value={profile.location} theme={theme} tint={theme.accent} />
        <ViewRow icon="school-outline" label="University" value={profile.university} theme={theme} tint={theme.accent} />
        <ViewRow icon="layers" label="Department" value={profile.department} theme={theme} />
        <ViewRow icon="link" label="Website" value={profile.website} theme={theme} tint={theme.accent} onPress={openUrl(profile.website)} />
        <ViewRow icon="linkedin" label="LinkedIn" value={profile.linkedInUrl ? "View Profile" : undefined} theme={theme} tint={theme.info} onPress={openUrl(profile.linkedInUrl)} />
        <ViewRow icon="calendar" label="Member Since" value={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Unknown"} theme={theme} tint={theme.info} />
      </GroupCard>

      {profile.professionalInfoEnabled !== false && (
        <>
          <GroupHeader title="Professional Info" theme={theme} />
          <GroupCard theme={theme}>
            <ViewRow icon="domain" label="Industry" value={profile.industry} theme={theme} tint={theme.accent} />
            <ViewRow icon="briefcase" label="Job Title" value={profile.jobTitle} theme={theme} tint={theme.accent} />
            <ViewRow icon="domain" label="Company" value={profile.company} theme={theme} tint={theme.accent} />
            <ViewRow icon="tie" label="Collar Type" value={profile.collarType ? profile.collarType.replace("_", " ") : undefined} theme={theme} tint={theme.accent} />
          </GroupCard>
        </>
      )}

      <GroupHeader title="Availability" theme={theme} />
      <GroupCard theme={theme}>
        <ViewRow icon="checkbox-marked-circle" label="Status" value={profile.availability ? AVAILABILITY_LABELS[profile.availability] || profile.availability : undefined} theme={theme} tint={theme.success} />
      </GroupCard>
    </View>
  );
}

function EducationModal({ education, onSave, onClose }: { education: Education; onSave: (e: Education) => void; onClose: () => void }) {
  const theme = useThemeColors();
  const [institution, setInstitution] = useState(education.institution);
  const [degree, setDegree] = useState(education.degree);
  const [fieldOfStudy, setFieldOfStudy] = useState(education.fieldOfStudy);
  const [startDate, setStartDate] = useState(education.startDate);
  const [endDate, setEndDate] = useState(education.endDate ?? "");
  const [isCurrent, setIsCurrent] = useState(education.isCurrent);
  return (
    <View style={infoStyles.subOverlay}>
      <View style={[infoStyles.subModal, { backgroundColor: theme.surface }]}>
        <Text style={[infoStyles.subTitle, { color: theme.text }]}>Education</Text>
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={institution} onChangeText={setInstitution} placeholder="Institution" placeholderTextColor={theme.textMuted} />
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={degree} onChangeText={setDegree} placeholder="Degree" placeholderTextColor={theme.textMuted} />
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={fieldOfStudy} onChangeText={setFieldOfStudy} placeholder="Field of Study" placeholderTextColor={theme.textMuted} />
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={startDate} onChangeText={setStartDate} placeholder="Start Date (YYYY-MM)" placeholderTextColor={theme.textMuted} />
        {!isCurrent && <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={endDate} onChangeText={setEndDate} placeholder="End Date (YYYY-MM)" placeholderTextColor={theme.textMuted} />}
        <TouchableOpacity onPress={() => setIsCurrent(!isCurrent)} style={infoStyles.checkRow}>
          <MaterialCommunityIcons name={isCurrent ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={theme.primary} />
          <Text style={[infoStyles.checkLabel, { color: theme.text }]}>Currently studying</Text>
        </TouchableOpacity>
        <View style={infoStyles.subActions}>
          <TouchableOpacity onPress={onClose} style={[infoStyles.subBtn, { borderColor: theme.border }]}><Text style={[infoStyles.subBtnText, { color: theme.textSecondary }]}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => onSave({ ...education, institution, degree, fieldOfStudy, startDate, endDate: isCurrent ? undefined : endDate, isCurrent })} style={[infoStyles.subBtn, { backgroundColor: theme.primary }]}><Text style={[infoStyles.subBtnText, { color: "#FFF" }]}>Save</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function WorkModal({ work, onSave, onClose }: { work: WorkExperience; onSave: (w: WorkExperience) => void; onClose: () => void }) {
  const theme = useThemeColors();
  const [company, setCompany] = useState(work.company);
  const [title, setTitle] = useState(work.title);
  const [employmentType, setEmploymentType] = useState(work.employmentType);
  const [startDate, setStartDate] = useState(work.startDate);
  const [endDate, setEndDate] = useState(work.endDate ?? "");
  const [isCurrent, setIsCurrent] = useState(work.isCurrent);
  const [description, setDescription] = useState(work.description ?? "");
  return (
    <View style={infoStyles.subOverlay}>
      <View style={[infoStyles.subModal, { backgroundColor: theme.surface }]}>
        <Text style={[infoStyles.subTitle, { color: theme.text }]}>Work Experience</Text>
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={title} onChangeText={setTitle} placeholder="Job Title" placeholderTextColor={theme.textMuted} />
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={company} onChangeText={setCompany} placeholder="Company" placeholderTextColor={theme.textMuted} />
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={startDate} onChangeText={setStartDate} placeholder="Start Date (YYYY-MM)" placeholderTextColor={theme.textMuted} />
        {!isCurrent && <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={endDate} onChangeText={setEndDate} placeholder="End Date (YYYY-MM)" placeholderTextColor={theme.textMuted} />}
        <TextInput style={[infoStyles.input, { ...infoStyles.textArea }, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={theme.textMuted} multiline numberOfLines={2} />
        <TouchableOpacity onPress={() => setIsCurrent(!isCurrent)} style={infoStyles.checkRow}>
          <MaterialCommunityIcons name={isCurrent ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={theme.primary} />
          <Text style={[infoStyles.checkLabel, { color: theme.text }]}>Currently working here</Text>
        </TouchableOpacity>
        <View style={infoStyles.subActions}>
          <TouchableOpacity onPress={onClose} style={[infoStyles.subBtn, { borderColor: theme.border }]}><Text style={[infoStyles.subBtnText, { color: theme.textSecondary }]}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => onSave({ ...work, company, title, employmentType, startDate, endDate: isCurrent ? undefined : endDate, isCurrent, description: description || undefined })} style={[infoStyles.subBtn, { backgroundColor: theme.primary }]}><Text style={[infoStyles.subBtnText, { color: "#FFF" }]}>Save</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function CertModal({ certification, onSave, onClose }: { certification: Certification; onSave: (c: Certification) => void; onClose: () => void }) {
  const theme = useThemeColors();
  const [name, setName] = useState(certification.name);
  const [issuer, setIssuer] = useState(certification.issuer);
  const [issueDate, setIssueDate] = useState(certification.issueDate);
  const [credentialId, setCredentialId] = useState(certification.credentialId ?? "");
  const [credentialUrl, setCredentialUrl] = useState(certification.credentialUrl ?? "");
  return (
    <View style={infoStyles.subOverlay}>
      <View style={[infoStyles.subModal, { backgroundColor: theme.surface }]}>
        <Text style={[infoStyles.subTitle, { color: theme.text }]}>Certification</Text>
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={name} onChangeText={setName} placeholder="Certification Name" placeholderTextColor={theme.textMuted} />
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={issuer} onChangeText={setIssuer} placeholder="Issuer" placeholderTextColor={theme.textMuted} />
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={issueDate} onChangeText={setIssueDate} placeholder="Issue Date (YYYY-MM)" placeholderTextColor={theme.textMuted} />
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={credentialId} onChangeText={setCredentialId} placeholder="Credential ID" placeholderTextColor={theme.textMuted} />
        <TextInput style={[infoStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={credentialUrl} onChangeText={setCredentialUrl} placeholder="Credential URL" placeholderTextColor={theme.textMuted} keyboardType="url" autoCapitalize="none" />
        <View style={infoStyles.subActions}>
          <TouchableOpacity onPress={onClose} style={[infoStyles.subBtn, { borderColor: theme.border }]}><Text style={[infoStyles.subBtnText, { color: theme.textSecondary }]}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => onSave({ ...certification, name, issuer, issueDate, credentialId: credentialId || undefined, credentialUrl: credentialUrl || undefined })} style={[infoStyles.subBtn, { backgroundColor: theme.primary }]}><Text style={[infoStyles.subBtnText, { color: "#FFF" }]}>Save</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  groupHeader: {
    fontFamily: bodyFont,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },

  viewRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  viewIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  viewLabel: { fontFamily: bodyFont, fontSize: 16, fontWeight: "400", flex: 1 },
  viewValue: {
    fontFamily: bodyFont,
    fontSize: 16,
    fontWeight: "400",
    textAlign: "right",
    flexShrink: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },
  tooltip: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 44,
    justifyContent: "center",
    maxWidth: "68%",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  tooltipText: { fontFamily: bodyFont, fontSize: 13, fontWeight: "500" },

  editActions: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 16 },
  xBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  saveBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignItems: "center", minWidth: 120 },
  saveText: { color: "#FFF", fontSize: 15, fontWeight: "700" },

  editSectionLabel: { fontSize: 15, fontWeight: "700", marginTop: 20, marginBottom: 8 },
  editSubLabel: { fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  toggleLabel: { fontSize: 14, fontWeight: "600" },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1, marginBottom: 10 },
  geoRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  geoInput: { flex: 1, marginBottom: 0 },
  geoPinBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  suggestionBox: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 10 },
  suggestionRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  suggestionText: { fontSize: 14, flex: 1 },
  suggestionHint: { fontSize: 12, marginBottom: 8 },
  dateField: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateFieldText: { fontSize: 14, flex: 1 },
  datePickerWrap: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 10 },
  textArea: { minHeight: 60, textAlignVertical: "top" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  optionChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  optionChipText: { fontSize: 13, fontWeight: "600" },
  tagRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  tagInput: { flex: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, borderWidth: 1 },
  tagAddBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  tagList: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  tag: { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, gap: 4 },
  tagText: { fontSize: 12, fontWeight: "600" },
  listBlock: { marginBottom: 14 },
  listLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6, textTransform: "uppercase" },
  listItem: { flexDirection: "row", alignItems: "center", borderRadius: 10, padding: 10, marginBottom: 6 },
  listItemText: { flex: 1 },
  listItemTitle: { fontSize: 13, fontWeight: "600" },
  listItemSub: { fontSize: 11, marginTop: 2 },
  addItemBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", padding: 10 },
  addItemText: { fontSize: 12, fontWeight: "600" },

  subOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.6)" },
  subModal: { width: "100%", borderRadius: 20, padding: 20, maxWidth: 400 },
  subTitle: { fontSize: 17, fontWeight: "700", marginBottom: 16 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  checkLabel: { fontSize: 13, fontWeight: "500" },
  subActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  subBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 10 },
  subBtnText: { fontSize: 13, fontWeight: "600" },
});
