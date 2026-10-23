import { useEffect, useState } from "react";
import { adminApi, type AdminGroup } from "./api/adminApi";
import { useI18n } from "../../i18n";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeading,
  relativeTime,
  timeTitle,
} from "./components/AdminUI";
import { GroupMembersDrawer } from "./components/GroupMembersDrawer";
import { ArrowLeftIcon } from "../../components/Icons";

export default function AdminGroupsPage() {
  const { t, tp, locale } = useI18n();
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<AdminGroup | null>(null);

  const load = () => {
    setLoading(true);
    setError(false);
    void adminApi
      .groups()
      .then(({ items }) => setGroups(items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeading
          eyebrow={t("admin.pageEyebrowCapacity")}
          title={t("admin.groupsTitle")}
          description={t("admin.groupsDescription")}
        />
        <span className="rounded-lg border border-border bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
          {t("admin.clickGroupHint")}
        </span>
      </div>
      {loading ? (
        <LoadingState label={t("admin.loadingGroups")} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : !groups.length ? (
        <EmptyState>{t("admin.noGroups")}</EmptyState>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
            <table className="data-table">
              <thead className="data-table-head">
                <tr>
                  <th className="data-table-cell">{t("admin.group")}</th>
                  <th className="data-table-cell">{t("admin.capacity")}</th>
                  <th className="data-table-cell">{t("admin.lastActivity")}</th>
                  <th className="data-table-cell">{t("admin.memberActivity")}</th>
                  <th className="data-table-cell w-10"></th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr
                    key={group.id}
                    onClick={() => setSelectedGroup(group)}
                    className="data-table-row cursor-pointer transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-900/60"
                  >
                    <td className="data-table-cell font-medium">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {group.name}
                        </span>
                      </div>
                    </td>
                    <td className="data-table-cell">
                      <p className="text-sm font-medium">
                        {t("admin.memberCapacity", { members: group.memberCount, capacity: group.capacity })}
                      </p>
                      <div className="mt-2 h-1.5 w-36 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div
                          className="h-full rounded-full bg-neutral-700 dark:bg-neutral-300"
                          style={{
                            width: `${Math.min(100, (group.memberCount / Math.max(1, group.capacity)) * 100)}%`,
                          }}
                        />
                      </div>
                      <p
                        className={`mt-1 text-xs ${group.availableSlots ? "text-success-strong" : "text-neutral-500"}`}
                      >
                        {group.availableSlots
                          ? tp("common.spotCount", group.availableSlots)
                          : t("admin.full")}
                      </p>
                    </td>
                    <td
                      className="data-table-cell text-sm text-neutral-600 dark:text-neutral-300"
                      title={timeTitle(group.lastActivityAt, locale)}
                    >
                      {relativeTime(group.lastActivityAt, locale)}
                    </td>
                    <td className="data-table-cell">
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="status-badge status-success">
                          {tp("admin.statusCount", group.activeMembers, { status: t("admin.active") })}
                        </span>
                        <span className="status-badge status-warning">
                          {tp("admin.statusCount", group.warningMembers, { status: t("admin.warning") })}
                        </span>
                        <span className="status-badge status-danger">
                          {tp("admin.statusCount", group.criticalMembers, { status: t("admin.critical") })}
                        </span>
                        {group.neverActiveMembers > 0 && (
                          <span className="status-badge status-neutral">
                            {tp("admin.statusCount", group.neverActiveMembers, { status: t("admin.neverActiveShort") })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="data-table-cell text-end">
                      <ArrowLeftIcon className="h-4 w-4 rotate-180 text-neutral-400 rtl:rotate-0 inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {groups.map((group) => (
              <article
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className="space-y-3 rounded-lg border border-border bg-surface p-4 cursor-pointer transition hover:border-neutral-400"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{group.name}</h3>
                  <span className="text-xs text-neutral-500">
                    {group.memberCount}/{group.capacity}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-neutral-700 dark:bg-neutral-300"
                    style={{
                      width: `${Math.min(100, (group.memberCount / Math.max(1, group.capacity)) * 100)}%`,
                    }}
                  />
                </div>
                <p
                  className={`text-sm ${group.availableSlots ? "text-success-strong" : "text-neutral-500"}`}
                >
                    {group.availableSlots
                    ? tp("common.spotCount", group.availableSlots)
                    : t("admin.full")}
                </p>
                <p
                  className="text-xs text-neutral-500"
                  title={timeTitle(group.lastActivityAt, locale)}
                >
                  {t("admin.groupLastActivity", { time: relativeTime(group.lastActivityAt, locale) })}
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="status-badge status-success">
                    {tp("admin.statusCount", group.activeMembers, { status: t("admin.active") })}
                  </span>
                  <span className="status-badge status-warning">
                    {tp("admin.statusCount", group.warningMembers, { status: t("admin.warning") })}
                  </span>
                  <span className="status-badge status-danger">
                    {tp("admin.statusCount", group.criticalMembers, { status: t("admin.critical") })}
                  </span>
                  {group.neverActiveMembers > 0 && (
                    <span className="status-badge status-neutral">
                      {tp("admin.statusCount", group.neverActiveMembers, { status: t("admin.neverActiveShort") })}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {/* Group Members Side Drawer */}
      <GroupMembersDrawer
        group={selectedGroup}
        onClose={() => setSelectedGroup(null)}
        onGroupUpdated={load}
      />
    </div>
  );
}
