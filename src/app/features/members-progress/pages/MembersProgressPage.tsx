import { useAuth } from "../../auth/store/authStore";
import { useMembersProgress } from "../hooks/useMembersProgress";
import { useRecentMemberProgress } from "../hooks/useRecentMemberProgress";
import { MembersProgressTable } from "../components/MembersProgressTable";
import { RecentActivityList } from "../components/RecentActivityList";
import { SpinnerIcon } from "../../../components/Icons";
import { EmptyState } from "../../../components/EmptyState";
import { useI18n } from "../../../i18n";

export default function MembersProgressPage() {
  const { user } = useAuth();
  const { t, tp } = useI18n();
  const { members, loading, error, retry } = useMembersProgress();
  const activity = useRecentMemberProgress(50);

  return (
    <section className="space-y-8 animate-in fade-in duration-200">
      <header className="border-b border-border pb-7">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
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
              className="mt-1 text-xl font-semibold tracking-tight text-neutral-900"
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
              className="mt-1 text-xl font-semibold tracking-tight text-neutral-900"
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
