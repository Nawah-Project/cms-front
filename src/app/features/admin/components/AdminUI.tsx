import type { ReactNode } from "react";
import type {
  ActivityStatus,
  AttentionReason,
  JourneySnapshot,
} from "../api/adminApi";
import { useI18n } from "../../../i18n";
import { SpinnerIcon, AlertCircleIcon } from "../../../components/Icons";
import { EmptyState as BaseEmptyState } from "../../../components/EmptyState";
export { PageHeading } from "../../../components/ui/PageHeading";

export function relativeTime(value: string | null, locale: string): string {
  if (!value) return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "second");
  const diff = new Date(value).getTime() - Date.now();
  const seconds = Math.round(diff / 1000);
  const absSeconds = Math.abs(seconds);
  const [amount, unit]: [number, Intl.RelativeTimeFormatUnit] = absSeconds < 60
    ? [seconds, "second"]
    : absSeconds < 3600 ? [Math.round(seconds / 60), "minute"]
      : absSeconds < 86400 ? [Math.round(seconds / 3600), "hour"]
        : absSeconds < 2592000 ? [Math.round(seconds / 86400), "day"]
          : absSeconds < 31536000 ? [Math.round(seconds / 2592000), "month"]
            : [Math.round(seconds / 31536000), "year"];
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(amount, unit);
}

const statusStyle: Record<ActivityStatus, string> = {
  ACTIVE: "status-success",
  WARNING: "status-warning",
  CRITICAL: "status-danger",
  NEVER_ACTIVE: "status-neutral",
};
export function ActivityBadge({
  status,
  days,
}: {
  status: ActivityStatus;
  days: number | null;
}) {
  const { t, tp } = useI18n();
  const label = status === "WARNING" || status === "CRITICAL"
    ? tp("admin.inactiveDays", days ?? 0)
    : status === "NEVER_ACTIVE" ? t("admin.neverActive") : t("admin.active");
  return <span className={`status-badge ${statusStyle[status]}`}>{label}</span>;
}

export function Initials({
  name,
  avatar,
}: {
  name: string;
  avatar?: string | null;
}) {
  if (avatar)
    return (
      <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
    );
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toLocaleUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
    >
      {initials}
    </span>
  );
}

export function StageCounts({
  counts,
}: {
  counts: {
    applied: number;
    assignment?: number;
    interview: number;
    decision: number;
    closed: number;
  };
}) {
  const { t, number } = useI18n();
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
      {(
        [
          [t("applications.submitted"), counts.applied],
          [t("applications.assignment"), counts.assignment ?? 0],
          [t("applications.interview"), counts.interview],
          [t("applications.decision"), counts.decision],
          [t("applications.closed"), counts.closed],
        ] as const
      ).map(([label, value]) => (
        <span
          key={label}
          className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 dark:border-neutral-800 dark:bg-neutral-900"
        >
          {label}{" "}
          <strong className="font-semibold text-neutral-900 dark:text-neutral-100">
            {number(value)}
          </strong>
        </span>
      ))}
    </div>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div
      className="flex min-h-40 items-center justify-center gap-2 text-sm text-neutral-500"
      role="status"
    >
      <SpinnerIcon className="h-5 w-5 text-neutral-500" />
      <span>{label ?? t("common.loading")}</span>
    </div>
  );
}
export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { t } = useI18n();
  return (
    <div
      className="rounded-xl border border-danger-border bg-danger-soft/30 px-5 py-8 text-center"
      role="alert"
    >
      <AlertCircleIcon className="mx-auto mb-2 h-6 w-6 text-danger-strong" />
      <p className="text-sm font-medium text-danger-strong">
        {message ?? t("admin.loadSectionError")}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="button-secondary mt-4">
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  children,
  icon,
  actionLabel,
  onActionClick,
  compact = true,
}: {
  children?: ReactNode;
  icon?: ReactNode;
  actionLabel?: string;
  onActionClick?: () => void;
  compact?: boolean;
}) {
  return (
    <BaseEmptyState
      compact={compact}
      icon={icon}
      actionLabel={actionLabel}
      onActionClick={onActionClick}
    >
      {children}
    </BaseEmptyState>
  );
}

export function timeTitle(value: string | null, locale: string) {
  return value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "second");
}

export function JourneyBadge({
  journey,
  compact = false,
}: {
  journey?: JourneySnapshot | null;
  compact?: boolean;
}) {
  const { t, locale, number } = useI18n();
  if (!journey) {
    return (
      <span className="status-badge status-neutral">
        {t("admin.journeyNotStartedBadge")}
      </span>
    );
  }
  const isTask0 = journey.nodeCode === "TASK_0";
  const isFinished = journey.nodeCode === "FINAL_REPORT";
  const isNotStarted = isTask0 && journey.nodeApps === 0;
  const title =
    (locale === "ar" ? journey.titleAr : journey.titleEn) ?? journey.nodeCode;
  const weekLabel =
    journey.week === 0
      ? t("admin.journeyWeek0")
      : t("admin.journeyWeekN", { week: number(journey.week) });
  const required = Math.max(0, journey.requiredApps);
  const current = Math.min(
    required > 0 ? required : journey.nodeApps,
    Math.max(0, journey.nodeApps),
  );
  const pct =
    required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 100;

  const badgeTone = isFinished
    ? "status-success"
    : isNotStarted
      ? "status-warning"
      : "status-info";

  if (compact) {
    return (
      <span className={`status-badge ${badgeTone}`}>
        {isFinished
          ? t("admin.journeyCompletedBadge")
          : `${weekLabel} · ${number(current)}/${number(required)}`}
      </span>
    );
  }

  return (
    <div className="space-y-1.5 min-w-40">
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
        <span className={`status-badge ${badgeTone}`}>
          {isFinished ? t("admin.journeyCompletedBadge") : weekLabel}
        </span>
        {!isFinished && required > 0 && (
          <span className="font-semibold tabular-nums text-neutral-700 dark:text-neutral-200">
            {number(current)} / {number(required)}
          </span>
        )}
      </div>
      <p className="truncate text-[11px] text-neutral-500" title={title}>
        {title}
      </p>
      {!isFinished && required > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className={`h-full rounded-full transition-all ${isNotStarted ? "bg-warning-strong" : "bg-info-strong"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function AttentionReasonBadges({
  reasons,
}: {
  reasons: AttentionReason[];
}) {
  const { t, number } = useI18n();
  return (
    <div className="flex flex-wrap gap-1.5">
      {reasons.map((reason) => {
        const label =
          reason.code === "PROFILE_INCOMPLETE"
            ? t("admin.reasonProfileIncomplete")
            : reason.code === "JOURNEY_NOT_STARTED"
              ? t("admin.reasonJourneyNotStarted", {
                  days: number(reason.days ?? 0),
                })
              : reason.code === "JOURNEY_STALLED"
                ? t("admin.reasonJourneyStalled", {
                    days: number(reason.days ?? 0),
                  })
                : reason.code === "OVERDUE_TASKS"
                  ? t("admin.reasonOverdueTasks", {
                      count: number(reason.count ?? 0),
                    })
                  : t("admin.reasonInactive", {
                      days: number(reason.days ?? 0),
                    });
        const tone =
          reason.severity >= 4
            ? "status-danger"
            : reason.severity >= 3
              ? "status-warning"
              : "status-neutral";
        return (
          <span key={reason.code} className={`status-badge ${tone}`}>
            {label}
          </span>
        );
      })}
    </div>
  );
}
