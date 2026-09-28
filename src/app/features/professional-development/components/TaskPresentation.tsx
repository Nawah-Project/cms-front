import type { DragEvent, ReactNode } from "react";
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

const STATUS_DOT_STYLES: Record<TaskStatus, string> = {
  TODO: "bg-neutral-400",
  IN_PROGRESS: "bg-info-strong",
  BLOCKED: "bg-warning-strong",
  DONE: "bg-success-strong",
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
    <span className="inline-flex items-center rounded-full border border-amber-600/70 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900 dark:border-amber-500/70 dark:bg-amber-950/50 dark:text-amber-200">
      {t("professionalDevelopment.mentorPriorityShort")}
    </span>
  );
}

export function TaskSourceLabel({
  source,
}: {
  source: ProfessionalTask["source"];
}) {
  const { t } = useI18n();
  return (
    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
      {t(
        source === "PERSONAL"
          ? "professionalDevelopment.personalTask"
          : "professionalDevelopment.mentorTaskSource",
      )}
    </span>
  );
}

export function TaskCard({
  task,
  onClick,
  draggable = false,
  onDragStart,
  onDragEnd,
}: {
  task: ProfessionalTask;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
}) {
  const { t, date } = useI18n();
  const overdue = task.overdue && task.status !== "DONE";
  const border = overdue
    ? "border-danger-border ring-1 ring-danger-border/60"
    : task.mentorPriority
      ? "border-amber-700/75 shadow-[0_0_0_2px_rgba(127,29,29,0.10)] before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-gradient-to-r before:from-red-800 before:via-orange-700 before:to-amber-500"
      : "border-border hover:border-border-hover";
  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`relative w-full overflow-hidden rounded-xl border bg-surface p-4 text-start shadow-xs transition hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info-strong ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${border}`}
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
              className="h-2 w-2 rounded-full bg-[#FF3B30]"
            />
            <span className="sr-only">
              {t("professionalDevelopment.unreadFeedback")}
            </span>
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <TaskSourceLabel source={task.source} />
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
  status,
  count,
  children,
  onDragOver,
  onDrop,
  isDragTarget = false,
}: {
  title: string;
  status: TaskStatus;
  count: number;
  children: ReactNode;
  onDragOver?: (event: DragEvent<HTMLElement>) => void;
  onDrop?: (event: DragEvent<HTMLElement>) => void;
  isDragTarget?: boolean;
}) {
  const { number } = useI18n();
  return (
    <section
      className={`min-w-0 space-y-3 rounded-xl border p-3 shadow-xs transition-colors ${isDragTarget ? "border-info-strong bg-info-soft/50 ring-2 ring-info-border" : "border-border bg-surface"}`}
      aria-label={title}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT_STYLES[status]}`}
          />
          <span className="truncate">{title}</span>
        </h2>
        <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-neutral-100 px-2 py-1 text-xs font-semibold tabular-nums text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          {number(count)}
        </span>
      </header>
      <div className="min-h-72 space-y-3 rounded-lg p-1">{children}</div>
    </section>
  );
}
