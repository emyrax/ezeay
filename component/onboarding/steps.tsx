import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  DEGREE_OPTIONS,
  GOALS,
  MAX_GOALS,
  MAX_SUBJECTS,
  SCHOOL_TYPES,
  SUBJECTS,
  getGradeOptions,
  getSchoolTypeLabel,
  getSchoolTypeOption,
} from "../../data/onboarding";
import {
  findAfricanCountry,
} from "../../data/countries";
import { images } from "../../constants/images";
import {
  landingColors,
  landingFonts,
  landingRadii,
} from "../../constants/landing";
import { parseBirthdayDate, uniqueStrings } from "../../lib/onboarding/steps";
import type {
  OnboardingAnswers,
  OnboardingErrors,
  OnboardingStep,
} from "../../types/onboarding";
import CountryFlag from "./CountryFlag";
import {
  ChoiceCard,
  InlineError,
  SelectionCount,
  SelectChip,
  StepHeader,
  TextField,
} from "./primitives";

export interface StepContentProps {
  step: OnboardingStep;
  answers: OnboardingAnswers;
  errors: OnboardingErrors;
  setAnswer: <K extends keyof OnboardingAnswers>(
    key: K,
    value: OnboardingAnswers[K],
  ) => void;
  setAnswers: (updates: Partial<OnboardingAnswers>) => void;
  onOpenCountry: () => void;
  onSignIn: () => void;
  isSignedIn: boolean;
  email?: string | null;
}

export function OnboardingStepContent(props: StepContentProps) {
  switch (props.step.id) {
    case "welcome":
      return <WelcomeStep {...props} />;
    case "name":
      return <NameStep {...props} />;
    case "birthday":
      return <BirthdayStep {...props} />;
    case "country":
      return <CountryStep {...props} />;
    case "region":
      return <RegionStep {...props} />;
    case "schoolType":
      return <SchoolTypeStep {...props} />;
    case "school":
      return <SchoolStep {...props} />;
    case "grade":
      return <GradeStep {...props} />;
    case "degree":
      return <DegreeStep {...props} />;
    case "subjects":
      return <SubjectsStep {...props} />;
    case "goals":
      return <GoalsStep {...props} />;
    case "ready":
      return <ReadyStep {...props} />;
    default:
      return null;
  }
}

function WelcomeStep({ step, onSignIn }: StepContentProps) {
  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      <View style={styles.welcomeVisual}>
        <View style={styles.welcomeGlow} />
        <Image
          source={images.researching}
          style={styles.welcomeImage}
          contentFit="contain"
        />
      </View>
      <View style={styles.bulletList}>
        <Bullet icon="map-marker-radius-outline" text="Built around where you learn." />
        <Bullet icon="target" text="Quests that match your goals, not a generic feed." />
        <Bullet icon="chart-timeline-variant" text="Progress you can actually see." />
      </View>
      <Pressable onPress={onSignIn} style={styles.textLink} accessibilityRole="button">
        <Text style={styles.textLinkText}>
          I already have an account
        </Text>
        <MaterialCommunityIcons
          name="arrow-right"
          size={15}
          color={landingColors.blueSoft}
        />
      </Pressable>
    </View>
  );
}

function Bullet({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletIcon}>
        <MaterialCommunityIcons
          name={icon as never}
          size={17}
          color={landingColors.blueSoft}
        />
      </View>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function NameStep({ step, answers, errors, setAnswer }: StepContentProps) {
  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      <TextField
        label="Your name"
        value={answers.displayName}
        onChangeText={(value) => setAnswer("displayName", value)}
        placeholder="e.g. Amara"
        autoFocus
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
        maxLength={40}
        error={errors.displayName}
      />
      <Text style={styles.helperText}>
        You can change this later in your profile.
      </Text>
    </View>
  );
}

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function BirthdayStep({ step, answers, errors, setAnswer }: StepContentProps) {
  const [showPicker, setShowPicker] = useState(false);
  const parsed = parseBirthdayDate(answers.birthday);
  const isWeb = Platform.OS === "web";

  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      {isWeb ? (
        <TextField
          label="Date of birth"
          value={answers.birthday}
          onChangeText={(value) => setAnswer("birthday", value)}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          error={errors.birthday}
        />
      ) : (
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Date of birth</Text>
          <Pressable
            onPress={() => setShowPicker(true)}
            style={[styles.pickerField, errors.birthday && styles.inputError]}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.pickerFieldText,
                !parsed && { color: landingColors.textSubtle },
              ]}
            >
              {parsed
                ? parsed.toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "Choose your birthday"}
            </Text>
            <MaterialCommunityIcons
              name="calendar-month"
              size={19}
              color={landingColors.textSubtle}
            />
          </Pressable>
          {errors.birthday ? (
            <Text style={styles.errorTextInline}>{errors.birthday}</Text>
          ) : null}
          {showPicker ? (
            <View style={styles.datePickerWrap}>
              <DateTimePicker
                value={parsed ?? new Date(2005, 0, 1)}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()}
                onValueChange={(_event, selected) => {
                  if (Platform.OS === "android") setShowPicker(false);
                  if (selected) setAnswer("birthday", toYmd(selected));
                }}
                onDismiss={() => setShowPicker(false)}
              />
              {Platform.OS === "ios" ? (
                <Pressable
                  onPress={() => setShowPicker(false)}
                  style={styles.dateDone}
                >
                  <Text style={styles.dateDoneText}>Done</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      )}
      <Text style={styles.helperText}>
        Yuinx is for learners {13} and older. We only use this to keep your
        experience age-appropriate.
      </Text>
    </View>
  );
}

function CountryStep({ step, answers, errors, onOpenCountry }: StepContentProps) {
  const country = findAfricanCountry(answers.country);
  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      <Pressable
        onPress={onOpenCountry}
        style={({ pressed }) => [
          styles.countryButton,
          errors.country && styles.inputError,
          pressed && { opacity: 0.85 },
        ]}
        accessibilityRole="button"
      >
        {country ? (
          <>
            <CountryFlag country={country} size={46} />
            <View style={styles.countryButtonText}>
              <Text style={styles.countryButtonLabel}>Selected country</Text>
              <Text style={styles.countryButtonValue}>{country.name}</Text>
            </View>
            <Text style={styles.changeText}>Change</Text>
          </>
        ) : (
          <>
            <View style={styles.countryPlaceholderIcon}>
              <MaterialCommunityIcons
                name="earth"
                size={24}
                color={landingColors.blueSoft}
              />
            </View>
            <View style={styles.countryButtonText}>
              <Text style={styles.countryButtonValue}>Choose your country</Text>
              <Text style={styles.countryButtonLabel}>
                All 54 African countries
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={landingColors.textSubtle}
            />
          </>
        )}
      </Pressable>
      <InlineError message={errors.country} />
      <Text style={styles.helperText}>
        We use your country to make examples, courses, and opportunities feel
        relevant to where you are.
      </Text>
    </View>
  );
}

function RegionStep({ step, answers, errors, setAnswer }: StepContentProps) {
  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      <TextField
        label="Region or city"
        value={answers.region}
        onChangeText={(value) => setAnswer("region", value)}
        placeholder="e.g. Lagos, Nairobi, Accra"
        autoCapitalize="words"
        returnKeyType="next"
        maxLength={80}
        error={errors.form}
      />
      <Text style={styles.helperText}>
        Optional. This helps us tune examples without needing your exact
        address.
      </Text>
    </View>
  );
}

function SchoolTypeStep({ step, answers, errors, setAnswer }: StepContentProps) {
  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      <View style={styles.choiceList}>
        {SCHOOL_TYPES.map((option) => (
          <ChoiceCard
            key={option.value}
            icon={option.icon}
            title={option.label}
            description={option.description}
            selected={answers.schoolType === option.value}
            onPress={() => setAnswer("schoolType", option.value)}
          />
        ))}
      </View>
      <InlineError message={errors.schoolType} />
    </View>
  );
}

function SchoolStep({ step, answers, errors, setAnswer }: StepContentProps) {
  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      <TextField
        label="School, university, or training centre"
        value={answers.school}
        onChangeText={(value) => setAnswer("school", value)}
        placeholder="Start typing the name"
        autoCapitalize="words"
        returnKeyType="next"
        maxLength={120}
        error={errors.form}
      />
      <Text style={styles.helperText}>
        Optional. You can add or change this anytime in your profile.
      </Text>
    </View>
  );
}

function GradeStep({ step, answers, setAnswer }: StepContentProps) {
  const options = getGradeOptions(answers.schoolType);
  const isSelfTaught = answers.schoolType === "self_taught";
  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      <View style={styles.chipWrap}>
        {options.map((option) => (
          <SelectChip
            key={option}
            label={option}
            selected={answers.grade === option}
            onPress={() =>
              setAnswer("grade", answers.grade === option ? "" : option)
            }
          />
        ))}
      </View>
      {options.length === 0 ? (
        <Text style={styles.helperText}>
          Select your learning stage first and we’ll show the right options.
        </Text>
      ) : null}
      <Text style={styles.helperText}>
        {isSelfTaught
          ? "Optional. Tell us how confident you feel right now."
          : "Optional. Choose the closest match; you can change it later."}
      </Text>
    </View>
  );
}

function DegreeStep({ step, answers, setAnswer }: StepContentProps) {
  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      <Text style={styles.fieldLabel}>Degree level</Text>
      <View style={styles.chipWrap}>
        {DEGREE_OPTIONS.map((option) => (
          <SelectChip
            key={option}
            label={option}
            selected={answers.degree === option}
            onPress={() =>
              setAnswer("degree", answers.degree === option ? "" : option)
            }
          />
        ))}
      </View>
      <TextField
        label="Field of study"
        value={answers.majorCourse}
        onChangeText={(value) => setAnswer("majorCourse", value)}
        placeholder="e.g. Computer Science"
        autoCapitalize="words"
        returnKeyType="next"
        maxLength={80}
      />
      <Text style={styles.helperText}>
        Optional. This helps us pitch courses at the right level.
      </Text>
    </View>
  );
}

function SubjectsStep({
  step,
  answers,
  errors,
  setAnswers,
}: StepContentProps) {
  const [custom, setCustom] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const selected = answers.subjects;
  const atLimit = selected.length >= MAX_SUBJECTS;

  const customSubjects = useMemo(
    () => selected.filter((item) => !SUBJECTS.includes(item as never)),
    [selected],
  );

  function toggle(subject: string) {
    setCustomError(null);
    if (selected.includes(subject)) {
      setAnswers({ subjects: selected.filter((item) => item !== subject) });
      return;
    }
    if (atLimit) {
      setCustomError(`Pick up to ${MAX_SUBJECTS} subjects.`);
      return;
    }
    setAnswers({ subjects: [...selected, subject] });
  }

  function addCustom() {
    const value = custom.trim();
    if (!value) return;
    if (selected.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setCustom("");
      return;
    }
    if (atLimit) {
      setCustomError(`Pick up to ${MAX_SUBJECTS} subjects.`);
      return;
    }
    setAnswers({ subjects: [...selected, value] });
    setCustom("");
    setCustomError(null);
  }

  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      <View style={styles.selectionHeader}>
        <Text style={styles.fieldLabel}>Subjects</Text>
        <SelectionCount count={selected.length} max={MAX_SUBJECTS} label="picked" />
      </View>
      <View style={styles.chipWrap}>
        {SUBJECTS.map((subject) => (
          <SelectChip
            key={subject}
            label={subject}
            selected={selected.includes(subject)}
            onPress={() => toggle(subject)}
          />
        ))}
        {customSubjects.map((subject) => (
          <SelectChip
            key={subject}
            label={subject}
            selected
            onPress={() => toggle(subject)}
          />
        ))}
      </View>
      <View style={styles.customRow}>
        <TextInput
          value={custom}
          onChangeText={setCustom}
          placeholder="Add your own subject"
          placeholderTextColor={landingColors.textSubtle}
          style={styles.customInput}
          returnKeyType="done"
          onSubmitEditing={addCustom}
        />
        <Pressable
          onPress={addCustom}
          style={({ pressed }) => [
            styles.customAdd,
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add custom subject"
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
      <InlineError message={customError ?? errors.subjects} />
    </View>
  );
}

function GoalsStep({ step, answers, errors, setAnswers }: StepContentProps) {
  const [custom, setCustom] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const selected = answers.learningGoals;
  const atLimit = selected.length >= MAX_GOALS;

  const customGoals = useMemo(
    () => selected.filter((item) => !GOALS.includes(item as never)),
    [selected],
  );

  function toggle(goal: string) {
    setCustomError(null);
    if (selected.includes(goal)) {
      setAnswers({ learningGoals: selected.filter((item) => item !== goal) });
      return;
    }
    if (atLimit) {
      setCustomError(`Pick up to ${MAX_GOALS} goals.`);
      return;
    }
    setAnswers({ learningGoals: [...selected, goal] });
  }

  function addCustom() {
    const value = custom.trim();
    if (!value) return;
    if (selected.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setCustom("");
      return;
    }
    if (atLimit) {
      setCustomError(`Pick up to ${MAX_GOALS} goals.`);
      return;
    }
    setAnswers({ learningGoals: [...selected, value] });
    setCustom("");
    setCustomError(null);
  }

  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      <View style={styles.selectionHeader}>
        <Text style={styles.fieldLabel}>Your goals</Text>
        <SelectionCount count={selected.length} max={MAX_GOALS} label="picked" />
      </View>
      <View style={styles.chipWrap}>
        {GOALS.map((goal) => (
          <SelectChip
            key={goal}
            label={goal}
            selected={selected.includes(goal)}
            onPress={() => toggle(goal)}
          />
        ))}
        {customGoals.map((goal) => (
          <SelectChip
            key={goal}
            label={goal}
            selected
            onPress={() => toggle(goal)}
          />
        ))}
      </View>
      <View style={styles.customRow}>
        <TextInput
          value={custom}
          onChangeText={setCustom}
          placeholder="Add your own goal"
          placeholderTextColor={landingColors.textSubtle}
          style={styles.customInput}
          returnKeyType="done"
          onSubmitEditing={addCustom}
        />
        <Pressable
          onPress={addCustom}
          style={({ pressed }) => [
            styles.customAdd,
            pressed && { opacity: 0.8 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add custom goal"
        >
          <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
      <InlineError message={customError ?? errors.learningGoals} />
    </View>
  );
}

function ReadyStep({
  step,
  answers,
  isSignedIn,
  email,
}: StepContentProps) {
  const country = findAfricanCountry(answers.country);
  const schoolType = getSchoolTypeLabel(answers.schoolType);
  const subjects = uniqueStrings(answers.subjects);
  const goals = uniqueStrings(answers.learningGoals);
  const school = getSchoolTypeOption(answers.schoolType);

  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryAvatar}>
            <Text style={styles.summaryInitial}>
              {(answers.displayName.trim().charAt(0) || "Y").toUpperCase()}
            </Text>
          </View>
          <View style={styles.summaryTopText}>
            <Text style={styles.summaryName}>
              {answers.displayName.trim() || "Your Yuinx profile"}
            </Text>
            <Text style={styles.summarySub}>
              {country ? `${country.name} · ` : ""}
              {schoolType || "Learner"}
            </Text>
          </View>
          {country ? <CountryFlag country={country} size={32} /> : null}
        </View>

        <View style={styles.summaryDivider} />

        <SummaryRow
          icon="school-outline"
          label="Learning stage"
          value={school?.label ?? "Not set"}
        />
        <SummaryRow
          icon="book-open-variant"
          label="Subjects"
          value={subjects.length ? subjects.join(", ") : "Not set"}
        />
        <SummaryRow
          icon="target"
          label="Goals"
          value={goals.length ? goals.join(", ") : "Not set"}
        />
      </View>

      <View style={styles.accountNote}>
        <MaterialCommunityIcons
          name={isSignedIn ? "account-check-outline" : "account-plus-outline"}
          size={19}
          color={landingColors.blueSoft}
        />
        <Text style={styles.accountNoteText}>
          {isSignedIn
            ? `Signed in as ${email ?? "your account"}. Your answers will be saved to this profile.`
            : "Next, create your account. We’ll save these answers to your new Yuinx profile."}
        </Text>
      </View>
      <Text style={styles.helperText}>
        By continuing you agree to keep learning curious. You can update every
        answer from your profile later.
      </Text>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <MaterialCommunityIcons
        name={icon as never}
        size={17}
        color={landingColors.textSubtle}
      />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 20,
  },
  welcomeVisual: {
    height: 190,
    borderRadius: landingRadii.xl,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: "rgba(14,21,36,0.7)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  welcomeGlow: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(47,124,255,0.18)",
  },
  welcomeImage: {
    width: "86%",
    height: "86%",
  },
  bulletList: {
    gap: 10,
  },
  bullet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  bulletIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(47,124,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  bulletText: {
    flex: 1,
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  textLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  textLinkText: {
    color: landingColors.blueSoft,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 13,
  },
  fieldWrap: {
    gap: 8,
  },
  fieldLabel: {
    color: landingColors.textMuted,
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  helperText: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
  pickerField: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: landingRadii.md,
    borderWidth: 1,
    borderColor: landingColors.borderStrong,
    backgroundColor: landingColors.bgSoft,
  },
  pickerFieldText: {
    flex: 1,
    color: landingColors.text,
    fontFamily: landingFonts.body,
    fontSize: 15,
  },
  inputError: {
    borderColor: landingColors.danger,
  },
  errorTextInline: {
    color: landingColors.danger,
    fontFamily: landingFonts.body,
    fontSize: 12,
  },
  datePickerWrap: {
    borderRadius: landingRadii.md,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: landingColors.panel,
    paddingBottom: 8,
  },
  dateDone: {
    alignSelf: "flex-end",
    marginRight: 14,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: landingRadii.pill,
    backgroundColor: landingColors.blue,
  },
  dateDoneText: {
    color: "#FFFFFF",
    fontFamily: landingFonts.bodySemiBold,
    fontSize: 12,
  },
  countryButton: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: landingRadii.lg,
    borderWidth: 1,
    borderColor: landingColors.borderStrong,
    backgroundColor: landingColors.panel,
  },
  countryButtonText: {
    flex: 1,
    gap: 3,
  },
  countryButtonLabel: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 11,
  },
  countryButtonValue: {
    color: landingColors.text,
    fontFamily: landingFonts.heading,
    fontSize: 18,
  },
  changeText: {
    color: landingColors.blueSoft,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 12,
  },
  countryPlaceholderIcon: {
    width: 46,
    height: 46,
    borderRadius: 24,
    backgroundColor: "rgba(47,124,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceList: {
    gap: 9,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: landingRadii.md,
    borderWidth: 1,
    borderColor: landingColors.border,
    backgroundColor: landingColors.bgSoft,
    color: landingColors.text,
    fontFamily: landingFonts.body,
    fontSize: 14,
  },
  customAdd: {
    width: 48,
    height: 48,
    borderRadius: landingRadii.md,
    backgroundColor: landingColors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    borderRadius: landingRadii.lg,
    borderWidth: 1,
    borderColor: landingColors.borderStrong,
    backgroundColor: landingColors.panel,
    padding: 18,
    gap: 13,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(47,124,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(47,124,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryInitial: {
    color: landingColors.blueSoft,
    fontFamily: landingFonts.heading,
    fontSize: 18,
  },
  summaryTopText: {
    flex: 1,
    gap: 2,
  },
  summaryName: {
    color: landingColors.text,
    fontFamily: landingFonts.heading,
    fontSize: 18,
  },
  summarySub: {
    color: landingColors.textSubtle,
    fontFamily: landingFonts.body,
    fontSize: 12,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: landingColors.border,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  summaryLabel: {
    width: 110,
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 12,
    paddingTop: 1,
  },
  summaryValue: {
    flex: 1,
    color: landingColors.text,
    fontFamily: landingFonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
  },
  accountNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 13,
    borderRadius: landingRadii.md,
    backgroundColor: "rgba(47,124,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(47,124,255,0.2)",
  },
  accountNoteText: {
    flex: 1,
    color: landingColors.textMuted,
    fontFamily: landingFonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
});
