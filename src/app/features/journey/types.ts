export type JourneyNodeStatus = "COMPLETED" | "ACTIVE" | "LOCKED_BLURRED";

export type JourneyNodeType =
  | "ONBOARDING_QUEST"
  | "MAIN_QUEST"
  | "SIDE_QUEST"
  | "REVIEW_STATION"
  | "FINAL_REPORT";

export type SideTaskType =
  "LINKEDIN_POST" | "OUTREACH_CONTACT" | "WEEKLY_REVIEW" | "USER_CHANGE";

export type OutreachStatus = "SENT" | "REPLIED" | "REFERRED" | "NO_RESPONSE";

export interface RequirementProgress {
  current: number;
  required: number;
  percentage: number;
}

export interface NodeProgressMetrics {
  apps: RequirementProgress;
  tailored: RequirementProgress;
  posts: RequirementProgress;
  outreach: RequirementProgress;
  weeklyReview?: RequirementProgress;
  overallPercentage: number;
}

export interface EnrichedJourneyNode {
  id?: string;
  code: string;
  weekNumber: number;
  orderIndex: number;
  nodeType: JourneyNodeType;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  durationDays: number;
  requiredAppsCount: number;
  requiredTailoredCount: number;
  requiredPostsCount: number;
  requiredOutreachCount: number;
  unlocksInsightCode: string | null;
  nextNodeCode: string | null;
  status: JourneyNodeStatus;
  progress: NodeProgressMetrics;
}

export interface UserJourneyState {
  id: string;
  userId: string;
  currentWeek: number;
  currentNodeCode: string;
  currentNodeStartedAt: string;
  weekStartedAt: string;
  week1StartedAt?: string | null;
  isGroupUnlocked: boolean;
  canUseTableView?: boolean;
  hasUnlockedAdvPrep?: boolean;
  cvVersionNumber?: number;
  unlockedInsightCodes: string[];
  readInsightCodes: string[];
  completedNodeCodes: string[];
  updatedAt: string;
}

export interface WeeklyConversionStats {
  weekNumber: number;
  totalApplications: number;
  tailoredApplications: number;
  interviewsOrResponses: number;
  conversionRate: number;
}

export interface JourneyStateResponse {
  state: UserJourneyState;
  currentNode: EnrichedJourneyNode | null;
  currentWeekNodes: EnrichedJourneyNode[];
  nodes: EnrichedJourneyNode[];
  weeklyStats: WeeklyConversionStats;
  features: { groups: boolean; tableView: boolean; professionalTasks: boolean };
}

export interface JobMarketCompassPlatform {
  id: string;
  name: string;
  url: string;
  descriptionAr: string;
  descriptionEn: string;
}

export interface JobMarketCompassResponse {
  targetJobTitle: string;
  location: string;
  platforms: JobMarketCompassPlatform[];
}

export interface CreateSideTaskInput {
  nodeCode?: string;
  type: SideTaskType;
  postUrl?: string;
  postTopic?: string;
  applicationId?: string;
  contactName?: string;
  contactRole?: string;
  companyName?: string;
  contactMethod?: string;
  contactUrl?: string;
  outreachState?: OutreachStatus;
  reviewSummary?: string;
  newCvUploaded?: boolean;
  sharedInGroup?: boolean;
}

export interface SideTaskSubmission {
  id: string;
  userId: string;
  nodeCode: string;
  journeyWeek: number;
  type: SideTaskType;
  postUrl: string | null;
  postTopic: string | null;
  applicationId: string | null;
  contactName: string | null;
  contactRole: string | null;
  companyName: string | null;
  contactMethod: string | null;
  contactUrl: string | null;
  outreachState: OutreachStatus | null;
  reviewSummary: string | null;
  newCvUploaded: boolean;
  sharedInGroup: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsListResponse {
  items: AppNotification[];
  unreadCount: number;
}
