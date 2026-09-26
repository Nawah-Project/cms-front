import type { Application, CreateApplicationInput, DashboardStats, Outcome, Stage, UpdateApplicationInput } from "../types";

// Server memory store that persists across requests during the server lifecycle
const INITIAL_APPLICATIONS: Application[] = [
  // 5 APPLIED
  {
    id: "app-1",
    userId: "user-default",
    companyName: "Company A",
    jobTitle: "UX Designer",
    applicationDate: "2026-09-26",
    location: "Cairo",
    applicationMethod: "LinkedIn",
    jobUrl: "https://example.com/jobs/ux-designer-cairo",
    stage: "APPLIED",
    outcome: "NONE",
    createdAt: "2026-09-26T08:00:00.000Z",
    updatedAt: "2026-09-26T08:00:00.000Z",
  },
  {
    id: "app-2",
    userId: "user-default",
    companyName: "Vodafone",
    jobTitle: "Frontend Architect",
    applicationDate: "2026-09-25",
    location: "Cairo / Hybrid",
    applicationMethod: "Company Website",
    jobUrl: "https://careers.vodafone.com/jobs/fe-architect",
    stage: "APPLIED",
    outcome: "NONE",
    createdAt: "2026-09-25T11:30:00.000Z",
    updatedAt: "2026-09-25T11:30:00.000Z",
  },
  {
    id: "app-3",
    userId: "user-default",
    companyName: "Stripe",
    jobTitle: "Design Engineer",
    applicationDate: "2026-09-24",
    location: "Remote",
    applicationMethod: "Referral",
    jobUrl: "https://stripe.com/jobs/design-engineer",
    stage: "APPLIED",
    outcome: "NONE",
    createdAt: "2026-09-24T14:15:00.000Z",
    updatedAt: "2026-09-24T14:15:00.000Z",
  },
  {
    id: "app-4",
    userId: "user-default",
    companyName: "Linear",
    jobTitle: "Product Designer",
    applicationDate: "2026-09-23",
    location: "Remote",
    applicationMethod: "Company Website",
    jobUrl: "https://linear.app/careers/product-designer",
    stage: "APPLIED",
    outcome: "NONE",
    createdAt: "2026-09-23T09:45:00.000Z",
    updatedAt: "2026-09-23T09:45:00.000Z",
  },
  {
    id: "app-5",
    userId: "user-default",
    companyName: "Figma",
    jobTitle: "Design Systems Engineer",
    applicationDate: "2026-09-21",
    location: "San Francisco / Remote",
    applicationMethod: "LinkedIn",
    jobUrl: "https://figma.com/careers/design-systems",
    stage: "APPLIED",
    outcome: "NONE",
    createdAt: "2026-09-21T16:20:00.000Z",
    updatedAt: "2026-09-21T16:20:00.000Z",
  },

  // 4 INTERVIEW
  {
    id: "app-6",
    userId: "user-default",
    companyName: "Company B",
    jobTitle: "Product Designer",
    applicationDate: "2026-09-22",
    location: "Remote",
    applicationMethod: "Company Website",
    jobUrl: "https://example.com/jobs/product-designer-remote",
    stage: "INTERVIEW",
    outcome: "NONE",
    createdAt: "2026-09-22T10:00:00.000Z",
    updatedAt: "2026-09-23T12:00:00.000Z",
  },
  {
    id: "app-7",
    userId: "user-default",
    companyName: "GitHub",
    jobTitle: "Staff Design Systems Engineer",
    applicationDate: "2026-09-19",
    location: "Remote",
    applicationMethod: "Referral",
    jobUrl: "https://github.com/careers/staff-design-eng",
    stage: "INTERVIEW",
    outcome: "NONE",
    createdAt: "2026-09-19T13:00:00.000Z",
    updatedAt: "2026-09-21T10:00:00.000Z",
  },
  {
    id: "app-8",
    userId: "user-default",
    companyName: "Notion",
    jobTitle: "Senior Product Designer",
    applicationDate: "2026-09-18",
    location: "Remote",
    applicationMethod: "LinkedIn",
    jobUrl: "https://notion.so/careers/senior-product-designer",
    stage: "INTERVIEW",
    outcome: "NONE",
    createdAt: "2026-09-18T15:30:00.000Z",
    updatedAt: "2026-09-20T11:15:00.000Z",
  },
  {
    id: "app-9",
    userId: "user-default",
    companyName: "Vercel",
    jobTitle: "Frontend Platform Engineer",
    applicationDate: "2026-09-16",
    location: "Remote",
    applicationMethod: "Company Website",
    jobUrl: "https://vercel.com/careers/frontend-platform",
    stage: "INTERVIEW",
    outcome: "NONE",
    createdAt: "2026-09-16T09:00:00.000Z",
    updatedAt: "2026-09-18T14:40:00.000Z",
  },

  // 3 DECISION
  {
    id: "app-10",
    userId: "user-default",
    companyName: "Company C",
    jobTitle: "UX Designer",
    applicationDate: "2026-09-20",
    location: "Giza",
    applicationMethod: "Referral",
    jobUrl: "https://example.com/jobs/ux-designer-giza",
    stage: "DECISION",
    outcome: "NONE",
    createdAt: "2026-09-20T08:30:00.000Z",
    updatedAt: "2026-09-25T17:00:00.000Z",
  },
  {
    id: "app-11",
    userId: "user-default",
    companyName: "Airbnb",
    jobTitle: "Lead Experience Designer",
    applicationDate: "2026-09-17",
    location: "Remote",
    applicationMethod: "LinkedIn",
    jobUrl: "https://airbnb.com/careers/lead-experience",
    stage: "DECISION",
    outcome: "NONE",
    createdAt: "2026-09-17T12:00:00.000Z",
    updatedAt: "2026-09-24T16:00:00.000Z",
  },
  {
    id: "app-12",
    userId: "user-default",
    companyName: "Automattic",
    jobTitle: "Frontend Architect",
    applicationDate: "2026-09-14",
    location: "Remote",
    applicationMethod: "Company Website",
    jobUrl: "https://automattic.com/work-with-us/architect",
    stage: "DECISION",
    outcome: "NONE",
    createdAt: "2026-09-14T11:00:00.000Z",
    updatedAt: "2026-09-23T15:20:00.000Z",
  },

  // 8 CLOSED (2 Accepted, 6 Rejected, 0 Withdrawn)
  {
    id: "app-13",
    userId: "user-default",
    companyName: "Company D",
    jobTitle: "Product Designer",
    applicationDate: "2026-09-15",
    location: "Remote",
    applicationMethod: "LinkedIn",
    jobUrl: "https://example.com/jobs/company-d",
    stage: "CLOSED",
    outcome: "ACCEPTED",
    createdAt: "2026-09-15T09:00:00.000Z",
    updatedAt: "2026-09-24T14:00:00.000Z",
  },
  {
    id: "app-14",
    userId: "user-default",
    companyName: "Wise",
    jobTitle: "Senior Product Designer",
    applicationDate: "2026-09-10",
    location: "London / Hybrid",
    applicationMethod: "Company Website",
    jobUrl: "https://wise.com/jobs/senior-product-designer",
    stage: "CLOSED",
    outcome: "ACCEPTED",
    createdAt: "2026-09-10T10:00:00.000Z",
    updatedAt: "2026-09-22T16:30:00.000Z",
  },
  {
    id: "app-15",
    userId: "user-default",
    companyName: "Google",
    jobTitle: "Interaction Designer",
    applicationDate: "2026-09-08",
    location: "Zurich",
    applicationMethod: "Company Website",
    jobUrl: "https://google.com/about/careers/applications",
    stage: "CLOSED",
    outcome: "REJECTED",
    createdAt: "2026-09-08T08:00:00.000Z",
    updatedAt: "2026-09-16T12:00:00.000Z",
  },
  {
    id: "app-16",
    userId: "user-default",
    companyName: "Apple",
    jobTitle: "Human Interface Designer",
    applicationDate: "2026-09-05",
    location: "Cupertino / On-site",
    applicationMethod: "Company Website",
    jobUrl: "https://apple.com/jobs/hid",
    stage: "CLOSED",
    outcome: "REJECTED",
    createdAt: "2026-09-05T14:00:00.000Z",
    updatedAt: "2026-09-14T09:00:00.000Z",
  },
  {
    id: "app-17",
    userId: "user-default",
    companyName: "Meta",
    jobTitle: "Product Designer",
    applicationDate: "2026-09-02",
    location: "London",
    applicationMethod: "Referral",
    jobUrl: "https://metacareers.com/jobs/pd",
    stage: "CLOSED",
    outcome: "REJECTED",
    createdAt: "2026-09-02T13:00:00.000Z",
    updatedAt: "2026-09-12T17:00:00.000Z",
  },
  {
    id: "app-18",
    userId: "user-default",
    companyName: "Netflix",
    jobTitle: "UI Systems Designer",
    applicationDate: "2026-08-28",
    location: "Los Gatos / Remote",
    applicationMethod: "LinkedIn",
    jobUrl: "https://netflix.com/jobs/ui-systems",
    stage: "CLOSED",
    outcome: "REJECTED",
    createdAt: "2026-08-28T10:00:00.000Z",
    updatedAt: "2026-09-07T11:00:00.000Z",
  },
  {
    id: "app-19",
    userId: "user-default",
    companyName: "Uber",
    jobTitle: "Design Engineer",
    applicationDate: "2026-08-25",
    location: "Amsterdam",
    applicationMethod: "Company Website",
    jobUrl: "https://uber.com/careers/design-eng",
    stage: "CLOSED",
    outcome: "REJECTED",
    createdAt: "2026-08-25T15:00:00.000Z",
    updatedAt: "2026-09-05T14:00:00.000Z",
  },
  {
    id: "app-20",
    userId: "user-default",
    companyName: "Slack",
    jobTitle: "Frontend Specialist",
    applicationDate: "2026-08-20",
    location: "Remote",
    applicationMethod: "Indeed",
    jobUrl: "https://slack.com/careers/frontend",
    stage: "CLOSED",
    outcome: "REJECTED",
    createdAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-30T10:00:00.000Z",
  },
];

// In-memory data store instance
class ApplicationStore {
  private items: Application[] = [...INITIAL_APPLICATIONS];

  public getAll(filters?: { stage?: string; outcome?: string; search?: string }): Application[] {
    let list = [...this.items];

    if (filters?.stage) {
      const stageUpper = filters.stage.toUpperCase();
      if (stageUpper === "ACTIVE") {
        list = list.filter((app) => app.stage !== "CLOSED");
      } else {
        list = list.filter((app) => app.stage === stageUpper);
      }
    }

    if (filters?.outcome) {
      const outcomeUpper = filters.outcome.toUpperCase();
      list = list.filter((app) => app.outcome === outcomeUpper);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (app) =>
          app.companyName.toLowerCase().includes(q) ||
          app.jobTitle.toLowerCase().includes(q)
      );
    }

    // Sort by application date descending by default
    return list.sort((a, b) => b.applicationDate.localeCompare(a.applicationDate));
  }

  public getById(id: string): Application | undefined {
    return this.items.find((app) => app.id === id);
  }

  public create(data: CreateApplicationInput): Application {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const newApp: Application = {
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: "user-default",
      companyName: data.companyName.trim(),
      jobTitle: data.jobTitle.trim(),
      applicationDate: data.applicationDate || today,
      location: (data.location || "").trim(),
      applicationMethod: (data.applicationMethod || "Company Website").trim(),
      jobUrl: (data.jobUrl || "").trim(),
      stage: "APPLIED",
      outcome: "NONE",
      createdAt: now,
      updatedAt: now,
    };

    this.items.unshift(newApp);
    return newApp;
  }

  public update(id: string, data: UpdateApplicationInput): Application | undefined {
    const index = this.items.findIndex((app) => app.id === id);
    if (index === -1) return undefined;

    const current = this.items[index];
    const now = new Date().toISOString();

    const stage: Stage = data.stage ?? current.stage;
    let outcome: Outcome = data.outcome ?? current.outcome;

    // Outcome is only applicable when stage is CLOSED; if stage is not CLOSED, outcome is NONE
    if (stage !== "CLOSED") {
      outcome = "NONE";
    }

    const updated: Application = {
      ...current,
      companyName: data.companyName !== undefined ? data.companyName.trim() : current.companyName,
      jobTitle: data.jobTitle !== undefined ? data.jobTitle.trim() : current.jobTitle,
      applicationDate: data.applicationDate !== undefined ? data.applicationDate : current.applicationDate,
      location: data.location !== undefined ? (data.location ? data.location.trim() : null) : current.location,
      applicationMethod: data.applicationMethod !== undefined ? (data.applicationMethod ? data.applicationMethod.trim() : null) : current.applicationMethod,
      jobUrl: data.jobUrl !== undefined ? (data.jobUrl ? data.jobUrl.trim() : null) : current.jobUrl,
      stage,
      outcome,
      updatedAt: now,
    };

    this.items[index] = updated;
    return updated;
  }

  public delete(id: string): boolean {
    const initialLength = this.items.length;
    this.items = this.items.filter((app) => app.id !== id);
    return this.items.length < initialLength;
  }

  public getDashboardStats(): DashboardStats {
    let applied = 0;
    let interview = 0;
    let decision = 0;

    let accepted = 0;
    let rejected = 0;
    let withdrawn = 0;

    for (const app of this.items) {
      if (app.stage === "APPLIED") applied++;
      else if (app.stage === "INTERVIEW") interview++;
      else if (app.stage === "DECISION") decision++;
      else if (app.stage === "CLOSED") {
        if (app.outcome === "ACCEPTED") accepted++;
        else if (app.outcome === "REJECTED") rejected++;
        else if (app.outcome === "WITHDRAWN") withdrawn++;
      }
    }

    const activeTotal = applied + interview + decision;
    const closedTotal = accepted + rejected + withdrawn;

    return {
      active: {
        total: activeTotal,
        applied,
        interview,
        decision,
      },
      closed: {
        total: closedTotal,
        accepted,
        rejected,
        withdrawn,
      },
    };
  }
}

// Global singleton across hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var __APP_STORE__: ApplicationStore | undefined;
}

export const db = global.__APP_STORE__ ?? (global.__APP_STORE__ = new ApplicationStore());
