import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { PlusIcon, SpinnerIcon } from "../components/Icons";
import { StatusBadge } from "../components/StatusBadge";
import { useRecentMemberProgress } from "../features/members-progress/hooks/useRecentMemberProgress";
import { RecentActivityList } from "../features/members-progress/components/RecentActivityList";
import { api } from "../services/api";
import type { DashboardStats } from "../types";
import { useI18n } from "../i18n";
import { ProfessionalDevelopmentSummary } from "../features/professional-development/components/ProfessionalDevelopmentSummary";

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
    tone: "text-neutral-600",
  },
  {
    key: "interview",
    label: "Interview",
    href: "/applications?stage=INTERVIEW",
    tone: "text-info-strong",
  },
  {
    key: "decision",
    label: "Decision",
    href: "/applications?stage=DECISION",
    tone: "text-warning-strong",
  },
  {
    key: "closed",
    label: "Closed",
    href: "/applications?stage=CLOSED",
    tone: "text-neutral-500",
  },
] as const;

export default function DashboardPage() {
  const { t, tp, number, locale, relativeTime } = useI18n();
  const { openAddModal } = useOutletContext<{ openAddModal: () => void }>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
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
      setStats(await api.getDashboardStats());
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
      <div className="w-full space-y-12">
        <header className="border-b border-stone-300/80 pb-7 dark:border-neutral-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="h-8 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-4 w-72 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800/60" />
            </div>
          </div>
        </header>

        <section className="space-y-7">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs animate-pulse dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-700" />
                <div className="mt-4 h-7 w-20 rounded bg-neutral-200 dark:bg-neutral-700" />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="py-16 max-w-md mx-auto text-center">
        <div className="p-6 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 text-red-800 dark:text-red-300 text-xs shadow-xs">
          <p className="font-semibold text-sm mb-1">{t("dashboard.loadError")}</p>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => void fetchStats()}
            className="px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg font-medium text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-xs"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  const stageCounts = [
    stats.active.applied,
    stats.active.interview,
    stats.active.decision,
    stats.closed.total,
  ];
  const recentApplications = stats.recentApplications ?? [];
  return (
    <div className="w-full space-y-12">
      <header className="border-b border-stone-300/80 pb-7 dark:border-neutral-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100 sm:text-4xl">
              {t("dashboard.title")}
            </h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              {t("dashboard.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/applications"
              className="text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
            >
              {t("dashboard.viewApplications", {
                count: number(stats.active.total + stats.closed.total),
              })}
            </Link>
            <button
              type="button"
              onClick={openAddModal}
              className="button-primary inline-flex items-center gap-1.5 py-2 text-sm dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>+ {t("common.addApplication")}</span>
            </button>
          </div>
        </div>
      </header>

      <section aria-labelledby="pipeline-heading" className="space-y-7">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-3 dark:border-neutral-800">
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t("dashboard.pipeline")}
            </p>
            <h2
              id="pipeline-heading"
              className="mt-1 text-lg font-medium tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              {t("dashboard.pipelineTitle")}
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
            <Link
              to="/applications?stage=ACTIVE"
              className="transition-colors hover:text-neutral-950 dark:hover:text-white"
            >
              {t("dashboard.activeCount", {
                count: number(stats.active.total),
              })}
            </Link>
            <span
              aria-hidden="true"
              className="h-3 w-px bg-stone-300 dark:bg-neutral-700"
            />
            <Link
              to="/applications?stage=CLOSED"
              className="transition-colors hover:text-neutral-950 dark:hover:text-white"
            >
              {t("dashboard.closedCount", {
                count: number(stats.closed.total),
              })}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {STAGE_PRESENTATION.map((stage, index) => (
            <Link
              key={stage.key}
              to={stage.href}
              className="group rounded-xl border border-gray-200/80 bg-surface p-4 shadow-xs transition duration-150 hover:scale-[1.01] hover:border-border-hover hover:shadow-sm dark:border-neutral-800 sm:p-5"
            >
              <span className={`text-xs font-medium ${stage.tone}`}>
                {t(
                  `applications.${stage.key === "applied" ? "submitted" : stage.key}`,
                )}
              </span>
              <span className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-neutral-900">
                  {number(stageCounts[index])}
                </span>
                <span className="text-xs text-neutral-500">
                  {tp("common.applicationCount", stageCounts[index])}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <ProfessionalDevelopmentSummary />

      <div className="grid grid-cols-1 gap-8 border-t border-stone-200 pt-8 lg:grid-cols-2 lg:gap-10 dark:border-neutral-800">
        <section aria-labelledby="member-updates-heading" className="space-y-4">
          <header className="flex items-end justify-between gap-4 border-b border-stone-200 pb-3 dark:border-neutral-800">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {t("members.sharedGroup")}
              </p>
              <h2
                id="member-updates-heading"
                className="mt-1 text-lg font-medium tracking-tight text-neutral-900 dark:text-neutral-100"
              >
                {t("members.memberProgress")}
              </h2>
            </div>
            <Link
              to="/members-progress"
              className="text-xs font-medium text-neutral-600 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
            >
              {t("dashboard.viewProgress")}
            </Link>
          </header>
          <div className="min-h-36 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white px-5 dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
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
          <header className="flex items-end justify-between gap-4 border-b border-stone-200 pb-3 dark:border-neutral-800">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {t("dashboard.latestUpdates")}
              </p>
              <h2
                id="recent-applications-heading"
                className="mt-1 text-lg font-medium tracking-tight text-neutral-900 dark:text-neutral-100"
              >
                {t("dashboard.recentApplications")}
              </h2>
            </div>
            <Link
              to="/applications"
              className="text-xs font-medium text-neutral-600 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
            >
              {t("dashboard.viewAllApplications")}
            </Link>
          </header>
          <div className="min-h-36 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white px-5 dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {(stats.recentApplications ?? []).length === 0 ? (
              <div className="flex min-h-36 flex-col items-start justify-center py-6">
                <p className="text-sm text-neutral-500">
                  {t("applications.noApplicationsYet")}
                </p>
                <Link
                  to="/applications"
                  className="button-ghost mt-2 inline-flex items-center gap-2 px-0"
                >
                  {t("common.navApplications")}
                </Link>
              </div>
            ) : (
              (stats.recentApplications ?? []).map((application) => (
                <Link
                  key={application.id}
                  to={`/applications/${application.id}`}
                  className="interactive-transition flex items-center justify-between gap-4 py-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {application.companyName}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-400">
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
