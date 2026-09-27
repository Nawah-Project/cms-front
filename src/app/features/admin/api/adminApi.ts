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
import { notifyAuthSessionExpired } from "../../../utils/authSession";

export type ActivityStatus = "ACTIVE" | "WARNING" | "CRITICAL" | "NEVER_ACTIVE";
export type StageCounts = {
  applied: number;
  interview: number;
  decision: number;
  closed: number;
};
export type AdminMember = {
  id: string;
  name: string;
  role: "USER" | "ADMIN";
  group: { id: string; name: string } | null;
  lastActivityAt: string | null;
  inactivityDays: number | null;
  activityStatus: ActivityStatus;
  applicationsCount: number;
  currentStageCounts: StageCounts;
  avatar?: string | null;
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
};
export type AdminUserDetail = {
  user: {
    id: string;
    name: string;
    role: "USER" | "ADMIN";
    createdAt: string;
    portfolioUrl: string | null;
    hasCv: boolean;
    group: { id: string; name: string } | null;
  };
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

const BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3000"
).replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("We couldn’t reach the server. Please try again.");
  }
  if (!response.ok) {
    if (response.status === 401) notifyAuthSessionExpired();
    const error = new Error(
      response.status === 401 || response.status === 403
        ? "You don’t have permission to access this admin page."
        : "We couldn’t complete that request. Please try again.",
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const adminApi = {
  overview: () => request<AdminOverview>("/admin/monitoring/overview"),
  users: (
    params: {
      page?: number;
      limit?: number;
      activityStatus?: ActivityStatus;
    } = {},
  ) => {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.activityStatus)
      query.set("activityStatus", params.activityStatus);
    return request<{
      items: AdminMember[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/admin/monitoring/users?${query}`);
  },
  groups: () => request<{ items: AdminGroup[] }>("/admin/monitoring/groups"),
  activity: (limit = 20) =>
    request<{ items: AdminActivity[] }>(
      `/admin/monitoring/activity?limit=${limit}`,
    ),
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
};
