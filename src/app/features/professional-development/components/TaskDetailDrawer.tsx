import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { CloseIcon, PlusIcon, TrashIcon } from "../../../components/Icons";
import { api } from "../../../services/api";
import { useI18n } from "../../../i18n";
import type { ProfessionalTask, TaskChecklistItem, TaskStatus } from "../types";
import {
  MentorPriorityMark,
  PriorityLabel,
  StatusPill,
} from "./TaskPresentation";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];
const STATUS_KEYS: Record<TaskStatus, string> = {
  TODO: "toDo",
  IN_PROGRESS: "inProgress",
  BLOCKED: "blocked",
  DONE: "done",
};

export function TaskDetailDrawer({
  taskId,
  onClose,
  onChanged,
}: {
  taskId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { t, date, locale } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [task, setTask] = useState<ProfessionalTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checklistTitle, setChecklistTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [personalNote, setPersonalNote] = useState("");

  const load = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setError(false);
    setActionError("");
    try {
      let data = await api.getTask(taskId);
      const unread = data.notes.filter(
        (note) => note.type === "MENTOR_FEEDBACK" && !note.readAt,
      );
      if (unread.length) {
        await Promise.all(
          unread.map((note) => api.markMentorFeedbackRead(taskId, note.id)),
        );
        data = await api.getTask(taskId);
        onChanged?.();
      }
      setTask(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [taskId, onChanged]);

  useEffect(() => {
    if (!taskId) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    requestAnimationFrame(() => closeRef.current?.focus());
    void load();
    return () => {
      if (dialog?.open) dialog.close();
      previousFocus.current?.focus();
    };
  }, [taskId, load]);

  const updateTask = async (operation: () => Promise<ProfessionalTask>) => {
    setBusy(true);
    setActionError("");
    try {
      await operation();
      const next = taskId ? await api.getTask(taskId) : null;
      if (next) setTask(next);
      onChanged?.();
    } catch {
      setActionError(t("professionalDevelopment.saveError"));
    } finally {
      setBusy(false);
    }
  };

  const refreshDetails = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setActionError("");
    try {
      await operation();
      await load();
      onChanged?.();
      return true;
    } catch {
      setActionError(t("professionalDevelopment.saveError"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveChecklistTitle = (item: TaskChecklistItem) =>
    refreshDetails(() =>
      api.updateChecklistItem(taskId!, item.id, { title: editedTitle.trim() }),
    );

  const addChecklist = (event: FormEvent) => {
    event.preventDefault();
    if (!checklistTitle.trim() || !taskId) return;
    void refreshDetails(() =>
      api.addChecklistItem(taskId, checklistTitle.trim()),
    ).then((saved) => {
      if (saved) setChecklistTitle("");
    });
  };

  const addNote = (event: FormEvent) => {
    event.preventDefault();
    if (!personalNote.trim() || !taskId) return;
    void refreshDetails(() =>
      api.addPersonalNote(taskId, personalNote.trim()),
    ).then((saved) => {
      if (saved) setPersonalNote("");
    });
  };

  if (!taskId) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-start backdrop:bg-neutral-950/45"
      aria-labelledby="task-detail-title"
    >
      <div className="flex h-full justify-end">
        <section className="h-full w-full max-w-2xl overflow-y-auto border-s border-border bg-surface px-5 py-5 shadow-2xl sm:px-8 sm:py-7">
          <header className="sticky top-0 z-10 -mx-5 -mt-5 flex items-start justify-between gap-4 border-b border-border bg-surface/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:-mt-7 sm:px-8">
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-500">
                {t("professionalDevelopment.tasks")}
              </p>
              <h2
                id="task-detail-title"
                className="mt-1 text-xl font-semibold leading-7 text-neutral-950 dark:text-neutral-100"
              >
                {task?.title ?? t("professionalDevelopment.loadingTask")}
              </h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-info-strong dark:hover:bg-neutral-800"
              aria-label={t("professionalDevelopment.close")}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </header>

          {loading ? (
            <div className="space-y-4 py-8" role="status" aria-live="polite">
              <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
              <div className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
              <div className="h-40 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            </div>
          ) : error || !task ? (
            <div role="alert" className="py-10 text-center">
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {t("professionalDevelopment.detailError")}
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="button-secondary mt-4"
              >
                {t("professionalDevelopment.retry")}
              </button>
            </div>
          ) : (
            <div className="space-y-7 py-6">
              {actionError && (
                <p
                  role="alert"
                  className="rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger-strong"
                >
                  {actionError}
                </p>
              )}
              <section
                aria-label={t("professionalDevelopment.taskActions")}
                className="space-y-4 rounded-xl border border-border p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={task.status} />
                  <PriorityLabel priority={task.priority} />
                  {task.mentorPriority && <MentorPriorityMark />}
                </div>
                <label className="grid max-w-xs gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  {t("professionalDevelopment.updateStatus")}
                  <select
                    value={task.status}
                    disabled={busy}
                    onChange={(event) =>
                      void updateTask(() =>
                        api.updateTaskStatus(
                          task.id,
                          event.target.value as TaskStatus,
                        ),
                      )
                    }
                    className="field-control"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {t(`professionalDevelopment.${STATUS_KEYS[status]}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <p className="text-neutral-500">
                    {t("professionalDevelopment.startDate")}:{" "}
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">
                      {task.startDate
                        ? date(task.startDate, { dateStyle: "medium" })
                        : t("common.notSpecified")}
                    </span>
                  </p>
                  <p
                    className={
                      task.overdue
                        ? "font-semibold text-danger-strong"
                        : "text-neutral-500"
                    }
                  >
                    {task.overdue && task.status !== "DONE"
                      ? `${t("professionalDevelopment.overdue")} · `
                      : `${t("professionalDevelopment.dueDate")} · `}
                    <span className="font-medium">
                      {task.dueDate
                        ? date(task.dueDate, { dateStyle: "medium" })
                        : t("professionalDevelopment.noDueDate")}
                    </span>
                  </p>
                </div>
              </section>

              <section
                className="space-y-2"
                aria-labelledby="task-description-heading"
              >
                <h3
                  id="task-description-heading"
                  className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
                >
                  {t("professionalDevelopment.description")}
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                  {task.description ||
                    t("professionalDevelopment.noDescription")}
                </p>
              </section>

              <section
                className="space-y-3"
                aria-labelledby="task-checklist-heading"
              >
                <header className="flex items-baseline justify-between gap-3">
                  <h3
                    id="task-checklist-heading"
                    className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
                  >
                    {t("professionalDevelopment.checklist")}
                  </h3>
                  <span className="text-xs tabular-nums text-neutral-500">
                    {t(
                      "professionalDevelopment.checklistProgress",
                      task.progress,
                    )}
                  </span>
                </header>
                {!task.checklist.length ? (
                  <p className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-neutral-500">
                    {t("professionalDevelopment.checklistEmpty")}
                  </p>
                ) : (
                  <ul className="divide-y divide-border-subtle rounded-xl border border-border px-4">
                    {task.checklist.map((item) => (
                      <li
                        key={item.id}
                        className="flex min-h-12 items-center gap-3 py-2.5"
                      >
                        <input
                          type="checkbox"
                          checked={item.completed}
                          disabled={busy}
                          onChange={(event) =>
                            void refreshDetails(() =>
                              api.updateChecklistItem(task.id, item.id, {
                                completed: event.target.checked,
                              }),
                            )
                          }
                          className="h-4 w-4 shrink-0 accent-info-strong"
                          aria-label={item.title}
                        />
                        {editingId === item.id ? (
                          <form
                            className="flex min-w-0 flex-1 gap-2"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void saveChecklistTitle(item).then(() =>
                                setEditingId(null),
                              );
                            }}
                          >
                            <input
                              autoFocus
                              value={editedTitle}
                              onChange={(event) =>
                                setEditedTitle(event.target.value)
                              }
                              maxLength={300}
                              required
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
                          <span
                            className={`min-w-0 flex-1 text-sm ${item.completed ? "text-neutral-500 line-through" : "text-neutral-800 dark:text-neutral-200"}`}
                          >
                            {item.title}
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setEditingId(item.id);
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
                                t(
                                  "professionalDevelopment.deleteChecklistItem",
                                ) + "?",
                              ) &&
                              taskId
                            )
                              void refreshDetails(() =>
                                api.deleteChecklistItem(taskId, item.id),
                              );
                          }}
                          className="rounded-md p-2 text-neutral-500 hover:bg-danger-soft hover:text-danger-strong"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <form className="flex gap-2" onSubmit={addChecklist}>
                  <label htmlFor="new-checklist-item" className="sr-only">
                    {t("professionalDevelopment.checklistPlaceholder")}
                  </label>
                  <input
                    id="new-checklist-item"
                    value={checklistTitle}
                    onChange={(event) => setChecklistTitle(event.target.value)}
                    maxLength={300}
                    placeholder={t(
                      "professionalDevelopment.checklistPlaceholder",
                    )}
                    className="field-control min-w-0 flex-1"
                  />
                  <button
                    type="submit"
                    disabled={busy || !checklistTitle.trim()}
                    className="button-secondary inline-flex shrink-0 items-center gap-1.5 px-3"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>{t("professionalDevelopment.add")}</span>
                  </button>
                </form>
              </section>

              <section
                className="space-y-3"
                aria-labelledby="mentor-feedback-heading"
              >
                <header className="flex items-center gap-2">
                  <h3
                    id="mentor-feedback-heading"
                    className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
                  >
                    {t("professionalDevelopment.mentorFeedback")}
                  </h3>
                  {task.unreadMentorFeedbackCount > 0 && (
                    <span
                      className="h-2 w-2 rounded-full bg-danger-strong"
                      aria-label={t("professionalDevelopment.unreadFeedback")}
                    />
                  )}
                </header>
                {task.notes.filter((note) => note.type === "MENTOR_FEEDBACK")
                  .length ? (
                  <ul className="space-y-3">
                    {task.notes
                      .filter((note) => note.type === "MENTOR_FEEDBACK")
                      .map((note) => (
                        <li
                          key={note.id}
                          className="rounded-xl border-s-2 border-info-strong bg-info-soft/50 p-4 dark:bg-blue-950/20"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="rounded-full border border-info-border px-2 py-0.5 text-[11px] font-medium text-info-strong">
                              {t("professionalDevelopment.mentor")}
                            </span>
                            <time
                              className="text-xs text-neutral-500"
                              dateTime={note.createdAt}
                            >
                              {date(note.createdAt, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </time>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-700 dark:text-neutral-200">
                            {note.content}
                          </p>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-neutral-500">
                    {t("professionalDevelopment.noFeedback")}
                  </p>
                )}
              </section>

              <section
                className="space-y-3"
                aria-labelledby="personal-notes-heading"
              >
                <h3
                  id="personal-notes-heading"
                  className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
                >
                  {t("professionalDevelopment.personalNotes")}
                </h3>
                <form className="space-y-2" onSubmit={addNote}>
                  <label className="sr-only" htmlFor="personal-task-note">
                    {t("professionalDevelopment.personalNotes")}
                  </label>
                  <textarea
                    id="personal-task-note"
                    value={personalNote}
                    onChange={(event) => setPersonalNote(event.target.value)}
                    maxLength={5000}
                    rows={3}
                    placeholder={t("professionalDevelopment.notePlaceholder")}
                    className="field-control w-full resize-y"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={busy || !personalNote.trim()}
                      className="button-primary px-3 py-2 text-xs"
                    >
                      {t("professionalDevelopment.addPersonalNote")}
                    </button>
                  </div>
                </form>
                {task.notes.filter((note) => note.type === "PERSONAL_NOTE")
                  .length ? (
                  <ul className="space-y-2">
                    {task.notes
                      .filter((note) => note.type === "PERSONAL_NOTE")
                      .map((note) => (
                        <li
                          key={note.id}
                          className="rounded-lg border border-border bg-neutral-50/70 p-3 dark:bg-neutral-900"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                              {t("professionalDevelopment.personalNote")}
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
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700 dark:text-neutral-200">
                            {note.content}
                          </p>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-xs text-neutral-500">
                    {t("professionalDevelopment.noPersonalNotes")}
                  </p>
                )}
              </section>
            </div>
          )}
        </section>
      </div>
    </dialog>
  );
}
