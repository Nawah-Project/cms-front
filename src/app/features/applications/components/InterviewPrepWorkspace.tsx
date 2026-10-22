import React, { useEffect, useState } from "react";
import type {
  Application,
  PrepChecklistItem,
  UpdateApplicationInput,
} from "../../../types";
import {
  CheckIcon,
  PlusIcon,
  SparklesIcon,
  SpinnerIcon,
  TrashIcon,
} from "../../../components/Icons";
import { useI18n } from "../../../i18n";

interface InterviewPrepWorkspaceProps {
  application: Application;
  onSave: (
    id: string,
    updates: UpdateApplicationInput,
  ) => Promise<Application | void>;
}

const DEFAULT_CHECKLIST_AR: PrepChecklistItem[] = [
  {
    id: "research-company",
    label: "البحث عن منتجات الشركة وفريقها التقني على LinkedIn",
    completed: false,
  },
  {
    id: "review-jd",
    label: "مراجعة الوصف الوظيفي وتجهيز أمثلة عملية بطريقة STAR",
    completed: false,
  },
  {
    id: "prepare-questions",
    label: "تحضير 3 أسئلة ذكية لطرحها على المحاور في نهاية المقابلة",
    completed: false,
  },
];

const DEFAULT_CHECKLIST_EN: PrepChecklistItem[] = [
  {
    id: "research-company",
    label: "Research company products & engineering team on LinkedIn",
    completed: false,
  },
  {
    id: "review-jd",
    label: "Review job description & prepare STAR method examples",
    completed: false,
  },
  {
    id: "prepare-questions",
    label: "Prepare 3 insightful questions for the interviewer",
    completed: false,
  },
];

function normalizeChecklist(
  raw: PrepChecklistItem[] | null | undefined,
  locale: string,
): PrepChecklistItem[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((item, idx) => ({
      id: item.id || `item-${idx}`,
      label: String(
        item.label || (item as { title?: string }).title || "",
      ),
      completed: Boolean(item.completed),
    }));
  }
  return locale === "ar" ? DEFAULT_CHECKLIST_AR : DEFAULT_CHECKLIST_EN;
}

export function InterviewPrepWorkspace({
  application,
  onSave,
}: InterviewPrepWorkspaceProps) {
  const { t, locale } = useI18n();
  const [hasAssignment, setHasAssignment] = useState(
    Boolean(application.hasAssignment),
  );
  const [interviewDate, setInterviewDate] = useState(
    application.interviewDate ? application.interviewDate.slice(0, 16) : "",
  );
  const [checklist, setChecklist] = useState<PrepChecklistItem[]>(() =>
    normalizeChecklist(application.prepChecklist, locale),
  );
  const [newItemTitle, setNewItemTitle] = useState("");
  const [interviewNotes, setInterviewNotes] = useState(
    application.interviewNotes || "",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHasAssignment(Boolean(application.hasAssignment));
    setInterviewDate(
      application.interviewDate ? application.interviewDate.slice(0, 16) : "",
    );
    setChecklist(normalizeChecklist(application.prepChecklist, locale));
    setInterviewNotes(application.interviewNotes || "");
  }, [
    application.id,
    application.hasAssignment,
    application.interviewDate,
    application.prepChecklist,
    application.interviewNotes,
    locale,
  ]);

  const completedCount = checklist.filter((i) => i.completed).length;

  const persistWorkspace = async (overrides?: {
    hasAssignment?: boolean;
    interviewDate?: string;
    prepChecklist?: PrepChecklistItem[];
    interviewNotes?: string;
  }) => {
    setSaving(true);
    try {
      const nextDate = overrides?.interviewDate ?? interviewDate;
      await onSave(application.id, {
        hasAssignment: overrides?.hasAssignment ?? hasAssignment,
        interviewDate: nextDate ? new Date(nextDate).toISOString() : null,
        prepChecklist: overrides?.prepChecklist ?? checklist,
        interviewNotes: overrides?.interviewNotes ?? interviewNotes,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleChecklistItem = (itemId: string) => {
    const next = checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item,
    );
    setChecklist(next);
    void persistWorkspace({ prepChecklist: next });
  };

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemTitle.trim();
    if (!trimmed) return;
    const next: PrepChecklistItem[] = [
      ...checklist,
      {
        id: `custom-${Date.now()}`,
        label: trimmed,
        completed: false,
      },
    ];
    setChecklist(next);
    setNewItemTitle("");
    void persistWorkspace({ prepChecklist: next });
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    const next = checklist.filter((item) => item.id !== itemId);
    setChecklist(next);
    void persistWorkspace({ prepChecklist: next });
  };

  return (
    <section
      aria-labelledby="interview-prep-heading"
      className="rounded-xl border border-info-border bg-white p-6 shadow-xs dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 pb-4 dark:border-neutral-800">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-info-soft px-2.5 py-1 text-xs font-semibold text-info-strong">
            <SparklesIcon className="h-3.5 w-3.5" />
            <span>{t("applications.prepWorkspaceBadge")}</span>
          </div>
          <h2
            id="interview-prep-heading"
            className="mt-2 text-lg font-bold text-neutral-900 dark:text-neutral-100"
          >
            {t("applications.prepWorkspaceTitle")}
          </h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {t("applications.prepWorkspaceSubtitle")}
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void persistWorkspace()}
          className="button-primary inline-flex items-center gap-2 text-xs"
        >
          {saving && <SpinnerIcon className="h-3.5 w-3.5" />}
          <span>{t("applications.savePrepWorkspace")}</span>
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-neutral-50/70 p-3.5 dark:bg-neutral-800/40">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <div>
                <span className="block text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  {t("applications.hasAssignmentLabel")}
                </span>
                <span className="mt-0.5 block text-[11px] text-neutral-500 dark:text-neutral-400">
                  {t("applications.hasAssignmentHint")}
                </span>
              </div>
              <input
                type="checkbox"
                checked={hasAssignment}
                onChange={(e) => {
                  const next = e.target.checked;
                  setHasAssignment(next);
                  void persistWorkspace({ hasAssignment: next });
                }}
                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
              />
            </label>
          </div>

          <div>
            <label htmlFor="interviewDateInput" className="field-label">
              {t("applications.interviewDateLabel")}
            </label>
            <input
              id="interviewDateInput"
              type="datetime-local"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              className="field-control text-xs"
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="field-label mb-0">
                {t("applications.prepChecklistLabel")}
              </span>
              <span className="text-xs font-medium text-neutral-500">
                {completedCount}/{checklist.length}
              </span>
            </div>

            <div className="space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklistItem(item.id)}
                      className="h-4 w-4 rounded border-neutral-300 text-neutral-900"
                    />
                    <span
                      className={`truncate ${
                        item.completed
                          ? "line-through text-neutral-400"
                          : "font-medium text-neutral-800 dark:text-neutral-200"
                      }`}
                    >
                      {item.label}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeleteChecklistItem(item.id)}
                    aria-label={t("common.delete")}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-danger-strong dark:hover:bg-neutral-800"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddChecklistItem} className="flex gap-2">
              <input
                type="text"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder={t("applications.addPrepStepPlaceholder")}
                className="field-control flex-1 py-1.5 text-xs"
              />
              <button
                type="submit"
                className="button-secondary inline-flex shrink-0 items-center gap-1 px-3 py-1.5 text-xs"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                <span>{t("applications.addPrepStep")}</span>
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col">
          <label htmlFor="interviewNotesTextarea" className="field-label">
            {t("applications.interviewNotesLabel")}
          </label>
          <p className="mb-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            {t("applications.interviewNotesHint")}
          </p>
          <textarea
            id="interviewNotesTextarea"
            rows={8}
            value={interviewNotes}
            onChange={(e) => setInterviewNotes(e.target.value)}
            placeholder={t("applications.interviewNotesPlaceholder")}
            className="field-control flex-1 resize-y text-xs leading-5"
          />
          <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1">
              <CheckIcon className="h-3.5 w-3.5 text-success-strong" />
              <span>{t("applications.day7SyncNotice")}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

