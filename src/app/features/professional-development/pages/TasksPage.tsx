import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { useSearchParams } from "react-router";
import { PageHeading } from "../../admin/components/AdminUI";
import { useI18n } from "../../../i18n";
import { api } from "../../../services/api";
import type {
  CreateTaskInput,
  ProfessionalTask,
  TaskStatus,
  UpdateTaskInput,
} from "../types";
import { TaskDetailDrawer } from "../components/TaskDetailDrawer";
import { TaskCard, TaskSection } from "../components/TaskPresentation";
import { ProfessionalDevelopmentNav } from "../components/ProfessionalDevelopmentNav";
import { TaskFormDialog } from "../components/TaskFormDialog";
import { PlusIcon } from "../../../components/Icons";
import { useAuth } from "../../auth/store/authStore";
import { adminApi, type AdminMember } from "../../admin/api/adminApi";

const COLUMNS: Array<{ status: TaskStatus; key: string }> = [
  { status: "TODO", key: "toDo" },
  { status: "IN_PROGRESS", key: "inProgress" },
  { status: "BLOCKED", key: "blocked" },
  { status: "DONE", key: "done" },
];

export default function TasksPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTaskId = searchParams.get("task");
  const [tasks, setTasks] = useState<ProfessionalTask[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [memberLoadError, setMemberLoadError] = useState(false);
  const [movingTaskIds, setMovingTaskIds] = useState<Set<string>>(() => new Set());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [moveError, setMoveError] = useState(false);
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) return;
    void adminApi
      .users({ page: 1, limit: 100 })
      .then((result) =>
        setMembers(result.items.filter((member) => member.role === "USER")),
      )
      .catch(() => setMemberLoadError(true));
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await api.getTasks({ page, limit: 50 });
      setTasks(result.items);
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

  const byStatus = useMemo(
    () =>
      Object.fromEntries(
        COLUMNS.map(({ status }) => [
          status,
          tasks.filter((task) => task.status === status),
        ]),
      ) as Record<TaskStatus, ProfessionalTask[]>,
    [tasks],
  );
  const selectTask = (taskId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (taskId) next.set("task", taskId);
    else next.delete("task");
    setSearchParams(next, { preventScrollReset: true });
  };

  const moveTask = async (taskId: string, status: TaskStatus) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === status || movingTaskIds.has(taskId)) return;

    const previousStatus = task.status;
    setMoveError(false);
    setMovingTaskIds((current) => new Set(current).add(taskId));
    setTasks((current) =>
      current.map((item) => (item.id === taskId ? { ...item, status } : item)),
    );
    try {
      const updated = await api.updateTaskStatus(taskId, status);
      setTasks((current) =>
        current.map((item) => (item.id === taskId ? updated : item)),
      );
    } catch {
      setTasks((current) =>
        current.map((item) =>
          item.id === taskId ? { ...item, status: previousStatus } : item,
        ),
      );
      setMoveError(true);
    } finally {
      setMovingTaskIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleDrop = (event: DragEvent<HTMLElement>, status: TaskStatus) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain");
    setDraggedTaskId(null);
    setDragOverStatus(null);
    if (taskId) void moveTask(taskId, status);
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <PageHeading
          eyebrow={t("professionalDevelopment.title")}
          title={t("professionalDevelopment.tasks")}
          description={t("professionalDevelopment.subtitle")}
        />
        <button
          type="button"
          onClick={() => setTaskFormOpen(true)}
          className="button-primary inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm"
        >
          <PlusIcon className="h-4 w-4" />
          {t(
            isAdmin
              ? "professionalDevelopment.assignTask"
              : "professionalDevelopment.addTask",
          )}
        </button>
      </header>

      {memberLoadError && isAdmin && (
        <p role="alert" className="text-sm text-danger-strong">
          {t("professionalDevelopment.noMembers")}
        </p>
      )}

      <ProfessionalDevelopmentNav />

      {moveError && (
        <p role="alert" className="rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger-strong">
          {t("professionalDevelopment.saveError")}
        </p>
      )}

      {loading ? (
        <div
          className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4"
          aria-label={t("professionalDevelopment.loading")}
        >
          {COLUMNS.map(({ status, key }) => (
            <section key={status} className="space-y-3" aria-hidden="true">
              <div className="h-8 animate-pulse border-b border-border bg-neutral-50 dark:bg-neutral-900" />
              <div className="h-36 animate-pulse rounded-xl border border-border bg-neutral-50 dark:bg-neutral-900" />
              <div className="h-28 animate-pulse rounded-xl border border-border bg-neutral-50 dark:bg-neutral-900" />
              <span className="sr-only">
                {t(`professionalDevelopment.${key}`)}
              </span>
            </section>
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-danger-border bg-surface px-5 py-8 text-center"
        >
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {t("professionalDevelopment.loadError")}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="button-secondary mt-4 px-3 py-2 text-xs"
          >
            {t("professionalDevelopment.retry")}
          </button>
        </div>
      ) : !tasks.length && page === 1 ? (
        <section className="rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {t("professionalDevelopment.noTasks")}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500 dark:text-neutral-400">
            {t("professionalDevelopment.noTasksDescription")}
          </p>
          <button
            type="button"
            onClick={() => setTaskFormOpen(true)}
            className="button-primary mt-5 inline-flex min-h-10 items-center gap-2 px-4 py-2 text-sm"
          >
            <PlusIcon className="h-4 w-4" />
            {t(
              isAdmin
                ? "professionalDevelopment.assignTask"
                : "professionalDevelopment.addTask",
            )}
          </button>
        </section>
      ) : (
        <>
          <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[68rem] grid-cols-4 gap-6">
            {COLUMNS.map(({ status, key }) => (
              <TaskSection
                key={status}
                title={t(`professionalDevelopment.${key}`)}
                count={byStatus[status].length}
                isDragTarget={draggedTaskId !== null && dragOverStatus === status}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOverStatus(status);
                }}
                onDrop={(event) => handleDrop(event, status)}
              >
                {byStatus[status].length ? (
                  byStatus[status].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => selectTask(task.id)}
                      draggable={!movingTaskIds.has(task.id)}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", task.id);
                        setDraggedTaskId(task.id);
                      }}
                      onDragEnd={() => {
                        setDraggedTaskId(null);
                        setDragOverStatus(null);
                      }}
                    />
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-border-subtle px-3 py-6 text-center text-xs text-neutral-500">
                    {t("professionalDevelopment.noTasksInColumn")}
                  </p>
                )}
              </TaskSection>
          ))}
          </div>
          </div>
          {totalPages > 1 && (
            <nav
              aria-label={t("professionalDevelopment.taskPagination")}
              className="flex items-center justify-center gap-3 border-t border-border pt-5"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="button-secondary px-3 py-2 text-xs disabled:opacity-50"
              >
                {t("professionalDevelopment.previous")}
              </button>
              <span className="text-xs tabular-nums text-neutral-500">
                {t("professionalDevelopment.pageOf", {
                  page,
                  pages: totalPages,
                })}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="button-secondary px-3 py-2 text-xs disabled:opacity-50"
              >
                {t("professionalDevelopment.next")}
              </button>
            </nav>
          )}
        </>
      )}
      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => selectTask(null)}
        onChanged={load}
      />
      {taskFormOpen && (
        <TaskFormDialog
          mode={isAdmin ? "assign" : "personal"}
          members={members}
          onClose={() => setTaskFormOpen(false)}
          onSave={async (input, memberId) => {
            if (isAdmin) {
              if (!memberId) throw new Error("Member required");
              await adminApi.createTask(memberId, input as CreateTaskInput);
            } else {
              await api.createTask(input as CreateTaskInput);
            }
            setTaskFormOpen(false);
            await load();
          }}
        />
      )}
    </div>
  );
}
