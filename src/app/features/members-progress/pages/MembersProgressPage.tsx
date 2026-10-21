import { Lock, Plus, Sparkles } from "lucide-react";
import { useAuth } from "../../auth/store/authStore";
import { useMembersProgress } from "../hooks/useMembersProgress";
import { useRecentMemberProgress } from "../hooks/useRecentMemberProgress";
import { MembersProgressTable } from "../components/MembersProgressTable";
import { RecentActivityList } from "../components/RecentActivityList";
import { SpinnerIcon } from "../../../components/Icons";
import { EmptyState } from "../../../components/EmptyState";
import { useI18n } from "../../../i18n";
import { useJourneyState } from "../../journey/api/journeyApi";
import { canAccessGroupSection } from "../../journey/lib/journey-policies";
import { useAppModal } from "../../../routes/layout";

export default function MembersProgressPage() {
  const { user } = useAuth();
  const { t, tp } = useI18n();
  const { openAddModal } = useAppModal();
  const { data: journeyData, isLoading: journeyLoading } = useJourneyState({
    enabled: Boolean(user),
  });
  const isUnlocked = canAccessGroupSection(journeyData, user);

  const { members, loading, error, retry } = useMembersProgress();
  const activity = useRecentMemberProgress(50);

  // Motivational Lock Screen before completing Task 0 (first 5 applications)
  if (!journeyLoading && journeyData && !isUnlocked) {
    const task0Node = journeyData.nodes.find((n) => n.code === "TASK_0");
    const currentApps = task0Node?.progress.apps.current ?? 0;
    const requiredApps = task0Node?.requiredAppsCount ?? 5;
    const pct = Math.min(100, Math.round((currentApps / requiredApps) * 100));

    return (
      <section className="mx-auto max-w-2xl py-12 animate-in fade-in duration-200">
        <div className="rounded-3xl border border-amber-300/80 bg-gradient-to-b from-amber-50/70 via-white to-white p-8 text-center shadow-sm dark:border-amber-800/60 dark:from-amber-950/30 dark:via-neutral-900 dark:to-neutral-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
            <Lock className="h-7 w-7" aria-hidden="true" />
          </div>

          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("journey.groupLockBadge")}</span>
          </span>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-100 sm:text-3xl">
            {t("journey.groupLockTitle")}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-600 dark:text-neutral-300">
            {t("journey.groupLockDescription")}
          </p>

          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-border bg-neutral-50 p-4 text-start dark:bg-neutral-800/60">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              <span>{t("journey.task0ProgressLabel")}</span>
              <span className="tabular-nums">
                {currentApps} / {requiredApps} ({pct}%)
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => openAddModal()}
              className="button-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{t("common.addApplication")}</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8 animate-in fade-in duration-200">
      <header className="border-b border-border pb-7">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl">
          {t("members.title")}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {t("members.subtitle")}
        </p>
      </header>

      <section aria-labelledby="recent-activity-heading" className="space-y-3">
        <header className="flex items-end justify-between border-b border-border pb-3">
          <div>
            <p className="text-xs text-neutral-500">
              {t("members.sharedGroup")}
            </p>
            <h2
              id="recent-activity-heading"
              className="mt-1 text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              {t("members.recentActivity")}
            </h2>
          </div>
          {!activity.loading &&
            !activity.error &&
            activity.events.length > 0 && (
              <span className="text-xs text-neutral-500">
                {t("members.latestGroupUpdates")}
              </span>
            )}
        </header>
        <div className="rounded-xl border border-border bg-surface px-4 shadow-xs sm:px-5">
          <RecentActivityList
            events={activity.events}
            loading={activity.loading}
            error={activity.error !== null}
            retry={() => void activity.retry()}
            scrollable
            limit={50}
            newEventIds={activity.newEventIds}
          />
        </div>
      </section>

      <section aria-labelledby="members-pipeline-heading" className="space-y-4">
        <header className="flex items-end justify-between border-b border-border pb-3">
          <div>
            <p className="text-xs text-neutral-500">
              {t("members.currentStageTotals")}
            </p>
            <h2
              id="members-pipeline-heading"
              className="mt-1 text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              {t("members.memberProgress")}
            </h2>
          </div>
          {!loading && !error && members.length > 0 && (
            <span className="text-xs text-neutral-500">
              {tp("common.memberCount", members.length)}
            </span>
          )}
        </header>
        {loading ? (
          <div
            className="flex min-h-56 flex-col items-center justify-center border-y border-border text-sm text-neutral-500"
            role="status"
          >
            <SpinnerIcon className="mb-3 h-6 w-6 animate-spin text-neutral-400" />
            <span>{t("members.loadingProgress")}</span>
          </div>
        ) : error ? (
          <div
            className="rounded-xl border border-danger-border bg-danger-soft/30 p-6 text-center"
            role="alert"
          >
            <p className="text-sm font-semibold text-danger-strong">
              {error === "unassigned"
                ? t("members.unassignedTitle")
                : t("members.loadError")}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              {error === "unassigned"
                ? t("members.unassignedHelp")
                : t("members.retryHelp")}
            </p>
            {error === "general" && (
              <button
                type="button"
                onClick={() => void retry()}
                className="button-primary mt-4 text-xs font-medium"
              >
                {t("common.retry")}
              </button>
            )}
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            title={t("members.noMembers")}
            description={t("members.unassignedHelp")}
          />
        ) : (
          <>
            {members.length === 1 &&
              (members[0].isCurrentUser || members[0].userId === user?.id) && (
                <p className="border-s-2 border-border ps-4 text-xs text-neutral-500">
                  {t("members.onlyMember")}
                </p>
              )}
            <MembersProgressTable
              members={members}
              currentUserId={user?.id}
              activities={activity.events}
            />
          </>
        )}
      </section>
    </section>
  );
}
