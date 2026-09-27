export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskNoteType = "MENTOR_FEEDBACK" | "PERSONAL_NOTE";

export interface TaskChecklistItem {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskNote {
  id: string;
  taskId: string;
  authorId: string;
  type: TaskNoteType;
  content: string;
  createdAt: string;
  updatedAt: string;
  readAt: string | null;
}

export interface ProfessionalTask {
  id: string;
  userId: string;
  createdById: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  mentorPriority: boolean;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  checklist: TaskChecklistItem[];
  notes: TaskNote[];
  overdue: boolean;
  progress: { completed: number; total: number };
  unreadMentorFeedbackCount: number;
}

export interface TaskPage {
  items: ProfessionalTask[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProfessionalDevelopmentSummary {
  totalActiveTasks: number;
  TODO: number;
  IN_PROGRESS: number;
  BLOCKED: number;
  overdueCount: number;
  mentorPriorityActiveCount: number;
  unreadMentorFeedbackCount: number;
  recentTasks: ProfessionalTask[];
  upcomingDeadlines: ProfessionalTask[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  mentorPriority?: boolean;
  startDate?: string;
  dueDate?: string;
  checklist?: Array<{ title: string }>;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  mentorPriority?: boolean;
  startDate?: string | null;
  dueDate?: string | null;
  status?: TaskStatus;
}
