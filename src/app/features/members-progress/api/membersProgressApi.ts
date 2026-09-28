import type { Outcome, Stage } from "../../../types";
import type {
  MemberApplication,
  MemberDetail,
  MemberProgress,
  MemberProgressCounts,
  MemberSummary,
  RecentMemberProgress,
} from "../types/membersProgress.types";
import { notifyAuthSessionExpired } from "../../../utils/authSession";

const BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3000"
).replace(/\/$/, "");

const STAGES: Stage[] = ["APPLIED", "INTERVIEW", "DECISION", "CLOSED"];
const OUTCOMES: Exclude<Outcome, "NONE">[] = [
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "NO_RESPONSE",
];

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

function normalizeAvatar(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeMemberSummary(value: unknown): MemberSummary {
  const member = objectValue(value);
  if (
    !member ||
    typeof member.id !== "string" ||
    typeof member.name !== "string"
  ) {
    throw new Error("Invalid member response");
  }
  return {
    id: member.id,
    name: member.name,
    avatar: normalizeAvatar(member.avatar),
  };
}

function normalizeMember(value: unknown): MemberProgress {
  const member = objectValue(value);
  const counts = objectValue(member?.counts);
  const memberId = member?.memberId ?? member?.userId;
  if (
    !member ||
    typeof memberId !== "string" ||
    typeof member.name !== "string" ||
    !counts
  ) {
    throw new Error("Invalid members progress response");
  }

  const normalizedCounts: MemberProgressCounts = {
    applied: normalizeCount(counts.applied),
    interview: normalizeCount(counts.interview),
    decision: normalizeCount(counts.decision),
    closed: normalizeCount(counts.closed),
  };
  return {
    memberId,
    userId: typeof member.userId === "string" ? member.userId : memberId,
    name: member.name,
    avatar: normalizeAvatar(member.avatar),
    portfolioUrl:
      typeof member.portfolioUrl === "string" ? member.portfolioUrl : null,
    hasCv: member.hasCv === true,
    hasAcceptedApplication: member.hasAcceptedApplication === true,
    isCurrentUser:
      typeof member.isCurrentUser === "boolean"
        ? member.isCurrentUser
        : undefined,
    lastUpdatedAt:
      typeof member.lastUpdatedAt === "string" ? member.lastUpdatedAt : null,
    counts: normalizedCounts,
  };
}

function normalizeRecentEvent(value: unknown): RecentMemberProgress {
  const event = objectValue(value);
  const member = objectValue(event?.member);
  const application = objectValue(event?.application);
  const fromStage = event?.fromStage ?? null;
  const outcome = event?.outcome ?? null;
  if (
    !event ||
    typeof event.id !== "string" ||
    !member ||
    typeof member.id !== "string" ||
    typeof member.name !== "string" ||
    !application ||
    typeof application.id !== "string" ||
    typeof application.jobTitle !== "string" ||
    typeof application.companyName !== "string" ||
    (fromStage !== null &&
      (typeof fromStage !== "string" ||
        !STAGES.includes(fromStage as Stage))) ||
    typeof event.toStage !== "string" ||
    !STAGES.includes(event.toStage as Stage) ||
    typeof event.changedAt !== "string" ||
    (outcome !== null &&
      (typeof outcome !== "string" ||
        !OUTCOMES.includes(outcome as Exclude<Outcome, "NONE">)))
  ) {
    throw new Error("Invalid recent progress response");
  }

  return {
    id: event.id,
    memberId: typeof event.memberId === "string" ? event.memberId : member.id,
    member: normalizeMemberSummary(member),
    application: {
      id: application.id,
      jobTitle: application.jobTitle,
      companyName: application.companyName,
      jobUrl:
        typeof application.jobUrl === "string" ? application.jobUrl : null,
      applicationMethod:
        typeof application.applicationMethod === "string"
          ? application.applicationMethod
          : null,
    },
    fromStage: fromStage as Stage | null,
    toStage: event.toStage as Stage,
    outcome: outcome as RecentMemberProgress["outcome"],
    changedAt: event.changedAt,
  };
}

function normalizeApplication(value: unknown): MemberApplication {
  const app = objectValue(value);
  const outcome = app?.outcome;
  if (
    !app ||
    typeof app.id !== "string" ||
    typeof app.companyName !== "string" ||
    typeof app.jobTitle !== "string" ||
    typeof app.applicationDate !== "string" ||
    typeof app.stage !== "string" ||
    !STAGES.includes(app.stage as Stage) ||
    typeof app.updatedAt !== "string" ||
    (outcome !== null &&
      outcome !== "NONE" &&
      (typeof outcome !== "string" ||
        !OUTCOMES.includes(outcome as Exclude<Outcome, "NONE">)))
  ) {
    throw new Error("Invalid member application response");
  }
  const otherMembers = Array.isArray(app.otherMembers)
    ? app.otherMembers.map(normalizeMemberSummary)
    : [];
  return {
    id: app.id,
    companyName: app.companyName,
    jobTitle: app.jobTitle,
    applicationDate: app.applicationDate,
    location: typeof app.location === "string" ? app.location : null,
    applicationMethod:
      typeof app.applicationMethod === "string" ? app.applicationMethod : null,
    jobUrl: typeof app.jobUrl === "string" ? app.jobUrl : null,
    stage: app.stage as Stage,
    outcome:
      outcome === "NONE" || outcome === null
        ? null
        : (outcome as MemberApplication["outcome"]),
    updatedAt: app.updatedAt,
    sharedCompany: app.sharedCompany === true,
    otherMembers,
  };
}

function unwrapArray(payload: unknown, message: string): unknown[] {
  const data = Array.isArray(payload) ? payload : objectValue(payload)?.data;
  if (!Array.isArray(data)) throw new Error(message);
  return data;
}

async function get<T>(path: string, message: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    if (response.status === 401) notifyAuthSessionExpired();
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

export const membersProgressApi = {
  async getMembersProgress(): Promise<MemberProgress[]> {
    const payload = await get<unknown>(
      "/members/progress",
      "Unable to load members progress",
    );
    return unwrapArray(payload, "Invalid members progress response").map(
      normalizeMember,
    );
  },

  async getActivity(limit = 20): Promise<RecentMemberProgress[]> {
    const safeLimit = Math.max(1, Math.min(50, Math.floor(limit) || 20));
    const payload = await get<unknown>(
      `/members/progress/activity?limit=${safeLimit}`,
      "Unable to load recent member activity",
    );
    return unwrapArray(payload, "Invalid recent activity response").map(
      normalizeRecentEvent,
    );
  },

  async getRecentProgress(limit = 20): Promise<RecentMemberProgress[]> {
    return this.getActivity(limit);
  },

  async getMemberDetail(memberId: string): Promise<MemberDetail> {
    const payload = await get<unknown>(
      `/members/progress/${encodeURIComponent(memberId)}`,
      "Unable to load member details",
    );
    const detail = objectValue(payload);
    const member = objectValue(detail?.member);
    if (
      !detail ||
      !member ||
      typeof member.id !== "string" ||
      typeof member.name !== "string" ||
      !Array.isArray(detail.applications)
    ) {
      throw new Error("Invalid member detail response");
    }
    return {
      member: {
        ...normalizeMemberSummary(member),
        lastUpdatedAt:
          typeof member.lastUpdatedAt === "string"
            ? member.lastUpdatedAt
            : null,
      },
      applications: detail.applications.map(normalizeApplication),
    };
  },
};
