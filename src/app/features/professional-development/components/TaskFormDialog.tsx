import { useEffect, useRef, useState, type FormEvent } from "react";
import { CloseIcon, PlusIcon, TrashIcon } from "../../../components/Icons";
import { useI18n } from "../../../i18n";
import type {
  CreateTaskInput,
  ProfessionalTask,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from "../types";
import type { AdminMember } from "../../admin/api/adminApi";

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

export function TaskFormDialog({
  mode,
  members = [],
  selectedMember,
  task,
  onClose,
  onSave,
}: {
  mode: "personal" | "assign" | "editPersonal" | "editAssigned";
  members?: AdminMember[];
  selectedMember?: AdminMember;
  task?: ProfessionalTask;
  onClose: () => void;
  onSave: (
    input: CreateTaskInput | UpdateTaskInput,
    memberId?: string,
  ) => Promise<void>;
}) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? "MEDIUM",
  );
  const [mentorPriority, setMentorPriority] = useState(
    task?.mentorPriority ?? false,
  );
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "TODO");
  const [startDate, setStartDate] = useState(
    task?.startDate?.slice(0, 10) ?? "",
  );
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? "");
  const [checklist, setChecklist] = useState<string[]>(
    task?.checklist.map((item) => item.title) ?? [],
  );
  const [step, setStep] = useState("");
  const [memberId, setMemberId] = useState(selectedMember?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fieldClass = "field-control w-full";
  const isEditing = mode === "editPersonal" || mode === "editAssigned";
  const isAdmin = mode === "assign" || mode === "editAssigned";

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      if (dialog?.open) dialog.close();
      previousFocus.current?.focus();
    };
  }, []);

  const addStep = () => {
    if (!step.trim()) return;
    setChecklist((items) => [...items, step.trim()]);
    setStep("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (isAdmin && !selectedMember && !memberId) {
      setError(t("professionalDevelopment.memberRequired"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const input = {
        title: title.trim(),
        description: description.trim() || (isEditing ? null : undefined),
        priority,
        ...(isAdmin ? { mentorPriority } : {}),
        startDate: startDate || (isEditing ? null : undefined),
        dueDate: dueDate || (isEditing ? null : undefined),
        ...(isEditing
          ? { status }
          : {
              checklist: checklist
                .filter(Boolean)
                .map((item) => ({ title: item })),
            }),
      };
      await onSave(input, (selectedMember?.id ?? memberId) || undefined);
    } catch {
      setError(t("professionalDevelopment.saveError"));
    } finally {
      setSaving(false);
    }
  };

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
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-xl overflow-hidden rounded-2xl border border-border bg-surface p-0 text-start text-neutral-900 shadow-2xl backdrop:bg-neutral-950/50 dark:text-neutral-100 sm:w-[calc(100%-3rem)]"
      aria-labelledby="task-form-title"
    >
      <form onSubmit={submit} className="flex max-h-[92dvh] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <h2 id="task-form-title" className="text-lg font-semibold">
              {mode === "personal"
                ? t("professionalDevelopment.addTask")
                : mode === "assign"
                  ? t("professionalDevelopment.assignTaskTitle")
                  : t("professionalDevelopment.editTask")}
            </h2>
            {selectedMember && (
              <p className="mt-1 text-sm text-neutral-500">
                {selectedMember.name}
              </p>
            )}
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
        <div className="space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          {mode === "assign" && !selectedMember && (
            <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {t("professionalDevelopment.member")}
              <select
                required
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
                className={fieldClass}
              >
                <option value="">
                  {t("professionalDevelopment.chooseMember")}
                </option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                    {member.group ? ` · ${member.group.name}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            {t("professionalDevelopment.taskTitle")}
            <input
              autoFocus
              required
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("professionalDevelopment.taskTitlePlaceholder")}
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            {t("professionalDevelopment.description")}
            <textarea
              maxLength={5000}
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("professionalDevelopment.descriptionPlaceholder")}
              className={`${fieldClass} resize-y`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {t("professionalDevelopment.priority")}
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as TaskPriority)
                }
                className={fieldClass}
              >
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`professionalDevelopment.${value.toLowerCase()}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {t("professionalDevelopment.dueDate")}{" "}
              <span className="font-normal">
                ({t("professionalDevelopment.optional")})
              </span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {t("professionalDevelopment.startDate")}{" "}
              <span className="font-normal">
                ({t("professionalDevelopment.optional")})
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={fieldClass}
              />
            </label>
            {isEditing && (
              <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                {t("professionalDevelopment.status")}
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as TaskStatus)
                  }
                  className={fieldClass}
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {t(
                        `professionalDevelopment.${({ TODO: "toDo", IN_PROGRESS: "inProgress", BLOCKED: "blocked", DONE: "done" } as const)[value]}`,
                      )}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {isAdmin && (
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-amber-300/70 bg-amber-50/60 px-3 py-2.5 text-sm dark:border-amber-900 dark:bg-amber-950/20">
              <input
                type="checkbox"
                checked={mentorPriority}
                onChange={(event) => setMentorPriority(event.target.checked)}
                className="h-4 w-4 accent-amber-600"
              />
              <span className="font-medium">
                {t("professionalDevelopment.mentorPriority")}
              </span>
            </label>
          )}
          {!isEditing && (
            <section
              className="space-y-2"
              aria-labelledby="task-checklist-label"
            >
              <h3
                id="task-checklist-label"
                className="text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                {t("professionalDevelopment.checklist")}
              </h3>
              {checklist.length > 0 && (
                <ul className="space-y-2">
                  {checklist.map((item, index) => (
                    <li
                      key={`${index}-${item}`}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1">{item}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setChecklist((items) =>
                            items.filter((_, i) => i !== index),
                          )
                        }
                        aria-label={`${t("professionalDevelopment.deleteChecklistItem")}: ${item}`}
                        className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  value={step}
                  onChange={(event) => setStep(event.target.value)}
                  maxLength={300}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addStep();
                    }
                  }}
                  placeholder={t(
                    "professionalDevelopment.checklistPlaceholder",
                  )}
                  className={`${fieldClass} min-w-0 flex-1`}
                />
                <button
                  type="button"
                  onClick={addStep}
                  disabled={!step.trim()}
                  aria-label={t("professionalDevelopment.addChecklistItem")}
                  className="button-secondary inline-flex items-center gap-1 px-3"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>{t("professionalDevelopment.add")}</span>
                </button>
              </div>
            </section>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger-strong">
              {error}
            </p>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="button-secondary px-4 py-2 text-sm"
          >
            {t("professionalDevelopment.cancel")}
          </button>
          <button
            type="submit"
            disabled={
              saving ||
              !title.trim() ||
              (mode === "assign" && !selectedMember && !memberId)
            }
            className="button-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {saving
              ? t("professionalDevelopment.saving")
              : mode === "personal"
                ? t("professionalDevelopment.createTask")
                : mode === "assign"
                  ? t("professionalDevelopment.assignTask")
                  : t("professionalDevelopment.save")}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
