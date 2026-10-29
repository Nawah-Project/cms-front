import { apiClient } from "../../../lib/api-client";

export type MarketingOverview = {
  range: { days: number; since: string; until: string; timeZone: string };
  summary: {
    visitors: number;
    newVisitors: number;
    returningVisitors: number;
    sessions: number;
    pageViews: number;
    pagesPerSession: number;
    bounceRate: number;
    averageSessionSeconds: number | null;
    signups: number;
    onboarded: number;
    signupRate: number;
    onboardingRate: number;
  };
  realtime: { active5m: number; active30m: number };
  trend: Array<{
    date: string;
    visitors: number;
    newVisitors: number;
    returningVisitors: number;
    sessions: number;
    pageViews: number;
    signups: number;
    onboarded: number;
  }>;
  sources: Array<{
    source: string;
    visitors: number;
    sessions: number;
    pageViews: number;
    signups: number;
  }>;
  campaigns: Array<{
    campaign: string;
    source: string;
    medium: string;
    visitors: number;
    sessions: number;
    signups: number;
    onboarded: number;
    signupRate: number;
  }>;
  pages: Array<{ path: string; views: number; visitors: number }>;
  devices: Array<{ device: string; visitors: number; sessions: number }>;
  hours: Array<{ hour: number; sessions: number; visitors: number }>;
};

export const marketingApi = {
  overview: (days: number) =>
    apiClient.get<MarketingOverview>("/admin/marketing/overview", {
      params: { days },
    }),
};
