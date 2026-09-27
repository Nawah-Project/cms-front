import type { ReactNode } from "react";
import { useI18n } from "../../../i18n";
import type { ProfessionalTask, TaskPriority, TaskStatus } from "../types";

const STATUS_KEYS: Record<TaskStatus, string> = {
  TODO: "toDo",
  IN_PROGRESS: "inProgress",
  BLOCKED: "blocked",
  DONE: "done",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  TODO: "border-neutral-300 bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
  IN_PROGRESS:
    "border-info-border bg-info-soft text-info-strong dark:border-info-strong dark:bg-blue-950/50 dark:text-blue-200",
  BLOCKED:
    "border-warning-border bg-warning-soft text-warning-strong dark:border-warning-strong dark:bg-amber-950/50 dark:text-amber-200",
  DONE: "border-success-border bg-success-soft text-success-strong dark:border-success-strong dark:bg-green-950/50 dark:text-green-200",
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  LOW: "text-neutral-500",
  MEDIUM: "text-neutral-700 dark:text-neutral-300",
  HIGH: "text-warning-strong",
  CRITICAL: "text-danger-strong",
};

export function StatusPill({ status }: { status: TaskStatus }) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {t(`professionalDevelopment.${STATUS_KEYS[status]}`)}
    </span>
  );
}

export function PriorityLabel({ priority }: { priority: TaskPriority }) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${PRIORITY_STYLES[priority]}`}
    >
      {priority === "CRITICAL" && <span aria-hidden="true">●</span>}
      {t(`professionalDevelopment.${priority.toLowerCase()}`)}
    </span>
  );
}

export function MentorPriorityMark() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/80 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900 shadow-[0_0_0_2px_rgba(245,158,11,0.10)] dark:border-amber-500/70 dark:bg-amber-950/50 dark:text-amber-200">
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8.2 1.4c.4 2.2-1.4 2.8-.8 4.6.3.8 1 1.1 1.5 1.5.1-1.2.7-1.8 1.3-2.4 1.3 1.2 2.3 2.6 2.3 4.5a4.5 4.5 0 1 1-9 0c0-2.1 1.3-3.7 3.2-5.2-.1 1.1.2 1.7.7 2.1.7-1.4 1.7-2.6.8-5.1Z"
          fill="#F59E0B"
        />
        <path
          d="M8 8.4c.7.8 1.5 1.3 1.5 2.6a1.5 1.5 0 1 1-3 0c0-.9.6-1.8 1.5-2.6Z"
          fill="#EA580C"
        />
      </svg>
      {t("professionalDevelopment.mentorPriorityShort")}
    </span>
  );
}

export function TaskCard({
  task,
  onClick,
}: {
  task: ProfessionalTask;
  onClick: () => void;
}) {
  const { t, date } = useI18n();
  const overdue = task.overdue && task.status !== "DONE";
  const border = overdue
    ? "border-danger-border ring-1 ring-danger-border/60"
    : task.mentorPriority
      ? "border-amber-400/90 shadow-[0_0_0_2px_rgba(245,158,11,0.10)] before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-gradient-to-r before:from-amber-300 before:via-orange-500 before:to-amber-400"
      : "border-border hover:border-border-hover";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-xl border bg-surface p-4 text-start shadow-xs transition hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info-strong ${border}`}
      aria-label={`${task.title}${task.unreadMentorFeedbackCount ? `, ${t("professionalDevelopment.unreadFeedback")}` : ""}`}
    >
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 text-sm font-semibold leading-6 text-neutral-950 dark:text-neutral-100">
          {task.title}
        </span>
        {task.unreadMentorFeedbackCount > 0 && (
          <span
            className="mt-1.5 flex shrink-0 items-center gap-1.5"
            aria-label={t("professionalDevelopment.unreadFeedback")}
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-danger-strong"
            />
            <span className="sr-only">
              {t("professionalDevelopment.unreadFeedback")}
            </span>
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusPill status={task.status} />
        <PriorityLabel priority={task.priority} />
      </div>
      {task.mentorPriority && (
        <div className="mt-3">
          <MentorPriorityMark />
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3 text-xs">
        <span
          className={
            overdue
              ? "font-semibold text-danger-strong"
              : "text-neutral-500 dark:text-neutral-400"
          }
        >
          {overdue
            ? `${t("professionalDevelopment.overdue")} · `
            : `${t("professionalDevelopment.dueDate")} · `}
          {task.dueDate
            ? date(task.dueDate, { dateStyle: "medium" })
            : t("professionalDevelopment.noDueDate")}
        </span>
        {task.progress.total > 0 && (
          <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
            {t("professionalDevelopment.checklistProgress", task.progress)}
          </span>
        )}
      </div>
    </button>
  );
}

export function TaskSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  const { number } = useI18n();
  return (
    <section className="min-w-0 space-y-3" aria-label={title}>
      <header className="flex items-center justify-between border-b border-border pb-2.5">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {title}
        </h2>
        <span className="text-xs tabular-nums text-neutral-500">
          {number(count)}
        </span>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
