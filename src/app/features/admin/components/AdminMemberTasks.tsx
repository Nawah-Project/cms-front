import { useCallback, useEffect, useState, type FormEvent } from "react";
import { EditIcon, PlusIcon, TrashIcon } from "../../../components/Icons";
import { useI18n } from "../../../i18n";
import type {
  CreateTaskInput,
  ProfessionalTask,
  TaskNote,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from "../../professional-development/types";
import {
  PriorityLabel,
  StatusPill,
  MentorPriorityMark,
} from "../../professional-development/components/TaskPresentation";
import { adminApi } from "../api/adminApi";
import type { AdminMember } from "../api/adminApi";

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];
const STATUS_KEYS: Record<TaskStatus, string> = {
  TODO: "toDo",
  IN_PROGRESS: "inProgress",
  BLOCKED: "blocked",
  DONE: "done",
};

type TaskDraft = {
  title: string;
  description: string;
  priority: TaskPriority;
  mentorPriority: boolean;
  startDate: string;
  dueDate: string;
  status: TaskStatus;
  checklistText: string;
};

function blankDraft(): TaskDraft {
  return {
    title: "",
    description: "",
    priority: "MEDIUM",
    mentorPriority: false,
    startDate: "",
    dueDate: "",
    status: "TODO",
    checklistText: "",
  };
}

function fromTask(task: ProfessionalTask): TaskDraft {
  return {
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    mentorPriority: task.mentorPriority,
    startDate: task.startDate?.slice(0, 10) ?? "",
    dueDate: task.dueDate?.slice(0, 10) ?? "",
    status: task.status,
    checklistText: "",
  };
}

function TaskForm({
  member,
  task,
  onCancel,
  onSave,
}: {
  member: AdminMember;
  task?: ProfessionalTask;
  onCancel: () => void;
  onSave: (draft: TaskDraft) => Promise<void>;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(() =>
    task ? fromTask(task) : blankDraft(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const change = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(false);
    try {
      await onSave(draft);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };
  const fieldClass = "field-control w-full";
  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-border bg-neutral-50/60 p-4 dark:bg-neutral-900/60"
    >
      <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {task
          ? t("professionalDevelopment.editTask")
          : t("professionalDevelopment.assignTaskTitle")}
      </h4>
      <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
        {t("professionalDevelopment.member")}
        <span className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-neutral-800 dark:text-neutral-200">
          {member.name}
        </span>
      </label>
      <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
        {t("professionalDevelopment.taskTitle")}
        <input
          required
          maxLength={200}
          value={draft.title}
          onChange={(event) => change("title", event.target.value)}
          placeholder={t("professionalDevelopment.taskTitlePlaceholder")}
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
        {t("professionalDevelopment.description")}
        <textarea
          maxLength={5000}
          rows={3}
          value={draft.description}
          onChange={(event) => change("description", event.target.value)}
          placeholder={t("professionalDevelopment.descriptionPlaceholder")}
          className={`${fieldClass} resize-y`}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
          {t("professionalDevelopment.priority")}
          <select
            value={draft.priority}
            onChange={(event) =>
              change("priority", event.target.value as TaskPriority)
            }
            className={fieldClass}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {t(`professionalDevelopment.${priority.toLowerCase()}`)}
              </option>
            ))}
          </select>
        </label>
        {task && (
          <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            {t("professionalDevelopment.status")}
            <select
              value={draft.status}
              onChange={(event) =>
                change("status", event.target.value as TaskStatus)
              }
              className={fieldClass}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`professionalDevelopment.${STATUS_KEYS[status]}`)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-amber-300/70 bg-amber-50/60 px-3 py-2.5 text-sm dark:border-amber-900 dark:bg-amber-950/20">
        <input
          type="checkbox"
          checked={draft.mentorPriority}
          onChange={(event) => change("mentorPriority", event.target.checked)}
          className="h-4 w-4 accent-amber-600"
        />
        <span className="flex-1 font-medium text-neutral-800 dark:text-neutral-200">
          {t("professionalDevelopment.mentorPriority")}
        </span>
        {draft.mentorPriority && <MentorPriorityMark />}
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
          {t("professionalDevelopment.startDate")}{" "}
          <span className="font-normal">
            ({t("professionalDevelopment.optional")})
          </span>
          <input
            type="date"
            value={draft.startDate}
            onChange={(event) => change("startDate", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
          {t("professionalDevelopment.dueDate")}{" "}
          <span className="font-normal">
            ({t("professionalDevelopment.optional")})
          </span>
          <input
            type="date"
            value={draft.dueDate}
            onChange={(event) => change("dueDate", event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
      {!task ? (
        <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
          {t("professionalDevelopment.checklistItems")}{" "}
          <span className="font-normal">
            ({t("professionalDevelopment.optional")})
          </span>
          <textarea
            rows={3}
            value={draft.checklistText}
            onChange={(event) => change("checklistText", event.target.value)}
            placeholder={t("professionalDevelopment.checklistLinesHelp")}
            className={`${fieldClass} resize-y`}
          />
          <span className="font-normal text-neutral-500">
            {t("professionalDevelopment.checklistLinesHelp")}
          </span>
        </label>
      ) : (
        <p className="text-xs text-neutral-500">
          {t("professionalDevelopment.manageChecklist")}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger-strong">
          {t("professionalDevelopment.saveError")}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="button-secondary px-3 py-2 text-xs"
        >
          {t("professionalDevelopment.cancel")}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="button-primary inline-flex items-center gap-2 px-3 py-2 text-xs"
        >
          {saving
            ? t("professionalDevelopment.saving")
            : t("professionalDevelopment.save")}
        </button>
      </div>
    </form>
  );
}

function AdminTaskRow({
  task,
  expanded,
  onExpand,
  onEdit,
  onDelete,
  onRefresh,
}: {
  task: ProfessionalTask;
  expanded: boolean;
  onExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const { t, date } = useI18n();
  const [feedback, setFeedback] = useState<TaskNote[]>([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [checklistText, setChecklistText] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const loadFeedback = useCallback(async () => {
    setFeedbackLoading(true);
    try {
      setFeedback(await adminApi.mentorFeedback(task.id));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setFeedbackLoading(false);
    }
  }, [task.id]);
  useEffect(() => {
    if (expanded) void loadFeedback();
  }, [expanded, loadFeedback]);

  const perform = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setError(false);
    try {
      await operation();
      await onRefresh();
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const sendFeedback = async (event: FormEvent) => {
    event.preventDefault();
    if (!feedbackText.trim()) return;
    setBusy(true);
    setError(false);
    try {
      await adminApi.addMentorFeedback(task.id, feedbackText.trim());
      setFeedbackText("");
      await loadFeedback();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const addChecklist = async (event: FormEvent) => {
    event.preventDefault();
    if (!checklistText.trim()) return;
    const saved = await perform(() =>
      adminApi.addTaskChecklistItem(task.id, checklistText.trim()),
    );
    if (saved) setChecklistText("");
  };

  return (
    <article
      className={`rounded-xl border bg-surface ${task.overdue && task.status !== "DONE" ? "border-danger-border" : task.mentorPriority ? "border-amber-400/80 shadow-[0_0_0_2px_rgba(245,158,11,0.08)]" : "border-border"}`}
    >
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onExpand}
            aria-expanded={expanded}
            className="min-w-0 flex-1 text-start focus-visible:outline-2 focus-visible:outline-info-strong"
          >
            <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {task.title}
            </span>
            <span
              className={`mt-1 block text-xs ${task.overdue && task.status !== "DONE" ? "font-semibold text-danger-strong" : "text-neutral-500"}`}
            >
              {task.overdue && task.status !== "DONE"
                ? `${t("professionalDevelopment.overdue")} · `
                : `${t("professionalDevelopment.dueDate")} · `}
              {task.dueDate
                ? date(task.dueDate, { dateStyle: "medium" })
                : t("professionalDevelopment.noDueDate")}
            </span>
          </button>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={onEdit}
              aria-label={`${t("professionalDevelopment.editTask")}: ${task.title}`}
              className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <EditIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`${t("professionalDevelopment.deleteTask")}: ${task.title}`}
              className="rounded-md p-2 text-neutral-500 hover:bg-danger-soft hover:text-danger-strong"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={task.status} />
          <PriorityLabel priority={task.priority} />
          {task.mentorPriority && <MentorPriorityMark />}
          {task.progress.total > 0 && (
            <span className="text-xs tabular-nums text-neutral-500">
              {t("professionalDevelopment.checklistProgress", task.progress)}
            </span>
          )}
        </div>
      </div>
      {expanded && (
        <div className="space-y-5 border-t border-border p-4">
          {error && (
            <p role="alert" className="text-sm text-danger-strong">
              {t("professionalDevelopment.saveError")}
            </p>
          )}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {t("professionalDevelopment.checklist")}
            </h4>
            {task.checklist.length ? (
              <ul className="space-y-2">
                {task.checklist.map((item, index) => (
                  <li key={item.id} className="flex items-center gap-2">
                    {editingItem === item.id ? (
                      <form
                        className="flex min-w-0 flex-1 gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void perform(() =>
                            adminApi.updateTaskChecklistItem(task.id, item.id, {
                              title: editedTitle.trim(),
                            }),
                          ).then((saved) => {
                            if (saved) setEditingItem(null);
                          });
                        }}
                      >
                        <input
                          autoFocus
                          required
                          maxLength={300}
                          value={editedTitle}
                          onChange={(event) =>
                            setEditedTitle(event.target.value)
                          }
                          className="field-control min-w-0 flex-1"
                          aria-label={t(
                            "professionalDevelopment.editChecklistItem",
                          )}
                        />
                        <button
                          type="submit"
                          disabled={busy}
                          className="button-secondary px-2 py-1 text-xs"
                        >
                          {t("professionalDevelopment.save")}
                        </button>
                      </form>
                    ) : (
                      <span className="min-w-0 flex-1 text-sm text-neutral-700 dark:text-neutral-300">
                        {item.title}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={busy || index === 0}
                      aria-label={t("professionalDevelopment.moveUp")}
                      onClick={() =>
                        void perform(() =>
                          adminApi.updateTaskChecklistItem(task.id, item.id, {
                            position: index - 1,
                          }),
                        )
                      }
                      className="rounded px-1.5 text-xs text-neutral-500 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={busy || index === task.checklist.length - 1}
                      aria-label={t("professionalDevelopment.moveDown")}
                      onClick={() =>
                        void perform(() =>
                          adminApi.updateTaskChecklistItem(task.id, item.id, {
                            position: index + 1,
                          }),
                        )
                      }
                      className="rounded px-1.5 text-xs text-neutral-500 disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(item.id);
                        setEditedTitle(item.title);
                      }}
                      className="rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`${t("professionalDevelopment.deleteChecklistItem")}: ${item.title}`}
                      onClick={() => {
                        if (
                          window.confirm(
                            `${t("professionalDevelopment.deleteChecklistItem")}?`,
                          )
                        )
                          void perform(() =>
                            adminApi.deleteTaskChecklistItem(task.id, item.id),
                          );
                      }}
                      className="rounded-md p-1.5 text-neutral-500 hover:text-danger-strong"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-neutral-500">
                {t("professionalDevelopment.checklistEmpty")}
              </p>
            )}
            <form className="flex gap-2" onSubmit={addChecklist}>
              <label htmlFor={`checklist-${task.id}`} className="sr-only">
                {t("professionalDevelopment.checklistPlaceholder")}
              </label>
              <input
                id={`checklist-${task.id}`}
                maxLength={300}
                value={checklistText}
                onChange={(event) => setChecklistText(event.target.value)}
                placeholder={t("professionalDevelopment.checklistPlaceholder")}
                className="field-control min-w-0 flex-1"
              />
              <button
                type="submit"
                disabled={busy || !checklistText.trim()}
                className="button-secondary inline-flex items-center gap-1 px-2.5 text-xs"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                {t("professionalDevelopment.add")}
              </button>
            </form>
          </section>
          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {t("professionalDevelopment.mentorFeedback")}
            </h4>
            {feedbackLoading ? (
              <p className="text-xs text-neutral-500">
                {t("professionalDevelopment.loadingTask")}
              </p>
            ) : feedback.length ? (
              <ul className="space-y-2">
                {feedback.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-lg border-s-2 border-info-strong bg-info-soft/50 px-3 py-2 dark:bg-blue-950/20"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-[11px] font-medium text-info-strong">
                        {t("professionalDevelopment.mentor")}
                      </span>
                      <time
                        className="text-[11px] text-neutral-500"
                        dateTime={note.createdAt}
                      >
                        {date(note.createdAt, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                      {note.content}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-neutral-500">
                {t("professionalDevelopment.noFeedback")}
              </p>
            )}
            <form onSubmit={sendFeedback} className="space-y-2">
              <label htmlFor={`feedback-${task.id}`} className="sr-only">
                {t("professionalDevelopment.mentorFeedback")}
              </label>
              <textarea
                id={`feedback-${task.id}`}
                rows={2}
                maxLength={5000}
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)}
                placeholder={t("professionalDevelopment.feedbackPlaceholder")}
                className="field-control w-full resize-y"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={busy || !feedbackText.trim()}
                  className="button-primary px-3 py-2 text-xs"
                >
                  {t("professionalDevelopment.sendFeedback")}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </article>
  );
}

export function AdminMemberTasks({ member }: { member: AdminMember }) {
  const { t, number } = useI18n();
  const [tasks, setTasks] = useState<ProfessionalTask[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [editing, setEditing] = useState<ProfessionalTask | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await adminApi.tasksForUser(member.id, page, 50);
      setTasks(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [member.id, page]);
  useEffect(() => {
    void load();
  }, [load]);

  const create = async (draft: TaskDraft) => {
    const input: CreateTaskInput = {
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      priority: draft.priority,
      mentorPriority: draft.mentorPriority,
      startDate: draft.startDate || undefined,
      dueDate: draft.dueDate || undefined,
      checklist: draft.checklistText
        .split("\n")
        .map((title) => title.trim())
        .filter(Boolean)
        .map((title) => ({ title })),
    };
    await adminApi.createTask(member.id, input);
    setAssigning(false);
    setNotice(t("professionalDevelopment.taskCreated"));
    if (page !== 1) setPage(1);
    else await load();
  };
  const update = async (draft: TaskDraft) => {
    if (!editing) return;
    const input: UpdateTaskInput = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      priority: draft.priority,
      mentorPriority: draft.mentorPriority,
      startDate: draft.startDate || null,
      dueDate: draft.dueDate || null,
      status: draft.status,
    };
    await adminApi.updateTask(editing.id, input);
    setEditing(null);
    setNotice(t("professionalDevelopment.taskUpdated"));
    await load();
  };
  const deleteTask = async (task: ProfessionalTask) => {
    if (!window.confirm(t("professionalDevelopment.deleteTaskConfirm"))) return;
    try {
      await adminApi.deleteTask(task.id);
      setNotice(t("professionalDevelopment.taskDeleted"));
      await load();
    } catch {
      setError(true);
    }
  };

  return (
    <section
      className="space-y-4 border-t border-border pt-6"
      aria-labelledby="member-tasks-heading"
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-500">{t("admin.memberDetails")}</p>
          <h3
            id="member-tasks-heading"
            className="mt-1 text-base font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {t("professionalDevelopment.memberTaskSummary")}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setAssigning((value) => !value);
            setNotice("");
          }}
          className="button-primary inline-flex items-center gap-2 px-3 py-2 text-xs"
        >
          <PlusIcon className="h-4 w-4" />
          {t("professionalDevelopment.assignTask")}
        </button>
      </header>
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-success-border bg-success-soft px-3 py-2 text-sm text-success-strong"
        >
          {notice}
        </p>
      )}
      {assigning && (
        <TaskForm
          member={member}
          onCancel={() => setAssigning(false)}
          onSave={create}
        />
      )}
      {loading ? (
        <div className="space-y-3" role="status">
          <div className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-lg border border-danger-border px-4 py-5 text-center"
        >
          <p className="text-sm text-neutral-600">
            {t("professionalDevelopment.loadError")}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="button-secondary mt-3 px-3 py-2 text-xs"
          >
            {t("professionalDevelopment.retry")}
          </button>
        </div>
      ) : !tasks.length ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm text-neutral-500">
            {t("professionalDevelopment.adminEmpty")}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-neutral-500">
            {number(total)} · {t("professionalDevelopment.tasks")}
          </p>
          <div className="space-y-3">
            {tasks.map((task) =>
              editing?.id === task.id ? (
                <TaskForm
                  key={task.id}
                  member={member}
                  task={task}
                  onCancel={() => setEditing(null)}
                  onSave={update}
                />
              ) : (
                <AdminTaskRow
                  key={task.id}
                  task={task}
                  expanded={expandedId === task.id}
                  onExpand={() =>
                    setExpandedId((id) => (id === task.id ? null : task.id))
                  }
                  onEdit={() => {
                    setAssigning(false);
                    setEditing(task);
                    setNotice("");
                  }}
                  onDelete={() => void deleteTask(task)}
                  onRefresh={load}
                />
              ),
            )}
          </div>
          {totalPages > 1 && (
            <nav
              aria-label={t("professionalDevelopment.taskPagination")}
              className="flex items-center justify-center gap-3"
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
                {t("professionalDevelopment.pageOf", {
                  page,
                  pages: totalPages,
                })}
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
        </>
      )}
    </section>
  );
}
