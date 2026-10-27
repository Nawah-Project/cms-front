import { fetchApi } from "../../lib/api-client";
import type { SectionAssignment, SectionId } from "./SectionExperience";
export type LabRegistry = {
  id: SectionId;
  titleAr: string;
  titleEn: string;
  versions: ("A" | "B")[];
  metrics: string[];
};
export type LabExperiment = {
  id: string;
  title: string;
  hypothesis: string;
  section: SectionId;
  treatment: string;
  status: "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED";
  audience: "ALL" | "GROUPS" | "USERS";
  groupIds: string[];
  userIds: string[];
  allocation: number;
  primaryMetric: string;
  minSample: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  _count?: { assignments: number };
};
export type LabConfig = {
  baseline: string;
  registry: LabRegistry[];
  releases: Record<SectionId, SectionAssignment>;
  experiments: LabExperiment[];
};
export type LabArm = {
  version: string;
  exposed: number;
  converted: number;
  errors: number;
  medianSeconds: number | null;
  rate: number | null;
};
export type LabComparison = {
  experimentId: string;
  primaryMetric: string;
  minSample: number;
  arms: LabArm[];
  sufficient: boolean;
  deltaPoints: number | null;
  interpretation: string;
};
export type LabReport = {
  days: number;
  since: string;
  generatedAt: string;
  rollup: {
    section: string;
    version: string;
    name: string;
    users: number;
    events: number;
    seconds: number;
  }[];
  daily: {
    day: string;
    views: number;
    users: number;
    actions: number;
    errors: number;
  }[];
  sections: {
    section: SectionId;
    visitors: number;
    sessions: number;
    engagedSeconds: number;
    actedUsers: number;
    errorUsers: number;
    medianFirstActionSeconds: number | null;
    actionRate: number | null;
  }[];
  comparisons: LabComparison[];
  guides: { flowKey: string; status: string; count: number }[];
  activation: {
    total: number;
    stages: {
      code: string;
      titleAr: string;
      titleEn: string;
      count: number;
      percent: number | null;
    }[];
    waiting: {
      id: string;
      name: string;
      node: string;
      applications: number;
      days: number | null;
      reason: string;
    }[];
  };
};
export type CreateExperiment = Pick<
  LabExperiment,
  | "title"
  | "hypothesis"
  | "section"
  | "audience"
  | "groupIds"
  | "userIds"
  | "allocation"
  | "primaryMetric"
  | "minSample"
>;
export const labApi = {
  config: () => fetchApi<LabConfig>("/admin/ux-lab/v2/config"),
  report: (days: number, groupId?: string, experimentId?: string) =>
    fetchApi<LabReport>("/admin/ux-lab/v2/report", {
      params: { days, groupId, experimentId },
    }),
  create: (body: CreateExperiment) =>
    fetchApi<LabExperiment>("/admin/ux-lab/v2/experiments", {
      method: "POST",
      body,
    }),
  status: (id: string, status: string) =>
    fetchApi<LabExperiment>("/admin/ux-lab/v2/experiments/" + id, {
      method: "PATCH",
      body: { status },
    }),
  publish: (section: SectionId, version: string, expectedContext: string) =>
    fetchApi<SectionAssignment>("/admin/ux-lab/v2/releases/" + section, {
      method: "POST",
      body: { version, expectedContext },
    }),
};
export const METRIC_LABELS: Record<string, [string, string]> = {
  application_created: ["طلب محفوظ", "Application saved"],
  application_stage_updated: ["مرحلة طلب محدثة", "Stage updated"],
  feedback_read: ["إرشاد مقروء", "Guidance read"],
  prompt_copied: ["قالب منسوخ", "Prompt copied"],
  task_status_changed: ["حالة مهمة محدثة", "Task updated"],
  member_detail_loaded: [
    "سجل زميل معروض بنجاح",
    "Member application history loaded",
  ],
  member_profile_loaded: [
    "ملف زميل معروض",
    "Member professional profile opened",
  ],
  linked_applications_opened: [
    "طلبات فترة تغيير معروضة",
    "Change cohort applications opened",
  ],
  profile_saved: ["ملف مهني محفوظ", "Profile saved"],
  onboarding_completed: ["استقبال مكتمل", "Welcome completed"],
  request_failed: ["فشل طلب للخادم", "Server request failed"],
  validation_failed: ["تعذر اجتياز التحقق", "Validation failed"],
  view: ["عرض قسم", "Section view"],
  engaged: ["وقت نشاط", "Active engagement"],
};
