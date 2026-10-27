import { fetchApi } from "../../../lib/api-client";
export type Gate =
  | "PROFILE"
  | "GUIDE"
  | "CV"
  | "APPLICATIONS"
  | "TAILORED"
  | "POSTS"
  | "OUTREACH"
  | "REVIEW"
  | "TIME"
  | "READY"
  | "NOT_STARTED"
  | "FINISHED"
  | "UNKNOWN";
export type Scope = {
  days: number;
  idleDays: number;
  groupId?: string;
  userId?: string;
};
export type Person = {
  id: string;
  name: string;
  group: { id: string; name: string } | null;
  registeredAt: string;
  currentCode: string;
  currentWeek: number;
  completedCodes: string[];
  startedAt: string | null;
  lastWorkAt: string | null;
  counts: {
    apps: number;
    tailored: number;
    posts: number;
    outreach: number;
    reviews: number;
  };
  guideStatus: string | null;
  guideStep: number;
  unlockedCodes: string[];
  readCodes: string[];
  gate: Gate;
  needsReview: boolean;
  elapsedDays: number | null;
  idleForDays: number;
  completedCurrent: boolean;
  availableAt: string | null;
  waitHours: number | null;
  missing: {
    apps: number;
    tailored: number;
    posts: number;
    outreach: number;
    reviews: number;
  };
  foundationCompleted: boolean;
};
export type Station = {
  code: string;
  weekNumber: number;
  orderIndex: number;
  titleAr: string;
  titleEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  nodeType: string;
  durationDays: number;
  requiredAppsCount: number;
  requiredTailoredCount: number;
  requiredPostsCount: number;
  requiredOutreachCount: number;
  unlocksInsightCode: string | null;
  nextNodeCode: string | null;
  current: number;
  entered: number;
  completed: number;
  completionRate: number | null;
  needsReview: number;
  timeWait: number;
  cvWait: number;
  guideWait: number;
  ready: number;
  completedInWindow: number;
  transitionsInWindow: number;
  observedVisits: number;
  medianHours: number | null;
  missingApps: number;
};
export type Guidance = {
  code: string;
  nodeCode: string | null;
  week: number;
  titleAr: string;
  titleEn: string;
  unlocked: number;
  read: number;
  readRate: number | null;
  unreadIds: string[];
  datedReads: number;
  applied: number | null;
  actionKind: string | null;
  foundationCompleted: number | null;
};
export type JourneyMap = {
  scope: {
    days: number;
    idleDays: number;
    groupId: string | null;
    userId: string | null;
    now: string;
    since: string;
  };
  directory: { id: string; name: string; groupId: string | null }[];
  groups: { id: string; name: string; members: number }[];
  admins: { id: string; name: string }[];
  nodes: Station[];
  members: Person[];
  guidance: Guidance[];
  weeks: {
    week: number;
    current: number;
    entered: number;
    completed: number;
    needsReview: number;
    transitionsInWindow: number;
  }[];
  daily: { day: string; users: number; transitions: number }[];
  timeline: {
    kind: string;
    code: string;
    at: string;
    nextCode?: string | null;
    enteredAt?: string | null;
  }[];
  summary: {
    people: number;
    started: number;
    finished: number;
    needsReview: number;
    timeWait: number;
    cvWait: number;
    guideWait: number;
    transitionsInWindow: number;
    transitionUsersInWindow: number;
    pairedDurationSamples: number;
    knownCompleted: number;
    unmappedStates: number;
  };
  quality: {
    historyWindowDays: number;
    transitionTimelineLimit: number;
    individualTimelineLimit: number;
    duration: string;
    guidanceApplication: string;
    unmeasuredGuidance: number;
    legacyCompletionDatesReconstructed: boolean;
  };
};
export type Observation = {
  id: string;
  nodeCode: string;
  groupId: string | null;
  subjectUserId: string | null;
  title: string;
  hypothesis: string;
  nextAction: string;
  category: "FRICTION" | "OPPORTUNITY" | "QUESTION";
  status: "OPEN" | "VALIDATING" | "RESOLVED";
  authorId: string;
  ownerId: string | null;
  authorName: string | null;
  ownerName: string | null;
  createdAt: string;
  updatedAt: string;
  evidence: {
    capturedAt: string;
    people: number;
    days: number;
    idleDays: number;
    station: {
      code: string;
      current: number;
      entered: number;
      completed: number;
      needsReview: number;
      timeWait: number;
      cvWait: number;
      guideWait: number;
      medianHours: number | null;
      observedVisits: number;
    };
  };
};
export type ObservationPage = {
  items: Observation[];
  total: number;
  page: number;
  pageSize: number;
};
const ROOT = "/admin/ux-lab/v2";
export const journeyResearchApi = {
  map: (scope: Scope) =>
    fetchApi<JourneyMap>(ROOT + "/journey-map", { params: scope }),
  notes: (scope: Scope, nodeCode?: string, page = 1) =>
    fetchApi<ObservationPage>(ROOT + "/journey-observations", {
      params: { groupId: scope.groupId, userId: scope.userId, nodeCode, page },
    }),
  create: (
    body: Scope & {
      nodeCode: string;
      title: string;
      hypothesis: string;
      nextAction: string;
      category: string;
      ownerId?: string | null;
    },
  ) =>
    fetchApi<Observation>(ROOT + "/journey-observations", {
      method: "POST",
      body,
    }),
  status: (note: Observation, status: string) =>
    fetchApi<Observation>(ROOT + "/journey-observations/" + note.id, {
      method: "PATCH",
      body: { status, expectedUpdatedAt: note.updatedAt },
    }),
};
export const GATES: Record<Gate, [string, string]> = {
  PROFILE: ["الملف غير مكتمل", "Profile incomplete"],
  GUIDE: ["الجولة الإلزامية لم تكتمل", "Required guide incomplete"],
  CV: ["تحديث السيرة لتطبيق الإرشاد", "CV guidance update"],
  APPLICATIONS: ["طلبات التقديم المطلوبة", "Application requirement"],
  TAILORED: ["طلبات مخصصة ناقصة", "Tailored applications"],
  POSTS: ["منشورات مطلوبة", "Publishing requirement"],
  OUTREACH: ["تواصل مهني مطلوب", "Outreach requirement"],
  REVIEW: ["مراجعة / تقرير مطلوب", "Review / report required"],
  TIME: ["انتظار موعد المحطة التالية", "Waiting for next scheduled station"],
  READY: ["جاهز للمتابعة", "Ready to continue"],
  NOT_STARTED: ["الرحلة لم تبدأ", "Journey not started"],
  FINISHED: ["أكمل الرحلة", "Journey finished"],
  UNKNOWN: ["محطة تحتاج تحققًا", "Station requires verification"],
};
export const WEEK_TITLES = [
  ["البداية", "Start"],
  ["زخم التقديم", "Application momentum"],
  ["دقة الاستهداف", "Targeted applications"],
  ["الحضور المهني", "Professional presence"],
  ["العلاقات والنتيجة", "Outreach & outcome"],
];
