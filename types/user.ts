import type { Course } from "./course";

export type { Course };

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  employmentType: "full-time" | "part-time" | "contract" | "internship" | "self-employed";
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  location?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export type CollarType = "white" | "yellow" | "both";
export type Availability = "open_to_work" | "open_to_learn" | "open_to_mentor" | "not_looking";

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  level?: string;
  majorCourse?: string;
  birthday?: string;
  educationLevel?: string;
  professionalInfoEnabled?: boolean;
  status: "active" | "deleted";
  deletedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
  xp: number;
  coins: number;
  gamingLevel: number;
  rank: string;
  nextLevelXp: number;
  courses: Course[];
  earnedTrophies: string[];

  headline?: string;
  industry?: string;
  department?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  locationLat?: number;
  locationLng?: number;
  university?: string;
  linkedInUrl?: string;
  website?: string;
  bio?: string;
  collarType?: CollarType;
  availability?: Availability;
  skills?: string[];
  languages?: string[];
  interests?: string[];

  education?: Education[];
  workExperience?: WorkExperience[];

  tradeSkills?: string[];
  certifications?: Certification[];
  yearsOfTradeExperience?: number;

  learningGoals?: string[];
  onBoarded?: boolean;
  modelRatings?: Record<string, number>;
  isPro?: boolean;
}

export interface MappedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  originalUser: unknown;
}