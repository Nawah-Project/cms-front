import type {
  CreateTaskInput,
  ProfessionalTask,
  TaskNote,
  TaskPage,
  UpdateTaskInput,
  CreateFeedbackInput,
  FeedbackPage,
  FeedbackPost,
} from "../../professional-development/types";
import type { Stage } from "../../../types";
import { apiClient } from "../../../lib/api-client";

export type ActivityStatus = "ACTIVE" | "WARNING" | "CRITICAL" | "NEVER_ACTIVE";
export type ExperimentVariant = "A" | "B" | "C";
export type UxConfig = {
  defaultVariant: ExperimentVariant;
  groupVariants: Record<string, ExperimentVariant>;
  introVideoUrl: string;
};
export type StageCounts = {
  applied: number;
  interview: number;
  decision: number;
  closed: number;
};
export type JourneySnapshot = {
  nodeCode: string;
  week: number;
  started: boolean;
  nodeStartedAt: string | null;
  completedNodes: number;
  requiredApps: number;
  nodeApps: number;
  titleAr: string | null;
  titleEn: string | null;
  daysInNode: number | null;
};
export type AttentionReasonCode =
  | "JOURNEY_NOT_STARTED"
  | "JOURNEY_STALLED"
  | "OVERDUE_TASKS"
  | "PROFILE_INCOMPLETE"
  | "INACTIVE";
export type AttentionReason = {
  code: AttentionReasonCode;
  severity: number;
  days?: number;
  count?: number;
};
export type AdminMember = {
  id: string;
  name: string;
  email?: string | null;
  role: "USER" | "ADMIN";
  emailVerified?: boolean | null;
  registeredAt?: string | null;
  profileComplete?: boolean | null;
  group: { id: string; name: string } | null;
  lastActivityAt: string | null;
  inactivityDays: number | null;
  activityStatus: ActivityStatus;
  applicationsCount: number;
  currentStageCounts: StageCounts;
  avatar?: string | null;
  development?: {
    active: number;
    inProgress: number;
    overdue: number;
    lastTaskAt: string | null;
  };
  journey?: JourneySnapshot | null;
};
export type AttentionItem = {
  member: AdminMember;
  reasons: AttentionReason[];
  score: number;
};
export type AdminGroup = {
  id: string;
  name: string;
  memberCount: number;
  capacity: number;
  availableSlots: number;
  lastActivityAt: string | null;
  activeMembers: number;
  warningMembers: number;
  criticalMembers: number;
  neverActiveMembers: number;
};
export type AdminActivity = {
  id: string;
  type:
    "APPLICATION_CREATED" | "APPLICATION_UPDATED" | "APPLICATION_STAGE_CHANGED";
  user: { id: string; name: string; avatar: string | null };
  group: { id: string; name: string } | null;
  application: { id: string; companyName: string; jobTitle: string };
  fromStage: Stage | null;
  toStage: Stage;
  outcome: string | null;
  createdAt: string;
};
export type AdminOverview = {
  usersCount: number;
  groupsCount: number;
  membershipsCount: number;
  unassignedUsersCount: number;
  activeUsersCount: number;
  warningUsersCount: number;
  criticalUsersCount: number;
  neverActiveUsersCount: number;
  applicationsCount: number;
  journey?: {
    weeks: Array<{ week: number; members: number }>;
    notStartedCount: number;
    startedCount: number;
    finishedCount: number;
  };
};
export type AdminUserDetail = {
  user: {
    id: string;
    name: string;
    email: string;
    role: "USER" | "ADMIN";
    emailVerified?: boolean;
    targetJobTitle?: string | null;
    preferredLocations?: string[];
    createdAt: string;
    portfolioUrl: string | null;
    hasCv: boolean;
    group: { id: string; name: string } | null;
  };
  journey?: JourneySnapshot | null;
  lastActivityAt: string | null;
  inactivityDays: number | null;
  activityStatus: ActivityStatus;
  applicationsCount: number;
  development: {
    totalActiveTasks: number;
    taskStatusCounts: {
      TODO: number;
      IN_PROGRESS: number;
      BLOCKED: number;
      DONE: number;
    };
    overdueTasks: number;
    mentorPriorityTasks: number;
    tasksBySource: { personal: number; mentorAssigned: number };
    unreadMentorFeedback: number;
  };
  currentStageCounts: StageCounts;
  recentActivities: AdminActivity[];
  recentApplications: Array<{
    id: string;
    companyName: string;
    jobTitle: string;
    applicationDate: string;
    stage: Stage;
    outcome: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const method = (init?.method || "GET") as
      | "GET"
      | "POST"
      | "PUT"
      | "PATCH"
      | "DELETE";
    return await apiClient.request<T>(path, {
      method,
      body: init?.body,
      headers: init?.headers as Record<string, string> | undefined,
    });
  } catch (err: any) {
    const status = err?.status;
    const error = new Error(
      status === 401 || status === 403
        ? "You don’t have permission to access this admin page."
        : "We couldn’t complete that request. Please try again.",
    ) as Error & { status?: number; code?: string };
    error.status = status;
    error.code =
      status === 401 || status === 403
        ? "PERMISSION_DENIED"
        : "REQUEST_FAILED";
    throw error;
  }
}

export const adminApi = {
  overview: () => request<AdminOverview>("/admin/monitoring/overview"),
  attention: (limit = 20) =>
    request<{ total: number; items: AttentionItem[] }>(
      `/admin/monitoring/attention?limit=${limit}`,
    ),
  users: (
    params: {
      page?: number;
      limit?: number;
      activityStatus?: ActivityStatus;
      search?: string;
      groupId?: string;
    } = {},
  ) => {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.activityStatus)
      query.set("activityStatus", params.activityStatus);
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.groupId && params.groupId !== "ALL")
      query.set("groupId", params.groupId);
    return request<{
      items: AdminMember[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/admin/monitoring/users?${query}`);
  },
  groups: () => request<{ items: AdminGroup[] }>("/admin/monitoring/groups"),
  activity: (params: number | { page?: number; limit?: number } = 20) => {
    const page = typeof params === "number" ? 1 : params.page || 1;
    const limit = typeof params === "number" ? params : params.limit || 20;
    return request<{
      items: AdminActivity[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/admin/monitoring/activity?page=${page}&limit=${limit}`);
  },
  user: (id: string) =>
    request<AdminUserDetail>(
      `/admin/monitoring/users/${encodeURIComponent(id)}`,
    ),
  removeFromGroup: (groupId: string, userId: string) =>
    request<{ success: boolean }>(
      `/admin/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    ),
  assignToGroup: (userId: string, groupId: string) =>
    request<{ userId: string; group: { id: string; name: string } }>(
      `/admin/users/${encodeURIComponent(userId)}/group-assignment`,
      { method: "POST", body: JSON.stringify({ groupId }) },
    ),
  tasksForUser: (userId: string, page = 1, limit = 50) =>
    request<TaskPage>(
      `/admin/users/${encodeURIComponent(userId)}/tasks?page=${page}&limit=${limit}`,
    ),
  createTask: (userId: string, input: CreateTaskInput) =>
    request<ProfessionalTask>(
      `/admin/users/${encodeURIComponent(userId)}/tasks`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  createTaskForGroup: (groupId: string, input: CreateTaskInput) =>
    request<{ groupId: string; groupName: string; assignedCount: number }>(
      `/admin/groups/${encodeURIComponent(groupId)}/tasks`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  updateTask: (taskId: string, input: UpdateTaskInput) =>
    request<ProfessionalTask>(`/admin/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteTask: (taskId: string) =>
    request<{ success: boolean }>(
      `/admin/tasks/${encodeURIComponent(taskId)}`,
      { method: "DELETE" },
    ),
  addTaskChecklistItem: (taskId: string, title: string) =>
    request<ProfessionalTask["checklist"][number]>(
      `/admin/tasks/${encodeURIComponent(taskId)}/checklist`,
      {
        method: "POST",
        body: JSON.stringify({ title }),
      },
    ),
  updateTaskChecklistItem: (
    taskId: string,
    itemId: string,
    input: { title?: string; position?: number },
  ) =>
    request<ProfessionalTask["checklist"][number]>(
      `/admin/tasks/${encodeURIComponent(taskId)}/checklist/${encodeURIComponent(itemId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    ),
  deleteTaskChecklistItem: (taskId: string, itemId: string) =>
    request<{ success: boolean }>(
      `/admin/tasks/${encodeURIComponent(taskId)}/checklist/${encodeURIComponent(itemId)}`,
      { method: "DELETE" },
    ),
  addMentorFeedback: (taskId: string, content: string) =>
    request<TaskNote>(`/admin/tasks/${encodeURIComponent(taskId)}/feedback`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  mentorFeedback: (taskId: string) =>
    request<TaskNote[]>(`/admin/tasks/${encodeURIComponent(taskId)}/feedback`),
  feedback: (feedbackId: string) =>
    request<FeedbackPost>(`/admin/feedback/${encodeURIComponent(feedbackId)}`),
  feedbackPosts: (page = 1, limit = 20, archived = false) =>
    request<FeedbackPage>(
      `/admin/feedback?page=${page}&limit=${limit}&archived=${archived}`,
    ),
  createFeedback: (input: CreateFeedbackInput) =>
    request<FeedbackPost>("/admin/feedback", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateFeedback: (feedbackId: string, input: CreateFeedbackInput) =>
    request<FeedbackPost>(`/admin/feedback/${encodeURIComponent(feedbackId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  archiveFeedback: (feedbackId: string) =>
    request<{ success: boolean }>(
      `/admin/feedback/${encodeURIComponent(feedbackId)}/archive`,
      { method: "POST" },
    ),
  uxAnalytics: () =>
    request<any>("/admin/monitoring/ux-analytics"),
  updateUxConfig: (input: {
    defaultVariant?: ExperimentVariant;
    groupVariants?: Record<string, ExperimentVariant>;
    introVideoUrl?: string;
  }) =>
    request<UxConfig>("/admin/monitoring/ux-config", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
};
