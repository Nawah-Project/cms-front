import { FeatureTourPending } from "../../../components/FeatureTour";
import { createContext, useContext, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, CircleCheck, FileText, Lock, Plus } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { useI18n } from "../../../i18n";
import { ApiError, apiClient } from "../../../lib/api-client";
import { journeyApi } from "../../journey/api/journeyApi";
import ActivityResponseChart from "./ActivityResponseChart";
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
  stages: Record<"APPLIED" | "ASSIGNMENT" | "INTERVIEW" | "DECISION" | "CLOSED", number>;
  outcomes: Record<"NONE" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "NO_RESPONSE", number>;
  milestones: { assignments: number; interviews: number; decisions: number };
}

export interface Report {
  manualUpdate?: { eligible: boolean; canSubmit: boolean; nextAvailableAt: string | null };
  dailyCohorts?: { date: string; logged: number; positive: number }[];
  analyticsAccess?: { cv: boolean; pipeline: boolean; tailoring: boolean; publishing: boolean; networking: boolean; freeChanges: boolean };
  cvFoundation?: { completed: boolean };
  asOf: string;
  overall: Metrics;
  weeks: (Metrics & { week: number })[];
  daily: { date: string; logged: number; positiveEvents: number }[];
  weeklyDaily?: { week: number; date: string; logged: number; positiveEvents: number }[];
  periodComparisons: {
    id: string;
    kind: "BEFORE_FIRST_CHECKPOINT" | "CV" | "USER_CHANGE";
    title: string;
    startAt: string;
    endAt: string | null;
    metrics: Omit<Metrics, "posts" | "outreach" | "reviews">;
    applications?: { id: string; companyName: string; jobTitle: string; createdAt: string; stage: string; outcome: string; isTailored: boolean; positive?: boolean }[];
  }[];
  cvs: { id: string; versionNumber: number; originalName: string; uploadedAt: string }[];
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
  weeklyStages?: Array<{
    week: number;
    available: boolean;
    focus?: { titleAr: string; titleEn: string; descriptionAr: string | null; descriptionEn: string | null } | null;
    milestones?: { titleAr: string; titleEn: string; completed: boolean; review: boolean }[];
    complete?: boolean;
    reflectionRecorded?: boolean;
    observedFrom?: string | null;
    observedThrough?: string | null;
    currentWeekStartedAt?: string | null;
    nextStage?: { titleAr: string; titleEn: string } | null;
  }>;
  readGuidance?: { titleAr: string; titleEn: string; weekNumber: number }[];
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
const ReportPreviewContext = createContext<ReportPreviewContextValue | null>(null);

export function ReportPreviewProvider({ value, children }: { value: ReportPreviewContextValue; children: ReactNode }) {
  return <ReportPreviewContext.Provider value={value}>{children}</ReportPreviewContext.Provider>;
}

function weekReportUnlocked(week: number, report: Report) {
  const completed = new Set(report.completedNodeCodes);
  if (week === 1) return completed.has("W1_REVIEW") || report.currentNodeCode === "W1_REVIEW" || report.currentWeek > 1;
  if (week === 2) return completed.has("W2_REVIEW") || report.currentNodeCode === "W2_REVIEW" || report.currentWeek > 2;
  if (week === 3) return completed.has("W3_REVIEW") || report.currentNodeCode === "W3_REVIEW" || report.currentWeek > 3;
  return report.currentNodeCode === "FINAL_REPORT" || report.finalAvailable || report.completed;
}

function formatDate(value: string | null | undefined, locale: string, year = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}), timeZone: "UTC",
  }).format(date);
}

function SectionTitle({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) {
  return <div>{eyebrow && <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">{eyebrow}</p>}<h2 className="mt-0.5 text-lg font-semibold">{title}</h2>{detail && <p className="mt-1 text-sm leading-5 text-text-secondary">{detail}</p>}</div>;
}

function WeekMetrics({ metrics, week }: { metrics: Metrics; week: number }) {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => ar ? a : e;
  const values = [
    { label: text("طلبات مسجلة", "Applications"), value: metrics.logged, always: true },
    { label: text("طلبات مخصصة", "Tailored"), value: metrics.tailored, always: week >= 2 },
    { label: text("مقابلات موثقة", "Interviews evidenced"), value: metrics.interviews, always: metrics.interviews > 0 },
    { label: text("تكليفات", "Assignments"), value: metrics.assignments, always: metrics.assignments > 0 },
    { label: text("منشورات LinkedIn", "LinkedIn posts"), value: metrics.posts, always: metrics.posts > 0 },
    { label: text("تواصل مهني", "Outreach"), value: metrics.outreach, always: metrics.outreach > 0 },
  ].filter((item) => item.always);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {values.map((item) => <div key={item.label} className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900/60"><p className="text-xs leading-4 text-text-secondary">{item.label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{number(item.value)}</p></div>)}
      <div className="rounded-lg bg-sky-50 p-3 dark:bg-sky-950/40"><p className="text-xs leading-4 text-sky-900 dark:text-sky-200">{text("تقدم إيجابي موثق", "Positive progression")}</p><p className="mt-1 text-2xl font-bold tabular-nums text-sky-900 dark:text-sky-100">{number(metrics.positive)}</p><p className="text-xs text-sky-800 dark:text-sky-200">{metrics.positiveRate === null ? "—" : `${number(metrics.positiveRate)}%`}</p></div>
    </div>
  );
}

function WeekComparison({ current, previous }: { current: Metrics; previous?: Metrics }) {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => ar ? a : e;
  if (!previous) return null;
  const delta = current.logged - previous.logged;
  return (
    <section className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900/60">
      <h3 className="font-semibold">{text("مقارنة بالأسبوع السابق", "Compared with the previous week")}</h3>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <p className="rounded-md bg-surface px-3 py-2 text-sm">{text("الطلبات", "Applications")}: <strong className="tabular-nums">{delta > 0 ? "+" : ""}{number(delta)}</strong></p>
        {previous.positiveRate !== null && current.positiveRate !== null ? <p className="rounded-md bg-surface px-3 py-2 text-sm">{text("معدل التقدم الموثق", "Evidence rate")}: <strong className="tabular-nums">{number(previous.positiveRate)}% → {number(current.positiveRate)}%</strong></p> : <p className="rounded-md bg-surface px-3 py-2 text-sm text-text-secondary">{text("مقارنة المعدل مش متاحة لأن مقام إحدى الفترتين صفر.", "Rate comparison is unavailable because one period has no applications.")}</p>}
        <p className="rounded-md bg-surface px-3 py-2 text-sm">{text("الطلبات المخصصة", "Tailored applications")}: <strong className="tabular-nums">{number(previous.tailored)} → {number(current.tailored)}</strong></p>
      </div>
      <p className="mt-2 text-xs text-text-secondary">{text("التجميع حسب أسبوع الرحلة المسجل. النتائج الحالية تُعرض وقت اللقطة ومدة انتظار الرد قد تختلف.", "Cohorts use the stored journey week. Outcomes reflect the current snapshot; response waiting time can differ.")}</p>
    </section>
  );
}

function WeeklyReportView({ report, week, metrics, readOnly }: { report: Report; week: number; metrics: Metrics; readOnly: boolean }) {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => ar ? a : e;
  const stage = report.weeklyStages?.find((item) => item.week === week && item.available);
  const weekActivities = report.activities.filter((item) => item.week === week);
  const reflections = weekActivities.filter((item) => item.type === "WEEKLY_REVIEW" && !item.legacyChange);
  const summaries = reflections.map((item) => item.summary?.trim()).filter((item): item is string => Boolean(item));
  const insights = (report.readGuidance ?? []).filter((item) => item.weekNumber === week);
  const completedMilestones = stage?.milestones?.filter((item) => item.completed) ?? [];
  const milestones = stage?.milestones ?? [];
  const previous = report.weeks.find((item) => item.week === week - 1);
  const timeSeries = report.weeklyDaily?.filter((item) => item.week === week) ?? [];
  const observedFrom = formatDate(stage?.observedFrom, locale, true);
  const observedThrough = formatDate(stage?.observedThrough, locale, true);
  const activityWindow = observedFrom && observedThrough
    ? `${observedFrom} — ${observedThrough}`
    : observedFrom ?? text("مفيش تاريخ نشاط مسجل", "No activity date recorded");

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="border-b border-border bg-gradient-to-r from-emerald-50 to-transparent p-5 dark:from-emerald-950/30 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">{text(`الأسبوع ${number(week)} · تقرير المرحلة`, `WEEK ${number(week)} · STAGE REPORT`)}</p>
              <h2 className="mt-2 text-xl font-bold sm:text-2xl">{stage?.focus ? (ar ? stage.focus.titleAr : stage.focus.titleEn) : text(`تقرير الأسبوع ${number(week)}`, `Week ${number(week)} report`)}</h2>
              {stage?.focus && (ar ? stage.focus.descriptionAr : stage.focus.descriptionEn) && <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{ar ? stage.focus.descriptionAr : stage.focus.descriptionEn}</p>}
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${stage?.complete ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100" : "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"}`}>
              {stage?.complete ? <CircleCheck className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
              {stage?.complete ? text("المرحلة مكتملة", "Stage complete") : text("قيد التنفيذ", "In progress")}
            </span>
          </div>
          <p className="mt-4 text-xs text-text-secondary">{text("نطاق النشاط المسجل (UTC)", "Observed activity dates (UTC)")}: <span dir="ltr" className="font-medium">{activityWindow}</span></p>
          {stage?.currentWeekStartedAt && <p className="mt-1 text-xs text-text-secondary">{text("بداية المرحلة المحفوظة", "Stored stage start")}: {formatDate(stage.currentWeekStartedAt, locale, true)}</p>}
        </div>

        {milestones.length > 0 && <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{text("خطوات المرحلة", "Stage milestones")}</h3><span className="text-xs text-text-secondary">{number(completedMilestones.length)} / {number(milestones.length)} {text("مكتملة", "completed")}</span></div>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {milestones.map((milestone, index) => <li key={`${week}-${index}`} className="flex min-h-11 items-start gap-2 rounded-lg bg-neutral-50 px-3 py-2.5 text-sm dark:bg-neutral-900/60"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${milestone.completed ? "bg-emerald-700 text-white" : "border border-border text-text-secondary"}`}>{milestone.completed ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="text-[10px] tabular-nums">{number(index + 1)}</span>}</span><span>{ar ? milestone.titleAr : milestone.titleEn}</span></li>)}
          </ol>
        </div>}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <SectionTitle title={text("النشاط والنتائج المسجلة", "Recorded activity and outcomes")} detail={text("طلبات المجموعة حسب أسبوع الرحلة، والنتائج الحالية وقت عرض التقرير.", "Applications are grouped by journey week; current outcomes are shown as of this report snapshot.")} />
        <div className="mt-4"><WeekMetrics metrics={metrics} week={week} /></div>
        {metrics.logged > 0 && <div className="mt-4 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-900/60"><p className="mb-2 text-sm font-medium">{text("حركة الطلبات والانتقالات", "Application activity and transition events")}</p><ActivityResponseChart points={timeSeries} compact /></div>}
        {metrics.logged === 0 && <p className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm text-text-secondary dark:bg-neutral-900/60">{text("مفيش طلبات مرتبطة بأسبوع الرحلة ده. ده ملخص فارغ حقيقي، من غير نشاط تجريبي.", "No applications are assigned to this journey week. This is a genuine empty summary, without sample activity.")}</p>}
        <p className="mt-3 text-xs leading-5 text-text-secondary">{text("انتقالات المراحل بتاريخ حدوثها الفعلي، حتى لو الرد وصل بعد أسبوع التقديم؛ الحدث لا يمثل نتيجة نهائية منفردة.", "Stage transitions use their actual dates, even when replies arrive after the application week; an event alone is not a final outcome.")}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <SectionTitle title={text("التعلّم والإنجاز", "Learning and completion")} detail={text("قراءة الدليل أو إكمال المهمة لا يعني وحده إتقانها.", "Reading guidance or completing a task does not by itself prove mastery.")} />
          {insights.length > 0 ? <ul className="mt-3 space-y-2">{insights.map((insight) => <li key={`${insight.weekNumber}-${insight.titleEn}`} className="flex items-start gap-2 rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-900/60"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" /><span>{ar ? insight.titleAr : insight.titleEn}</span></li>)}</ul> : <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-text-secondary dark:bg-neutral-900/60">{text("مفيش إرشاد مقروء مسجل للمرحلة دي.", "No guidance reading is recorded for this stage.")}</p>}
          {completedMilestones.length > 0 && <p className="mt-3 text-xs text-text-secondary">{text(`اكتملت ${number(completedMilestones.length)} خطوات محفوظة في مسار المرحلة.`, `${number(completedMilestones.length)} saved journey milestones are complete.`)}</p>}
          {(metrics.posts > 0 || metrics.outreach > 0) && <p className="mt-3 text-sm">{metrics.posts > 0 && <span>{text("منشورات مهنية", "Professional posts")}: <strong>{number(metrics.posts)}</strong></span>}{metrics.posts > 0 && metrics.outreach > 0 && " · "}{metrics.outreach > 0 && <span>{text("محاولات تواصل", "Outreach records")}: <strong>{number(metrics.outreach)}</strong></span>}</p>}
          {report.tasks.length > 0 && <p className="mt-3 text-xs text-text-secondary">{text("المهام المهنية ليست مرتبطة بأسبوع في البيانات الحالية؛ بنعرضها في التقرير النهائي دون نسبها لمرحلة بالتخمين.", "Professional tasks are not assigned to a journey week in the current data model; they are included in the final summary without guessed attribution.")}</p>}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <SectionTitle title={text("انعكاسك على الأسبوع", "Your weekly reflection")} detail={text("النص هنا هو ردّك المحفوظ كما كتبته.", "This is your saved reflection, shown as recorded.")} />
          {summaries.length > 0 ? <ul className="mt-3 space-y-3">{summaries.map((summary, index) => <li key={`${week}-reflection-${index}`} className="whitespace-pre-wrap rounded-lg border-s-2 border-violet-500 bg-violet-50/60 p-3 text-sm leading-6 dark:bg-violet-950/20">{summary}</li>)}</ul> : readOnly && stage?.reflectionRecorded ? <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-text-secondary dark:bg-neutral-900/60">{text("فيه انعكاس محفوظ، لكن نصه مخفي في معاينة Admin احترامًا لخصوصية العضو.", "A reflection is saved, but its text is hidden in Admin Preview to preserve member privacy.")}</p> : <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-text-secondary dark:bg-neutral-900/60">{stage?.reflectionRecorded ? text("حالة الانعكاس محفوظة لكن نص الرد غير متاح.", "The reflection state is recorded, but its text is unavailable.") : text("مفيش انعكاس أسبوعي محفوظ حتى الآن.", "No weekly reflection has been recorded yet.")}</p>}
        </div>
      </section>

      {week > 1 && <WeekComparison current={metrics} previous={previous} />}
      <section className="flex flex-col gap-3 rounded-2xl border border-emerald-800/15 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:bg-emerald-950/20">
        <div><h3 className="font-semibold">{text("الخطوة اللي بعدها", "Next stage")}</h3>{stage?.nextStage ? <p className="mt-1 text-sm text-text-secondary">{ar ? stage.nextStage.titleAr : stage.nextStage.titleEn}</p> : week < 4 ? <p className="mt-1 text-sm text-text-secondary">{stage?.complete ? text("تفاصيل المرحلة التالية هتظهر عند فتحها في مسار الرحلة.", "The next stage details appear when it is unlocked in the journey.") : text("إكمال مراجعة الأسبوع يفتح المرحلة التالية.", "Complete the weekly review to unlock the next stage.")}</p> : <p className="mt-1 text-sm text-text-secondary">{text("الأسبوع الرابع يمهّد للمراجعة النهائية للرحلة.", "Week 4 leads into the final journey review.")}</p>}</div>
        {!readOnly && <Link to="/journey" className="inline-flex min-h-10 shrink-0 items-center gap-2 font-semibold text-emerald-800 underline dark:text-emerald-300">{text("ارجع لمسار الرحلة", "Return to journey")} {ar ? <ArrowLeft className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}</Link>}
      </section>
    </div>
  );
}

function FinalJourneyReport({ report, readOnly, onComplete, pending, saveError }: { report: Report; readOnly: boolean; onComplete: () => void; pending: boolean; saveError: string }) {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => ar ? a : e;
  const weeklyStages = report.weeklyStages ?? [];
  const allReflections = report.activities.filter((item) => item.type === "WEEKLY_REVIEW" && !item.legacyChange);
  const reflectionTexts = allReflections.map((item) => item.summary?.trim()).filter((item): item is string => Boolean(item));
  const checkpoints = [
    ...report.cvs.map((cv) => ({ date: cv.uploadedAt, title: `${text("رفع نسخة CV", "CV version uploaded")} ${number(Math.max(0, cv.versionNumber - 1))}` })),
    ...report.activities.filter((item) => item.type === "USER_CHANGE" && !item.legacyChange).map((item) => ({ date: item.createdAt, title: text("تغيير مهني مسجل", "Professional change recorded") })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const weekRows = report.weeks.filter((item) => item.week >= 1 && item.week <= 4);
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-emerald-800/20 bg-surface">
        <div className="bg-gradient-to-r from-emerald-50 via-surface to-sky-50/40 p-5 dark:from-emerald-950/35 dark:via-surface dark:to-sky-950/20 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">{text("خلاصة رحلة البحث · ٤ أسابيع", "FOUR-WEEK JOB SEARCH RETROSPECTIVE")}</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{text("رحلتك من أول خطوة لحد النهارده", "Your journey, from the first step to now")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{text("ملخص متكامل للأسابيع الأربعة، مستقل عن تقرير الأسبوع الرابع، وبيعرض النشاط المسجل والنتائج كما هي.", "A complete summary of all four weeks, separate from the Week 4 report, using the activity and outcomes actually recorded.")}</p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              [text("طلبات", "Applications"), report.overall.logged],
              [text("تقدم إيجابي موثق", "Positive progression"), report.overall.positive],
              [text("مقابلات", "Interviews"), report.overall.interviews],
              [text("مراجعات محفوظة", "Reflections recorded"), report.overall.reviews],
            ].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-border/70 bg-surface/80 p-3"><p className="text-xs text-text-secondary">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{number(Number(value))}</p></div>)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <SectionTitle title={text("محطات الأسابيع الأربعة", "Four-week journey timeline")} detail={text("الحالة مأخوذة من نقاط الرحلة المكتملة فعلًا.", "Status comes from persisted journey milestones.")} />
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((week) => {
            const stage = weeklyStages.find((item) => item.week === week && item.available);
            const metric = weekRows.find((item) => item.week === week);
            return <li key={week} className="rounded-xl border border-border p-3.5">
              <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold dark:bg-neutral-800">{text(`الأسبوع ${number(week)}`, `Week ${number(week)}`)}</span>{stage?.complete ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300"><CircleCheck className="h-4 w-4" aria-hidden="true" />{text("مكتمل", "Complete")}</span> : <span className="text-xs text-text-secondary">{text("غير مكتمل", "In progress")}</span>}</div>
              <h3 className="mt-3 line-clamp-2 min-h-10 font-semibold">{stage?.focus ? (ar ? stage.focus.titleAr : stage.focus.titleEn) : text("مرحلة غير متاحة", "Stage details unavailable")}</h3>
              <p className="mt-2 text-sm text-text-secondary">{text("طلبات مسجلة", "Applications")}: <strong className="tabular-nums text-text-primary">{number(metric?.logged ?? 0)}</strong></p>
              {stage?.milestones && <p className="mt-1 text-xs text-text-secondary">{number(stage.milestones.filter((item) => item.completed).length)} / {number(stage.milestones.length)} {text("محطات مكتملة", "milestones complete")}</p>}
            </li>;
          })}
        </ol>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <SectionTitle title={text("التطور من أسبوع للتاني", "Week-over-week activity")} detail={text("الطلبات حسب أسبوع الرحلة؛ مؤشرات التقدم تخص النتائج الحالية لنفس المجموعة.", "Applications are grouped by journey week; progression reflects current outcomes for each cohort.")} />
          <div className="mt-4 overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[32rem] text-start text-sm"><caption className="sr-only">{text("ملخص الطلبات والتقدم حسب الأسبوع", "Application and progression summary by week")}</caption><thead className="bg-neutral-100 dark:bg-neutral-800"><tr><th className="p-2.5 text-start">{text("الأسبوع", "Week")}</th><th className="p-2.5 text-start">{text("طلبات", "Applications")}</th><th className="p-2.5 text-start">{text("مخصصة", "Tailored")}</th><th className="p-2.5 text-start">{text("تقدم إيجابي", "Positive")}</th><th className="p-2.5 text-start">{text("معدل موثق", "Evidence rate")}</th></tr></thead><tbody>{weekRows.map((item) => <tr key={item.week} className="border-t border-border"><th scope="row" className="p-2.5 text-start font-medium">{number(item.week)}</th><td className="p-2.5 tabular-nums">{number(item.logged)}</td><td className="p-2.5 tabular-nums">{number(item.tailored)}</td><td className="p-2.5 tabular-nums">{number(item.positive)}</td><td className="p-2.5 tabular-nums">{item.positiveRate === null ? "—" : `${number(item.positiveRate)}%`}</td></tr>)}</tbody></table></div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <SectionTitle title={text("الصورة النهائية للنتائج", "Outcome snapshot")} detail={text("النتائج الحالية لكل الطلبات، وقد تتغير عند وصول ردود جديدة.", "Current outcomes across all applications; these may change as replies arrive.")} />
          <ul className="mt-3 divide-y divide-border">{([["ACCEPTED", text("قبول", "Accepted")], ["REJECTED", text("رفض", "Rejected")], ["WITHDRAWN", text("انسحاب", "Withdrawn")], ["NO_RESPONSE", text("بلا رد", "No response")], ["NONE", text("مستمرة / بلا نتيجة", "Pending / no final outcome")]] as const).filter(([key]) => report.overall.outcomes[key] > 0).map(([key, label]) => <li key={key} className="flex justify-between gap-3 py-2.5 text-sm"><span>{label}</span><strong className="tabular-nums">{number(report.overall.outcomes[key])}</strong></li>)}</ul>
          {report.overall.logged === 0 && <p className="mt-3 text-sm text-text-secondary">{text("لا توجد طلبات مسجلة في ملخص الرحلة.", "No applications are recorded in this journey summary.")}</p>}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <SectionTitle title={text("تغييرات محفوظة خلال الرحلة", "Persisted checkpoints during the journey")} />
          {checkpoints.length ? <ol className="mt-3 space-y-2">{checkpoints.map((item, index) => <li key={`${item.date}-${item.title}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-neutral-50 px-3 py-2.5 text-sm dark:bg-neutral-900/60"><span>{item.title}</span><time dir="ltr" className="shrink-0 text-xs text-text-secondary" dateTime={item.date}>{formatDate(item.date, locale, true)}</time></li>)}</ol> : <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-text-secondary dark:bg-neutral-900/60">{text("لا توجد تغييرات أو نسخ CV مسجلة خلال الرحلة.", "No CV versions or manual changes were recorded during the journey.")}</p>}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <SectionTitle title={text("ملاحظاتك الأسبوعية", "Recorded reflections")} detail={text("دي إجابات محفوظة، مش استنتاجات عن التعلم أو الإتقان.", "These are saved responses, not conclusions about learning or mastery.")} />
          {reflectionTexts.length ? <ol className="mt-3 space-y-2">{reflectionTexts.slice(0, 4).map((summary, index) => <li key={`final-reflection-${index}`} className="rounded-lg border-s-2 border-violet-500 bg-violet-50/50 p-3 text-sm leading-5 dark:bg-violet-950/20">{summary}</li>)}</ol> : allReflections.length && readOnly ? <p className="mt-3 text-sm text-text-secondary">{text("نصوص الانعكاس مخفية في معاينة Admin؛ الحالات والأعداد فقط ظاهرة.", "Reflection text is hidden in Admin Preview; only completion state and counts are shown.")}</p> : <p className="mt-3 text-sm text-text-secondary">{text("لا توجد إجابات انعكاس نصية متاحة.", "No reflection text is available.")}</p>}
          {report.tasks.length > 0 && <div className="mt-4 border-t border-border pt-3"><p className="text-sm font-semibold">{text("مهام مهنية مكتملة", "Completed professional tasks")}</p><ul className="mt-2 space-y-1 text-sm text-text-secondary">{report.tasks.slice(0, 5).map((task) => <li key={task.id} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" /><span>{task.title}</span></li>)}</ul></div>}
        </div>
      </section>
      <details className="rounded-2xl border border-border bg-surface px-4 sm:px-5"><summary className="min-h-12 cursor-pointer py-3 font-semibold">{text("منهجية الملخص", "How this summary is calculated")}</summary><p className="pb-4 text-sm leading-6 text-text-secondary">{text("الطلبات تُجمع حسب journeyWeek المحفوظ. النتائج الحالية لا تعني إن الرد وصل في نفس الأسبوع، وتواريخ الانتقالات منفصلة. سجلات المراحل التاريخية غير المكتملة تفضل unknown. التقرير وصفي ولا يثبت إن تغييرًا بعينه أدى لنتيجة.", "Applications are grouped by stored journeyWeek. Current outcomes do not imply a reply arrived in the same week; transition timestamps remain separate. Incomplete history stays unknown. This report is descriptive and does not claim that any change caused an outcome.")}</p></details>
      {readOnly ? <p role="status" className="rounded-lg bg-neutral-50 p-3 text-sm text-text-secondary dark:bg-neutral-900/60">{text("معاينة Admin للقراءة فقط؛ لن تغيّر إكمال الرحلة أو تقدمها.", "Admin preview is read-only; it will not change journey completion or progress.")}</p> : report.completed ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">{text("إكمال الرحلة محفوظ. تقدر تواصل متابعة طلباتك.", "Journey completion is saved. You can continue tracking applications.")}</p> : report.finalAvailable ? <div><button type="button" disabled={pending} className="button-primary min-h-11" onClick={onComplete}>{pending ? text("بنحفظ…", "Saving…") : text("قرأت التقرير الكامل — أكمل الرحلة", "I have read the complete report — finish journey")}</button>{saveError && <p role="alert" className="mt-2 text-sm text-rose-700">{saveError}</p>}</div> : null}
    </div>
  );
}

export default function ReportsPage() {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => ar ? a : e;
  const queryClient = useQueryClient();
  const preview = useContext(ReportPreviewContext);
  const query = useQuery({ queryKey: ["journey", "reports"], queryFn: () => apiClient.get<Report>("/journey/reports"), retry: (count,error) => !(error instanceof ApiError && error.status === 403) && count < 2, enabled: !preview });
  const [memberScope, setMemberScope] = useState<number | null | "final">(null);
  const scope = preview ? preview.forceFinalPreview && preview.scope === null ? "final" : preview.scope : memberScope;
  const setScope = (next: number | null | "final") => preview ? preview.onScopeChange(next === "final" ? null : next) : setMemberScope(next);
  const readOnly = Boolean(preview);
  const report = preview?.data ?? query.data;
  const [changeOpen, setChangeOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [lockedWeek, setLockedWeek] = useState<number | "final" | null>(null);

  async function refresh() { await queryClient.invalidateQueries({ queryKey: ["journey"] }); }
  async function saveChange(event: FormEvent) {
    event.preventDefault();
    if (readOnly || !report || !note.trim()) return;
    setPending(true); setSaveError("");
    try {
      await journeyApi.submitSideTask({ nodeCode: report.currentNodeCode, type: "USER_CHANGE", reviewSummary: note.trim(), sharedInGroup: false });
      await refresh(); setNote(""); setChangeOpen(false);
    } catch { await refresh(); setSaveError(text("الحفظ فشل. الكلام لسه موجود؛ حاول تاني.", "Saving failed. Your text is preserved; please retry.")); }
    finally { setPending(false); }
  }
  async function completeFinal() {
    if (readOnly || !report?.finalAvailable) return;
    setPending(true); setSaveError("");
    try { await apiClient.post("/journey/final-report/complete"); await refresh(); }
    catch { setSaveError(text("تعذر حفظ الإكمال؛ حاول تاني.", "Completion could not be saved; please retry.")); }
    finally { setPending(false); }
  }

  const reportErrorDetails = query.error && typeof query.error === "object" && "details" in query.error ? query.error.details as {code?:string;guidanceUnlocked?:boolean} : undefined;
  if (!preview && reportErrorDetails?.code === "CV_FOUNDATION_REQUIRED") return <section className="rounded-2xl border border-border bg-surface p-6"><h1 className="text-xl font-bold">{text("تحليل الأداء لسه مقفول", "Performance analytics is locked")}</h1><p className="mt-3 text-sm leading-6 text-text-secondary">{reportErrorDetails.guidanceUnlocked ? text("طبّق إرشاد تحسين السيرة وارفع نسخة محدّثة من داخله؛ الإكمال وفتح التحليل بيحصلوا تلقائيًا بعد الحفظ.", "Apply the CV guidance, upload a revised file inside it. Completion and analytics access follow automatically once saved.") : text("أكمل أول 5 طلبات في المهمة صفر. بعدها هتظهر لك الخطوة اللي تفتح التحليل.", "Complete the first five applications in Task 0 to reveal the next analytics prerequisite.")}</p><Link className="button-primary mt-4 inline-flex min-h-11 items-center" to={reportErrorDetails.guidanceUnlocked?"/professional-development?guidance=INSIGHT_TASK_0_CV_BASE":"/applications"}>{reportErrorDetails.guidanceUnlocked?text("افتح إرشاد السيرة", "Open CV guidance"):text("كمّل مهمتك الحالية", "Continue your current quest")}</Link></section>;
  if (!preview && query.isPending) return <div role="status" className="rounded-xl bg-surface p-6"><FeatureTourPending feature="analytics-week1-v1" />{text("بنحمّل تقاريرك…", "Loading your reports…")}</div>;
  if (!preview && (query.isError || !report)) return <div role="alert" className="rounded-2xl border border-border bg-surface p-6"><p>{text("تعذر تحميل التقارير.", "Could not load your reports.")}</p><button className="button-primary mt-3 min-h-10" onClick={() => void query.refetch()}>{text("حاول تاني", "Retry")}</button></div>;
  if (!report) return null;
  const selectedWeek = typeof scope === "number" ? scope : null;
  const finalSelected = scope === "final";
  const metrics = selectedWeek === null ? report.overall : report.weeks.find((item) => item.week === selectedWeek) ?? report.overall;
  const pageTitle = finalSelected ? text("التقرير النهائي", "Final report") : selectedWeek ? text(`تقرير الأسبوع ${number(selectedWeek)}`, `Week ${number(selectedWeek)} report`) : text("تحليلات الأداء", "Performance analytics");

  return (
    <main dir={ar ? "rtl" : "ltr"} className="mx-auto w-full max-w-[1440px] space-y-5 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">{text("نواة · رحلة البحث عن وظيفة", "NAWAH · JOB SEARCH JOURNEY")}</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-[28px]">{pageTitle}</h1><p className="mt-1 text-sm text-text-secondary">{text("البيانات المحفوظة حتى", "Recorded data as of")} {formatDate(report.asOf, locale, true)}</p></div>

      </header>

      {!preview && <nav aria-label={text("اختيار التقرير", "Report navigation")} className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-2">
        <button type="button" aria-pressed={scope === null} className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${scope === null ? "bg-emerald-700 text-white" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`} onClick={() => { setLockedWeek(null); setScope(null); }}>{text("تحليلات مستمرة", "Continuous analytics")}</button>
        {[1, 2, 3, 4].map((week) => {
          const unlocked = weekReportUnlocked(week, report);
          return <button key={week} type="button" aria-pressed={scope === week} aria-label={unlocked ? text(`تقرير الأسبوع ${number(week)}`, `Week ${number(week)} report`) : text(`تقرير الأسبوع ${number(week)} مقفول`, `Week ${number(week)} report locked`)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${scope === week ? "bg-emerald-700 text-white" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`} onClick={() => { if (unlocked) { setLockedWeek(null); setScope(week); } else setLockedWeek(week); }}>{!unlocked && <Lock className="h-3.5 w-3.5" aria-hidden="true" />}{text(`الأسبوع ${number(week)}`, `Week ${number(week)}`)}</button>;
        })}
        <button type="button" aria-pressed={finalSelected} aria-label={report.finalAvailable || report.completed ? text("التقرير النهائي", "Final report") : text("التقرير النهائي مقفول", "Final report locked")} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${finalSelected ? "bg-emerald-700 text-white" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`} onClick={() => { if (report.finalAvailable || report.completed) { setLockedWeek(null); setScope("final"); } else setLockedWeek("final"); }}>{report.finalAvailable || report.completed ? <FileText className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}{text("النهائي", "Final")}</button>
      </nav>}

      {lockedWeek !== null && <p role="note" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><Lock className="me-1 inline h-4 w-4" aria-hidden="true" />{lockedWeek === "final" || lockedWeek === 4 ? text("التقرير النهائي والأسبوع الرابع بيظهروا عند الوصول لمرحلة التقرير النهائي.", "Week 4 and the final report are available at the final-report journey stage.") : !report.week1StartedAt ? text("التقرير ده هيفتح بعد إكمال Task 0 وبداية الأسبوع الأول.", "This report unlocks after Task 0 is complete and Week 1 begins.") : text(`التقرير ده لسه مقفول حسب تقدم الرحلة الحالي.`, `This report is still locked at the current journey stage.`)}</p>}

      <div hidden={selectedWeek !== null || finalSelected}>
        <PerformanceAnalytics report={report} metrics={report.overall} canNavigate={!readOnly} admin={readOnly} onAddUpdate={() => { setSaveError(""); setChangeOpen(true); }} />
      </div>
      {selectedWeek !== null && <WeeklyReportView report={report} week={selectedWeek} metrics={metrics} readOnly={readOnly} />}
      {finalSelected && <FinalJourneyReport report={report} readOnly={readOnly} onComplete={() => void completeFinal()} pending={pending} saveError={saveError} />}

      <Modal isOpen={changeOpen} onClose={() => { if (!pending) setChangeOpen(false); }} disableClose={pending} title={text("إضافة تحديث", "Add an update")}>
        <form className="space-y-3 p-5" onSubmit={saveChange}>
          <label className="block text-sm">{text("إيه اللي غيّرته في تجهيزاتك أو طريقة تقديمك؟ صف التغيير عشان تتابع الطلبات اللي هتتسجل بعده.", "What changed in your preparation or application approach? Describe it to follow applications recorded afterwards.")}<textarea className="field-control mt-2 min-h-32" required maxLength={5000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
          <p className="text-xs text-text-secondary">{text("تقدر تضيف تحديث مرة كل 3 أيام. رفع CV بيظل من الملف الشخصي.", "You can add an update once every 3 days. CV uploads remain in your profile.")}</p>
          {saveError && <p role="alert" className="text-sm text-rose-700">{saveError}</p>}
          <button className="button-primary min-h-10" disabled={pending}>{pending ? text("بنحفظ…", "Saving…") : text("احفظ التحديث", "Save update")}</button>
        </form>
      </Modal>
    </main>
  );
}
