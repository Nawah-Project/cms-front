import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { adminApi, type AdminGroup, type AdminMember } from "./api/adminApi";
import { AdminMemberDetail } from "./components/AdminMemberDetail";
import {
  EmptyState,
  ErrorState,
  Initials,
  LoadingState,
  PageHeading,
  relativeTime,
  timeTitle,
} from "./components/AdminUI";
import { TaskFormDialog } from "../professional-development/components/TaskFormDialog";
import type { CreateTaskInput } from "../professional-development/types";

type DevelopmentMember = AdminMember & {
  development: {
    active: number;
    inProgress: number;
    overdue: number;
    lastTaskAt: string | null;
  };
};

export default function AdminProfessionalDevelopmentPage() {
  const { t, tp, locale } = useI18n();
  const [members, setMembers] = useState<DevelopmentMember[]>([]);
  const [selected, setSelected] = useState<AdminMember | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [assignGroupOpen, setAssignGroupOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [result, groupResult] = await Promise.all([
        adminApi.users({ page, limit: 20 }),
        adminApi.groups(),
      ]);
      setGroups(groupResult.items);
      const users = result.items.filter((member) => member.role === "USER");
      const withDevelopment = await Promise.all(
        users.map(async (member) => {
          const [detail, tasks] = await Promise.all([
            adminApi.user(member.id),
            adminApi.tasksForUser(member.id, 1, 50),
          ]);
          const lastTaskAt = tasks.items.reduce<string | null>(
            (latest, task) =>
              !latest || task.updatedAt > latest ? task.updatedAt : latest,
            null,
          );
          return {
            ...member,
            development: {
              active: detail.development.totalActiveTasks,
              inProgress: detail.development.taskStatusCounts.IN_PROGRESS,
              overdue: detail.development.overdueTasks,
              lastTaskAt,
            },
          };
        }),
      );
      setMembers(withDevelopment);
      setTotalPages(result.totalPages);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          eyebrow={t("admin.eyebrow")}
          title={t("admin.professionalDevelopment")}
          description={t("professionalDevelopment.adminDevelopmentDescription")}
        />
        <button
          type="button"
          onClick={() => setAssignGroupOpen(true)}
          disabled={!groups.some((group) => group.memberCount > 0)}
          className="button-primary px-4 py-2 text-sm disabled:opacity-50"
        >
          {t("professionalDevelopment.assignGroupTask")}
        </button>
      </div>
      {notice && <p role="status" className="text-sm text-success-strong">{notice}</p>}
      <p className="text-xs text-neutral-500">
        {tp("common.memberCount", members.length)}
      </p>
      {loading ? (
        <LoadingState label={t("admin.loadingMembers")} />
      ) : error ? (
        <ErrorState onRetry={() => void load()} />
      ) : !members.length ? (
        <EmptyState>{t("admin.noMembersMatch")}</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelected(member)}
              className="rounded-xl border border-border bg-surface p-4 text-start transition hover:border-border-hover hover:shadow-sm focus-visible:outline-2 focus-visible:outline-info-strong"
            >
              <div className="flex items-center gap-3">
                <Initials name={member.name} avatar={member.avatar} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {member.name}
                  </span>
                  <span className="block truncate text-xs text-neutral-500">
                    {member.group?.name ?? t("common.unassigned")}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border-subtle pt-3 text-xs">
                <span className="text-neutral-500">
                  {t("professionalDevelopment.activeTasks")}{" "}
                  <b className="ms-1 tabular-nums text-neutral-900 dark:text-neutral-100">
                    {member.development.active}
                  </b>
                </span>
                <span className="text-neutral-500">
                  {t("professionalDevelopment.inProgressCount")}{" "}
                  <b className="ms-1 tabular-nums text-neutral-900 dark:text-neutral-100">
                    {member.development.inProgress}
                  </b>
                </span>
                <span className="text-neutral-500">
                  {t("professionalDevelopment.overdueCount")}{" "}
                  <b className="ms-1 tabular-nums text-danger-strong">
                    {member.development.overdue}
                  </b>
                </span>
              </div>
              <p
                className="mt-3 text-xs text-neutral-500"
                title={timeTitle(member.development.lastTaskAt, locale)}
              >
                {t("professionalDevelopment.lastDevelopmentActivity")}:{" "}
                {relativeTime(member.development.lastTaskAt, locale)}
              </p>
            </button>
          ))}
        </div>
      )}
      {!loading && !error && totalPages > 1 && (
        <nav
          aria-label={t("admin.professionalDevelopment")}
          className="flex items-center justify-center gap-3 border-t border-border pt-5"
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            className="button-secondary px-3 py-2 text-xs disabled:opacity-50"
          >
            {t("professionalDevelopment.previous")}
          </button>
          <span className="text-xs text-neutral-500">
            {t("professionalDevelopment.pageOf", { page, pages: totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
            className="button-secondary px-3 py-2 text-xs disabled:opacity-50"
          >
            {t("professionalDevelopment.next")}
          </button>
        </nav>
      )}
      {selected && (
        <AdminMemberDetail
          member={selected}
          onClose={() => setSelected(null)}
        />
      )}
      {assignGroupOpen && (
        <TaskFormDialog
          mode="assignGroup"
          groups={groups.filter((group) => group.memberCount > 0)}
          onClose={() => setAssignGroupOpen(false)}
          onSave={async (input, _memberId, groupId) => {
            if (!groupId) return;
            const result = await adminApi.createTaskForGroup(
              groupId,
              input as CreateTaskInput,
            );
            setAssignGroupOpen(false);
            setNotice(
              t("professionalDevelopment.groupTaskCreated", {
                count: result.assignedCount,
                group: result.groupName,
              }),
            );
            void load();
          }}
        />
      )}
    </div>
  );
}
