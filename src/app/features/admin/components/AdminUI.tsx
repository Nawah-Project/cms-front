import type { ReactNode } from "react";
import type { ActivityStatus } from "../api/adminApi";
import { useI18n } from "../../../i18n";

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
      className="flex min-h-40 items-center justify-center text-sm text-neutral-500"
      role="status"
    >
      {label ?? t("common.loading")}
    </div>
  );
}
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div
      className="rounded-lg border border-border bg-surface px-5 py-10 text-center"
      role="alert"
    >
      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
        {t("admin.loadSectionError")}
      </p>
      <button type="button" onClick={onRetry} className="button-secondary mt-4">
        {t("common.retry")}
      </button>
    </div>
  );
}
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-5 py-12 text-center text-sm text-neutral-500">
      {children}
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
        {title}
      </h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        {description}
      </p>
    </div>
  );
}

export function timeTitle(value: string | null, locale: string) {
  return value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "second");
}
