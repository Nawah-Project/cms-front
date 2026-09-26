import type { Outcome, Stage } from "../../../types";

export interface MemberProgressCounts {
  applied: number;
  interview: number;
  decision: number;
  closed: number;
}

export interface MemberProgress {
  userId: string;
  name: string;
  isCurrentUser?: boolean;
  counts: MemberProgressCounts;
}

export interface RecentMemberProgress {
  id: string;
  user: { id: string; name: string };
  application: { jobTitle: string; companyName: string };
  fromStage: Stage;
  toStage: Stage;
  outcome: Exclude<Outcome, "NONE"> | null;
  changedAt: string;
}
