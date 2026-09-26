import { useEffect, useState } from "react";
import {
  adminApi,
  type ActivityStatus,
  type AdminGroup,
  type AdminMember,
} from "./api/adminApi";
import { AdminMemberDetail } from "./components/AdminMemberDetail";
import { useI18n } from "../../i18n";
import {
  ActivityBadge,
  EmptyState,
  ErrorState,
  Initials,
  LoadingState,
  PageHeading,
  relativeTime,
  StageCounts,
  timeTitle,
} from "./components/AdminUI";

const statuses: ActivityStatus[] = [
  "ACTIVE",
  "WARNING",
  "CRITICAL",
  "NEVER_ACTIVE",
];
export default function AdminMembersPage() {
  const { t, tp, locale } = useI18n();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<"ALL" | ActivityStatus>("ALL");
  const [group, setGroup] = useState("ALL");
  const [selected, setSelected] = useState<AdminMember | null>(null);
  const [removing, setRemoving] = useState<AdminMember | null>(null);
  const [assigning, setAssigning] = useState<AdminMember | null>(null);
  const [targetGroupId, setTargetGroupId] = useState("");
  const [removeLoading, setRemoveLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const load = () => {
    setLoading(true);
    setError(false);
    void Promise.all([
      adminApi.users({
        page,
        limit: 100,
        ...(status === "ALL" ? {} : { activityStatus: status }),
      }),
      adminApi.groups(),
    ])
      .then(([result, groupResult]) => {
        setMembers(result.items);
        setTotalPages(result.totalPages);
        setGroups(groupResult.items);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [page, status]);
  const filtered = members.filter(
    (member) =>
      (status === "ALL" || member.activityStatus === status) &&
      (group === "ALL" ||
        (group === "UNASSIGNED" ? !member.group : member.group?.id === group)),
  );
  const availableGroups = groups.filter((item) => item.availableSlots > 0);
  const openAssignment = (member: AdminMember) => {
    setActionError("");
    setTargetGroupId(availableGroups[0]?.id ?? "");
    setAssigning(member);
  };
  const confirmRemoval = async () => {
    if (!removing?.group) return;
    setRemoveLoading(true);
    setActionError("");
    try {
      await adminApi.removeFromGroup(removing.group.id, removing.id);
      setMessage(t("admin.removedSuccess", { name: removing.name, group: removing.group.name }));
      setGroup("UNASSIGNED");
      if (selected?.id === removing.id)
        setSelected({ ...selected, group: null });
      setRemoving(null);
      load();
    } catch (err) {
      setActionError(
        t("admin.actionFailed"),
      );
    } finally {
      setRemoveLoading(false);
    }
  };
  const confirmAssignment = async () => {
    if (!assigning || !targetGroupId) return;
    setAssignLoading(true);
    setActionError("");
    try {
      const result = await adminApi.assignToGroup(assigning.id, targetGroupId);
      setMessage(t("admin.assignedSuccess", { name: assigning.name, group: result.group.name }));
      if (selected?.id === assigning.id)
        setSelected({ ...selected, group: result.group });
      setAssigning(null);
      load();
    } catch (err) {
      setActionError(
        t("admin.actionFailed"),
      );
    } finally {
      setAssignLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow={t("admin.people")}
        title={t("admin.membersTitle")}
        description={t("admin.membersDescription")}
      />
      {message && (
        <div
          role="status"
          className="flex items-center justify-between rounded-lg border border-success-border bg-success-soft px-4 py-3 text-sm text-success-strong"
        >
          {message}
          <button
            type="button"
            aria-label={t("admin.dismiss")}
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <label className="grid gap-1 text-xs text-neutral-500">
            {t("admin.statusFilter")}
            <select
              className="field-control min-w-40"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "ALL" | ActivityStatus);
                setPage(1);
              }}
            >
              <option value="ALL">{t("admin.allStatuses")}</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {value === "NEVER_ACTIVE" ? t("admin.neverActive") : t(`admin.${value.toLowerCase()}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-neutral-500">
            {t("admin.groupFilter")}
            <select
              className="field-control min-w-40"
              value={group}
              onChange={(event) => setGroup(event.target.value)}
            >
              <option value="ALL">{t("admin.allGroups")}</option>
              {groups.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
              <option value="UNASSIGNED">{t("common.unassigned")}</option>
            </select>
          </label>
        </div>
        <p className="text-xs text-neutral-500">
          {tp("common.memberCount", filtered.length)}
        </p>
      </div>
      {loading ? (
        <LoadingState label={t("admin.loadingMembers")} />
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : !filtered.length ? (
        <EmptyState>
          {status === "WARNING" || status === "CRITICAL"
            ? t("admin.noInactiveMembers")
            : t("admin.noMembersMatch")}
        </EmptyState>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
            <table className="data-table">
              <thead className="data-table-head">
                <tr>
                  <th className="data-table-cell">{t("admin.member")}</th>
                  <th className="data-table-cell">{t("admin.group")}</th>
                  <th className="data-table-cell">{t("admin.applicationsProgress")}</th>
                  <th className="data-table-cell">{t("admin.lastActivity")}</th>
                  <th className="data-table-cell">{t("admin.status")}</th>
                  <th className="data-table-cell">{t("admin.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr key={member.id} className="data-table-row">
                    <td className="data-table-cell">
                      <button
                        type="button"
                        onClick={() => setSelected(member)}
                        className="flex items-center gap-3 rounded text-start focus-visible:outline-2 focus-visible:outline-info-strong"
                      >
                        <Initials name={member.name} avatar={member.avatar} />
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          {member.name}
                        </span>
                      </button>
                    </td>
                    <td className="data-table-cell text-sm">
                      {member.group?.name ?? (
                        <span className="text-neutral-500">{t("common.unassigned")}</span>
                      )}
                    </td>
                    <td className="data-table-cell">
                      <p className="mb-2 text-sm font-medium">
                        {tp("admin.applicationsTotal", member.applicationsCount)}
                      </p>
                      <StageCounts counts={member.currentStageCounts} />
                    </td>
                    <td
                      className="data-table-cell text-sm text-neutral-600 dark:text-neutral-300"
                      title={timeTitle(member.lastActivityAt, locale)}
                    >
                      {relativeTime(member.lastActivityAt, locale)}
                    </td>
                    <td className="data-table-cell">
                      <ActivityBadge
                        status={member.activityStatus}
                        days={member.inactivityDays}
                      />
                    </td>
                    <td className="data-table-cell">
                      {member.group ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActionError("");
                            setRemoving(member);
                          }}
                          className="button-danger px-3 py-2 text-xs"
                        >
                          {t("admin.removeFromGroup")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAssignment(member)}
                          className="button-secondary px-3 py-2 text-xs"
                        >
                          {t("admin.addToGroup")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {filtered.map((member) => (
              <article
                key={member.id}
                className="space-y-3 rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelected(member)}
                    className="flex min-w-0 items-center gap-3 text-start"
                  >
                    <Initials name={member.name} avatar={member.avatar} />
                    <span className="truncate font-medium">{member.name}</span>
                  </button>
                  <ActivityBadge
                    status={member.activityStatus}
                    days={member.inactivityDays}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-neutral-500">{t("admin.group")}</p>
                    <p className="mt-1">{member.group?.name ?? t("common.unassigned")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">{t("admin.lastActivity")}</p>
                    <p
                      className="mt-1"
                      title={timeTitle(member.lastActivityAt, locale)}
                    >
                      {relativeTime(member.lastActivityAt, locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">{t("admin.applications")}</p>
                    <p className="mt-1">{member.applicationsCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">{t("admin.stageCounts")}</p>
                  </div>
                </div>
                <StageCounts counts={member.currentStageCounts} />
                {member.group ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActionError("");
                      setRemoving(member);
                    }}
                    className="button-danger w-full"
                  >
                    {t("admin.removeFromGroup")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAssignment(member)}
                    className="button-secondary w-full"
                  >
                    {t("admin.addToGroup")}
                  </button>
                )}
              </article>
            ))}
          </div>
        </>
      )}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
          <span className="text-neutral-500">
            {t("admin.pageOf", { page, pages: totalPages })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="button-secondary px-3 py-2"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              {t("admin.previous")}
            </button>
            <button
              type="button"
              className="button-secondary px-3 py-2"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              {t("admin.next")}
            </button>
          </div>
        </div>
      )}
      {selected && (
        <AdminMemberDetail
          member={selected}
          onClose={() => setSelected(null)}
        />
      )}
      {removing && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/45 p-4"
          role="presentation"
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="remove-member-title"
            className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl"
          >
            <h2 id="remove-member-title" className="text-lg font-semibold">
              {t("admin.removeTitle", { name: removing.name, group: removing.group?.name ?? "" })}
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              {t("admin.removeDescription")}
            </p>
            {actionError && (
              <p role="alert" className="mt-3 text-sm text-danger-strong">
                {actionError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={removeLoading}
                onClick={() => setRemoving(null)}
                className="button-secondary"
              >
                {t("admin.cancel")}
              </button>
              <button
                type="button"
                disabled={removeLoading}
                onClick={() => void confirmRemoval()}
                className="button-danger"
              >
                {removeLoading ? t("admin.removing") : t("admin.removeConfirm")}
              </button>
            </div>
          </section>
        </div>
      )}
      {assigning && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/45 p-4"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-member-title"
            className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl"
          >
            <h2 id="assign-member-title" className="text-lg font-semibold">
              {t("admin.assignTitle", { name: assigning.name })}
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
              {t("admin.assignDescription")}
            </p>
            {availableGroups.length > 0 ? (
              <label className="mt-5 grid gap-1.5 text-sm font-medium">
                {t("admin.destinationGroup")}
                <select
                  className="field-control"
                  value={targetGroupId}
                  onChange={(event) => setTargetGroupId(event.target.value)}
                >
                  {availableGroups.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {tp("admin.spotsAvailable", item.availableSlots)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="mt-5 rounded-lg border border-warning-border bg-warning-soft px-3 py-2.5 text-sm text-warning-strong">
                {t("admin.noCapacity")}
              </p>
            )}
            {actionError && (
              <p role="alert" className="mt-3 text-sm text-danger-strong">
                {actionError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={assignLoading}
                onClick={() => setAssigning(null)}
                className="button-secondary"
              >
                {t("admin.cancel")}
              </button>
              <button
                type="button"
                disabled={assignLoading || !targetGroupId}
                onClick={() => void confirmAssignment()}
                className="button-primary"
              >
                {assignLoading ? t("admin.adding") : t("admin.addToGroup")}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
