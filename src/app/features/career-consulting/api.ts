import { API_BASE_URL,fetchApi } from "../../lib/api-client";
export type Localized = { ar: string; en: string };
export type Prompt = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "ranked" | "matrix";
};
export type Content = Record<string, any>;
export type Kind =
  "WORK" | "ACTIVITY" | "SESSION" | "EVIDENCE" | "RECOMMENDATION";
export type Item = {
  id: string;
  kind: Kind;
  title: string;
  draft: Content;
  privateNotes: string;
  revision: number;
  updatedAt: string;
  archived: boolean;
};
export type Publication = {
  id: string;
  itemId: string;
  kind: Kind;
  revision: number;
  content: Content;
  createdAt: string;
};
export type Submission = {
  id: string;
  activityId: string;
  publicationId: string;
  version: number;
  answers: Content;
  fileIds: string[];
  createdAt: string;
};
export type Review = {
  id: string;
  submissionId: string;
  body: string;
  nextStep: string;
  revision: number;
  updatedAt: string;
};
export type CaseSummary = {
  id: string;
  title: string;
  status: string;
  consentStatus: string;
  updatedAt: string;
  retentionUntil: string;
  user: { id: string; name: string };
  owner: { name: string };
  _count: { submissions: number };
};
export type CaseData = {
  id: string;
  title: string;
  purpose: string;
  status: string;
  consentStatus: string;
  consentAt: string | null;
  retentionUntil: string;
  programmeSharing: boolean;
  agreementVersion: string;
  person: { id: string; name: string };
  consultantName: string;
  publications: Publication[];
  submissions: Submission[];
  reviews: Review[];
  decisions: {
    id: string;
    publicationId: string;
    choice: string;
    body: string;
    createdAt: string;
  }[];
  comments: {
    id: string;
    targetId: string | null;
    targetKind: string;
    body: string;
    private: boolean;
    authorRole: string;
    createdAt: string;
  }[];
  files: {
    id: string;
    originalName: string;
    size: number;
    shared: boolean;
    createdBy: string;
    createdAt: string;
  }[];
  drafts: {
    id: string;
    publicationId: string;
    answers: Content;
    fileIds: string[];
    revision: number;
    lastSubmittedAt: string | null;
  }[];
  items?: Item[];
  events?: {
    id: string;
    action: string;
    entityId: string;
    actorId: string;
    createdAt: string;
  }[];
  ownerId?: string;
  allowedAdminIds?: string[];
  revision?: number;
  canWrite?: boolean;
  canManageAccess?: boolean;
  maxFileBytes: number;
};
export type Lesson = {
  id: string;
  title: Localized;
  goal: Localized;
  body: Localized[];
  example: Localized;
  exercise: Localized[];
  pitfalls: Localized[];
  sources: string[];
};
export type Activity = {
  id: string;
  title: Localized;
  purpose: Localized;
  indications: Localized;
  avoid: Localized;
  expectedOutput: Localized;
  fields: { key: string; kind: Prompt["kind"]; label: Localized }[];
  review: Localized[];
  sources: string[];
};
export type Catalog = {
  version: string;
  lessons: Lesson[];
  activities: Activity[];
  sources: { id: string; title: string; location: string; note?: Localized }[];
};
export const base = (member: boolean) =>
  member ? "/career-consulting" : "/admin/career-consulting";
export const read = <T>(path: string) => fetchApi<T>(path);
export const write = <T = { id: string }>(
  path: string,
  data: Content = {},
  method: "POST" | "PATCH" | "DELETE" = "POST",
) =>
  fetchApi<T>(path, {
    method,
    body: { requestId: crypto.randomUUID(), ...data },
  });
export const fileUrl = (member: boolean, c: string, f: string) =>
  `${API_BASE_URL}${base(member)}/cases/${c}/files/${f}`;
export async function upload(member: boolean, c: string, file: File) {
  const body = new FormData();
  body.append("requestId", crypto.randomUUID());
  body.append("file", file);
  return fetchApi<{ id: string }>(`${base(member)}/cases/${c}/files`, {
    method: "POST",
    body,
  });
}
