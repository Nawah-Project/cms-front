import { apiClient, API_BASE_URL } from "../../lib/api-client";
export type Scenario =
  "START" | "WEEK_ONE" | "AFTER_WEEK_TWO" | "FINISHED" | "WAITING";
export type PeerScope = "GROUP" | "SPECIALTY" | "ALL";
export type Peer = {
  id: string;
  nameAr: string;
  nameEn: string;
  specialization: string;
  inGroup: boolean;
  currentCode: string;
  hasCv: boolean;
  hasPortfolio: boolean;
  portfolioUrl?: string | null;
};
export type Requirement = {
  key: string;
  titleAr: string;
  titleEn: string;
  current: number;
  required: number;
};
export type Branch = {
  id: string;
  kind: string;
  titleAr: string | null;
  titleEn: string | null;
  value: number | null;
  locked: boolean;
  done: boolean;
};
export type HomeNode = {
  code: string;
  week: number;
  order: number;
  kind: "TASK" | "REVIEW" | "FINAL";
  status: "LOCKED" | "ACTIVE" | "COMPLETED";
  titleAr: string | null;
  titleEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  durationDays: number | null;
  requirements: Requirement[];
  branches: Branch[];
  counts: { group: number | null; specialty: number; all: number };
};
export type HomePreview = {
  preview: boolean;
  scenario: Scenario | null;
  generatedAt: string;
  currentCode: string;
  viewer: {
    nameAr: string;
    nameEn: string;
    specialization: string;
    groupUnlocked: boolean;
    outsideUnlocked: boolean;
    completedCount: number;
    totalNodes: number;
  };
  nextAction: {
    kind: string;
    stationCode: string;
    titleAr: string;
    titleEn: string;
    detailAr: string;
    detailEn: string;
    availableAt: string | null;
  };
  weeks: {
    week: number;
    titleAr: string;
    titleEn: string;
    nodes: HomeNode[];
  }[];
};
export type PeerPage = {
  items: Peer[];
  total: number;
  page: number;
  pageSize: number;
  lockedGroupCount: number;
  lockedOutsideCount: number;
};
export const createHomeApi = (preview: boolean) => {
  const base = preview ? "/admin/ux-lab/v2/home-preview" : "/home";
  return {
    home: (scenario: Scenario) =>
      apiClient.get<HomePreview>(`${base}?scenario=${scenario}`),
    peers: (
      scenario: Scenario,
      code: string,
      scope: PeerScope,
      page = 1,
      includeGroup = false,
    ) =>
      apiClient.get<PeerPage>(
        `${base}/stations/${encodeURIComponent(code)}/members?scenario=${scenario}&scope=${scope}&page=${page}&includeGroup=${includeGroup}`,
      ),
    peer: (scenario: Scenario, id: string) =>
      apiClient.get<Peer>(
        `${base}/members/${encodeURIComponent(id)}?scenario=${scenario}`,
      ),
    cv: async (scenario: Scenario, id: string) => {
      const r = await fetch(
        `${API_BASE_URL}${base}/members/${encodeURIComponent(id)}/cv?scenario=${scenario}`,
        { credentials: "include", headers: { Accept: "application/pdf" } },
      );
      if (!r.ok) throw new Error("Preview CV unavailable");
      return r.blob();
    },
  };
};
export const homePreviewApi = createHomeApi(true);
