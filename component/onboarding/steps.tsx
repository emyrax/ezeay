import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  landingColors,
  landingFonts,
  landingRadii,
} from "../../constants/landing";
import { findAfricanCountry } from "../../data/countries";
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
import { initI18n } from "../../lib/i18n";
import {
  APP_LANGUAGES,
  LEARNING_LANGUAGES,
  isAppLanguage,
  type AppLanguageCode,
} from "../../lib/i18n/languages";
import { parseBirthdayDate, uniqueStrings } from "../../lib/onboarding/steps";
import MascotStage from "../mascot/MascotStage";
import type {
  OnboardingAnswers,
  OnboardingErrors,
  OnboardingStep,
} from "../../types/onboarding";
import BirthdayPicker from "./BirthdayPicker";
import CountryFlag from "./CountryFlag";
import LocationSelector from "./LocationSelector";
import UniversitySelector from "./UniversitySelector";
import {
  ChoiceCard,
  InlineError,
  SelectChip,
  SelectionCount,
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
    case "language":
      return <LanguageStep {...props} />;
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
    case "targetLanguage":
      return <TargetLanguageStep {...props} />;
    case "ready":
      return <ReadyStep {...props} />;
    default:
      return null;
  }
}

/* =========================================================================
   1. WELCOME STEP
   ========================================================================= */

function WelcomeStep({ step, onSignIn }: StepContentProps) {
  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      <View style={styles.welcomeVisual}>
        <View style={styles.welcomeGlow} />
        <MascotStage
          action="mascot_waving"
          height={196}
          stageColor="#183454"
          fadeColor="#0E1524"
          glow
        />
      </View>
      <View style={styles.bulletList}>
        <Bullet
          icon="map-marker-radius-outline"
          text="Built around where you learn."
        />
        <Bullet
          icon="target"
          text="Quests that match your goals, not a generic feed."
        />
        <Bullet
          icon="chart-timeline-variant"
          text="Progress you can actually see."
        />
      </View>
      <Pressable
        onPress={onSignIn}
        style={styles.textLink}
        accessibilityRole="button"
      >
        <Text style={styles.textLinkText}>I already have an account</Text>
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

/* =========================================================================
   2. LANGUAGE STEP (Premium visual language picker)
   ========================================================================= */

const LANGUAGE_DETAILS: Record<
  string,
  { greeting: string; badge: string; icon: string }
> = {
  en: {
    greeting: "Hello, explorer! Let's shape your learning path.",
    badge: "International",
    icon: "earth",
  },
  fr: {
    greeting: "Bonjour explorateur ! Façonnons votre parcours.",
    badge: "Francophonie",
    icon: "translate",
  },
  pt: {
    greeting: "Olá, explorador! Vamos moldar a sua jornada.",
    badge: "Lusofonia",
    icon: "book-open-page-variant",
  },
  sw: {
    greeting: "Habari msafiri! Tuanze safari yako ya masomo.",
    badge: "Afrika Mashariki",
    icon: "compass-rose",
  },
  ar: {
    greeting: "مرحباً بك! فلنبدأ معاً رحلتك التعليمية الممتعة.",
    badge: "شمال أفريقيا",
    icon: "star-crescent",
  },
};

function LanguageStep({
  step,
  answers,
  errors,
  setAnswer,
}: StepContentProps) {
  const selectedLang = answers.appLanguage || "en";
  const selectedInfo = LANGUAGE_DETAILS[selectedLang] ?? LANGUAGE_DETAILS.en;

  function handleSelectLanguage(code: string) {
    if (isAppLanguage(code)) {
      initI18n(code as AppLanguageCode);
    }
    setAnswer("appLanguage", code);
  }

  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />

      {/* Mascot Speech Banner */}
      <View style={styles.langSpeechCard}>
        <View style={styles.langMascotWrap}>
          <MascotStage
            action="mascot_posing"
            width={84}
            height={84}
            variant="inline"
            glow
          />
        </View>
        <View style={styles.langSpeechContent}>
          <View style={styles.speechBubbleTail} />
          <Text style={styles.speechEyebrow}>LIVE PREVIEW</Text>
          <Text style={styles.speechText}>
            “{selectedInfo.greeting}”
          </Text>
        </View>
      </View>

      {/* Language Cards */}
      <View style={styles.langCardsList}>
        {APP_LANGUAGES.map((lang) => {
          const isSelected = selectedLang === lang.code;
          const info = LANGUAGE_DETAILS[lang.code] ?? LANGUAGE_DETAILS.en;

          return (
            <Pressable
              key={lang.code}
              onPress={() => handleSelectLanguage(lang.code)}
              style={({ pressed }) => [
                styles.langCard,
                isSelected && styles.langCardSelected,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.langCardLeft}>
                <View
                  style={[
                    styles.langIconWrap,
                    isSelected && styles.langIconWrapSelected,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={info.icon as never}
                    size={22}
                    color={
                      isSelected
                        ? landingColors.blueSoft
                        : landingColors.textMuted
                    }
                  />
                </View>
                <View style={styles.langTextWrap}>
                  <View style={styles.langTitleRow}>
                    <Text
                      style={[
                        styles.langNativeName,
                        isSelected && styles.langNativeNameSelected,
                      ]}
                    >
                      {lang.nativeName}
                    </Text>
                    {lang.nativeName !== lang.englishName ? (
                      <Text style={styles.langEnglishName}>
                        ({lang.englishName})
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.langBadge}>{info.badge}</Text>
                </View>
              </View>

              <View
                style={[
                  styles.radioCircle,
                  isSelected && styles.radioCircleSelected,
                ]}
              >
                {isSelected ? (
                  <View style={styles.radioInnerDot} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <InlineError message={errors.appLanguage} />

      <Text style={styles.helperText}>
        You can switch your interface language anytime from your profile settings.
      </Text>
    </View>
  );
}

/* =========================================================================
   3. NAME STEP
   ========================================================================= */

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

/* =========================================================================
   4. BIRTHDAY STEP
   ========================================================================= */

function BirthdayStep({ step, answers, errors, setAnswer }: StepContentProps) {
  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      <BirthdayPicker
        value={answers.birthday}
        onChange={(val) => setAnswer("birthday", val)}
        error={errors.birthday}
      />
      <Text style={styles.helperText}>
        Yuinx is for learners 13 and older. We only use this to keep your
        experience age-appropriate.
      </Text>
    </View>
  );
}

/* =========================================================================
   5. COUNTRY STEP
   ========================================================================= */

function CountryStep({
  step,
  answers,
  errors,
  onOpenCountry,
}: StepContentProps) {
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

/* =========================================================================
   6. REGION / LOCATION STEP (States based on selected country)
   ========================================================================= */

function RegionStep({
  step,
  answers,
  errors,
  setAnswer,
  onOpenCountry,
}: StepContentProps) {
  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      <LocationSelector
        country={answers.country}
        selectedState={answers.region}
        onSelectState={(state) => setAnswer("region", state)}
        onChangeCountry={onOpenCountry}
        error={errors.country || errors.form}
      />
      <Text style={styles.helperText}>
        Optional. Selecting your state helps us tailor local learning communities and opportunities.
      </Text>
    </View>
  );
}

/* =========================================================================
   7. SCHOOL TYPE STEP
   ========================================================================= */

function SchoolTypeStep({
  step,
  answers,
  errors,
  setAnswer,
}: StepContentProps) {
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

/* =========================================================================
   8. SCHOOL / UNIVERSITY STEP (Country & State driven + custom university)
   ========================================================================= */

function SchoolStep({
  step,
  answers,
  errors,
  setAnswer,
}: StepContentProps) {
  const isUniversity = answers.schoolType === "university";

  if (isUniversity) {
    return (
      <View style={styles.wrap}>
        <StepHeader step={step} />
        <UniversitySelector
          country={answers.country}
          state={answers.region}
          selectedUniversity={answers.school}
          onSelectUniversity={(uni) => setAnswer("school", uni)}
          error={errors.form}
        />
        <Text style={styles.helperText}>
          Optional. You can change your university or add your faculty anytime later in your profile.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />
      <TextField
        label="School, academy, or training centre"
        value={answers.school}
        onChangeText={(value) => setAnswer("school", value)}
        placeholder="Start typing the name of your school"
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

/* =========================================================================
   9. GRADE STEP
   ========================================================================= */

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

/* =========================================================================
   10. DEGREE STEP
   ========================================================================= */

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

/* =========================================================================
   11. SUBJECTS STEP
   ========================================================================= */

function SubjectsStep({ step, answers, errors, setAnswers }: StepContentProps) {
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
        <SelectionCount
          count={selected.length}
          max={MAX_SUBJECTS}
          label="picked"
        />
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

/* =========================================================================
   12. GOALS STEP
   ========================================================================= */

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
        <SelectionCount
          count={selected.length}
          max={MAX_GOALS}
          label="picked"
        />
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

/* =========================================================================
   13. TARGET LANGUAGE STEP
   ========================================================================= */

function TargetLanguageStep({
  step,
  answers,
  errors,
  setAnswer,
}: StepContentProps) {
  const [search, setSearch] = useState("");

  const filteredLanguages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return LEARNING_LANGUAGES;
    return LEARNING_LANGUAGES.filter(
      (lang) =>
        lang.englishName.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <View style={styles.wrap}>
      <StepHeader step={step} />

      <View style={styles.searchBar}>
        <MaterialCommunityIcons
          name="magnify"
          size={18}
          color={landingColors.textSubtle}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search language (e.g. Swahili, French, Spanish...)"
          placeholderTextColor={landingColors.textSubtle}
          style={styles.searchInput}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.chipWrap}>
        {filteredLanguages.map((lang) => {
          const isSelected = answers.targetLanguage === lang.code;
          return (
            <SelectChip
              key={lang.code}
              label={`${lang.nativeName} (${lang.englishName})`}
              selected={isSelected}
              onPress={() =>
                setAnswer(
                  "targetLanguage",
                  isSelected ? "" : lang.code,
                )
              }
            />
          );
        })}
      </View>

      <InlineError message={errors.targetLanguage} />

      <Text style={styles.helperText}>
        We’ll tailor quizzes, conversation quests, and vocabulary bounties for this language.
      </Text>
    </View>
  );
}

/* =========================================================================
   14. READY STEP
   ========================================================================= */

function ReadyStep({ step, answers, isSignedIn, email }: StepContentProps) {
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
              {answers.region ? `${answers.region} · ` : ""}
              {schoolType || "Learner"}
            </Text>
          </View>
          {country ? <CountryFlag country={country} size={32} /> : null}
        </View>

        <View style={styles.summaryDivider} />

        {answers.school ? (
          <SummaryRow
            icon="school"
            label="Institution"
            value={answers.school}
          />
        ) : null}

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

/* =========================================================================
   STYLES
   ========================================================================= */

const styles = StyleSheet.create({
  wrap: {
    gap: 20,
  },
  welcomeVisual: {
    height: 220,
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

  /* Language Step Specific Styles */
  langSpeechCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(18, 32, 54, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.22)",
    borderRadius: landingRadii.lg,
    padding: 12,
    gap: 12,
  },
  langMascotWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  langSpeechContent: {
    flex: 1,
    backgroundColor: "rgba(9, 16, 28, 0.75)",
    borderRadius: landingRadii.md,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.15)",
    padding: 12,
    gap: 4,
  },
  speechBubbleTail: {
    position: "absolute",
    left: -6,
    top: 20,
    width: 10,
    height: 10,
    backgroundColor: "rgba(9, 16, 28, 0.75)",
    transform: [{ rotate: "45deg" }],
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.15)",
  },
  speechEyebrow: {
    fontSize: 10,
    fontFamily: landingFonts.body,
    fontWeight: "700",
    color: landingColors.blueSoft,
    letterSpacing: 0.5,
  },
  speechText: {
    fontSize: 13,
    fontFamily: landingFonts.bodyMedium,
    color: landingColors.text,
    lineHeight: 19,
    fontStyle: "italic",
  },
  langCardsList: {
    gap: 10,
  },
  langCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(18, 32, 54, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: landingRadii.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  langCardSelected: {
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderColor: "rgba(56, 189, 248, 0.45)",
  },
  langCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  langIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  langIconWrapSelected: {
    backgroundColor: "rgba(56, 189, 248, 0.18)",
  },
  langTextWrap: {
    gap: 3,
    flex: 1,
  },
  langTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
  },
  langNativeName: {
    fontSize: 16,
    fontFamily: landingFonts.heading,
    color: landingColors.text,
  },
  langNativeNameSelected: {
    color: "#FFFFFF",
  },
  langEnglishName: {
    fontSize: 13,
    fontFamily: landingFonts.body,
    color: landingColors.textSubtle,
  },
  langBadge: {
    fontSize: 11,
    fontFamily: landingFonts.body,
    color: landingColors.blueSoft,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: landingColors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: landingColors.blueSoft,
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: landingColors.blueSoft,
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
});
