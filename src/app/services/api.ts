import type {
  Application,
  CreateApplicationInput,
  DashboardApplication,
  DashboardStats,
  Outcome,
  Stage,
  UpdateApplicationInput,
  ApplicationsResponse,
} from "../types";
import { apiClient } from "../lib/api-client";
import type {
  ProfessionalDevelopmentSummary,
  ProfessionalTask,
  CreateTaskInput,
  UpdateTaskInput,
  TaskNote,
  TaskPage,
  TaskStatus,
  FeedbackPage,
  FeedbackPost,
  FeedbackScope,
  FeedbackUnreadCount,
} from "../features/professional-development/types";

function normalizeRecentApplications(value: unknown): DashboardApplication[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const app = item as Record<string, unknown>;
    if (
      typeof app.id !== "string" ||
      typeof app.companyName !== "string" ||
      typeof app.jobTitle !== "string" ||
      typeof app.applicationDate !== "string" ||
      typeof app.updatedAt !== "string" ||
      !["APPLIED", "INTERVIEW", "DECISION", "CLOSED"].includes(
        String(app.stage),
      ) ||
      !["NONE", "ACCEPTED", "REJECTED", "WITHDRAWN", "NO_RESPONSE"].includes(
        String(app.outcome),
      )
    )
      return [];

    return [
      {
        id: app.id,
        companyName: app.companyName,
        jobTitle: app.jobTitle,
        stage: app.stage as Stage,
        outcome: app.outcome as Outcome,
        applicationDate: app.applicationDate,
        updatedAt: app.updatedAt,
      },
    ];
  });
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method || "GET") as
    | "GET"
    | "POST"
    | "PUT"
    | "PATCH"
    | "DELETE";
  const result = await apiClient.request<T>(endpoint, {
    method,
    body: options.body,
    headers: options.headers as Record<string, string> | undefined,
  });
  return (result === undefined ? ({} as T) : result);
}

export const api = {
  /**
   * GET /applications
   * Supports filtering by stage, outcome, and text search.
   * Handles both flat array responses and paginated { data: [] } responses.
   */
  async getApplications(params?: {
    createdFrom?: string;
    createdBefore?: string;
    page?: number;
    stage?: string;
    outcome?: string;
    search?: string;
    limit?: number;
  }): Promise<ApplicationsResponse> {
    const searchParams = new URLSearchParams();

    // The backend now natively supports stage=ACTIVE as well as individual stages
    if (params?.stage) {
      searchParams.set("stage", params.stage);
    }
    if (params?.createdFrom) searchParams.set("createdFrom", params.createdFrom);
    if (params?.createdBefore) searchParams.set("createdBefore", params.createdBefore);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.outcome) searchParams.set("outcome", params.outcome);
    if (params?.search) searchParams.set("search", params.search);
    searchParams.set("limit", String(Math.min(params?.limit ?? 100, 1000)));

    const query = searchParams.toString();
    const endpoint = `/applications${query ? `?${query}` : ""}`;
    const res = await request<any>(endpoint, { method: "GET" });

    let items: Application[] = [];
    let total = 0;
    let unfilteredTotal = 0;

    if (Array.isArray(res)) {
      items = res;
      total = res.length;
      unfilteredTotal = res.length;
    } else if (res && typeof res === "object") {
      items = Array.isArray(res.items)
        ? res.items
        : Array.isArray(res.data)
          ? res.data
          : [];
      total = typeof res.total === "number" ? res.total : items.length;
      unfilteredTotal =
        typeof res.unfilteredTotal === "number" ? res.unfilteredTotal : total;
    }

    if (params?.stage === "ACTIVE" && items.some((app) => app.stage === "CLOSED")) {
      items = items.filter((app) => app.stage !== "CLOSED");
      total = items.length;
    }

    return { items, total, unfilteredTotal };
  },

  /**
   * GET /applications/:id
   */
  async getApplication(id: string): Promise<Application> {
    const res = await request<any>(`/applications/${encodeURIComponent(id)}`, {
      method: "GET",
    });
    if (res && res.data && !res.id) {
      return res.data;
    }
    return res as Application;
  },

  /**
   * POST /applications
   * Sanitizes optional fields (omitting empty strings) to satisfy backend class-validator.
   */
  async createApplication(input: CreateApplicationInput): Promise<Application> {
    const payload: Record<string, any> = {
      companyName: input.companyName.trim(),
      jobTitle: input.jobTitle.trim(),
    };

    if (input.applicationDate?.trim()) {
      payload.applicationDate = input.applicationDate.trim();
    }
    if (input.location?.trim()) {
      payload.location = input.location.trim();
    }
    if (input.applicationMethod) {
      payload.applicationMethod = input.applicationMethod;
    }
    if (input.jobUrl?.trim()) {
      payload.jobUrl = input.jobUrl.trim();
    }
    if (input.isTailored !== undefined) {
      payload.isTailored = input.isTailored;
    }
    if (input.journeyWeek !== undefined) {
      payload.journeyWeek = input.journeyWeek;
    }
    if (input.hasAssignment !== undefined) {
      payload.hasAssignment = input.hasAssignment;
    }
    if (input.interviewDate?.trim()) {
      payload.interviewDate = input.interviewDate.trim();
    }
    if (input.prepChecklist !== undefined) {
      payload.prepChecklist = input.prepChecklist;
    }
    if (input.interviewNotes?.trim()) {
      payload.interviewNotes = input.interviewNotes.trim();
    }
    if (input.sharedWithGroup !== undefined) {
      payload.sharedWithGroup = input.sharedWithGroup;
    }

    const res = await request<any>("/applications", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return (res && res.data && !res.id ? res.data : res) as Application;
  },

  /**
   * PATCH /applications/:id
   */
  async updateApplication(
    id: string,
    input: UpdateApplicationInput,
  ): Promise<Application> {
    const payload: Record<string, any> = {};

    if (input.companyName !== undefined)
      payload.companyName = input.companyName.trim();
    if (input.jobTitle !== undefined) payload.jobTitle = input.jobTitle.trim();
    if (input.applicationDate !== undefined)
      payload.applicationDate = input.applicationDate || undefined;
    if (input.stage !== undefined) payload.stage = input.stage;
    if (input.outcome !== undefined) payload.outcome = input.outcome;
    if (input.applicationMethod !== undefined) {
      payload.applicationMethod = input.applicationMethod || null;
    }
    if (input.location !== undefined) {
      payload.location = input.location ? input.location.trim() : null;
    }
    if (input.jobUrl !== undefined) {
      payload.jobUrl =
        input.jobUrl && input.jobUrl.trim() ? input.jobUrl.trim() : null;
    }
    if (input.isTailored !== undefined) {
      payload.isTailored = input.isTailored;
    }
    if (input.hasAssignment !== undefined) {
      payload.hasAssignment = input.hasAssignment;
    }
    if (input.interviewDate !== undefined) {
      payload.interviewDate = input.interviewDate || null;
    }
    if (input.prepChecklist !== undefined) {
      payload.prepChecklist = input.prepChecklist;
    }
    if (input.interviewNotes !== undefined) {
      payload.interviewNotes = input.interviewNotes
        ? input.interviewNotes.trim()
        : null;
    }
    if (input.sharedWithGroup !== undefined) {
      payload.sharedWithGroup = input.sharedWithGroup;
    }

    const res = await request<any>(`/applications/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    return (res && res.data && !res.id ? res.data : res) as Application;
  },

  /**
   * DELETE /applications/:id
   */
  async deleteApplication(id: string): Promise<void> {
    await request<void>(`/applications/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  /**
   * GET /applications/dashboard
   * Returns aggregated active & closed counts.
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const data = await request<any>("/applications/dashboard", {
      method: "GET",
    });

    // Normalize response in case the backend returns nested or flat structure
    if (data && typeof data === "object") {
      if (data.active && data.closed) {
        return {
          active: {
            total: Number(data.active.total) || 0,
            applied: Number(data.active.applied) || 0,
            assignment: Number(data.active.assignment) || 0,
            interview: Number(data.active.interview) || 0,
            decision: Number(data.active.decision) || 0,
          },
          closed: {
            total: Number(data.closed.total) || 0,
            accepted: Number(data.closed.accepted) || 0,
            rejected: Number(data.closed.rejected) || 0,
            withdrawn: Number(data.closed.withdrawn) || 0,
            noResponse: Number(data.closed.noResponse) || 0,
          },
          recentApplications: normalizeRecentApplications(
            data.recentApplications,
          ),
          expiringSoonCount: Number(data.expiringSoonCount) || 0,
          recentNoResponseCount: Number(data.recentNoResponseCount) || 0,
        };
      }

      // Flat fallback
      const applied = Number(data.applied) || 0;
      const interview = Number(data.interview) || 0;
      const decision = Number(data.decision) || 0;
      const activeTotal =
        Number(data.totalActive) || applied + interview + decision;

      const accepted = Number(data.accepted) || 0;
      const rejected = Number(data.rejected) || 0;
      const withdrawn = Number(data.withdrawn) || 0;
      const noResponse = Number(data.noResponse) || 0;
      const closedTotal =
        Number(data.totalClosed) ||
        accepted + rejected + withdrawn + noResponse;

      return {
        active: {
          total: activeTotal,
          applied,
          assignment: Number(data.assignment) || 0,
          interview,
          decision,
        },
        closed: {
          total: closedTotal,
          accepted,
          rejected,
          withdrawn,
          noResponse,
        },
        recentApplications: normalizeRecentApplications(
          data.recentApplications,
        ),
        expiringSoonCount: Number(data.expiringSoonCount) || 0,
        recentNoResponseCount: Number(data.recentNoResponseCount) || 0,
      };
    }

    return {
      active: {
        total: 0,
        applied: 0,
        assignment: 0,
        interview: 0,
        decision: 0,
      },
      closed: {
        total: 0,
        accepted: 0,
        rejected: 0,
        withdrawn: 0,
        noResponse: 0,
      },
      expiringSoonCount: 0,
      recentNoResponseCount: 0,
      recentApplications: [],
    };
  },

  getTasks(params: { page?: number; limit?: number } = {}): Promise<TaskPage> {
    const query = new URLSearchParams();
    query.set("page", String(params.page ?? 1));
    query.set("limit", String(params.limit ?? 50));
    return request<TaskPage>(`/tasks?${query}`);
  },

  getTask(taskId: string): Promise<ProfessionalTask> {
    return request<ProfessionalTask>(`/tasks/${encodeURIComponent(taskId)}`);
  },

  createTask(input: CreateTaskInput): Promise<ProfessionalTask> {
    return request<ProfessionalTask>("/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updatePersonalTask(
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<ProfessionalTask> {
    return request<ProfessionalTask>(`/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  deletePersonalTask(taskId: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(
      `/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "DELETE",
      },
    );
  },

  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
  ): Promise<ProfessionalTask> {
    return request<ProfessionalTask>(
      `/tasks/${encodeURIComponent(taskId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    );
  },

  addChecklistItem(taskId: string, title: string) {
    return request<ProfessionalTask["checklist"][number]>(
      `/tasks/${encodeURIComponent(taskId)}/checklist`,
      {
        method: "POST",
        body: JSON.stringify({ title }),
      },
    );
  },

  updateChecklistItem(
    taskId: string,
    itemId: string,
    input: { title?: string; completed?: boolean; position?: number },
  ) {
    return request<ProfessionalTask["checklist"][number]>(
      `/tasks/${encodeURIComponent(taskId)}/checklist/${encodeURIComponent(itemId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
  },

  deleteChecklistItem(
    taskId: string,
    itemId: string,
  ): Promise<{ success: boolean }> {
    return request(
      `/tasks/${encodeURIComponent(taskId)}/checklist/${encodeURIComponent(itemId)}`,
      { method: "DELETE" },
    );
  },

  addPersonalNote(taskId: string, content: string): Promise<TaskNote> {
    return request<TaskNote>(`/tasks/${encodeURIComponent(taskId)}/notes`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  markMentorFeedbackRead(
    taskId: string,
    noteId: string,
  ): Promise<{ success: boolean }> {
    return request(
      `/tasks/${encodeURIComponent(taskId)}/notes/${encodeURIComponent(noteId)}/read`,
      { method: "PATCH" },
    );
  },

  getProfessionalDevelopmentSummary(): Promise<ProfessionalDevelopmentSummary> {
    return request<ProfessionalDevelopmentSummary>(
      "/dashboard/professional-development",
    );
  },

  getFeedback(params?: {
    scope?: FeedbackScope;
    kind?: "guidance" | "member";
    page?: number;
    limit?: number;
  }): Promise<FeedbackPage> {
    const query = new URLSearchParams();
    if (params?.scope) query.set("scope", params.scope);
    if (params?.kind) query.set("kind", params.kind);
    query.set("page", String(params?.page ?? 1));
    query.set("limit", String(params?.limit ?? 20));
    return request<FeedbackPage>(`/feedback?${query}`);
  },

  getFeedbackItem(feedbackId: string): Promise<FeedbackPost> {
    return request<FeedbackPost>(`/feedback/${encodeURIComponent(feedbackId)}`);
  },

  markFeedbackRead(feedbackId: string) {
    return request<{ success: boolean; feedbackId: string; readAt: string }>(
      `/feedback/${encodeURIComponent(feedbackId)}/read`,
      { method: "POST" },
    );
  },

  getFeedbackUnreadCount(): Promise<FeedbackUnreadCount> {
    return request<FeedbackUnreadCount>("/feedback/unread-count");
  },
};
