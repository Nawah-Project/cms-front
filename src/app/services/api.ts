import type {
  Application,
  CreateApplicationInput,
  DashboardApplication,
  DashboardStats,
  Outcome,
  Stage,
  UpdateApplicationInput,
} from "../types";
import { notifyAuthSessionExpired } from "../utils/authSession";

/**
 * Clean API service layer for consuming the Job Application Tracking backend.
 * Uses VITE_API_URL (defaults to http://localhost:3000).
 */
const BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3000"
).replace(/\/$/, "");

class ApiError extends Error {
  public status: number;
  public details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

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
      !["NONE", "ACCEPTED", "REJECTED", "WITHDRAWN"].includes(
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
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) notifyAuthSessionExpired();
    let errorMessage = `Request failed with status ${response.status}`;
    let details: any;
    try {
      const errorJson = await response.json();
      if (Array.isArray(errorJson.message)) {
        errorMessage = errorJson.message.join(", ");
      } else {
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      }
      details = errorJson;
    } catch {
      const text = await response.text();
      if (text) errorMessage = text;
    }
    throw new ApiError(errorMessage, response.status, details);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  /**
   * GET /applications
   * Supports filtering by stage, outcome, and text search.
   * Handles both flat array responses and paginated { data: [] } responses.
   */
  async getApplications(params?: {
    stage?: string;
    outcome?: string;
    search?: string;
    limit?: number;
  }): Promise<Application[]> {
    const searchParams = new URLSearchParams();
    const isActiveFilter = params?.stage === "ACTIVE";

    // Forward valid backend stage enum to query params, avoid invalid "ACTIVE" string
    if (params?.stage && !isActiveFilter) {
      searchParams.set("stage", params.stage);
    }
    if (params?.outcome) searchParams.set("outcome", params.outcome);
    if (params?.search) searchParams.set("search", params.search);
    searchParams.set("limit", String(params?.limit ?? 100));

    const query = searchParams.toString();
    const endpoint = `/applications${query ? `?${query}` : ""}`;
    const res = await request<any>(endpoint, { method: "GET" });

    let items: Application[] = [];
    if (Array.isArray(res)) {
      items = res;
    } else if (res && Array.isArray(res.data)) {
      items = res.data;
    }

    if (isActiveFilter) {
      items = items.filter((app) => app.stage !== "CLOSED");
    }

    return items;
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
            interview: Number(data.active.interview) || 0,
            decision: Number(data.active.decision) || 0,
          },
          closed: {
            total: Number(data.closed.total) || 0,
            accepted: Number(data.closed.accepted) || 0,
            rejected: Number(data.closed.rejected) || 0,
            withdrawn: Number(data.closed.withdrawn) || 0,
          },
          recentApplications: normalizeRecentApplications(
            data.recentApplications,
          ),
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
      const closedTotal =
        Number(data.totalClosed) || accepted + rejected + withdrawn;

      return {
        active: {
          total: activeTotal,
          applied,
          interview,
          decision,
        },
        closed: {
          total: closedTotal,
          accepted,
          rejected,
          withdrawn,
        },
        recentApplications: normalizeRecentApplications(
          data.recentApplications,
        ),
      };
    }

    return {
      active: { total: 0, applied: 0, interview: 0, decision: 0 },
      closed: { total: 0, accepted: 0, rejected: 0, withdrawn: 0 },
      recentApplications: [],
    };
  },
};
