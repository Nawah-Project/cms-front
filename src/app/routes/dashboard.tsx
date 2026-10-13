import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { PlusIcon, SpinnerIcon } from "../components/Icons";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";
import { CompanionBanner } from "../components/CompanionBanner";
import { useRecentMemberProgress } from "../features/members-progress/hooks/useRecentMemberProgress";
import { RecentActivityList } from "../features/members-progress/components/RecentActivityList";
import { api } from "../services/api";
import type { DashboardStats } from "../types";
import { useI18n } from "../i18n";
import { ProfessionalDevelopmentSummary } from "../features/professional-development/components/ProfessionalDevelopmentSummary";
import { useUxExperiment } from "../utils/uxAnalytics";

export function meta() {
  return [
    { title: "Dashboard | Nawah Project" },
    {
      name: "description",
      content: "Overview of active and closed job applications",
    },
  ];
}

const STAGE_PRESENTATION = [
  {
    key: "applied",
    label: "Applied",
    href: "/applications?stage=APPLIED",
    tone: "text-neutral-700",
    bg: "bg-neutral-100 text-neutral-700",
    border: "border-s-4 border-s-neutral-400",
  },
  {
    key: "interview",
    label: "Interview",
    href: "/applications?stage=INTERVIEW",
    tone: "text-info-strong",
    bg: "bg-info-soft text-info-strong",
    border: "border-s-4 border-s-info-strong",
  },
  {
    key: "decision",
    label: "Decision",
    href: "/applications?stage=DECISION",
    tone: "text-warning-strong",
    bg: "bg-warning-soft text-warning-strong",
    border: "border-s-4 border-s-warning-strong",
  },
  {
    key: "closed",
    label: "Closed",
    href: "/applications?stage=CLOSED",
    tone: "text-neutral-800",
    bg: "bg-neutral-100 text-neutral-800",
    border: "border-s-4 border-s-neutral-600",
  },
] as const;

function StageIcon({ stage }: { stage: string }) {
  if (stage === "applied") {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    );
  }
  if (stage === "interview") {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    );
  }
  if (stage === "decision") {
    return (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

export default function DashboardPage() {
  const { t, tp, number, locale, relativeTime } = useI18n();
  const { openAddModal } = useOutletContext<{ openAddModal: () => void }>();
  const { variant } = useUxExperiment("dashboard_layout_v2");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    events: memberEvents,
    newEventIds: memberEventsNewIds,
    loading: memberEventsLoading,
    error: memberEventsError,
    retry: retryMemberEvents,
  } = useRecentMemberProgress(10);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, feedbackRes] = await Promise.all([
        api.getDashboardStats(),
        api.getFeedbackUnreadCount().catch(() => ({ unreadCount: 0 })),
      ]);
      setStats(statsRes);
      setUnreadFeedbackCount(feedbackRes.unreadCount);
    } catch {
      setError(t("common.connectionError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center text-sm text-neutral-500">
        <SpinnerIcon className="mb-3 h-6 w-6" />
        <p>{t("dashboard.loading")}</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mx-auto max-w-md border-s-2 border-danger-border bg-danger-soft/30 py-4 ps-5 text-sm">
        <p className="font-medium text-danger-strong">
          {t("dashboard.loadError")}
        </p>
        <p className="mt-1 text-text-secondary">{error}</p>
        <button
          type="button"
          onClick={() => void fetchStats()}
          className="mt-3 button-secondary text-xs"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }

  const stageCounts = [
    stats.active.applied,
    stats.active.interview,
    stats.active.decision,
    stats.closed.total,
  ];

  // Pipeline Metrics Section Component
  const evaluationSection = (
    <section aria-labelledby="pipeline-heading" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2
            id="pipeline-heading"
            className="text-lg font-semibold tracking-tight text-neutral-950"
          >
            {t("dashboard.evaluationSectionTitle")}
          </h2>
          <p className="mt-1 text-xs text-neutral-500 max-w-xl">
            {t("dashboard.evaluationSectionDesc")}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <Link
            to="/applications?stage=ACTIVE"
            className="transition-colors hover:text-neutral-950"
          >
            {t("dashboard.activeCount", {
              count: number(stats.active.total),
            })}
          </Link>
          <span
            aria-hidden="true"
            className="h-3 w-px bg-border"
          />
          <Link
            to="/applications?stage=CLOSED"
            className="transition-colors hover:text-neutral-950"
          >
            {t("dashboard.closedCount", {
              count: number(stats.closed.total),
            })}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAGE_PRESENTATION.map((stage, index) => (
          <Link
            key={stage.key}
            to={stage.href}
            className={`group flex items-center justify-between rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs transition duration-150 hover:scale-[1.01] hover:border-border-hover hover:shadow-sm ${stage.border}`}
          >
            <div>
              <span className={`text-xs font-semibold ${stage.tone}`}>
                {t(
                  `applications.${stage.key === "applied" ? "submitted" : stage.key}`,
                )}
              </span>
              <span className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums tracking-tight text-neutral-900">
                  {number(stageCounts[index])}
                </span>
                <span className="text-xs text-neutral-500">
                  {tp("common.applicationCount", stageCounts[index])}
                </span>
              </span>
            </div>
            <div className={`rounded-xl p-2.5 ${stage.bg} shrink-0`}>
              <StageIcon stage={stage.key} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );

  return (
    <div className="w-full space-y-10">
      <header className="border-b border-border pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
              {t("dashboard.title")}
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              {t("dashboard.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/applications"
              className="text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-950"
            >
              {t("dashboard.viewApplications", {
                count: number(stats.active.total + stats.closed.total),
              })}
            </Link>
            <button
              type="button"
              onClick={openAddModal}
              className="button-primary inline-flex items-center gap-1.5 py-2 text-sm"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>{t("common.addApplication")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Forefront: Smart Companion Guidance Banner */}
      <CompanionBanner
        stats={stats}
        unreadFeedbackCount={unreadFeedbackCount}
        onAddApplication={openAddModal}
      />

      {/* Render sections according to A/B test variant */}
      {variant === "B" ? (
        <>
          {/* Section 2: Professional Development & Feedback */}
          <ProfessionalDevelopmentSummary />

          {/* Section 3: Evaluation & Pipeline Metrics */}
          {evaluationSection}
        </>
      ) : (
        <>
          {/* Section 2: Evaluation & Pipeline Metrics */}
          {evaluationSection}

          {/* Section 3: Professional Development & Feedback */}
          <ProfessionalDevelopmentSummary />
        </>
      )}

      {/* Section 4: Group Activity & Recent Applications */}
      <div className="grid grid-cols-1 gap-8 border-t border-border pt-8 lg:grid-cols-2 lg:gap-10">
        <section aria-labelledby="member-updates-heading" className="space-y-4">
          <header className="flex items-end justify-between gap-4 border-b border-border pb-3">
            <div>
              <p className="text-xs text-neutral-500">
                {t("members.sharedGroup")}
              </p>
              <h2
                id="member-updates-heading"
                className="mt-1 text-lg font-medium tracking-tight text-neutral-900"
              >
                {t("members.memberProgress")}
              </h2>
            </div>
            <Link
              to="/members-progress"
              className="text-xs font-medium text-neutral-600 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-950"
            >
              {t("dashboard.viewProgress")}
            </Link>
          </header>
          <div className="min-h-36 divide-y divide-border/60 rounded-xl border border-border bg-surface px-5">
            <RecentActivityList
              events={memberEvents}
              loading={memberEventsLoading}
              error={memberEventsError !== null}
              retry={() => void retryMemberEvents()}
              newEventIds={memberEventsNewIds}
              compact
              linkToProgress
              limit={4}
            />
          </div>
        </section>

        <section
          aria-labelledby="recent-applications-heading"
          className="space-y-4"
        >
          <header className="flex items-end justify-between gap-4 border-b border-border pb-3">
            <div>
              <p className="text-xs text-neutral-500">
                {t("dashboard.latestUpdates")}
              </p>
              <h2
                id="recent-applications-heading"
                className="mt-1 text-lg font-medium tracking-tight text-neutral-900"
              >
                {t("dashboard.recentApplications")}
              </h2>
            </div>
            <Link
              to="/applications"
              className="text-xs font-medium text-neutral-600 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-950"
            >
              {t("dashboard.viewAllApplications")}
            </Link>
          </header>
          <div className="min-h-36 divide-y divide-border/60 rounded-xl border border-border bg-surface px-5">
            {(stats.recentApplications ?? []).length === 0 ? (
              <EmptyState
                compact
                description={t("applications.noApplicationsYet")}
                actionLabel={t("common.addApplication")}
                onActionClick={openAddModal}
              />
            ) : (
              (stats.recentApplications ?? []).map((application) => (
                <Link
                  key={application.id}
                  to={`/applications/${application.id}`}
                  className="interactive-transition flex items-center justify-between gap-4 py-4 hover:bg-neutral-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-neutral-900">
                      {application.companyName}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-500">
                      {application.jobTitle}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    {application.stage === "CLOSED" &&
                    application.outcome !== "NONE" ? (
                      <StatusBadge kind="outcome" value={application.outcome} />
                    ) : (
                      <StatusBadge kind="stage" value={application.stage} />
                    )}
                    <time
                      className="text-[11px] text-neutral-500"
                      dateTime={application.updatedAt}
                      title={new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(application.updatedAt))}
                    >
                      {relativeTime(application.updatedAt)}
                    </time>
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
