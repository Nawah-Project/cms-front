import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  adminApi,
  type AdminGroup,
  type AdminMember,
} from "./api/adminApi";
import { useI18n } from "../../i18n";
import {
  ActivityBadge,
  EmptyState,
  ErrorState,
  Initials,
  JourneyBadge,
  LoadingState,
  PageHeading,
  relativeTime,
  timeTitle,
} from "./components/AdminUI";
import { AdminMemberDetail } from "./components/AdminMemberDetail";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/ToastProvider";

export default function AdminGroupsPage() {
  const { t, tp, locale, number } = useI18n();
  const toast = useToast();
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<
    Record<string, AdminMember[]>
  >({});
  const [loadingGroupIds, setLoadingGroupIds] = useState<
    Record<string, boolean>
  >({});
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(
    null,
  );
  const [removingTarget, setRemovingTarget] = useState<{
    group: AdminGroup;
    member: AdminMember;
  } | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

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

  const toggleGroup = async (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }
    setExpandedGroupId(groupId);
    if (!groupMembers[groupId]) {
      setLoadingGroupIds((prev) => ({ ...prev, [groupId]: true }));
      try {
        const res = await adminApi.users({ groupId, limit: 50 });
        setGroupMembers((prev) => ({ ...prev, [groupId]: res.items }));
      } catch {
        toast.error(t("admin.loadSectionError"));
      } finally {
        setLoadingGroupIds((prev) => ({ ...prev, [groupId]: false }));
      }
    }
  };

  const confirmRemoval = async () => {
    if (!removingTarget) return;
    const { group, member } = removingTarget;
    setRemoveLoading(true);
    try {
      await adminApi.removeFromGroup(group.id, member.id);
      const msg = t("admin.removedSuccess", {
        name: member.name,
        group: group.name,
      });
      toast.success(msg);
      setGroupMembers((prev) => ({
        ...prev,
        [group.id]: (prev[group.id] || []).filter((m) => m.id !== member.id),
      }));
      setRemovingTarget(null);
      load();
    } catch {
      toast.error(t("admin.actionFailed"));
    } finally {
      setRemoveLoading(false);
    }
  };

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
          {/* Desktop Table with inline accordion */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
            <table className="data-table">
              <thead className="data-table-head">
                <tr>
                  <th className="data-table-cell">{t("admin.group")}</th>
                  <th className="data-table-cell">{t("admin.capacity")}</th>
                  <th className="data-table-cell">{t("admin.lastActivity")}</th>
                  <th className="data-table-cell">{t("admin.memberActivity")}</th>
                  <th className="data-table-cell w-10 text-end"></th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const isExpanded = expandedGroupId === group.id;
                  const members = groupMembers[group.id];
                  const isLoadingMembers = loadingGroupIds[group.id];
                  return (
                    <tr
                      key={group.id}
                      className="border-b border-border-subtle last:border-0"
                    >
                      <td colSpan={5} className="p-0">
                        <div
                          onClick={() => void toggleGroup(group.id)}
                          className={`grid grid-cols-[minmax(9rem,1.4fr)_1fr_1fr_1fr_2.5rem] items-center gap-4 px-4 py-4 cursor-pointer transition-colors ${
                            isExpanded
                              ? "bg-neutral-100/70 dark:bg-neutral-800/50"
                              : "hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {group.name}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {t("admin.memberCapacity", {
                                members: number(group.memberCount),
                                capacity: number(group.capacity),
                              })}
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
                          </div>
                          <div
                            className="text-sm text-neutral-600 dark:text-neutral-300"
                            title={timeTitle(group.lastActivityAt, locale)}
                          >
                            {relativeTime(group.lastActivityAt, locale)}
                          </div>
                          <div>
                            <div className="flex flex-wrap gap-1.5 text-xs">
                              <span className="status-badge status-success">
                                {tp("admin.statusCount", group.activeMembers, {
                                  status: t("admin.active"),
                                })}
                              </span>
                              <span className="status-badge status-warning">
                                {tp("admin.statusCount", group.warningMembers, {
                                  status: t("admin.warning"),
                                })}
                              </span>
                              <span className="status-badge status-danger">
                                {tp("admin.statusCount", group.criticalMembers, {
                                  status: t("admin.critical"),
                                })}
                              </span>
                              {group.neverActiveMembers > 0 && (
                                <span className="status-badge status-neutral">
                                  {tp("admin.statusCount", group.neverActiveMembers, {
                                    status: t("admin.neverActiveShort"),
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-end pe-2">
                            <span
                              className={`inline-grid h-7 w-7 place-items-center rounded-full text-neutral-400 transition-transform ${
                                isExpanded ? "rotate-180 text-neutral-800 dark:text-neutral-100" : ""
                              }`}
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m6 9 6 6 6-6"
                                />
                              </svg>
                            </span>
                          </div>
                        </div>

                        {/* Inline Accordion Content */}
                        {isExpanded && (
                          <div className="member-detail-enter border-t border-border-subtle bg-neutral-50/70 p-5 dark:bg-neutral-900/50">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                                    {t("admin.groupMembers")}
                                  </span>
                                  <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                    {number(members?.length ?? group.memberCount)}
                                  </span>
                                </div>
                                <Link
                                  to={`/admin/members?group=${encodeURIComponent(group.id)}`}
                                  className="text-xs font-semibold text-info-strong hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {t("admin.openInMembersTable")}
                                </Link>
                              </div>

                              {isLoadingMembers ? (
                                <LoadingState label={t("admin.loadingMembers")} />
                              ) : !members || !members.length ? (
                                <EmptyState compact>
                                  {t("admin.noMembersInGroup")}
                                </EmptyState>
                              ) : (
                                <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface shadow-2xs">
                                  {members.map((member) => (
                                    <div
                                      key={member.id}
                                      className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4"
                                    >
                                      <div className="flex min-w-0 items-center gap-3">
                                        <Initials
                                          name={member.name}
                                          avatar={member.avatar}
                                        />
                                        <div className="min-w-0">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedMember(member);
                                            }}
                                            className="truncate text-sm font-semibold text-neutral-900 hover:underline dark:text-neutral-100 text-start"
                                          >
                                            {member.name}
                                          </button>
                                          {member.email && (
                                            <p className="truncate text-xs text-neutral-500">
                                              {member.email}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-3">
                                        <JourneyBadge
                                          journey={member.journey}
                                          compact
                                        />
                                        <ActivityBadge
                                          status={member.activityStatus}
                                          days={member.inactivityDays}
                                        />
                                        <span
                                          className="text-xs text-neutral-500 hidden lg:inline"
                                          title={timeTitle(
                                            member.lastActivityAt,
                                            locale,
                                          )}
                                        >
                                          {relativeTime(
                                            member.lastActivityAt,
                                            locale,
                                          )}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedMember(member);
                                            }}
                                            className="button-secondary px-2.5 py-1 text-xs"
                                          >
                                            {t("admin.quickInspect")}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setRemovingTarget({ group, member });
                                            }}
                                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:border-danger-border hover:bg-danger-soft hover:text-danger-strong dark:text-neutral-400"
                                          >
                                            {t("admin.removeFromGroup")}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards with inline accordion */}
          <div className="space-y-3 md:hidden">
            {groups.map((group) => {
              const isExpanded = expandedGroupId === group.id;
              const members = groupMembers[group.id];
              const isLoadingMembers = loadingGroupIds[group.id];
              return (
                <article
                  key={group.id}
                  className="rounded-xl border border-border bg-surface p-4 transition"
                >
                  <div
                    onClick={() => void toggleGroup(group.id)}
                    className="flex cursor-pointer items-start justify-between gap-3"
                  >
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {group.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {t("admin.memberCapacity", {
                          members: number(group.memberCount),
                          capacity: number(group.capacity),
                        })}
                      </p>
                    </div>
                    <span
                      className={`inline-grid h-7 w-7 place-items-center rounded-full text-neutral-400 transition-transform ${
                        isExpanded ? "rotate-180 text-neutral-800 dark:text-neutral-100" : ""
                      }`}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m6 9 6 6 6-6"
                        />
                      </svg>
                    </span>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-neutral-700 dark:bg-neutral-300"
                      style={{
                        width: `${Math.min(100, (group.memberCount / Math.max(1, group.capacity)) * 100)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span
                      className={
                        group.availableSlots
                          ? "font-semibold text-success-strong"
                          : "text-neutral-500"
                      }
                    >
                      {group.availableSlots
                        ? tp("common.spotCount", group.availableSlots)
                        : t("admin.full")}
                    </span>
                    <span
                      className="text-neutral-500"
                      title={timeTitle(group.lastActivityAt, locale)}
                    >
                      {t("admin.groupLastActivity", {
                        time: relativeTime(group.lastActivityAt, locale),
                      })}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                    <span className="status-badge status-success">
                      {tp("admin.statusCount", group.activeMembers, {
                        status: t("admin.active"),
                      })}
                    </span>
                    <span className="status-badge status-warning">
                      {tp("admin.statusCount", group.warningMembers, {
                        status: t("admin.warning"),
                      })}
                    </span>
                    <span className="status-badge status-danger">
                      {tp("admin.statusCount", group.criticalMembers, {
                        status: t("admin.critical"),
                      })}
                    </span>
                    {group.neverActiveMembers > 0 && (
                      <span className="status-badge status-neutral">
                        {tp("admin.statusCount", group.neverActiveMembers, {
                          status: t("admin.neverActiveShort"),
                        })}
                      </span>
                    )}
                  </div>

                  {/* Mobile Accordion Content */}
                  {isExpanded && (
                    <div className="member-detail-enter mt-4 border-t border-border pt-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                          {t("admin.groupMembers")} ({number(members?.length ?? group.memberCount)})
                        </span>
                        <Link
                          to={`/admin/members?group=${encodeURIComponent(group.id)}`}
                          className="text-xs font-semibold text-info-strong hover:underline"
                        >
                          {t("admin.openInMembersTable")}
                        </Link>
                      </div>

                      {isLoadingMembers ? (
                        <LoadingState label={t("admin.loadingMembers")} />
                      ) : !members || !members.length ? (
                        <EmptyState compact>
                          {t("admin.noMembersInGroup")}
                        </EmptyState>
                      ) : (
                        <div className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-neutral-50/50 p-2 dark:bg-neutral-900/40">
                          {members.map((member) => (
                            <div key={member.id} className="py-2.5 first:pt-1 last:pb-1 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedMember(member)}
                                  className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:underline"
                                >
                                  {member.name}
                                </button>
                                <ActivityBadge
                                  status={member.activityStatus}
                                  days={member.inactivityDays}
                                />
                              </div>
                              <JourneyBadge journey={member.journey} compact />
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedMember(member)}
                                  className="button-secondary px-2.5 py-1 text-xs"
                                >
                                  {t("admin.quickInspect")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRemovingTarget({ group, member })}
                                  className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:border-danger-border hover:bg-danger-soft hover:text-danger-strong dark:text-neutral-400"
                                >
                                  {t("admin.removeFromGroup")}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* Member Details Modal */}
      {selectedMember && (
        <AdminMemberDetail
          member={selectedMember}
          onClose={() => {
            setSelectedMember(null);
            if (expandedGroupId) {
              adminApi
                .users({ groupId: expandedGroupId, limit: 50 })
                .then((res) =>
                  setGroupMembers((prev) => ({
                    ...prev,
                    [expandedGroupId]: res.items,
                  })),
                )
                .catch(() => null);
            }
          }}
        />
      )}

      {/* Confirm Removal Dialog */}
      {removingTarget && (
        <ConfirmDialog
          isOpen={Boolean(removingTarget)}
          onClose={() => setRemovingTarget(null)}
          onConfirm={() => void confirmRemoval()}
          title={t("admin.removeTitle", {
            name: removingTarget.member.name,
            group: removingTarget.group.name,
          })}
          message={t("admin.removeDescription")}
          confirmLabel={t("admin.removeConfirm")}
          cancelLabel={t("admin.cancel")}
          isConfirming={removeLoading}
          variant="danger"
        />
      )}
    </div>
  );
}
