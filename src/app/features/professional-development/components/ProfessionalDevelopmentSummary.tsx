import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { api } from "../../../services/api";
import { useI18n } from "../../../i18n";
import type {
  ProfessionalDevelopmentSummary as Summary,
  ProfessionalTask,
} from "../types";
import {
  PriorityLabel,
  StatusPill,
  MentorPriorityMark,
  TaskSourceLabel,
} from "./TaskPresentation";

export function ProfessionalDevelopmentSummary() {
  const { t, number, date, relativeTime } = useI18n();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setSummary(await api.getProfessionalDevelopmentSummary());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const relevantTasks = useMemo(() => {
    if (!summary) return [];
    const unique = new Map<string, ProfessionalTask>();
    [...summary.recentTasks, ...summary.upcomingDeadlines].forEach((task) => {
      if (task.status !== "DONE") unique.set(task.id, task);
    });
    return [...unique.values()]
      .sort((left, right) => {
        const bucket = (task: ProfessionalTask) =>
          task.overdue && task.mentorPriority
            ? 0
            : task.overdue
              ? 1
              : task.dueDate && task.mentorPriority
                ? 2
                : task.dueDate
                  ? 3
                  : 4;
        const bucketDiff = bucket(left) - bucket(right);
        if (bucketDiff) return bucketDiff;
        if (left.dueDate && right.dueDate)
          return left.dueDate.localeCompare(right.dueDate);
        return left.dueDate ? -1 : right.dueDate ? 1 : 0;
      })
      .slice(0, 4);
  }, [summary]);

  return (
    <section
      className="space-y-4"
      aria-labelledby="professional-development-summary-title"
    >
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-3 dark:border-neutral-800">
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t("professionalDevelopment.title")}
          </p>
          <h2
            id="professional-development-summary-title"
            className="mt-1 text-lg font-medium tracking-tight text-neutral-900 dark:text-neutral-100"
          >
            {t("professionalDevelopment.dashboard")}
          </h2>
        </div>
        <Link
          to="/professional-development"
          className="text-xs font-medium text-neutral-600 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
        >
          {t("professionalDevelopment.viewAllTasks")}
        </Link>
      </header>
      {loading ? (
        <div
          className="grid gap-3 sm:grid-cols-4"
          role="status"
          aria-label={t("professionalDevelopment.loading")}
        >
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-xl border border-border bg-surface"
            />
          ))}
        </div>
      ) : error || !summary ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger-border bg-surface px-4 py-4"
          role="alert"
        >
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {t("professionalDevelopment.dashboardLoadError")}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="button-secondary px-3 py-2 text-xs"
          >
            {t("common.retry")}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["activeTasks", summary.totalActiveTasks, "text-info-strong"],
              ["inProgressCount", summary.IN_PROGRESS, "text-info-strong"],
              [
                "dueSoonCount",
                summary.upcomingDeadlines.length,
                "text-warning-strong",
              ],
              [
                "overdueCount",
                summary.overdueCount,
                summary.overdueCount
                  ? "text-danger-strong"
                  : "text-neutral-700 dark:text-neutral-300",
              ],
            ].map(([key, value, tone]) => (
              <div
                key={String(key)}
                className="rounded-xl border border-border bg-surface px-4 py-3"
              >
                <p className="text-xs text-neutral-500">
                  {t(`professionalDevelopment.${key}`)}
                </p>
                <p
                  className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}
                >
                  {number(Number(value))}
                </p>
              </div>
            ))}
          </div>
          {!relevantTasks.length ? (
            <div className="rounded-xl border border-border bg-surface px-5 py-6 text-sm text-neutral-500">
              {t("professionalDevelopment.dashboardEmpty")}
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface px-4">
              {relevantTasks.map((task) => (
                <li key={task.id}>
                  <Link
                    to={`/professional-development?task=${encodeURIComponent(task.id)}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-3.5 focus-visible:outline-2 focus-visible:outline-info-strong"
                  >
                    <span className="flex min-w-0 flex-1 items-start gap-2">
                      {task.unreadMentorFeedbackCount > 0 && (
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#FF3B30]"
                          aria-label={t(
                            "professionalDevelopment.unreadFeedback",
                          )}
                        />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {task.title}
                        </span>
                        <span
                          className={`mt-1 block text-xs ${task.overdue ? "font-semibold text-danger-strong" : "text-neutral-500"}`}
                        >
                          {task.overdue
                            ? `${t("professionalDevelopment.overdue")} · `
                            : `${t("professionalDevelopment.dueDate")} · `}
                          {task.dueDate
                            ? date(task.dueDate, { dateStyle: "medium" })
                            : t("professionalDevelopment.noDueDate")}
                        </span>
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <TaskSourceLabel source={task.source} />
                      <StatusPill status={task.status} />
                      <PriorityLabel priority={task.priority} />
                      {task.mentorPriority && <MentorPriorityMark />}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {summary.feedback && (
            <section
              aria-labelledby="feedback-summary-heading"
              className="rounded-xl border border-border bg-surface p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3
                    id="feedback-summary-heading"
                    className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
                  >
                    {t("professionalDevelopment.feedbackInsights")}
                  </h3>
                  {summary.feedback.unreadDirectFeedbackCount > 0 && (
                    <p className="mt-1 text-xs font-medium text-danger-strong">
                      {t("professionalDevelopment.unreadDirectCount")}:{" "}
                      {number(summary.feedback.unreadDirectFeedbackCount)}
                    </p>
                  )}
                </div>
                <Link
                  to="/professional-development/feedback"
                  className="text-xs font-medium text-neutral-600 underline decoration-neutral-300 underline-offset-4 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
                >
                  {t("professionalDevelopment.viewAllFeedback")}
                </Link>
              </div>
              {(() => {
                const featured =
                  summary.feedback.unreadDirectFeedbackCount > 0
                    ? (summary.feedback.latestDirectFeedback ??
                      summary.feedback.latestSharedInsight)
                    : (summary.feedback.latestSharedInsight ??
                      summary.feedback.latestDirectFeedback);
                if (!featured)
                  return (
                    <p className="mt-3 text-sm text-neutral-500">
                      {t("professionalDevelopment.noFeedbackSummary")}
                    </p>
                  );
                const scope =
                  featured.visibility === "DIRECT" ? "for-you" : "shared";
                return (
                  <Link
                    to={`/professional-development/feedback?scope=${scope}&feedback=${encodeURIComponent(featured.id)}`}
                    className="mt-3 flex items-start gap-2 rounded-lg border border-border-subtle px-3 py-3 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-info-strong dark:hover:bg-neutral-900"
                  >
                    {!featured.isRead && (
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-danger-strong"
                        aria-hidden="true"
                      />
                    )}
                    {!featured.isRead && (
                      <span className="sr-only">
                        {t("professionalDevelopment.feedbackUnreadLabel")}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {featured.title}
                      </span>
                      <span className="mt-1 block text-xs text-neutral-500">
                        {featured.author.name} ·{" "}
                        {relativeTime(featured.publishedAt)}
                      </span>
                    </span>
                  </Link>
                );
              })()}
            </section>
          )}
        </>
      )}
    </section>
  );
}
