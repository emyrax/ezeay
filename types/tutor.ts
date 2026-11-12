export type TutorPersona =
  | "exam_examiner"
  | "patient_tutor"
  | "study_coach"
  | "custom";

export type TutorMode = "materials" | "general";

export type TutorRole = "user" | "assistant";

export type TutorMessageKind = "chat" | "quiz" | "plan";

export interface TutorCitation {
  quote: string;
  source: string;
}

export interface TutorMessageAttachment {
  id: string;
  label: string;
  fileName?: string;
  mimeType?: string;
  url?: string;
  sizeBytes?: number;
}

export interface TutorConversation {
  id: string;
  title: string;
  persona: TutorPersona;
  mode: TutorMode;
  agentProfileId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TutorMessage {
  id: string;
  conversationId: string;
  role: TutorRole;
  kind: TutorMessageKind;
  content: string;
  citations: TutorCitation[];
  attachments?: TutorMessageAttachment[];
  model: string | null;
  createdAt: string;
}

export interface TutorPreferences {
  persona: TutorPersona;
  instructions: string;
  examType: string;
  examDate: string | null;
  locale: string;
  dailyMessageLimit: number;
}

export interface TutorChatInput {
  conversationId?: string;
  message: string;
  persona?: TutorPersona;
  mode?: TutorMode;
  examType?: string;
  materialIds?: string[];
  noteTexts?: { title?: string; content: string }[];
  stream?: boolean;
}

export interface TutorChatResponse {
  conversationId: string;
  message: TutorMessage;
}

export interface TutorPlanSlot {
  date: string;
  title: string;
  minutes: number;
  subject?: string;
}

export interface TutorPlan {
  examType: string;
  examDate: string;
  timezone: string;
  slots: TutorPlanSlot[];
}

export interface TutorPlanInput {
  examType: string;
  examDate: string;
  subjects: string[];
  daysPerWeek: number;
  minutesPerDay: number;
  timezone?: string;
}

export interface TutorQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface TutorQuiz {
  topic: string;
  questions: TutorQuizQuestion[];
}

export interface TutorQuizInput {
  topic: string;
  mode?: TutorMode;
  persona?: TutorPersona;
  examType?: string;
  noteTexts?: { title?: string; content: string }[];
}
