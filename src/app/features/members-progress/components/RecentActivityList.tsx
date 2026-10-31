import { Link } from "react-router";
import { ExternalLink, Plus, Sparkles, Trophy } from "lucide-react";
import { StatusBadge } from "../../applications/components/StatusBadge";
import { formatApplicationMethod } from "../../../types";
import type { RecentMemberProgress } from "../types/membersProgress.types";
import { MemberAvatar } from "./MemberAvatar";
import { relativeActivityTime } from "./LastUpdated";
import { useI18n } from "../../../i18n";
import { EmptyState } from "../../../components/EmptyState";
import { useAppModal } from "../../../components/AppModalContext";

function parseSideTaskSummary(
  sideTask: RecentMemberProgress["sideTask"],
  fallbackTitle?: string,
): { title: string; category?: string } {
  if (!sideTask) return { title: fallbackTitle || "" };
  const raw = sideTask.reviewSummary || sideTask.postTopic || fallbackTitle || "";
  if (typeof raw === "string" && raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.category === "CV_UPDATE") {
        return {
          title: `قام بتحديث السيرة الذاتية (CV ${Math.max(0, (parsed.version || 1) - 1)})`,
          category: "CV_UPDATE",
        };
      }
      if (parsed.category === "PORTFOLIO_UPDATE") {
        return {
          title: `قام بتحديث معرض أعماله${parsed.summary ? `: ${parsed.summary}` : ""}`,
          category: "PORTFOLIO_UPDATE",
        };
      }
      if (parsed.summary) {
        return { title: parsed.summary, category: parsed.category };
      }
    } catch {
      // not JSON
    }
  }
  return { title: raw };
}

function ActivityDescription({ event }: { event: RecentMemberProgress }) {
  const { t, locale } = useI18n();

  if (event.activityType === "SIDE_TASK" && event.sideTask) {
    const parsed = parseSideTaskSummary(event.sideTask, event.application.jobTitle);

    if (parsed.category === "CV_UPDATE" || parsed.category === "PORTFOLIO_UPDATE") {
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            {locale === "ar" ? "قام بتحديث بياناته المهنية" : "Updated professional profile"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            <span>{parsed.category === "CV_UPDATE" ? (locale === "ar" ? "سيرة ذاتية" : "CV") : (locale === "ar" ? "معرض أعمال" : "Portfolio")}</span>
          </span>
        </span>
      );
    }

    if (event.sideTask.type === "LINKEDIN_POST") {
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            {t("members.publishedLinkedInPost")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
            <span>LinkedIn</span>
          </span>
        </span>
      );
    }
    if (event.sideTask.type === "WEEKLY_REVIEW") {
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
            <Trophy className="h-3 w-3 text-amber-600" aria-hidden="true" />
            <span>
              {t("members.completedWeeklyReview", {
                week: event.sideTask.journeyWeek,
              })}
            </span>
          </span>
        </span>
      );
    }
    return (
      <span className="font-medium text-neutral-700 dark:text-neutral-300">
        {t("members.completedOutreachActivity")}
      </span>
    );
  }

  if (event.fromStage === null) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-neutral-700 dark:text-neutral-300">
          {t("members.appliedTo")}
        </span>{" "}
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
          {event.application.companyName}
        </span>
        <span className="ms-1 inline-flex items-center gap-1.5 align-middle">
          <StatusBadge kind="stage" value={event.toStage} />
          {event.toStage === "CLOSED" && event.outcome && (
            <StatusBadge kind="outcome" value={event.outcome} />
          )}
          {(event.activityType === "SHARED_APPLICATION" ||
            event.application.sharedWithGroup) && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
              <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
              <span>{t("members.sharedOpportunityBadge")}</span>
            </span>
          )}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <StatusBadge kind="stage" value={event.fromStage} />
      <span className="text-neutral-400" aria-hidden="true">
        {locale === "ar" ? "←" : "→"}
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
  const { openAddModal } = useAppModal();

  const isLinkedInPost =
    event.activityType === "SIDE_TASK" &&
    event.sideTask?.type === "LINKEDIN_POST";
  const isSharedOpportunity =
    event.activityType === "SHARED_APPLICATION" ||
    Boolean(event.application?.sharedWithGroup);

  const handleAddSharedOpportunity = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openAddModal({
      companyName: event.application.companyName,
      jobTitle: event.application.jobTitle,
      applicationMethod:
        event.application.applicationMethod || "COMPANY_WEBSITE",
      jobUrl: event.application.jobUrl || "",
    });
  };

  const contents = (
    <>
      <MemberAvatar member={event.member} size="small" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {event.member.name}
          </span>
          <ActivityDescription event={event} />
        </span>

        {/* Subtitle / Details */}
        {event.activityType === "SIDE_TASK" && event.sideTask ? (
          <span className="mt-1 block text-xs text-neutral-600 dark:text-neutral-400">
            {parseSideTaskSummary(event.sideTask, event.application.jobTitle).title}
          </span>
        ) : (
          <span className="mt-1 block truncate text-sm text-neutral-600 dark:text-neutral-400">
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
                ·{" "}
                {t("members.viaMethod", {
                  method: formatApplicationMethod(
                    event.application.applicationMethod,
                    t,
                  ),
                })}
              </span>
            )}
          </span>
        )}

        {/* Interactive CTAs for Shared LinkedIn Post or Shared Job Opportunity */}
        {(isLinkedInPost || isSharedOpportunity) && (
          <span className="mt-2 flex flex-wrap items-center gap-2">
            {isLinkedInPost && event.sideTask?.postUrl && (
              <a
                href={event.sideTask.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200"
              >
                <span>{t("members.supportColleagueLinkedIn")}</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}

            {isSharedOpportunity && (
              <button
                type="button"
                onClick={handleAddSharedOpportunity}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-900 shadow-2xs transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t("members.addSharedOpportunityBtn")}</span>
              </button>
            )}
          </span>
        )}
      </span>

      <time
        className="shrink-0 text-xs text-neutral-500"
        dateTime={event.changedAt}
        title={new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(event.changedAt))}
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
      className={`${className} -mx-1 rounded-lg px-1 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-info-strong dark:hover:bg-neutral-800/40`}
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
    return <EmptyState compact description={t("members.noRecentActivity")} />;
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
