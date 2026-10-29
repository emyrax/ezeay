export const LANDING_NAV = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Across Africa", href: "#africa" },
  { label: "FAQ", href: "#faq" },
] as const;

export const LANDING_FEATURES = [
  {
    icon: "compass-outline",
    title: "A path built around you",
    description:
      "Tell Yuinx what you study, where you learn, and what you want next. Your quests follow your answers.",
    accent: "blue",
  },
  {
    icon: "trophy-outline",
    title: "Progress that feels good",
    description:
      "Levels, XP, streaks, coins, and a trophy cabinet turn small consistent sessions into visible momentum.",
    accent: "amber",
  },
  {
    icon: "robot-outline",
    title: "An AI study partner",
    description:
      "Generate courses, quizzes, flashcards, and study notes. Ask follow-up questions when something does not click.",
    accent: "violet",
  },
  {
    icon: "wifi-off",
    title: "Keep learning offline",
    description:
      "Download an on-device model and keep notes, study chat, quizzes, and review available without a connection.",
    accent: "green",
  },
  {
    icon: "school-outline",
    title: "Made for your stage",
    description:
      "Middle school, high school, university, vocational training, or self-taught — the path meets you where you are.",
    accent: "pink",
  },
  {
    icon: "chart-timeline-variant",
    title: "See what is working",
    description:
      "Track courses completed, study time, streaks, and subject focus so your effort turns into a clear picture.",
    accent: "blue",
  },
] as const;

export const LANDING_STEPS = [
  {
    number: "01",
    title: "Tell us how you learn",
    description:
      "Pick your country, learning stage, subjects, and goals. It takes a few minutes and you can change it later.",
  },
  {
    number: "02",
    title: "Get your first path",
    description:
      "Yuinx shapes a starting set of quests around your curiosity — not a generic feed or a random course list.",
  },
  {
    number: "03",
    title: "Show up and level up",
    description:
      "Finish a lesson, keep a streak, earn a trophy, and watch your camp fill with proof of progress.",
  },
] as const;

export const LANDING_FAQS = [
  {
    question: "Is Yuinx free to start?",
    answer:
      "Yes. You can create an account and start learning without a paid plan. Some AI features and offline models may have usage limits.",
  },
  {
    question: "Which countries does Yuinx support?",
    answer:
      "Onboarding currently lists all 54 African countries, each with its flag. We use your country to make examples and recommendations feel more relevant.",
  },
  {
    question: "Do I need a fast connection?",
    answer:
      "Not always. Core study tools work online, and supported devices can download an on-device model for notes, study chat, quizzes, flashcards, and review offline.",
  },
  {
    question: "What if I am not in school?",
    answer:
      "Choose Self-taught on the learning stage question. Yuinx is built for independent learners as well as students in school, university, or vocational training.",
  },
  {
    question: "Can I change my answers later?",
    answer:
      "Yes. Your country, learning stage, school, year, subjects, and goals are editable from your profile.",
  },
] as const;

export const LANDING_SUBJECTS = [
  "Mathematics",
  "Biology",
  "Computer Science",
  "Economics",
  "History",
  "Physics",
  "Art & Design",
  "Languages",
  "AI & Data",
  "Business",
  "Engineering",
  "Psychology",
] as const;
