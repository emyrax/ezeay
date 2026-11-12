import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamily } from "../../constants/themes";
import { useThemeColors } from "../../hooks/useTheme";
import { withAlpha } from "../../lib/color";
import type {
  Certification,
  Education,
  UserProfile,
  WorkExperience,
} from "../../types/user";
import type { ProfileIconName } from "./types";
import { formatProfileDate, getSkillLevel } from "./profileUtils";
import { createShadow } from "@/lib/shadow";

interface Props {
  profile: UserProfile | null;
  wide?: boolean;
  onEdit: () => void;
}

function SectionCard({
  title,
  icon,
  count,
  children,
  tone,
}: {
  title: string;
  icon: ProfileIconName;
  count?: number;
  children: React.ReactNode;
  tone?: string;
}) {
  const theme = useThemeColors();
  const color = tone ?? theme.primary;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.borderLight },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View
            style={[
              styles.cardIcon,
              { backgroundColor: withAlpha(color, 0.14) },
            ]}
          >
            <MaterialCommunityIcons name={icon} size={16} color={color} />
          </View>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        </View>
        {typeof count === "number" ? (
          <View
            style={[
              styles.countPill,
              { backgroundColor: withAlpha(color, 0.12) },
            ]}
          >
            <Text style={[styles.countText, { color }]}>{count}</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function SkillChip({ name, color }: { name: string; color: string }) {
  const theme = useThemeColors();
  const level = getSkillLevel(name);
  return (
    <View
      style={[
        styles.skillChip,
        {
          backgroundColor: theme.surfaceAlt,
          borderColor: theme.borderLight,
        },
      ]}
    >
      <Text style={[styles.skillName, { color: theme.text }]} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.dots}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i <= level ? color : withAlpha(color, 0.18),
                width: i <= level ? 7 : 5,
                height: i <= level ? 7 : 5,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function TimelineItem({
  title,
  subtitle,
  period,
  description,
  color,
  icon,
  last,
}: {
  title: string;
  subtitle: string;
  period: string;
  description?: string;
  color: string;
  icon: ProfileIconName;
  last?: boolean;
}) {
  const theme = useThemeColors();
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { backgroundColor: color }]} />
        {!last ? (
          <View
            style={[
              styles.timelineLine,
              { backgroundColor: withAlpha(color, 0.22) },
            ]}
          />
        ) : null}
      </View>
      <View style={styles.timelineBody}>
        <View style={styles.timelineTitleRow}>
          <MaterialCommunityIcons name={icon} size={14} color={color} />
          <Text
            style={[styles.timelineTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        <Text
          style={[styles.timelineSubtitle, { color: theme.textSecondary }]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
        <Text style={[styles.timelinePeriod, { color: theme.textMuted }]}>
          {period}
        </Text>
        {description ? (
          <Text
            style={[styles.timelineDescription, { color: theme.textSecondary }]}
            numberOfLines={2}
          >
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function ProfileSkillsPanel({
  profile,
  wide = false,
  onEdit,
}: Props) {
  const theme = useThemeColors();
  const skills = profile?.skills ?? [];
  const tradeSkills = profile?.tradeSkills ?? [];
  const experience = profile?.workExperience ?? [];
  const education = profile?.education ?? [];
  const certifications = profile?.certifications ?? [];
  const isEmpty =
    skills.length === 0 &&
    tradeSkills.length === 0 &&
    experience.length === 0 &&
    education.length === 0 &&
    certifications.length === 0;

  if (isEmpty) {
    return (
      <View
        style={[
          styles.emptyCard,
          { backgroundColor: theme.surface, borderColor: theme.borderLight },
        ]}
      >
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: withAlpha(theme.primary, 0.14) },
          ]}
        >
          <MaterialCommunityIcons
            name="briefcase-variant-outline"
            size={28}
            color={theme.primary}
          />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          Show what you know
        </Text>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          Add skills, work experience, education and certifications to build a
          profile that stands out.
        </Text>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [
            styles.emptyBtn,
            { backgroundColor: theme.primary },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add skills and experience"
        >
          <MaterialCommunityIcons
            name="plus"
            size={16}
            color="#FFFFFF"
          />
          <Text style={styles.emptyBtnText}>Add details</Text>
        </Pressable>
      </View>
    );
  }

  const skillsSection =
    skills.length > 0 ? (
      <SectionCard
        title="Skills"
        icon="lightning-bolt-outline"
        count={skills.length}
      >
        <View style={styles.chipsWrap}>
          {skills.map((skill) => (
            <SkillChip key={skill} name={skill} color={theme.primary} />
          ))}
        </View>
      </SectionCard>
    ) : null;

  const tradeSection =
    tradeSkills.length > 0 ? (
      <SectionCard
        title="Trade skills"
        icon="tools"
        count={tradeSkills.length}
        tone={theme.accent}
      >
        <View style={styles.chipsWrap}>
          {tradeSkills.map((skill) => (
            <SkillChip key={skill} name={skill} color={theme.accent} />
          ))}
        </View>
        {profile?.yearsOfTradeExperience ? (
          <Text style={[styles.tradeYears, { color: theme.textMuted }]}>
            {profile.yearsOfTradeExperience}{" "}
            {profile.yearsOfTradeExperience === 1 ? "year" : "years"} of
            hands-on experience
          </Text>
        ) : null}
      </SectionCard>
    ) : null;

  const experienceSection =
    experience.length > 0 ? (
      <SectionCard
        title="Experience"
        icon="briefcase-outline"
        count={experience.length}
      >
        {experience.map((exp: WorkExperience, index) => (
          <TimelineItem
            key={exp.id}
            title={exp.company}
            subtitle={exp.title}
            period={`${formatProfileDate(exp.startDate)} — ${
              exp.isCurrent ? "Present" : formatProfileDate(exp.endDate)
            }`}
            description={exp.description}
            color={theme.primary}
            icon="briefcase"
            last={index === experience.length - 1}
          />
        ))}
      </SectionCard>
    ) : null;

  const educationSection =
    education.length > 0 ? (
      <SectionCard
        title="Education"
        icon="school-outline"
        count={education.length}
        tone={theme.accent}
      >
        {education.map((edu: Education, index) => (
          <TimelineItem
            key={edu.id}
            title={edu.institution}
            subtitle={`${edu.degree}${
              edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ""
            }`}
            period={`${formatProfileDate(edu.startDate)} — ${
              edu.isCurrent ? "Present" : formatProfileDate(edu.endDate)
            }`}
            description={edu.description}
            color={theme.accent}
            icon="school"
            last={index === education.length - 1}
          />
        ))}
      </SectionCard>
    ) : null;

  const certificationsSection =
    certifications.length > 0 ? (
      <SectionCard
        title="Certifications"
        icon="certificate-outline"
        count={certifications.length}
        tone={theme.warning}
      >
        <View style={styles.certList}>
          {certifications.map((cert: Certification) => (
            <View
              key={cert.id}
              style={[
                styles.certRow,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.borderLight,
                },
              ]}
            >
              <View
                style={[
                  styles.certIcon,
                  { backgroundColor: withAlpha(theme.warning, 0.14) },
                ]}
              >
                <MaterialCommunityIcons
                  name="certificate"
                  size={16}
                  color={theme.warning}
                />
              </View>
              <View style={styles.certInfo}>
                <Text
                  style={[styles.certName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {cert.name}
                </Text>
                <Text
                  style={[styles.certIssuer, { color: theme.textMuted }]}
                  numberOfLines={1}
                >
                  {cert.issuer}
                  {cert.issueDate
                    ? ` · ${formatProfileDate(cert.issueDate)}`
                    : ""}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </SectionCard>
    ) : null;

  if (!wide) {
    return (
      <View style={styles.stack}>
        {skillsSection}
        {tradeSection}
        {experienceSection}
        {educationSection}
        {certificationsSection}
      </View>
    );
  }

  return (
    <View style={styles.columns}>
      <View style={styles.column}>
        {skillsSection}
        {experienceSection}
        {certificationsSection}
      </View>
      <View style={styles.column}>
        {tradeSection}
        {educationSection}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  columns: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  column: {
    flex: 1,
    minWidth: 0,
    gap: 14,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    ...createShadow("#000", 0, 10, 18, 0.08),
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flexShrink: 1,
  },
  cardIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily,
    flexShrink: 1,
  },
  countPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 11,
    fontWeight: "800",
    fontFamily,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  skillName: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily,
    maxWidth: 150,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  dot: {
    borderRadius: 4,
  },
  tradeYears: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily,
    marginTop: 12,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 10,
  },
  timelineRail: {
    width: 10,
    alignItems: "center",
  },
  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 5,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    minHeight: 18,
    borderRadius: 1,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: 16,
    minWidth: 0,
  },
  timelineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily,
    flexShrink: 1,
  },
  timelineSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily,
    marginBottom: 2,
  },
  timelinePeriod: {
    fontSize: 11,
    fontWeight: "500",
    fontFamily,
  },
  timelineDescription: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily,
    marginTop: 4,
  },
  certList: {
    gap: 8,
  },
  certRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  certIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  certInfo: {
    flex: 1,
    minWidth: 0,
  },
  certName: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily,
  },
  certIssuer: {
    fontSize: 11,
    fontWeight: "500",
    fontFamily,
    marginTop: 1,
  },
  emptyCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    ...createShadow("#000", 0, 12, 20, 0.1),
    elevation: 6,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    fontFamily,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily,
    textAlign: "center",
    maxWidth: 340,
    marginBottom: 18,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  emptyBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    fontFamily,
  },
  pressed: {
    opacity: 0.85,
  },
});
