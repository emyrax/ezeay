export interface CourseEnrollment {
  id: string;
  userId: string;
  courseId: string;
  currentChapter: number;
  progress: number;
  isCompleted: boolean;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt?: string;
  progressDetails?: string;
}
