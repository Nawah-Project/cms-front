export type Stage = "APPLIED" | "INTERVIEW" | "DECISION" | "CLOSED";

export type Outcome = "NONE" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export type ApplicationMethod =
  | "COMPANY_WEBSITE"
  | "LINKEDIN"
  | "REFERRAL"
  | "EMAIL"
  | "RECRUITMENT_PLATFORM"
  | "DIRECT_CONTACT"
  | "OTHER";

export interface Application {
  id: string;
  userId: string;
  companyName: string;
  jobTitle: string;
  applicationDate: string; // ISO date string YYYY-MM-DD
  location: string | null;
  applicationMethod: ApplicationMethod | string | null;
  jobUrl: string | null;
  stage: Stage;
  outcome: Outcome;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  active: {
    total: number;
    applied: number;
    interview: number;
    decision: number;
  };
  closed: {
    total: number;
    accepted: number;
    rejected: number;
    withdrawn: number;
  };
  recentApplications?: DashboardApplication[];
}

export interface DashboardApplication {
  id: string;
  companyName: string;
  jobTitle: string;
  stage: Stage;
  outcome: Outcome;
  applicationDate: string;
  updatedAt: string;
}

export interface CreateApplicationInput {
  companyName: string;
  jobTitle: string;
  applicationDate?: string;
  location?: string;
  applicationMethod?: ApplicationMethod | string;
  jobUrl?: string;
}

export interface UpdateApplicationInput {
  companyName?: string;
  jobTitle?: string;
  applicationDate?: string;
  location?: string | null;
  applicationMethod?: ApplicationMethod | string | null;
  jobUrl?: string | null;
  stage?: Stage;
  outcome?: Outcome;
}

export const APPLICATION_METHODS: {
  value: ApplicationMethod;
  label: string;
}[] = [
  { value: "COMPANY_WEBSITE", label: "Company Website" },
  { value: "LINKEDIN", label: "LinkedIn" },
  {
    value: "RECRUITMENT_PLATFORM",
    label: "Recruitment Platform (Indeed, Glassdoor, etc.)",
  },
  { value: "REFERRAL", label: "Referral" },
  { value: "EMAIL", label: "Email" },
  { value: "DIRECT_CONTACT", label: "Direct Contact" },
  { value: "OTHER", label: "Other" },
];

export function formatApplicationMethod(method?: string | null, translate?: (key: string) => string): string {
  if (!method) return "—";
  if (translate) {
    const key: Record<string, string> = { COMPANY_WEBSITE: "companyWebsite", LINKEDIN: "linkedIn", RECRUITMENT_PLATFORM: "recruitmentPlatform", REFERRAL: "referral", EMAIL: "emailMethod", DIRECT_CONTACT: "directContact", OTHER: "otherMethod" };
    if (key[method]) return translate(`applications.${key[method]}`);
  }
  const found = APPLICATION_METHODS.find((m) => m.value === method);
  if (found) return found.label;
  return method;
}

export const STAGES: { key: Stage; label: string }[] = [
  { key: "APPLIED", label: "Applied" },
  { key: "INTERVIEW", label: "Interview" },
  { key: "DECISION", label: "Decision" },
  { key: "CLOSED", label: "Closed" },
];

export const OUTCOMES: { key: Outcome; label: string }[] = [
  { key: "NONE", label: "None" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "REJECTED", label: "Rejected" },
  { key: "WITHDRAWN", label: "Withdrawn" },
];
