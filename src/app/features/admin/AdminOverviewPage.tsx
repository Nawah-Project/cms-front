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

export default function AdminOverviewPage() {
  const { t, tp, number, locale } = useI18n();
  const [data, setData] = useState<{
    overview: AdminOverview;
    groups: AdminGroup[];
    activity: AdminActivity[];
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
    ])
      .then(([overview, groups, activity]) =>
        setData({ overview, groups: groups.items, activity: activity.items }),
      )
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  if (loading) return <LoadingState label={t("admin.loadingOverview")} />;
  if (error || !data) return <ErrorState onRetry={load} />;
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
      <section
        aria-label={t("admin.workspaceTotals")}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stat(
          t("admin.totalUsers"),
          data.overview.usersCount,
          tp("admin.unassignedCount", data.overview.unassignedUsersCount),
        )}
        {stat(
          t("admin.groupsCount"),
          data.overview.groupsCount,
          tp("admin.assignedMembers", data.overview.membershipsCount),
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
        )}
        {stat(
          t("admin.applications"),
          data.overview.applicationsCount,
          t("admin.acrossMembers"),
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
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  {tp("admin.statusCount", group.activeMembers, { status: t("admin.active") })} ·{" "}
                  <span className="text-warning-strong">
                    {tp("admin.statusCount", group.warningMembers, { status: t("admin.warning") })}
                  </span>{" "}
                  ·{" "}
                  <span className="text-danger-strong">
                    {tp("admin.statusCount", group.criticalMembers, { status: t("admin.critical") })}
                  </span>
                </p>
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
