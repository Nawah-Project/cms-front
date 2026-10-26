import { createContext, useContext, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, FileText, Lock, Plus } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { useI18n } from "../../../i18n";
import { apiClient } from "../../../lib/api-client";
import { journeyApi } from "../../journey/api/journeyApi";
import PerformanceAnalytics from "./PerformanceAnalytics";

export function meta() {
  return [{ title: "Performance Analytics | Nawah" }];
}

export interface Metrics {
  logged: number;
  tailored: number;
  positive: number;
  positiveRate: number | null;
  interviews: number;
  unknownInterviews: number;
  assignments: number;
  rejected: number;
  withdrawn: number;
  noResponse: number;
  accepted: number;
  posts: number;
  outreach: number;
  reviews: number;
  stages: Record<
    "APPLIED" | "ASSIGNMENT" | "INTERVIEW" | "DECISION" | "CLOSED",
    number
  >;
  outcomes: Record<
    "NONE" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "NO_RESPONSE",
    number
  >;
  milestones: { assignments: number; interviews: number; decisions: number };
}

export interface Report {
  asOf: string;
  overall: Metrics;
  weeks: (Metrics & { week: number })[];
  daily: { date: string; logged: number; positiveEvents: number }[];
  periodComparisons: {
    id: string;
    kind: "BEFORE_FIRST_CHECKPOINT" | "CV" | "USER_CHANGE";
    title: string;
    startAt: string;
    endAt: string | null;
    metrics: Omit<Metrics, "posts" | "outreach" | "reviews">;
  }[];
  cvs: {
    id: string;
    versionNumber: number;
    originalName: string;
    uploadedAt: string;
  }[];
  tasks: { id: string; title: string; completedAt: string | null }[];
  activities: {
    id: string;
    week: number;
    type: string;
    summary: string | null;
    postUrl: string | null;
    postTopic: string | null;
    contactName: string | null;
    companyName: string | null;
    createdAt: string;
    legacyChange: boolean;
  }[];
  readInsightCodes: string[];
  completedNodeCodes: string[];
  currentNodeCode: string;
  currentWeek: number;
  week1StartedAt?: string | null;
  finalAvailable: boolean;
  completed: boolean;
}

interface ReportPreviewContextValue {
  data: Report;
  scope: number | null;
  onScopeChange: (scope: number | null) => void;
  forceFinalPreview?: boolean;
}

const ReportPreviewContext = createContext<ReportPreviewContextValue | null>(
  null,
);

export function ReportPreviewProvider({
  value,
  children,
}: {
  value: ReportPreviewContextValue;
  children: ReactNode;
}) {
  return (
    <ReportPreviewContext.Provider value={value}>
      {children}
    </ReportPreviewContext.Provider>
  );
}

function weekReportUnlocked(week: number, report: Report) {
  const completed = new Set(report.completedNodeCodes);
  if (week === 1) {
    return (
      completed.has("W1_REVIEW") ||
      report.currentNodeCode === "W1_REVIEW" ||
      report.currentWeek > 1
    );
  }
  if (week === 2) {
    return (
      completed.has("W2_REVIEW") ||
      report.currentNodeCode === "W2_REVIEW" ||
      report.currentWeek > 2
    );
  }
  if (week === 3) {
    return (
      completed.has("W3_REVIEW") ||
      report.currentNodeCode === "W3_REVIEW" ||
      report.currentWeek > 3
    );
  }
  return (
    report.currentNodeCode === "FINAL_REPORT" ||
    report.finalAvailable ||
    report.completed
  );
}

export default function ReportsPage() {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => (ar ? a : e);
  const client = useQueryClient();
  const preview = useContext(ReportPreviewContext);
  const query = useQuery({
    queryKey: ["journey", "reports"],
    queryFn: () => apiClient.get<Report>("/journey/reports"),
    enabled: !preview,
  });
  const [memberScope, setMemberScope] = useState<number | null | "final">(null);
  const scope: number | null | "final" = preview
    ? preview.forceFinalPreview && preview.scope === null
      ? "final"
      : preview.scope
    : memberScope;
  const setScope = (next: number | null | "final") => {
    if (preview) preview.onScopeChange(next === "final" ? null : next);
    else setMemberScope(next);
  };
  const readOnly = Boolean(preview);
  const data = preview?.data ?? query.data;
  const [changeOpen, setChangeOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [detail, setDetail] = useState<"activities" | "cvs" | null>(null);
  const [lockedWeek, setLockedWeek] = useState<number | "final" | null>(null);

  async function refresh() {
    await client.invalidateQueries({ queryKey: ["journey"] });
  }

  async function saveChange(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly || !data || !note.trim()) return;
    setPending(true);
    setSaveError("");
    try {
      await journeyApi.submitSideTask({
        nodeCode: data.currentNodeCode,
        type: "USER_CHANGE",
        reviewSummary: note.trim(),
        sharedInGroup: false,
      });
      await refresh();
      setNote("");
      setChangeOpen(false);
    } catch {
      setSaveError(
        text(
          "الحفظ فشل. الكلام لسه موجود؛ حاول تاني.",
          "Saving failed. Your text is preserved; please retry.",
        ),
      );
    } finally {
      setPending(false);
    }
  }

  async function complete() {
    if (readOnly || !data || !data.finalAvailable) return;
    setPending(true);
    setSaveError("");
    try {
      await apiClient.post("/journey/final-report/complete");
      await refresh();
    } catch {
      setSaveError(
        text(
          "تعذر حفظ الإكمال؛ حاول تاني.",
          "Completion could not be saved; please retry.",
        ),
      );
    } finally {
      setPending(false);
    }
  }

  if (!preview && query.isPending) {
    return (
      <div role="status" className="p-8">
        {text("بنحمّل التحليلات…", "Loading analytics…")}
      </div>
    );
  }
  if (!preview && (query.isError || !data)) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-border bg-surface p-6"
      >
        <p>{text("تعذر تحميل التحليلات.", "Could not load analytics.")}</p>
        <button
          className="button-primary mt-3"
          onClick={() => void query.refetch()}
        >
          {text("حاول تاني", "Retry")}
        </button>
      </div>
    );
  }
  if (!data) return null;
  const reportData = data;

  const selectedWeek = typeof scope === "number" ? scope : null;
  const finalReportSelected = scope === "final";
  const m =
    selectedWeek === null
      ? reportData.overall
      : (reportData.weeks.find((week) => week.week === selectedWeek) ??
        reportData.overall);
  const previous =
    selectedWeek !== null && selectedWeek > 0
      ? reportData.weeks.find((week) => week.week === selectedWeek - 1)
      : undefined;
  const activities = reportData.activities.filter(
    (activity) => selectedWeek === null || activity.week === selectedWeek,
  );
  const labels: [string, number][] = [
    [text("طلبات مسجلة", "Logged applications"), m.logged],
    [text("طلبات مخصصة", "Tailored applications"), m.tailored],
    [text("تقدم إيجابي موثق", "Recorded positive progression"), m.positive],
    [text("وصلت لمقابلة", "Interview reached"), m.interviews],
    [text("اختبار أو تكليف", "Assignment received"), m.assignments],
    [text("قبول أو عرض", "Accepted / offer"), m.accepted],
    [text("رفض", "Rejected"), m.rejected],
    [text("انسحاب", "Withdrawn"), m.withdrawn],
    [text("إغلاق بلا رد", "Closed: no response"), m.noResponse],
    [text("منشورات LinkedIn", "LinkedIn posts"), m.posts],
    [text("محاولات تواصل", "Outreach contacts"), m.outreach],
    [text("مراجعات أسبوعية", "Weekly reflections"), m.reviews],
  ];
  const label = finalReportSelected
    ? text("التقرير النهائي", "Final report")
    : selectedWeek === null
      ? text("الرحلة بالكامل", "Whole journey")
      : text(`الأسبوع ${number(selectedWeek)}`, `Week ${number(selectedWeek)}`);

  function lockedMessage(week: number | "final") {
    if (week === "final" || week === 4) {
      return text(
        "التقرير النهائي والأسبوع الرابع بيظهروا عند الوصول لمرحلة التقرير النهائي في الرحلة.",
        "Week 4 and the final report become available at the final-report journey stage.",
      );
    }
    if (reportData.currentWeek === 0 || !reportData.week1StartedAt) {
      return text(
        "التقرير ده لسه مقفول. يبدأ الجدول بعد إكمال المهمة صفر وبداية الأسبوع الأول.",
        "This report is locked. Its schedule starts after Task 0 is completed and Week 1 begins.",
      );
    }
    const expected = new Date(reportData.week1StartedAt);
    expected.setDate(expected.getDate() + (week - 1) * 7 + 6);
    const formatted = new Intl.DateTimeFormat(ar ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(expected);
    return text(
      `تقرير الأسبوع ${number(week)} لسه مقفول. موعده المتوقع قرب نهاية الأسبوع: ${formatted}.`,
      `Week ${number(week)} is still locked. Its expected availability is near the end of the week: ${formatted}.`,
    );
  }

  return (
    <main className="space-y-6 pb-8" dir={ar ? "rtl" : "ltr"}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            {text("نواة · تحليلات الأداء", "NAWAH · PERFORMANCE ANALYTICS")}
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            {text("تحليل الأداء ومسار البحث عن وظيفة", "Performance Analytics")}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {text("البيانات المحفوظة حتى", "Recorded data as of")}{" "}
            {new Date(reportData.asOf).toLocaleString(locale)}
          </p>
        </div>
        {!readOnly && reportData.currentWeek >= 3 && (
          <button
            className="button-primary"
            onClick={() => {
              setSaveError("");
              setChangeOpen(true);
            }}
          >
            <Plus className="inline h-4 w-4" aria-hidden="true" />{" "}
            {text("سجّل تغيير مهني", "Record a professional change")}
          </button>
        )}
      </header>

      {!preview && (
        <>
          <nav
            aria-label={text("اختيار نطاق التقرير", "Report selection")}
            className="flex flex-wrap gap-2"
          >
            <button
              type="button"
              aria-pressed={scope === null}
              className={scope === null ? "button-primary" : "button-secondary"}
              onClick={() => {
                setLockedWeek(null);
                setScope(null);
              }}
            >
              {text("التحليلات الشاملة", "Overall journey")}
            </button>
            {[1, 2, 3, 4].map((week) => {
              const unlocked = weekReportUnlocked(week, data);
              return (
                <button
                  key={week}
                  type="button"
                  aria-pressed={scope === week}
                  aria-label={
                    unlocked
                      ? text(
                          `تقرير الأسبوع ${number(week)}`,
                          `Week ${number(week)} report`,
                        )
                      : text(
                          `تقرير الأسبوع ${number(week)} مقفول`,
                          `Week ${number(week)} report locked`,
                        )
                  }
                  className={
                    scope === week ? "button-primary" : "button-secondary"
                  }
                  onClick={() => {
                    if (unlocked) {
                      setLockedWeek(null);
                      setScope(week);
                    } else setLockedWeek(week);
                  }}
                >
                  {unlocked ? (
                    text(`الأسبوع ${number(week)}`, `Week ${number(week)}`)
                  ) : (
                    <>
                      <Lock className="inline h-3.5 w-3.5" aria-hidden="true" />{" "}
                      {text(`الأسبوع ${number(week)}`, `Week ${number(week)}`)}
                    </>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={finalReportSelected}
              aria-label={
                reportData.finalAvailable || reportData.completed
                  ? text("التقرير النهائي", "Final report")
                  : text("التقرير النهائي مقفول", "Final report locked")
              }
              className={
                finalReportSelected ? "button-primary" : "button-secondary"
              }
              onClick={() => {
                if (reportData.finalAvailable || reportData.completed) {
                  setLockedWeek(null);
                  setScope("final");
                } else setLockedWeek("final");
              }}
            >
              {reportData.finalAvailable || reportData.completed ? (
                <FileText className="inline h-4 w-4" aria-hidden="true" />
              ) : (
                <Lock className="inline h-3.5 w-3.5" aria-hidden="true" />
              )}{" "}
              {text("التقرير النهائي", "Final report")}
            </button>
          </nav>
          {lockedWeek !== null && (
            <p
              role="note"
              className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
            >
              <Lock className="me-1 inline h-4 w-4" aria-hidden="true" />{" "}
              {lockedMessage(lockedWeek)}
            </p>
          )}
        </>
      )}

      {selectedWeek !== null && (
        <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <header className="flex items-start gap-3">
            <Activity
              className="mt-0.5 h-5 w-5 text-emerald-700"
              aria-hidden="true"
            />
            <div>
              <h2 className="font-bold">
                {text(
                  `تقرير الأسبوع ${number(selectedWeek)}`,
                  `Week ${number(selectedWeek)} report`,
                )}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {text(
                  "طلبات المجموعة حسب أسبوع تسجيلها؛ النتائج هي حالتها الحالية وقت اللقطة، حتى لو الرد وصل لاحقًا.",
                  "Applications are grouped by their recorded journey week; outcomes are current as of this snapshot, including late responses.",
                )}
              </p>
            </div>
          </header>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {labels.map(([name, value]) => (
              <div key={name} className="rounded-xl border border-border p-3">
                <p className="text-xs text-text-secondary">{name}</p>
                <strong className="text-xl tabular-nums">
                  {number(value)}
                </strong>
              </div>
            ))}
          </div>
          <p className="text-sm">
            {text(
              "نسبة التقدم الإيجابي الموثق",
              "Recorded positive progression rate",
            )}
            : {m.positiveRate === null ? "—" : `${number(m.positiveRate)}%`}
          </p>
          <p className="text-xs text-text-secondary">
            {text(
              "التقدم الإيجابي يحتاج دليلًا على تكليف أو مقابلة أو قرار أو قبول. الرفض وحده لا يُحسب إيجابيًا، والإغلاق بلا رد والانسحاب مستبعدان. الفئات التاريخية قد تتداخل ولا تجمع لإجمالي الطلبات.",
              "Positive progression requires assignment, interview, decision or acceptance evidence. Rejection alone is not positive; no-response and withdrawal are excluded. Historical categories can overlap and do not sum to total applications.",
            )}
          </p>
          {m.unknownInterviews > 0 && (
            <p
              role="note"
              className="text-sm text-amber-800 dark:text-amber-200"
            >
              {text(
                "سجلات لا تكفي لتحديد مقابلات سابقة",
                "Insufficient history to determine prior interviews",
              )}
              : {number(m.unknownInterviews)}
            </p>
          )}
          {previous && (
            <p className="text-sm">
              {text(
                "مقارنة بالأسبوع السابق",
                "Compared with the previous cohort",
              )}
              : {number(m.logged - previous.logged)}{" "}
              {text("فرق طلبات،", "application difference,")}{" "}
              {number(m.positive - previous.positive)}{" "}
              {text(
                "فرق تقدم إيجابي. مدة انتظار الرد ليست متساوية بين المجموعتين.",
                "positive progression difference. Response waiting time is not equal across cohorts.",
              )}
            </p>
          )}
          {readOnly && (
            <p role="status" className="text-xs text-text-secondary">
              {text(
                "معاينة إدارية للقراءة فقط.",
                "Admin preview is read-only.",
              )}
            </p>
          )}
        </section>
      )}

      {finalReportSelected && (
        <section className="rounded-2xl border border-emerald-500 bg-surface p-5 space-y-4">
          <header>
            <h2 className="text-lg font-bold">
              {text(
                "التقرير النهائي — الرحلة بالكامل",
                "Final report — whole journey",
              )}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {text(
                "التقرير النهائي يلخص التفعيل والأسابيع الأربعة كلها؛ هو تقرير مستقل عن الأسبوع الرابع.",
                "The final report summarizes activation and all four weeks; it is distinct from Week 4.",
              )}
            </p>
          </header>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [
                text("إجمالي الطلبات", "Total applications"),
                reportData.overall.logged,
              ],
              [
                text("تقدم إيجابي موثق", "Recorded positive progression"),
                reportData.overall.positive,
              ],
              [text("قبول", "Accepted"), reportData.overall.accepted],
              [
                text("مراجعات أسبوعية", "Weekly reflections"),
                reportData.overall.reviews,
              ],
            ].map(([name, value]) => (
              <div
                key={String(name)}
                className="rounded-xl border border-border p-3"
              >
                <p className="text-xs text-text-secondary">{name}</p>
                <strong className="text-xl tabular-nums">
                  {number(Number(value))}
                </strong>
              </div>
            ))}
          </div>
          <p className="text-sm text-text-secondary">
            {text(
              "الملخص وصفي للبيانات المتاحة؛ لا يحدد سبب النتيجة. انتقالات المراحل وتواريخ الطلبات محفوظة كلٌ على حدة.",
              "This is a descriptive summary of available records; it does not establish why an outcome occurred. Application and transition dates remain distinct.",
            )}
          </p>
          {readOnly ? (
            <p role="status">
              {text(
                "معاينة إدارية للقراءة فقط؛ لن تغيّر إكمال الرحلة أو تقدمها.",
                "Admin read-only preview; journey completion and progress will not change.",
              )}
            </p>
          ) : reportData.completed ? (
            <p role="status">
              {text(
                "إكمال الرحلة محفوظ. تقدر تواصل متابعة طلباتك.",
                "Journey completion is saved. You can continue tracking applications.",
              )}
            </p>
          ) : reportData.finalAvailable ? (
            <button
              disabled={pending}
              className="button-primary"
              onClick={() => void complete()}
            >
              {pending
                ? text("بنحفظ…", "Saving…")
                : text(
                    "قرأت التقرير الكامل — أكمل الرحلة",
                    "I have read the complete report — finish journey",
                  )}
            </button>
          ) : null}
          {saveError && <p role="alert">{saveError}</p>}
        </section>
      )}

      <PerformanceAnalytics
        report={reportData}
        metrics={m}
        scopeLabel={label}
        canNavigate={!readOnly}
      />

      <details className="rounded-2xl border border-border bg-surface p-4">
        <summary className="cursor-pointer font-semibold">
          {text("تفاصيل السجلات المحفوظة", "Persisted record details")}
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-sm text-text-secondary">
            {text("نسخ CV فعلية", "Persisted CV versions")}:{" "}
            {number(reportData.cvs.length)} ·{" "}
            {text("إرشادات مقروءة", "Guidance read")}:{" "}
            {number(reportData.readInsightCodes.length)} ·{" "}
            {text("مهام مهنية مكتملة", "Professional tasks completed")}:{" "}
            {number(reportData.tasks.length)}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="button-secondary"
              onClick={() => setDetail("cvs")}
            >
              {text("سجل CV", "CV history")}
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => setDetail("activities")}
            >
              {text(
                "تفاصيل النشاط والمراجعات",
                "Activity and reflection details",
              )}
            </button>
          </div>
        </div>
      </details>

      <Modal
        isOpen={changeOpen}
        onClose={() => {
          if (!pending) setChangeOpen(false);
        }}
        disableClose={pending}
        title={text("تسجيل تغيير مهني", "Record a professional change")}
      >
        <form className="space-y-3 p-5" onSubmit={saveChange}>
          <label className="block">
            {text(
              "إيه اللي غيرته؟ ده سجل يدوي ومش نسخة CV جديدة.",
              "What changed? This is a manual log, not a new CV version.",
            )}
            <textarea
              className="field-control"
              required
              maxLength={5000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          {saveError && <p role="alert">{saveError}</p>}
          <button className="button-primary" disabled={pending}>
            {pending ? text("بنحفظ…", "Saving…") : text("احفظ", "Save")}
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={
          detail === "cvs"
            ? text("نسخ CV المحفوظة", "Persisted CV versions")
            : text(
                "النشاط المحفوظ — النطاق المختار",
                "Persisted activity — selected scope",
              )
        }
      >
        <div className="space-y-4 p-5">
          {detail === "cvs" ? (
            reportData.cvs.length ? (
              reportData.cvs.map((cv) => (
                <article key={cv.id}>
                  <strong>CV v{number(cv.versionNumber)}</strong>
                  <p>
                    {cv.originalName} —{" "}
                    {new Date(cv.uploadedAt).toLocaleString(locale)}
                  </p>
                </article>
              ))
            ) : (
              <p>{text("مفيش نسخ محفوظة.", "No persisted versions.")}</p>
            )
          ) : activities.length ? (
            activities.map((activity) => (
              <article
                key={activity.id}
                className="border-b border-border pb-3"
              >
                <strong>
                  {activity.legacyChange
                    ? text(
                        "سجل قديم — مش مراجعة ولا دليل CV",
                        "Legacy record — not a reflection or CV evidence",
                      )
                    : activity.type === "WEEKLY_REVIEW"
                      ? text("مراجعة أسبوعية", "Weekly reflection")
                      : activity.type === "USER_CHANGE"
                        ? text("تغيير مهني", "Professional change")
                        : activity.type}
                </strong>
                <p className="whitespace-pre-wrap break-words">
                  {activity.summary ||
                    activity.postTopic ||
                    [activity.contactName, activity.companyName]
                      .filter(Boolean)
                      .join(" — ")}
                </p>
                {activity.postUrl && (
                  <a
                    className="break-all underline"
                    href={activity.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {activity.postUrl}
                  </a>
                )}
                <p className="text-xs">
                  {text("الأسبوع", "Week")} {number(activity.week)} —{" "}
                  {new Date(activity.createdAt).toLocaleString(locale)}
                </p>
              </article>
            ))
          ) : (
            <p>
              {text(
                "مفيش نشاط محفوظ في النطاق ده.",
                "No persisted activity in this scope.",
              )}
            </p>
          )}
        </div>
      </Modal>
    </main>
  );
}
