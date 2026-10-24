import React, { useEffect, useState, useRef } from "react";
import type {
  Application,
  PrepChecklistItem,
  UpdateApplicationInput,
} from "../../../types";
import {
  CalendarIcon,
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
  const isRtl = locale === "ar";

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
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setInterviewDate(
      application.interviewDate ? application.interviewDate.slice(0, 16) : "",
    );
    setChecklist(normalizeChecklist(application.prepChecklist, locale));
    setInterviewNotes(application.interviewNotes || "");
  }, [
    application.id,
    application.interviewDate,
    application.prepChecklist,
    application.interviewNotes,
    locale,
  ]);

  const completedCount = checklist.filter((i) => i.completed).length;
  const progressPercent =
    checklist.length > 0
      ? Math.round((completedCount / checklist.length) * 100)
      : 0;

  const persistWorkspace = async (overrides?: {
    interviewDate?: string;
    prepChecklist?: PrepChecklistItem[];
    interviewNotes?: string;
  }) => {
    setSaving(true);
    try {
      const nextDate = overrides?.interviewDate ?? interviewDate;
      await onSave(application.id, {
        interviewDate: nextDate ? new Date(nextDate).toISOString() : null,
        prepChecklist: overrides?.prepChecklist ?? checklist,
        interviewNotes: overrides?.interviewNotes ?? interviewNotes,
      });
      setLastSavedTime(
        new Date().toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
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

  const handleNotesChange = (val: string) => {
    setInterviewNotes(val);
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      void persistWorkspace({ interviewNotes: val });
    }, 1500);
  };

  const handleOpenGoogleCalendar = () => {
    if (!interviewDate) return;
    try {
      const startDate = new Date(interviewDate);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const formatGCal = (d: Date) =>
        d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        `[مقابلة] ${application.jobTitle} - ${application.companyName}`,
      )}&details=${encodeURIComponent(
        `موعد مقابلة/اختبار لشركة ${application.companyName}\nالمسمى: ${application.jobTitle}\nرابط الوظيفة: ${application.jobUrl || ""}`,
      )}&location=${encodeURIComponent(application.location || "")}&dates=${formatGCal(
        startDate,
      )}/${formatGCal(endDate)}`;

      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // ignore
    }
  };

  const handleDownloadIcs = () => {
    if (!interviewDate) return;
    try {
      const startDate = new Date(interviewDate);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const formatIcs = (d: Date) =>
        d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Nawah Project//Interview Prep//AR",
        "BEGIN:VEVENT",
        `SUMMARY:[مقابلة] ${application.jobTitle} - ${application.companyName}`,
        `DESCRIPTION:تحضير المقابلة في منصة نواة\\nالشركة: ${application.companyName}\\nالمسمى: ${application.jobTitle}`,
        `LOCATION:${application.location || ""}`,
        `DTSTART:${formatIcs(startDate)}`,
        `DTEND:${formatIcs(endDate)}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");

      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `interview-${application.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")}.ics`;
      link.click();
    } catch {
      // ignore
    }
  };

  return (
    <section
      aria-labelledby="interview-prep-heading"
      className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm overflow-hidden"
    >
      {/* Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-info-soft dark:bg-info-border/20 px-3 py-1 text-xs font-semibold text-info-strong border border-info-border/40">
            <SparklesIcon className="h-3.5 w-3.5 text-info-strong" />
            <span>
              {isRtl
                ? "غرفة التحضير والملاحظات"
                : "Preparation & Debrief Workspace"}
            </span>
          </div>
          <h2
            id="interview-prep-heading"
            className="mt-2 text-lg font-bold text-neutral-900 dark:text-neutral-100"
          >
            {isRtl
              ? "مساحة الاستعداد للمقابلة والاختبار"
              : "Interview & Assignment Readiness Hub"}
          </h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {isRtl
              ? "نظّم خطواتك وسجل الملاحظات والأسئلة فور انتهاء المقابلة لتقييم أدائك في اليوم السابع."
              : "Organize prep steps and record debrief notes right after interview/assignment for Day 7 review."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastSavedTime && (
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 hidden sm:inline-block">
              {isRtl ? `تم الحفظ: ${lastSavedTime}` : `Saved at: ${lastSavedTime}`}
            </span>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => void persistWorkspace()}
            className="button-primary inline-flex items-center gap-2 text-xs py-2 px-4 shadow-sm"
          >
            {saving ? (
              <SpinnerIcon className="h-3.5 w-3.5" />
            ) : (
              <CheckIcon className="h-3.5 w-3.5" />
            )}
            <span>
              {saving
                ? isRtl
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isRtl
                  ? "حفظ التغييرات"
                  : "Save Workspace"}
            </span>
          </button>
        </div>
      </div>

      {/* 2-Column Parallel Layout */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Right Column (Start in RTL): Readiness Plan & Schedule Picker */}
        <div className="space-y-5">
          {/* Prominent Schedule Picker */}
          <div className="rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary-strong dark:text-neutral-300" />
              <label
                htmlFor="interviewDateInput"
                className="text-xs font-bold text-neutral-900 dark:text-neutral-100"
              >
                {isRtl
                  ? "موعد المقابلة أو تسليم الاختبار"
                  : "Interview Date or Assignment Deadline"}
              </label>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              {isRtl
                ? "حدد التاريخ والوقت لتذكيرك وضبط أولويات أسبوعك في بوصلة الإنجاز."
                : "Set schedule date/time to coordinate your weekly milestones."}
            </p>
            <input
              id="interviewDateInput"
              type="datetime-local"
              value={interviewDate}
              onChange={(e) => {
                const val = e.target.value;
                setInterviewDate(val);
                void persistWorkspace({ interviewDate: val });
              }}
              className="field-control text-xs w-full bg-white dark:bg-neutral-900"
            />
            {interviewDate && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={handleOpenGoogleCalendar}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-2xs"
                >
                  <span>📅 Google Calendar</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadIcs}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-2xs"
                >
                  <span>📥 {isRtl ? "تحميل ملف (.ics)" : "Download (.ics)"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Checklist with Mini Progress Bar */}
          <div className="rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/20 p-4 space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  {isRtl ? "قائمة فحص الاستعداد" : "Readiness Checklist"}
                </span>
                <span className="text-xs font-semibold text-primary-strong dark:text-neutral-300">
                  {completedCount} {isRtl ? "من" : "of"} {checklist.length}{" "}
                  ({progressPercent}%)
                </span>
              </div>
              {/* Mini Percentage Progress Bar */}
              <div className="w-full bg-neutral-200 dark:bg-neutral-700/80 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary-strong h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2 pt-1">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2.5 text-xs transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 shadow-2xs"
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleChecklistItem(item.id)}
                      className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-800"
                    />
                    <span
                      className={`truncate leading-relaxed ${
                        item.completed
                          ? "line-through text-neutral-400 dark:text-neutral-500"
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

            {/* Add Custom Checklist Item */}
            <form onSubmit={handleAddChecklistItem} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder={
                  isRtl
                    ? "أضف خطوة مخصصة لتحضيرك..."
                    : "Add custom prep task..."
                }
                className="field-control flex-1 py-1.5 text-xs bg-white dark:bg-neutral-900"
              />
              <button
                type="submit"
                disabled={!newItemTitle.trim()}
                className="button-secondary inline-flex shrink-0 items-center gap-1 px-3 py-1.5 text-xs disabled:opacity-40"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                <span>{isRtl ? "إضافة خطوة" : "Add Step"}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Left Column (End in RTL): Post-Interview / Assignment Debrief Notes */}
        <div className="flex flex-col h-full rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/20 p-4 space-y-2.5">
          <div>
            <label
              htmlFor="interviewNotesTextarea"
              className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5"
            >
              <span>📝</span>
              <span>
                {isRtl
                  ? "دفتر ملاحظات ما بعد المقابلة / الاختبار"
                  : "Post-Interview & Assignment Debrief"}
              </span>
            </label>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              {isRtl
                ? "مساحة مريحة لتدوين الأسئلة التي طُرحت، نقاط قوتك وتحدياتك لمراجعتها وتحسين أدائك في تقييم اليوم السابع."
                : "Record questions asked, strengths, and areas of improvement to review in your Day 7 evaluation."}
            </p>
          </div>

          {/* Smart Debrief Notification Banner */}
          <div className="rounded-xl border border-info-border/70 bg-info-soft/50 dark:bg-info-border/10 p-3 flex items-start gap-2.5 text-xs text-info-strong">
            <SparklesIcon className="w-4 h-4 shrink-0 mt-0.5 text-info-strong" />
            <div className="space-y-0.5">
              <span className="font-bold">
                {isRtl
                  ? "💡 تذكير ذكي للمراجعة الفورية:"
                  : "💡 Smart Debrief Reminder:"}
              </span>
              <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                {isRtl
                  ? "فور انتهاء مقابلتك، دوّن هنا الأسئلة وردود الفعل ونقاط قوتك وتحدياتك لتستفيد منها في تحسين أدائك بمراجعة اليوم السابع."
                  : "Right after your interview, log questions, feedback, and key learnings here for Day 7 review."}
              </p>
            </div>
          </div>

          <textarea
            id="interviewNotesTextarea"
            rows={12}
            value={interviewNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder={
              isRtl
                ? "مثال:\n- ما هي أبرز الأسئلة التقنية والشخصية التي وُجهت لك؟\n- ما هو رد فعل المقابلين على إجاباتك وخبراتك؟\n- ما هي الملاحظات على الاختبار العملي التي تحتاج تحسيناً لاحقاً؟"
                : "Example:\n- What key questions were asked?\n- How did interviewers react to your answers?\n- What areas need refinement for future discussions?"
            }
            className="field-control flex-1 min-h-[220px] resize-y text-xs leading-5 bg-white dark:bg-neutral-900 p-3"
          />

          <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="h-3.5 w-3.5 text-success-strong" />
              <span>
                {isRtl
                  ? "حفظ تلقائي مرتبط مباشرة بمراجعة الأسبوع"
                  : "Auto-synced with weekly review"}
              </span>
            </span>

            {saving && (
              <span className="inline-flex items-center gap-1 text-primary-strong">
                <SpinnerIcon className="h-3 w-3" />
                <span>{isRtl ? "جاري الحفظ..." : "Saving..."}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
