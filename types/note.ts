export interface NoteImage {
  id: string;
  uri: string;
  createdAt: number;
}

export interface AudioClip {
  id: string;
  uri: string;
  duration: number;
  createdAt: number;
  waveform: number[];
  transcript?: string;
}

export interface NoteTag {
  id: string;
  name: string;
  color: string;
}

export type RepeatType = "none" | "daily" | "weekly" | "monthly";

export interface NoteQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  reminderAt: number | null;
  notificationId: string | null;
  repeatType: RepeatType;
  images: NoteImage[];
  audioClips: AudioClip[];
  summary: string | null;
  quiz: NoteQuizQuestion[] | null;
  createdAt: number;
  updatedAt: number;
}
