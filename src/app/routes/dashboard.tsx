import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { PlusIcon, SpinnerIcon } from "../components/Icons";
import { StatusBadge } from "../components/StatusBadge";
import { useRecentMemberProgress } from "../features/members-progress/hooks/useRecentMemberProgress";
import { api } from "../services/api";
import type { DashboardStats } from "../types";

export function meta() {
  return [
    { title: "My Applications | Dashboard" },
    {
      name: "description",
      content: "Overview of active and closed job applications",
    },
  ];
}

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently updated";

  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const absSeconds = Math.abs(seconds);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [30, "day"],
    [12, "month"],
  ];
  let valueInUnit = seconds;
  let unit: Intl.RelativeTimeFormatUnit = "second";
  for (const [threshold, nextUnit] of units) {
    if (Math.abs(valueInUnit) < threshold) break;
    valueInUnit = Math.round(valueInUnit / threshold);
    unit = nextUnit;
  }
  if (absSeconds < 45) return "just now";
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    valueInUnit,
    unit,
  );
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
  const { openAddModal } = useOutletContext<{ openAddModal: () => void }>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    events: memberEvents,
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
      setError("Please check your connection and try again.");
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
        <p>Loading your applications overview…</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mx-auto max-w-md border-l-2 border-rose-300 py-4 pl-5 text-sm dark:border-rose-900">
        <p className="font-medium text-neutral-900 dark:text-neutral-100">
          Unable to load your dashboard
        </p>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">{error}</p>
        <button
          type="button"
          onClick={() => void fetchStats()}
          className="mt-3 text-sm font-medium text-neutral-800 underline decoration-stone-300 underline-offset-4 hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white"
        >
          Try again
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
  const recentApplications = stats.recentApplications ?? [];
  const outcomes = [
    {
      label: "Accepted",
      value: "ACCEPTED" as const,
      count: stats.closed.accepted,
      href: "/applications?stage=CLOSED&outcome=ACCEPTED",
    },
    {
      label: "Rejected",
      value: "REJECTED" as const,
      count: stats.closed.rejected,
      href: "/applications?stage=CLOSED&outcome=REJECTED",
    },
    {
      label: "Withdrawn",
      value: "WITHDRAWN" as const,
      count: stats.closed.withdrawn,
      href: "/applications?stage=CLOSED&outcome=WITHDRAWN",
    },
  ];

  return (
    <div className="space-y-12">
      <header className="flex flex-col gap-4 border-b border-stone-300/80 pb-7 sm:flex-row sm:items-end sm:justify-between dark:border-neutral-800">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-neutral-950 dark:text-neutral-100">
            My Applications
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            A clear view of your current search and recent outcomes.
          </p>
        </div>
        <Link
          to="/applications"
          className="text-sm font-medium text-neutral-700 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
        >
          View all {stats.active.total + stats.closed.total} applications
        </Link>
      </header>

      <section aria-labelledby="pipeline-heading" className="space-y-7">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-3 dark:border-neutral-800">
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Application pipeline
            </p>
            <h2
              id="pipeline-heading"
              className="mt-1 text-lg font-medium tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              Where things stand
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
            <Link
              to="/applications?stage=ACTIVE"
              className="transition-colors hover:text-neutral-950 dark:hover:text-white"
            >
              {stats.active.total} active
            </Link>
            <span
              aria-hidden="true"
              className="h-3 w-px bg-stone-300 dark:bg-neutral-700"
            />
            <Link
              to="/applications?stage=CLOSED"
              className="transition-colors hover:text-neutral-950 dark:hover:text-white"
            >
              {stats.closed.total} closed
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STAGE_PRESENTATION.map((stage, index) => (
            <Link
              key={stage.key}
              to={stage.href}
              className="group rounded-xl border border-border-subtle bg-surface p-4 shadow-xs transition duration-150 hover:scale-[1.01] hover:border-border-hover hover:shadow-sm sm:p-5"
            >
              <span className={`text-xs font-medium ${stage.tone}`}>
                {stage.label}
              </span>
              <span className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-neutral-900">
                  {stageCounts[index]}
                </span>
                <span className="text-xs text-neutral-500">
                  {stageCounts[index] === 1 ? "application" : "applications"}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="outcomes-heading" className="space-y-4">
        <div className="border-b border-stone-200 pb-3 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Closed applications
          </p>
          <h2
            id="outcomes-heading"
            className="mt-1 text-lg font-medium tracking-tight text-neutral-900 dark:text-neutral-100"
          >
            Outcomes
          </h2>
        </div>
        <div className="grid grid-cols-1 divide-y divide-stone-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-neutral-800">
          {outcomes.map((outcome) => (
            <Link
              key={outcome.label}
              to={outcome.href}
              aria-label={`${outcome.label}: ${outcome.count}`}
              className="group flex items-center justify-between gap-4 py-4 transition-colors hover:bg-white/50 sm:px-5 sm:first:pl-0 sm:last:pr-0 dark:hover:bg-neutral-900/40"
            >
              <span className="flex items-center gap-3 text-sm text-neutral-600 group-hover:text-neutral-950 dark:text-neutral-400 dark:group-hover:text-white">
                <StatusBadge kind="outcome" value={outcome.value} />
              </span>
              <span className="text-base font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                {outcome.count}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 border-t border-stone-200 pt-8 lg:grid-cols-2 lg:gap-10 dark:border-neutral-800">
        <section aria-labelledby="member-updates-heading" className="space-y-4">
          <header className="flex items-end justify-between gap-4 border-b border-stone-200 pb-3 dark:border-neutral-800">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Your shared group
              </p>
              <h2
                id="member-updates-heading"
                className="mt-1 text-lg font-medium tracking-tight text-neutral-900 dark:text-neutral-100"
              >
                Recent Member Progress
              </h2>
            </div>
            <Link
              to="/members-progress"
              className="text-xs font-medium text-neutral-600 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
            >
              View progress
            </Link>
          </header>
          <div className="min-h-36 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white px-5 dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {memberEventsLoading ? (
              <div className="flex min-h-36 items-center gap-3 py-6 text-sm text-neutral-500" role="status">
                <SpinnerIcon className="h-4 w-4" /> Loading group activity…
              </div>
            ) : memberEventsError ? (
              <div className="flex min-h-36 flex-col items-start justify-center py-6">
                <p className="text-sm text-danger-strong">Unable to load group activity.</p>
                <button type="button" onClick={() => void retryMemberEvents()} className="button-ghost mt-2 px-0 text-info-strong">
                  Try again
                </button>
              </div>
            ) : memberEvents.length === 0 ? (
              <div className="flex min-h-36 flex-col items-start justify-center py-6">
                <p className="text-sm text-neutral-500">No member updates yet.</p>
              </div>
            ) : (
              memberEvents.slice(0, 4).map((event) => (
                <Link
                  key={event.id}
                  to="/members-progress"
                  className="interactive-transition flex flex-col gap-2 py-4 hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {event.user.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {event.application.jobTitle} · {event.application.companyName}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <StatusBadge kind="stage" value={event.fromStage} />
                    <span className="px-0.5 text-neutral-400" aria-hidden="true">→</span>
                    <StatusBadge kind="stage" value={event.toStage} />
                    {event.toStage === "CLOSED" && event.outcome && (
                      <StatusBadge kind="outcome" value={event.outcome} />
                    )}
                    <time className="ml-1 text-[11px] text-neutral-500" dateTime={event.changedAt} title={new Date(event.changedAt).toLocaleString()}>
                      {relativeTime(event.changedAt)}
                    </time>
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section
          aria-labelledby="recent-applications-heading"
          className="space-y-4"
        >
          <header className="flex items-end justify-between gap-4 border-b border-stone-200 pb-3 dark:border-neutral-800">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Your latest updates
              </p>
              <h2
                id="recent-applications-heading"
                className="mt-1 text-lg font-medium tracking-tight text-neutral-900 dark:text-neutral-100"
              >
                Recent Applications
              </h2>
            </div>
            <Link
              to="/applications"
              className="text-xs font-medium text-neutral-600 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
            >
              View all applications
            </Link>
          </header>
          <div className="min-h-36 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white px-5 dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {(stats.recentApplications ?? []).length === 0 ? (
              <div className="flex min-h-36 flex-col items-start justify-center py-6">
                <p className="text-sm text-neutral-500">No applications yet.</p>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="button-ghost mt-2 inline-flex items-center gap-2 px-0"
                >
                  <PlusIcon className="h-4 w-4" /> Add your first application
                </button>
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
                      title={new Date(application.updatedAt).toLocaleString()}
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
