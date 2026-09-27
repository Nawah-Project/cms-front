export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskNoteType = "MENTOR_FEEDBACK" | "PERSONAL_NOTE";
export type FeedbackVisibility = "DIRECT" | "GROUP" | "ALL";
export type FeedbackContext =
  "APPLICATION" | "INTERVIEW" | "WAITING" | "DECISION" | "GENERAL";
export type FeedbackTag =
  | "INTERVIEW"
  | "CV"
  | "COMMUNICATION"
  | "TECHNICAL"
  | "APPLICATIONS"
  | "LEARNING"
  | "GENERAL";
export type FeedbackScope = "for-you" | "shared";

export interface FeedbackResource {
  id: string;
  title: string;
  url: string;
  type: string | null;
  description: string | null;
  createdAt: string;
}

export interface FeedbackPost {
  id: string;
  title: string;
  content: string;
  visibility: FeedbackVisibility;
  audience: FeedbackVisibility;
  context: FeedbackContext;
  tags: FeedbackTag[];
  author: { id: string; name: string };
  resources: FeedbackResource[];
  publishedAt: string;
  updatedAt: string;
  archivedAt: string | null;
  isRead?: boolean;
  readAt?: string | null;
}

export interface FeedbackPage {
  items: FeedbackPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FeedbackUnreadCount {
  unreadCount: number;
  forYou: number;
  shared: number;
}

export interface FeedbackDashboardItem {
  id: string;
  title: string;
  visibility: FeedbackVisibility;
  context: FeedbackContext;
  tags: FeedbackTag[];
  author: { id: string; name: string };
  publishedAt: string;
  isRead: boolean;
}

export interface FeedbackDashboardSummary {
  unreadDirectFeedbackCount: number;
  unreadSharedFeedbackCount: number;
  latestDirectFeedback: FeedbackDashboardItem | null;
  latestSharedInsight: FeedbackDashboardItem | null;
}

export interface CreateFeedbackInput {
  title: string;
  content: string;
  visibility: FeedbackVisibility;
  targetUserId?: string;
  groupId?: string;
  context?: FeedbackContext;
  tags?: FeedbackTag[];
  resource?: {
    title: string;
    url: string;
    type?: string;
    description?: string;
  } | null;
}

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
  feedback?: FeedbackDashboardSummary;
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
