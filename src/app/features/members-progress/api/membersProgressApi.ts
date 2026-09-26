import type {
  MemberProgress,
  MemberProgressCounts,
  RecentMemberProgress,
} from "../types/membersProgress.types";

const BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3000"
).replace(/\/$/, "");

function normalizeCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function normalizeMember(value: unknown): MemberProgress {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid members progress response");
  }
  const member = value as Record<string, unknown>;
  const counts = member.counts as Record<string, unknown> | null;
  if (member.userId == null || typeof member.name !== "string" || !counts) {
    throw new Error("Invalid members progress response");
  }

  const normalizedCounts: MemberProgressCounts = {
    applied: normalizeCount(counts.applied),
    interview: normalizeCount(counts.interview),
    decision: normalizeCount(counts.decision),
    closed: normalizeCount(counts.closed),
  };
  return {
    userId: String(member.userId),
    name: member.name,
    ...(typeof member.isCurrentUser === "boolean"
      ? { isCurrentUser: member.isCurrentUser }
      : {}),
    counts: normalizedCounts,
  };
}

const STAGES = ["APPLIED", "INTERVIEW", "DECISION", "CLOSED"];
const OUTCOMES = ["ACCEPTED", "REJECTED", "WITHDRAWN"];

function normalizeRecentEvent(value: unknown): RecentMemberProgress {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid recent progress response");
  }
  const event = value as Record<string, unknown>;
  const user = event.user as Record<string, unknown> | null;
  const application = event.application as Record<string, unknown> | null;
  if (
    typeof event.id !== "string" ||
    !user ||
    typeof user.id !== "string" ||
    typeof user.name !== "string" ||
    !application ||
    typeof application.jobTitle !== "string" ||
    typeof application.companyName !== "string" ||
    typeof event.fromStage !== "string" ||
    !STAGES.includes(event.fromStage) ||
    typeof event.toStage !== "string" ||
    !STAGES.includes(event.toStage) ||
    typeof event.changedAt !== "string" ||
    (event.outcome !== null &&
      (typeof event.outcome !== "string" || !OUTCOMES.includes(event.outcome)))
  ) {
    throw new Error("Invalid recent progress response");
  }

  return {
    id: event.id,
    user: { id: user.id, name: user.name },
    application: {
      jobTitle: application.jobTitle,
      companyName: application.companyName,
    },
    fromStage: event.fromStage as RecentMemberProgress["fromStage"],
    toStage: event.toStage as RecentMemberProgress["toStage"],
    outcome: event.outcome as RecentMemberProgress["outcome"],
    changedAt: event.changedAt,
  };
}

export const membersProgressApi = {
  async getMembersProgress(): Promise<MemberProgress[]> {
    const response = await fetch(`${BASE_URL}/members/progress`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      const error = new Error("Unable to load members progress") as Error & {
        status?: number;
      };
      error.status = response.status;
      throw error;
    }

    const payload: unknown = await response.json();
    const members = Array.isArray(payload)
      ? payload
      : (payload as { data?: unknown } | null)?.data;
    if (!Array.isArray(members))
      throw new Error("Invalid members progress response");
    // Pick only fields in the public progress contract; private fields are never rendered.
    return members.map(normalizeMember);
  },

  async getRecentProgress(limit = 10): Promise<RecentMemberProgress[]> {
    const safeLimit = Math.max(1, Math.min(50, Math.floor(limit) || 10));
    const response = await fetch(
      `${BASE_URL}/members/progress/recent?limit=${safeLimit}`,
      {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      },
    );
    if (!response.ok) {
      const error = new Error(
        "Unable to load recent member progress",
      ) as Error & {
        status?: number;
      };
      error.status = response.status;
      throw error;
    }

    const payload: unknown = await response.json();
    const events = Array.isArray(payload)
      ? payload
      : (payload as { data?: unknown } | null)?.data;
    if (!Array.isArray(events)) {
      throw new Error("Invalid recent progress response");
    }
    return events.map(normalizeRecentEvent);
  },
};
