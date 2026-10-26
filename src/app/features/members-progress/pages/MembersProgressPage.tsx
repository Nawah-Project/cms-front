import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
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
import { LockedStateView } from "../../../components/ui/LockedStateView";
import { FeatureTour, FeatureTourPending } from "../../../components/FeatureTour";
import { GROUP_TOUR } from "../../journey/lib/week-one-tours";
import { openJourneyTasksPanel } from "../../../components/journeyTasksPanelEvents";

export default function MembersProgressPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { data: journeyData, isLoading: journeyLoading } = useJourneyState({
    enabled: Boolean(user),
  });
  const isUnlocked = canAccessGroupSection(journeyData, user);

  if (journeyLoading) {
    return (
      <div className="flex min-h-56 items-center justify-center" role="status"><FeatureTourPending feature="groups-week1-v1" />
        <SpinnerIcon className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!isUnlocked) {
    const taskZeroNode = journeyData?.nodes.find((n) => n.code === "TASK_0");
    const currentApps = taskZeroNode?.progress?.apps?.current ?? 0;
    const requiredApps = taskZeroNode?.progress?.apps?.required ?? 5;

    return (
      <main className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            {t("common.navMembersProgress")}
          </h1>
          <p className="text-sm text-neutral-500">
            {t("members.subtitle")}
          </p>
        </header>

        <LockedStateView
          title={t("common.navMembersProgress")}
          subtitle={t("journey.lockedBadge")}
          description={t("journey.groupLockedTooltip")}
          progressCurrent={currentApps}
          progressTotal={requiredApps}
          primaryActionLabel={t("common.addApplication")}
          onPrimaryAction={() => navigate("/applications")}
          secondaryActionLabel={t("journey.panelTitle")}
          onSecondaryAction={() => openJourneyTasksPanel()}
        />
      </main>
    );
  }

  return <MembersProgressContent />;
}

function MembersProgressContent() {
  const { user } = useAuth();
  const { t, tp } = useI18n();
  const { members, loading, error, retry } = useMembersProgress();
  const navigate = useNavigate();
  const activity = useRecentMemberProgress(50);

  return (
    <section className="space-y-5 sm:space-y-8">
      {loading && <FeatureTourPending feature="groups-week1-v1" />}
      <header className="border-b border-border pb-7">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-4xl">
          {t("members.title")}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {t("members.subtitle")}
        </p>
      </header>

      <FeatureTour feature="groups-week1-v1" enabled={!loading && !error && members.length > 0} steps={GROUP_TOUR} finishAr="افتح إرشاد السيرة" finishEn="Open CV guide" onFinish={(skipped,fromTarget) => {if(!skipped && !fromTarget) navigate('/professional-development?guidance=INSIGHT_TASK_0_CV_BASE');}} />

      <section data-guide="group-activity" aria-labelledby="recent-activity-heading" className="space-y-3">
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
