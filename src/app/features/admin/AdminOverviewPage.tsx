import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  adminApi,
  type AdminActivity,
  type AdminGroup,
  type AdminOverview,
} from "./api/adminApi";
import { AdminActivityList } from "./components/AdminActivityList";
import { useI18n } from "../../i18n";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeading,
  relativeTime,
} from "./components/AdminUI";
import { SparklesIcon } from "../../components/Icons";
import { useUxExperiment, getUxEvents } from "../../utils/uxAnalytics";

export default function AdminOverviewPage() {
  const { t, tp, number, locale } = useI18n();
  const { variant, setVariant } = useUxExperiment("dashboard_layout_v2");
  const [data, setData] = useState<{
    overview: AdminOverview;
    groups: AdminGroup[];
    activity: AdminActivity[];
    uxMetrics?: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const load = () => {
    setLoading(true);
    setError(false);
    void Promise.all([
      adminApi.overview(),
      adminApi.groups(),
      adminApi.activity(6),
      adminApi.uxAnalytics().catch(() => null),
    ])
      .then(([overview, groups, activity, uxMetrics]) =>
        setData({
          overview,
          groups: groups.items,
          activity: activity.items,
          uxMetrics,
        }),
      )
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  if (loading) return <LoadingState label={t("admin.loadingOverview")} />;
  if (error || !data) return <ErrorState onRetry={load} />;

  const targetMembers = 50;
  const acquisitionPercent = Math.min(
    100,
    Math.round((data.overview.usersCount / targetMembers) * 100),
  );
  const engagementRate =
    data.overview.usersCount > 0
      ? Math.round((data.overview.activeUsersCount / data.overview.usersCount) * 100)
      : 0;

  const uxEvents = getUxEvents();
  const localCount = (eventName: string) =>
    uxEvents.filter((e) => e.name === eventName || (e as any).event === eventName).length;

  const backendOnboardingStartedCount =
    data.uxMetrics?.uniqueUsersByEvent?.onboarding_started ??
    data.uxMetrics?.totalsByEvent?.onboarding_started;
  const onboardingStartedCount =
    backendOnboardingStartedCount ??
    (localCount("onboarding_started") || data.overview.usersCount);

  const backendOnboardingCompletedCount =
    data.uxMetrics?.uniqueUsersByEvent?.onboarding_completed ??
    data.uxMetrics?.totalsByEvent?.onboarding_completed;
  const onboardingCompletedCount =
    backendOnboardingCompletedCount ??
    (localCount("onboarding_completed") || data.overview.activeUsersCount);

  const videoWatchedCount =
    data.uxMetrics?.uniqueUsersByEvent?.onboarding_video_watched ??
    data.uxMetrics?.totalsByEvent?.onboarding_video_watched ??
    localCount("onboarding_video_watched");

  const onboardingCompletionPercent =
    onboardingStartedCount > 0
      ? Math.min(
          100,
          Math.round((onboardingCompletedCount / onboardingStartedCount) * 100),
        )
      : 0;

  const videoWatchPercent =
    data.overview.usersCount > 0
      ? Math.min(
          100,
          Math.round((videoWatchedCount / Math.max(1, data.overview.usersCount)) * 100),
        )
      : 0;

  const variantAInteractions =
    data.uxMetrics?.abTestSummary?.A?.interactionsCount ??
    uxEvents.filter((e) => e.variant === "A").length;
  const variantBInteractions =
    data.uxMetrics?.abTestSummary?.B?.interactionsCount ??
    uxEvents.filter((e) => e.variant === "B").length;
  const totalAbInteractions = variantAInteractions + variantBInteractions;
  const variantBShare =
    totalAbInteractions > 0
      ? Math.round((variantBInteractions / totalAbInteractions) * 100)
      : 50;

  const stat = (label: string, value: number, note?: string, tone = "") => (
    <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${tone}`}>
        {number(value)}
      </p>
      {note && <p className="mt-1 text-xs text-neutral-500">{note}</p>}
    </div>
  );
  return (
    <div className="space-y-8">
      <PageHeading
        eyebrow={t("admin.operations")}
        title={t("admin.overviewTitle")}
        description={t("admin.overviewDescription")}
      />

      {/* UX & Growth Targets Section */}
      <section
        aria-label={t("admin.uxGrowthSectionTitle")}
        className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-info-soft text-info-strong">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                {t("admin.uxGrowthSectionTitle")}
              </h3>
              <p className="text-xs text-text-secondary">
                {t("admin.currentExperimentVariant", {
                  variant: variant === "A" ? t("admin.variantA") : t("admin.variantB"),
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">
              {t("admin.abVariantSwitcher")}:
            </span>
            <div className="inline-flex rounded-xl border border-border bg-neutral-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setVariant("A")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  variant === "A"
                    ? "bg-surface text-text-primary shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {t("admin.variantA")}
              </button>
              <button
                type="button"
                onClick={() => setVariant("B")}
                className={`rounded-lg px-3 py-1.5 transition ${
                  variant === "B"
                    ? "bg-surface text-text-primary shadow-xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {t("admin.variantB")}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: t("admin.acquisitionTarget"),
              value: `${number(data.overview.usersCount)} / 50`,
              percent: acquisitionPercent,
              subtitle: t("admin.acquisitionProgress", {
                count: number(data.overview.usersCount),
                percent: number(acquisitionPercent),
              }),
              color: "bg-info-strong",
            },
            {
              title: t("admin.onboardingCompletionRate"),
              value: `${number(onboardingCompletionPercent)}%`,
              percent: onboardingCompletionPercent,
              subtitle: t("admin.funnelCompleted", {
                count: number(onboardingCompletedCount),
                percent: number(onboardingCompletionPercent),
              }),
              color: "bg-success-strong",
            },
            {
              title: t("admin.videoWatchRate"),
              value: `${number(videoWatchPercent)}%`,
              percent: videoWatchPercent,
              subtitle: t("admin.funnelViews", {
                count: number(videoWatchedCount),
              }),
              color: "bg-info-strong",
            },
            {
              title: t("admin.abMetricsComparison"),
              value: `B: ${number(variantBShare)}% · A: ${number(100 - variantBShare)}%`,
              percent: variantBShare,
              subtitle: `${t("admin.variantBPerformance")}: ${number(variantBInteractions)} (${number(variantBShare)}%)`,
              color: "bg-success-strong",
            },
          ].map((target) => (
            <div
              key={target.title}
              className="space-y-2 rounded-xl border border-border/80 bg-neutral-50/50 p-4"
            >
              <p className="text-xs font-medium text-neutral-500">{target.title}</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-neutral-900">
                {target.value}
              </p>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-neutral-200"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={target.percent}
                aria-label={target.title}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${target.color}`}
                  style={{ width: `${target.percent}%` }}
                />
              </div>
              <p className="text-[11px] text-neutral-500">{target.subtitle}</p>
            </div>
          ))}
        </div>
      </section>
      <section
        aria-label={t("admin.workspaceTotals")}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stat(
          t("admin.totalUsers"),
          data.overview.usersCount,
          tp("admin.unassignedCount", data.overview.unassignedUsersCount),
          "text-info-strong",
        )}
        {stat(
          t("admin.groupsCount"),
          data.overview.groupsCount,
          tp("admin.assignedMembers", data.overview.membershipsCount),
          "text-info-strong",
        )}
        {stat(
          t("admin.activeUsers"),
          data.overview.activeUsersCount,
          t("admin.activityLast3Days"),
          "text-success-strong",
        )}
        {stat(
          t("admin.warningUsers"),
          data.overview.warningUsersCount,
          t("admin.inactive3to6Days"),
          "text-warning-strong",
        )}
        {stat(
          t("admin.criticalUsers"),
          data.overview.criticalUsersCount,
          t("admin.inactive7Days"),
          "text-danger-strong",
        )}
        {stat(
          t("admin.neverActiveUsers"),
          data.overview.neverActiveUsersCount,
          t("admin.noApplicationsYet"),
          "text-neutral-700 dark:text-neutral-300",
        )}
        {stat(
          t("admin.applications"),
          data.overview.applicationsCount,
          t("admin.acrossMembers"),
          "text-info-strong",
        )}
        {stat(
          t("admin.groupsWithSpace"),
          data.groups.filter((group) => group.availableSlots > 0).length,
          t("admin.capacityAvailable"),
          "text-success-strong",
        )}
      </section>
      <section className="space-y-3">
        <div className="flex items-end justify-between border-b border-border pb-3">
          <div>
            <p className="text-xs text-neutral-500">{t("admin.groupStatus")}</p>
            <h3 className="mt-1 text-lg font-semibold">
              {t("admin.capacityActivity")}
            </h3>
          </div>
          <Link
            to="/admin/groups"
            className="text-sm font-medium text-neutral-700 hover:underline dark:text-neutral-300"
          >
            {t("admin.allGroups")}
          </Link>
        </div>
        {!data.groups.length ? (
          <EmptyState>{t("admin.noGroups")}</EmptyState>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="hidden grid-cols-[minmax(9rem,1.4fr)_1fr_1fr_1fr] gap-4 border-b border-border bg-neutral-50 px-4 py-3 text-xs font-medium text-neutral-500 dark:bg-neutral-900 sm:grid">
              <span>{t("admin.group")}</span>
              <span>{t("admin.capacity")}</span>
              <span>{t("admin.lastActivity")}</span>
              <span>{t("admin.memberStatus")}</span>
            </div>
            {data.groups.map((group) => (
              <div
                key={group.id}
                className="grid gap-2 border-b border-border-subtle px-4 py-4 last:border-0 sm:grid-cols-[minmax(9rem,1.4fr)_1fr_1fr_1fr] sm:items-center sm:gap-4"
              >
                <div>
                  <p className="font-medium">{group.name}</p>
                  <p className="text-xs text-neutral-500 sm:hidden">
                    {t("admin.memberCapacity", { members: group.memberCount, capacity: group.capacity })}
                  </p>
                </div>
                <div>
                  <p className="text-sm">
                    {t("admin.memberCapacity", { members: group.memberCount, capacity: group.capacity })}
                  </p>
                  <div className="mt-2 h-1.5 w-36 max-w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-neutral-700"
                      style={{
                        width: `${Math.min(100, (group.memberCount / Math.max(1, group.capacity)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p
                    className={`text-xs ${group.availableSlots ? "text-success-strong" : "text-neutral-500"}`}
                  >
                    {group.availableSlots
                      ? tp("common.spotCount", group.availableSlots)
                      : t("admin.full")}
                  </p>
                </div>
                <p className="text-xs text-neutral-500">
                  {t("admin.groupLastActivity", { time: relativeTime(group.lastActivityAt, locale) })}
                </p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="status-badge status-success">
                    {tp("admin.statusCount", group.activeMembers, { status: t("admin.active") })}
                  </span>
                  <span className="status-badge status-warning">
                    {tp("admin.statusCount", group.warningMembers, { status: t("admin.warning") })}
                  </span>{" "}
                  <span className="status-badge status-danger">
                    {tp("admin.statusCount", group.criticalMembers, { status: t("admin.critical") })}
                  </span>
                  {group.neverActiveMembers > 0 && (
                    <span className="status-badge status-neutral">
                      {tp("admin.statusCount", group.neverActiveMembers, { status: t("admin.neverActiveShort") })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="space-y-3">
        <div className="flex items-end justify-between border-b border-border pb-3">
          <div>
            <p className="text-xs text-neutral-500">{t("admin.recentChanges")}</p>
            <h3 className="mt-1 text-lg font-semibold">{t("admin.recentActivity")}</h3>
          </div>
          <Link
            to="/admin/activity"
            className="text-sm font-medium text-neutral-700 hover:underline dark:text-neutral-300"
          >
            {t("admin.viewActivity")}
          </Link>
        </div>
        <div className="rounded-lg border border-border bg-surface px-4 sm:px-5">
          <AdminActivityList items={data.activity} />
        </div>
      </section>
    </div>
  );
}
