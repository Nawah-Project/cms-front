import { Link } from "react-router";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatApplicationMethod } from "../../../types";
import type { RecentMemberProgress } from "../types/membersProgress.types";
import { MemberAvatar } from "./MemberAvatar";
import { relativeActivityTime } from "./LastUpdated";
import { useI18n } from "../../../i18n";

function ActivityDescription({ event }: { event: RecentMemberProgress }) {
  const { t } = useI18n();
  if (event.fromStage === null) {
    return (
      <span>
          <span className="font-medium text-neutral-700">{t("members.appliedTo")}</span>{" "}
        <span className="font-semibold text-neutral-900">
          {event.application.companyName}
        </span>
        <span className="ms-2 inline-flex items-center gap-1.5 align-middle">
          <StatusBadge kind="stage" value={event.toStage} />
          {event.toStage === "CLOSED" && event.outcome && (
            <StatusBadge kind="outcome" value={event.outcome} />
          )}
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <StatusBadge kind="stage" value={event.fromStage} />
      <span className="text-neutral-400" aria-hidden="true">
        →
      </span>
      <StatusBadge kind="stage" value={event.toStage} />
      {event.toStage === "CLOSED" && event.outcome && (
        <StatusBadge kind="outcome" value={event.outcome} />
      )}
    </span>
  );
}

function ActivityItem({
  event,
  compact,
  linkToProgress,
  isNew,
}: {
  event: RecentMemberProgress;
  compact?: boolean;
  linkToProgress?: boolean;
  isNew: boolean;
}) {
  const { t, locale } = useI18n();
  const contents = (
    <>
      <MemberAvatar member={event.member} size="small" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-neutral-900">
            {event.member.name}
          </span>
          <ActivityDescription event={event} />
        </span>
        <span className="mt-1 block truncate text-sm text-neutral-600">
          {event.application.jobTitle}
          {event.fromStage !== null && (
            <>
              <span aria-hidden="true"> · </span>
              {event.application.companyName}
            </>
          )}
          {event.application.applicationMethod && (
            <span className="text-xs text-neutral-500">
              {" "}
              · {t("members.viaMethod", { method: formatApplicationMethod(event.application.applicationMethod, t) })}
            </span>
          )}
        </span>
      </span>
      <time
        className="shrink-0 text-xs text-neutral-500"
        dateTime={event.changedAt}
        title={new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.changedAt))}
      >
          {relativeActivityTime(event.changedAt, locale)}
      </time>
      {isNew && (
        <span className="shrink-0 rounded-full border border-info-border bg-info-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-info-strong">
          {t("common.new")}
        </span>
      )}
    </>
  );
  const className = `flex min-w-0 items-start gap-3 ${compact ? "py-2.5" : "py-3"}`;
  return linkToProgress ? (
    <Link
      to="/members-progress"
      className={`${className} -mx-1 rounded-lg px-1 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-info-strong`}
    >
      {contents}
    </Link>
  ) : (
    <article className={className}>{contents}</article>
  );
}

export function RecentActivityList({
  events,
  loading,
  error,
  retry,
  compact = false,
  linkToProgress = false,
  scrollable = false,
  limit = 20,
  newEventIds,
}: {
  events: RecentMemberProgress[];
  loading: boolean;
  error: boolean;
  retry: () => void;
  compact?: boolean;
  linkToProgress?: boolean;
  scrollable?: boolean;
  limit?: number;
  newEventIds?: Set<string>;
}) {
  const { t } = useI18n();
  if (loading) {
    return (
      <div
        role="status"
        className="flex min-h-32 items-center gap-3 py-6 text-sm text-neutral-500"
      >
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700"
          aria-hidden="true"
        />
        {t("members.loadingActivity")}
      </div>
    );
  }
  if (error) {
    return (
      <div
        className="flex min-h-32 flex-col items-start justify-center py-5"
        role="alert"
      >
        <p className="text-sm text-danger-strong">
          {t("members.activityLoadError")}
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-2 rounded-md px-2 py-1 text-sm font-medium text-info-strong transition-colors hover:bg-info-soft focus-visible:outline-2 focus-visible:outline-info-strong"
        >
          {t("common.retry")}
        </button>
      </div>
    );
  }
  const visibleEvents = events.slice(0, limit);
  if (visibleEvents.length === 0) {
    return (
      <p className="py-8 text-sm text-neutral-500">{t("members.noRecentActivity")}</p>
    );
  }
  return (
    <div
      role={scrollable ? "region" : undefined}
      aria-label={scrollable ? t("members.recentActivity") : undefined}
      tabIndex={scrollable ? 0 : undefined}
      className={`divide-y divide-neutral-100 dark:divide-neutral-800 ${scrollable ? "max-h-[25rem] overflow-y-auto overscroll-contain pe-1.5 [&>*]:min-h-[4.75rem]" : ""}`}
    >
      {visibleEvents.map((event) => (
        <ActivityItem
          key={event.id}
          event={event}
          compact={compact}
          linkToProgress={linkToProgress}
          isNew={newEventIds?.has(event.id) ?? false}
        />
      ))}
    </div>
  );
}
