import { apiClient } from '../../../lib/api-client';
export type Person = {
  id: string;
  name: string;
  targetJobTitle?: string | null;
  canOwn?: boolean;
};
export type AccessDecision = {
  resourceType: string;
  resourceId: string;
  view: boolean;
  interact: boolean;
  source: 'NORMAL' | 'ADMIN' | 'SCHEDULED' | 'EXPIRED' | 'REVOKED' | 'LOCKED';
  reason: string;
  endsAt?: string | null;
};
export type ReportAccess = {
  performance: AccessDecision;
  weeks: AccessDecision[];
  final: AccessDecision;
};
export type CaseStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
export interface CaseRow {
  id: string;
  title: string;
  goal: string;
  status: CaseStatus;
  nextStep: string | null;
  followUpAt: string | null;
  updatedAt: string;
  consentStatus: string;
  retentionUntil: string;
  user: Person;
  owner: Person;
  _count: { observations: number };
}
export interface Session {
  id: string;
  kind: string;
  heldAt: string;
  goal: string;
  topics: string[];
  participantStatements: string | null;
  researcherObservations: string | null;
  barriers: string | null;
  hypotheses: string | null;
  agreements: string | null;
  nextActions: string | null;
  outcome: string | null;
  followUpAt: string | null;
  followUpStatus: string;
}
export interface Observation {
  id: string;
  sessionId: string | null;
  kind: string;
  lens: string;
  content: string;
  evidence: string | null;
  status: string;
  isBarrier: boolean;
  createdAt: string;
}
export interface PlanItem {
  id: string;
  title: string;
  goal: string | null;
  activity: string | null;
  completionCondition: string;
  resourceUrl: string | null;
  nodeCode: string | null;
  status: string;
  dueAt: string | null;
  task: { id: string; title: string; status: string } | null;
  feedback: {
    id: string;
    title: string;
    archivedAt: string | null;
    reads: { readAt: string }[];
  } | null;
}
export interface Grant {
  id: string;
  resourceType: string;
  resourceId: string;
  permission: string;
  reason: string;
  issuedBy: string;
  startsAt: string;
  endsAt: string | null;
  status: string;
  revokedAt: string | null;
  effectiveSource: string;
}
export interface CaseDetail extends Omit<CaseRow, 'owner' | '_count'> {
  userId: string;
  ownerId: string;
  allowedAdminIds: string[];
  hypothesis: string;
  consentAt: string | null;
  consentMethod: string | null;
  consentEvidence: string | null;
  consentWithdrawnAt: string | null;
  user: Person & {
    portfolioUrl: string | null;
    journeyState: {
      currentNodeCode: string;
      currentWeek: number;
      completedNodeCodes: string[];
      readInsightCodes: string[];
    } | null;
    cv: { originalName: string } | null;
    _count: { applications: number; assignedTasks: number };
  };
  sessions: Session[];
  observations: Observation[];
  planItems: PlanItem[];
  overrides: Grant[];
  effectiveOverrides: {
    resourceType: string;
    resourceId: string;
    permission: string;
  }[];
  events: {
    id: string;
    actorId: string | null;
    action: string;
    metadata?: {
      changedFields?: string[];
      caseStatusBefore?: string;
      entityStatus?: string;
    };
    entityId: string | null;
    createdAt: string;
  }[];
  review: {
    observedChange: string;
    learning: string;
    insufficientEvidence: string;
  } | null;
  canWrite: boolean;
  canManageAccess: boolean;
  accessOverview: AccessDecision[];
  counts: {
    sessions: number;
    observations: number;
    planItems: number;
    events: number;
  };
  resourceOptions: {
    assignedTasks: { id: string; title: string; status: string }[];
    directFeedback: { id: string; title: string }[];
  };
}
const base = '/admin/individual-research';
export const studioApi = {
  list: (params: { search?: string; status?: string; page?: number }) =>
    apiClient.get<{
      items: CaseRow[];
      total: number;
      page: number;
      limit: number;
    }>(base + '/cases', { params }),
  detail: (id: string) => apiClient.get<CaseDetail>(base + '/cases/' + id),
  candidates: (search = '') =>
    apiClient.get<Person[]>(base + '/candidates', { params: { search } }),
  staff: () => apiClient.get<Person[]>(base + '/staff'),
  create: (body: unknown) =>
    apiClient.post<{ id: string }>(base + '/cases', body),
  patch: (id: string, body: unknown) =>
    apiClient.patch(base + '/cases/' + id, body),
  action: (id: string, path: string, body: unknown) =>
    apiClient.post(base + '/cases/' + id + '/' + path, body),
  patchResource: (id: string, path: string, body: unknown) =>
    apiClient.patch(base + '/cases/' + id + '/' + path, body),
  remove: (id: string) => apiClient.delete(base + '/cases/' + id),
};
