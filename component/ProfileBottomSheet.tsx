import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeColors } from "../hooks/useTheme";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { useUserStore } from "../store/userStore";
import type { Education, WorkExperience, Certification, CollarType, Availability, UserProfile } from "../types/user";

const COLLAR_OPTIONS: { value: CollarType; label: string }[] = [
  { value: "white", label: "White Collar" },
  { value: "yellow", label: "Yellow Collar" },
  { value: "both", label: "Both" },
];

const AVAILABILITY_LABELS: Record<string, string> = { open_to_work: "Open to Work", open_to_learn: "Open to Learn", open_to_mentor: "Open to Mentor", not_looking: "Not Looking" };

const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: "open_to_work", label: "Open to Work" },
  { value: "open_to_learn", label: "Open to Learn" },
  { value: "open_to_mentor", label: "Open to Mentor" },
  { value: "not_looking", label: "Not Looking" },
];

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ViewRow({
  icon, label, value, theme,
}: {
  icon: string; label: string; value?: string | number | null; theme: ReturnType<typeof useThemeColors>;
}) {
  const filled = value !== null && value !== undefined && value !== "";
  return (
    <View style={bsStyles.viewRow}>
      <View style={bsStyles.viewLabelRow}>
        <MaterialCommunityIcons name={icon as any} size={18} color={theme.textMuted} />
        <Text style={[bsStyles.viewLabel, { color: theme.textMuted }]}>{label}</Text>
      </View>
      <Text style={[bsStyles.viewValue, { color: filled ? theme.text : theme.textMuted }]} numberOfLines={1}>
        {filled ? value : "—"}
      </Text>
    </View>
  );
}

export default function ProfileBottomSheet({ visible, onClose, profile }: { visible: boolean; onClose: () => void; profile: UserProfile }) {
  const theme = useThemeColors();
  const { getToken } = useAuth();
  const setProfile = useUserStore((s) => s.setProfile);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [linkedInUrl, setLinkedInUrl] = useState(profile.linkedInUrl ?? "");
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

  function addSkill() { const v = skillInput.trim(); if (v && !skills.includes(v)) setSkills([...skills, v]); setSkillInput(""); }
  function addLanguage() { const v = languageInput.trim(); if (v && !languages.includes(v)) setLanguages([...languages, v]); setLanguageInput(""); }
  function addInterest() { const v = interestInput.trim(); if (v && !interests.includes(v)) setInterests([...interests, v]); setInterestInput(""); }
  function addTradeSkill() { const v = tradeSkillInput.trim(); if (v && !tradeSkills.includes(v)) setTradeSkills([...tradeSkills, v]); setTradeSkillInput(""); }

  async function handleSave() {
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) { Alert.alert("Error", "Not authenticated"); return; }
      const data: Record<string, unknown> = {
        displayName: displayName || null, headline: headline || null, bio: bio || null,
        location: location || null, website: website || null, linkedInUrl: linkedInUrl || null,
        department: department || null,
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
      setProfile({
        ...profile, displayName: displayName || null, headline: headline || undefined, bio: bio || undefined,
        location: location || undefined, website: website || undefined, linkedInUrl: linkedInUrl || undefined,
        department: department || undefined,
        collarType: collarType ?? undefined, availability: availability ?? undefined,
        industry: industry || undefined, jobTitle: jobTitle || undefined, company: company || undefined,
        education, workExperience, tradeSkills, certifications,
        yearsOfTradeExperience: yearsOfTradeExperience ? Number(yearsOfTradeExperience) : undefined,
        skills, languages, interests,
      });
      setEditMode(false);
      onClose();
    } catch (err: any) {
      Alert.alert("Save Failed", err.message ?? "Something went wrong");
    } finally { setSaving(false); }
  }

  function renderTagInput(
    items: string[], input: string, setInput: (v: string) => void, onAdd: () => void,
    onRemove: (i: number) => void, placeholder: string,
  ) {
    return (
      <View>
        <View style={bsStyles.tagRow}>
          <TextInput style={[bsStyles.tagInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={input} onChangeText={setInput} placeholder={placeholder} placeholderTextColor={theme.textMuted} onSubmitEditing={onAdd} returnKeyType="done" />
          <TouchableOpacity style={[bsStyles.tagAddBtn, { backgroundColor: theme.primary }]} onPress={onAdd}>
            <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
        {items.length > 0 && (
          <View style={bsStyles.tagList}>
            {items.map((item, i) => (
              <View key={i} style={[bsStyles.tag, { backgroundColor: theme.primary + "20" }]}>
                <Text style={[bsStyles.tagText, { color: theme.text }]}>{item}</Text>
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

  function renderCollarFields() {
    if (!collarType) return null;
    const showWhite = collarType === "white" || collarType === "both";
    const showYellow = collarType === "yellow" || collarType === "both";
    return (
      <>
        {showWhite && (
          <>
            <Text style={[bsStyles.sectionLabel, { color: theme.text }]}>Professional Info</Text>
            <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={jobTitle} onChangeText={setJobTitle} placeholder="Job Title" placeholderTextColor={theme.textMuted} />
            <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={company} onChangeText={setCompany} placeholder="Company" placeholderTextColor={theme.textMuted} />
            <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={industry} onChangeText={setIndustry} placeholder="Industry" placeholderTextColor={theme.textMuted} />
            <View style={bsStyles.listBlock}>
              <Text style={[bsStyles.listLabel, { color: theme.textSecondary }]}>Education</Text>
              {education.map((edu, i) => (
                <View key={edu.id} style={[bsStyles.listItem, { backgroundColor: theme.surfaceAlt }]}>
                  <View style={bsStyles.listItemText}>
                    <Text style={[bsStyles.listItemTitle, { color: theme.text }]}>{edu.institution}</Text>
                    <Text style={[bsStyles.listItemSub, { color: theme.textMuted }]}>{edu.degree} in {edu.fieldOfStudy}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setEducation(education.filter((_, j) => j !== i))}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[bsStyles.addItemBtn, { borderColor: theme.border }]} onPress={() => setEditingEducation({ id: generateId(), institution: "", degree: "", fieldOfStudy: "", startDate: "", isCurrent: false })}>
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={theme.primary} />
                <Text style={[bsStyles.addItemText, { color: theme.primary }]}>Add Education</Text>
              </TouchableOpacity>
            </View>
            <View style={bsStyles.listBlock}>
              <Text style={[bsStyles.listLabel, { color: theme.textSecondary }]}>Work Experience</Text>
              {workExperience.map((exp, i) => (
                <View key={exp.id} style={[bsStyles.listItem, { backgroundColor: theme.surfaceAlt }]}>
                  <View style={bsStyles.listItemText}>
                    <Text style={[bsStyles.listItemTitle, { color: theme.text }]}>{exp.title}</Text>
                    <Text style={[bsStyles.listItemSub, { color: theme.textMuted }]}>{exp.company}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setWorkExperience(workExperience.filter((_, j) => j !== i))}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[bsStyles.addItemBtn, { borderColor: theme.border }]} onPress={() => setEditWork({ id: generateId(), company: "", title: "", employmentType: "full-time", startDate: "", isCurrent: false })}>
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={theme.primary} />
                <Text style={[bsStyles.addItemText, { color: theme.primary }]}>Add Experience</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        {showYellow && (
          <>
            <Text style={[bsStyles.sectionLabel, { color: theme.text }]}>Trade / Craft Info</Text>
            {renderTagInput(tradeSkills, tradeSkillInput, setTradeSkillInput, addTradeSkill, (i) => setTradeSkills(tradeSkills.filter((_, j) => j !== i)), "Add trade skill")}
            <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={yearsOfTradeExperience} onChangeText={setYearsOfTradeExperience} placeholder="Years of experience" placeholderTextColor={theme.textMuted} keyboardType="number-pad" />
            <View style={bsStyles.listBlock}>
              <Text style={[bsStyles.listLabel, { color: theme.textSecondary }]}>Certifications</Text>
              {certifications.map((cert, i) => (
                <View key={cert.id} style={[bsStyles.listItem, { backgroundColor: theme.surfaceAlt }]}>
                  <View style={bsStyles.listItemText}>
                    <Text style={[bsStyles.listItemTitle, { color: theme.text }]}>{cert.name}</Text>
                    <Text style={[bsStyles.listItemSub, { color: theme.textMuted }]}>{cert.issuer}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setCertifications(certifications.filter((_, j) => j !== i))}>
                    <MaterialCommunityIcons name="delete-outline" size={20} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={[bsStyles.addItemBtn, { borderColor: theme.border }]} onPress={() => setEditCert({ id: generateId(), name: "", issuer: "", issueDate: "" })}>
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={theme.primary} />
                <Text style={[bsStyles.addItemText, { color: theme.primary }]}>Add Certification</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={bsStyles.backdrop} onPress={onClose}>
        <Pressable style={[bsStyles.sheet, { backgroundColor: theme.surface }]} onPress={() => {}}>
          <View style={[bsStyles.handle, { backgroundColor: theme.textMuted + "30" }]} />

          <View style={bsStyles.header}>
            <Text style={[bsStyles.headerTitle, { color: theme.text }]}>
              {editMode ? "Edit Profile" : "Profile Details"}
            </Text>
            <View style={bsStyles.headerActions}>
              {editMode ? (
                <TouchableOpacity onPress={() => setEditMode(false)} hitSlop={8}>
                  <Text style={[bsStyles.cancelText, { color: theme.primary }]}>Cancel</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setEditMode(true)} hitSlop={8}>
                  <MaterialCommunityIcons name="pencil" size={20} color={theme.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {editMode ? (
            <ScrollView showsVerticalScrollIndicator={false} style={bsStyles.scroll}>
              <Text style={[bsStyles.sectionLabel, { color: theme.text }]}>Basic Info</Text>
              <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={displayName} onChangeText={setDisplayName} placeholder="Display Name" placeholderTextColor={theme.textMuted} />
              <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={headline} onChangeText={setHeadline} placeholder="Professional Headline" placeholderTextColor={theme.textMuted} />
              <TextInput style={[bsStyles.input, { ...bsStyles.textArea }, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={bio} onChangeText={setBio} placeholder="Bio" placeholderTextColor={theme.textMuted} multiline numberOfLines={3} />
              <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={location} onChangeText={setLocation} placeholder="Location" placeholderTextColor={theme.textMuted} />
              <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={department} onChangeText={setDepartment} placeholder="Department" placeholderTextColor={theme.textMuted} />
              <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={website} onChangeText={setWebsite} placeholder="Website URL" placeholderTextColor={theme.textMuted} keyboardType="url" autoCapitalize="none" />
              <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={linkedInUrl} onChangeText={setLinkedInUrl} placeholder="LinkedIn URL" placeholderTextColor={theme.textMuted} keyboardType="url" autoCapitalize="none" />

              <Text style={[bsStyles.sectionLabel, { color: theme.text }]}>Collar Type</Text>
              <View style={bsStyles.optionRow}>
                {COLLAR_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt.value} style={[bsStyles.optionChip, { borderColor: collarType === opt.value ? theme.primary : theme.border }, collarType === opt.value && { backgroundColor: theme.primary + "20" }]} onPress={() => setCollarType(opt.value)}>
                    <Text style={[bsStyles.optionChipText, { color: collarType === opt.value ? theme.primary : theme.textMuted }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {renderCollarFields()}

              <Text style={[bsStyles.sectionLabel, { color: theme.text }]}>Availability</Text>
              <View style={bsStyles.optionRow}>
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt.value} style={[bsStyles.optionChip, { borderColor: availability === opt.value ? theme.primary : theme.border }, availability === opt.value && { backgroundColor: theme.primary + "20" }]} onPress={() => setAvailability(opt.value)}>
                    <Text style={[bsStyles.optionChipText, { color: availability === opt.value ? theme.primary : theme.textMuted }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[bsStyles.sectionLabel, { color: theme.text }]}>Skills</Text>
              {renderTagInput(skills, skillInput, setSkillInput, addSkill, (i) => setSkills(skills.filter((_, j) => j !== i)), "Add a skill")}

              <Text style={[bsStyles.sectionLabel, { color: theme.text }]}>Languages</Text>
              {renderTagInput(languages, languageInput, setLanguageInput, addLanguage, (i) => setLanguages(languages.filter((_, j) => j !== i)), "Add a language")}

              <Text style={[bsStyles.sectionLabel, { color: theme.text }]}>Interests</Text>
              {renderTagInput(interests, interestInput, setInterestInput, addInterest, (i) => setInterests(interests.filter((_, j) => j !== i)), "Add an interest")}

              <TouchableOpacity style={[bsStyles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={bsStyles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={bsStyles.scroll}>
              <View style={[bsStyles.sectionCard, { borderColor: theme.borderLight }]}>
                <Text style={[bsStyles.sectionTitle, { color: theme.text }]}>Basic Info</Text>
                <ViewRow icon="account" label="Name" value={profile.displayName || profile.email?.split("@")[0] || "Scholar"} theme={theme} />
                <ViewRow icon="card-text" label="Headline" value={profile.headline} theme={theme} />
                <ViewRow icon="text" label="Bio" value={profile.bio} theme={theme} />
                <ViewRow icon="map-marker" label="Location" value={profile.location} theme={theme} />
                <ViewRow icon="layers" label="Department" value={profile.department} theme={theme} />
                <ViewRow icon="link" label="Website" value={profile.website} theme={theme} />
                <ViewRow icon="linkedin" label="LinkedIn" value={profile.linkedInUrl ? "View Profile" : undefined} theme={theme} />
              </View>

              <View style={[bsStyles.sectionCard, { borderColor: theme.borderLight }]}>
                <Text style={[bsStyles.sectionTitle, { color: theme.text }]}>Professional Info</Text>
                <ViewRow icon="domain" label="Industry" value={profile.industry} theme={theme} />
                <ViewRow icon="briefcase" label="Job Title" value={profile.jobTitle} theme={theme} />
                <ViewRow icon="domain" label="Company" value={profile.company} theme={theme} />
                <ViewRow icon="tie" label="Collar Type" value={profile.collarType ? profile.collarType.replace("_", " ") : undefined} theme={theme} />
              </View>

              <View style={[bsStyles.sectionCard, { borderColor: theme.borderLight }]}>
                <Text style={[bsStyles.sectionTitle, { color: theme.text }]}>Availability</Text>
                <ViewRow icon="checkbox-marked-circle" label="Status" value={profile.availability ? AVAILABILITY_LABELS[profile.availability] || profile.availability : undefined} theme={theme} />
              </View>

              <View style={[bsStyles.sectionCard, { borderColor: theme.borderLight }]}>
                <Text style={[bsStyles.sectionTitle, { color: theme.text }]}>Account</Text>
                <ViewRow icon="email" label="Email" value={profile.email} theme={theme} />
                <ViewRow icon="cake" label="Birthday" value={profile.birthday ? new Date(profile.birthday).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : undefined} theme={theme} />
                <ViewRow icon="calendar" label="Member Since" value={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Unknown"} theme={theme} />
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}

          {/* Education sub-modal */}
          <Modal visible={!!editingEducation} transparent animationType="fade">
            {editingEducation && (
              <EducationModal
                education={editingEducation}
                onSave={(edu) => {
                  const idx = education.findIndex((e) => e.id === edu.id);
                  if (idx >= 0) { const u = [...education]; u[idx] = edu; setEducation(u); }
                  else setEducation([...education, edu]);
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
                  if (idx >= 0) { const u = [...workExperience]; u[idx] = w; setWorkExperience(u); }
                  else setWorkExperience([...workExperience, w]);
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
                  if (idx >= 0) { const u = [...certifications]; u[idx] = c; setCertifications(u); }
                  else setCertifications([...certifications, c]);
                  setEditCert(null);
                }}
                onClose={() => setEditCert(null)}
              />
            )}
          </Modal>
        </Pressable>
      </Pressable>
    </Modal>
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
    <View style={[bsStyles.subOverlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
      <View style={[bsStyles.subModal, { backgroundColor: theme.surface }]}>
        <Text style={[bsStyles.subTitle, { color: theme.text }]}>Education</Text>
        <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={institution} onChangeText={setInstitution} placeholder="Institution" placeholderTextColor={theme.textMuted} />
        <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={degree} onChangeText={setDegree} placeholder="Degree" placeholderTextColor={theme.textMuted} />
        <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={fieldOfStudy} onChangeText={setFieldOfStudy} placeholder="Field of Study" placeholderTextColor={theme.textMuted} />
        <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={startDate} onChangeText={setStartDate} placeholder="Start Date (YYYY-MM)" placeholderTextColor={theme.textMuted} />
        {!isCurrent && <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={endDate} onChangeText={setEndDate} placeholder="End Date (YYYY-MM)" placeholderTextColor={theme.textMuted} />}
        <TouchableOpacity onPress={() => setIsCurrent(!isCurrent)} style={bsStyles.checkRow}>
          <MaterialCommunityIcons name={isCurrent ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={theme.primary} />
          <Text style={[bsStyles.checkLabel, { color: theme.text }]}>Currently studying</Text>
        </TouchableOpacity>
        <View style={bsStyles.subActions}>
          <TouchableOpacity onPress={onClose} style={[bsStyles.subBtn, { borderColor: theme.border }]}><Text style={[bsStyles.subBtnText, { color: theme.textSecondary }]}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => onSave({ ...education, institution, degree, fieldOfStudy, startDate, endDate: isCurrent ? undefined : endDate, isCurrent })} style={[bsStyles.subBtn, { backgroundColor: theme.primary }]}><Text style={[bsStyles.subBtnText, { color: "#FFF" }]}>Save</Text></TouchableOpacity>
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
    <View style={[bsStyles.subOverlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
      <View style={[bsStyles.subModal, { backgroundColor: theme.surface }]}>
        <Text style={[bsStyles.subTitle, { color: theme.text }]}>Work Experience</Text>
        <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={title} onChangeText={setTitle} placeholder="Job Title" placeholderTextColor={theme.textMuted} />
        <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={company} onChangeText={setCompany} placeholder="Company" placeholderTextColor={theme.textMuted} />
        <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={startDate} onChangeText={setStartDate} placeholder="Start Date (YYYY-MM)" placeholderTextColor={theme.textMuted} />
        {!isCurrent && <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={endDate} onChangeText={setEndDate} placeholder="End Date (YYYY-MM)" placeholderTextColor={theme.textMuted} />}
        <TextInput style={[bsStyles.input, { ...bsStyles.textArea }, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={theme.textMuted} multiline numberOfLines={2} />
        <TouchableOpacity onPress={() => setIsCurrent(!isCurrent)} style={bsStyles.checkRow}>
          <MaterialCommunityIcons name={isCurrent ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={theme.primary} />
          <Text style={[bsStyles.checkLabel, { color: theme.text }]}>Currently working here</Text>
        </TouchableOpacity>
        <View style={bsStyles.subActions}>
          <TouchableOpacity onPress={onClose} style={[bsStyles.subBtn, { borderColor: theme.border }]}><Text style={[bsStyles.subBtnText, { color: theme.textSecondary }]}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => onSave({ ...work, company, title, employmentType, startDate, endDate: isCurrent ? undefined : endDate, isCurrent, description: description || undefined })} style={[bsStyles.subBtn, { backgroundColor: theme.primary }]}><Text style={[bsStyles.subBtnText, { color: "#FFF" }]}>Save</Text></TouchableOpacity>
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
    <View style={[bsStyles.subOverlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
      <View style={[bsStyles.subModal, { backgroundColor: theme.surface }]}>
        <Text style={[bsStyles.subTitle, { color: theme.text }]}>Certification</Text>
        <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={name} onChangeText={setName} placeholder="Certification Name" placeholderTextColor={theme.textMuted} />
        <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={issuer} onChangeText={setIssuer} placeholder="Issuer" placeholderTextColor={theme.textMuted} />
        <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={issueDate} onChangeText={setIssueDate} placeholder="Issue Date (YYYY-MM)" placeholderTextColor={theme.textMuted} />
        <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={credentialId} onChangeText={setCredentialId} placeholder="Credential ID" placeholderTextColor={theme.textMuted} />
        <TextInput style={[bsStyles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceAlt }]} value={credentialUrl} onChangeText={setCredentialUrl} placeholder="Credential URL" placeholderTextColor={theme.textMuted} keyboardType="url" autoCapitalize="none" />
        <View style={bsStyles.subActions}>
          <TouchableOpacity onPress={onClose} style={[bsStyles.subBtn, { borderColor: theme.border }]}><Text style={[bsStyles.subBtnText, { color: theme.textSecondary }]}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => onSave({ ...certification, name, issuer, issueDate, credentialId: credentialId || undefined, credentialUrl: credentialUrl || undefined })} style={[bsStyles.subBtn, { backgroundColor: theme.primary }]}><Text style={[bsStyles.subBtnText, { color: "#FFF" }]}>Save</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const bsStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, maxHeight: "90%" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  cancelText: { fontSize: 15, fontWeight: "600" },
  scroll: { paddingBottom: 20 },

  sectionCard: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },

  viewRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingVertical: 18, gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  viewLabelRow: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 120 },
  viewLabel: { fontSize: 16, fontWeight: "600" },
  viewValue: { flex: 1, fontSize: 16, fontWeight: "500", textAlign: "right" },

  sectionLabel: { fontSize: 15, fontWeight: "700", marginTop: 20, marginBottom: 8 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1, marginBottom: 10 },
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
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  subOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  subModal: { width: "100%", borderRadius: 20, padding: 20, maxWidth: 400 },
  subTitle: { fontSize: 17, fontWeight: "700", marginBottom: 16 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  checkLabel: { fontSize: 13, fontWeight: "500" },
  subActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  subBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 10 },
  subBtnText: { fontSize: 13, fontWeight: "600" },
});
