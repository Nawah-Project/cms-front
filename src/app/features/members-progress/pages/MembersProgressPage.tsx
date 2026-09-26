import { useAuth } from "../../auth/store/authStore";
import { useMembersProgress } from "../hooks/useMembersProgress";
import { useRecentMemberProgress } from "../hooks/useRecentMemberProgress";
import { MembersProgressTable } from "../components/MembersProgressTable";
import { RecentActivityList } from "../components/RecentActivityList";
import { SpinnerIcon } from "../../../components/Icons";
import { useI18n } from "../../../i18n";

export default function MembersProgressPage() {
  const { user } = useAuth();
  const { t, tp } = useI18n();
  const { members, loading, error, retry } = useMembersProgress();
  const activity = useRecentMemberProgress(50);

  return (
    <section className="space-y-8">
      <header className="border-b border-stone-300/80 pb-7 dark:border-neutral-800">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100 sm:text-4xl">
          {t("members.title")}
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {t("members.subtitle")}
        </p>
      </header>

      <section aria-labelledby="recent-activity-heading" className="space-y-3">
        <header className="flex items-end justify-between border-b border-stone-300/80 pb-3 dark:border-neutral-800">
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
        <div className="rounded-xl border border-neutral-200 bg-white px-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:px-5">
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
        <header className="flex items-end justify-between border-b border-stone-300/80 pb-3 dark:border-neutral-800">
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
            className="flex min-h-56 flex-col items-center justify-center border-y border-stone-200 text-sm text-neutral-500 dark:border-neutral-800"
            role="status"
          >
            <SpinnerIcon className="mb-3 h-6 w-6" />
            <span>{t("members.loadingProgress")}</span>
          </div>
        ) : error ? (
          <div
            className="border-y border-stone-200 py-8 text-center dark:border-neutral-800"
            role="alert"
          >
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {error === "unassigned"
                ? t("members.unassignedTitle")
                : t("members.loadError")}
            </p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {error === "unassigned"
                ? t("members.unassignedHelp")
                : t("members.retryHelp")}
            </p>
            {error === "general" && (
              <button
                type="button"
                onClick={() => void retry()}
                className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {t("common.retry")}
              </button>
            )}
          </div>
        ) : members.length === 0 ? (
          <div className="border-y border-stone-200 px-6 py-16 text-center dark:border-neutral-800">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t("members.noMembers")}
            </p>
          </div>
        ) : (
          <>
            {members.length === 1 &&
              (members[0].isCurrentUser || members[0].userId === user?.id) && (
                <p className="border-s-2 border-neutral-300 ps-4 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
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
