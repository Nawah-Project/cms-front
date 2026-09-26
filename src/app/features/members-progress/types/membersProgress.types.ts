import type { Outcome, Stage } from "../../../types";

export interface MemberProgressCounts {
  applied: number;
  interview: number;
  decision: number;
  closed: number;
}

export interface MemberSummary {
  id: string;
  name: string;
  avatar: string | null;
}

export interface MemberProgress {
  memberId: string;
  /** Retained because older responses and the current auth session use userId. */
  userId: string;
  name: string;
  avatar: string | null;
  portfolioUrl: string | null;
  hasCv: boolean;
  isCurrentUser?: boolean;
  lastUpdatedAt: string | null;
  counts: MemberProgressCounts;
}

export interface RecentMemberProgress {
  id: string;
  memberId: string;
  member: MemberSummary;
  application: {
    id: string;
    companyName: string;
    jobTitle: string;
    jobUrl: string | null;
    applicationMethod: string | null;
  };
  fromStage: Stage | null;
  toStage: Stage;
  outcome: Exclude<Outcome, "NONE"> | null;
  changedAt: string;
}

export interface MemberApplication {
  id: string;
  companyName: string;
  jobTitle: string;
  applicationDate: string;
  location: string | null;
  applicationMethod: string | null;
  jobUrl: string | null;
  stage: Stage;
  outcome: Exclude<Outcome, "NONE"> | null;
  updatedAt: string;
  sharedCompany: boolean;
  otherMembers: MemberSummary[];
}

export interface MemberDetail {
  member: MemberSummary & { lastUpdatedAt: string | null };
  applications: MemberApplication[];
}
