import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  CircleHelp,
  FileText,
  type LucideIcon,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "../../../i18n";
import type { Metrics, Report } from "./ReportsPage";
import ActivityResponseChart from "./ActivityResponseChart";

type Props = {
  report: Report;
  metrics: Metrics;
  canNavigate: boolean;
};

type TimelineKind = "CV" | "CHANGE" | "REFLECTION" | "POST" | "OUTREACH" | "LEGACY";
type TimelineItem = { id: string; kind: TimelineKind; date: string; title: string; body: string | null };
type ComparisonTooltipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: { title: string; logged: number; positive: number } }> };

const stageKeys = ["APPLIED", "ASSIGNMENT", "INTERVIEW", "DECISION", "CLOSED"] as const;
const outcomeKeys = ["NONE", "ACCEPTED", "REJECTED", "WITHDRAWN", "NO_RESPONSE"] as const;
const timelineFilters: Array<TimelineKind | "ALL"> = ["ALL", "CV", "CHANGE", "REFLECTION", "POST", "OUTREACH", "LEGACY"];

function dateLabel(value: string, locale: string, withYear = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC",
  }).format(date);
}

function summaryFromChange(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      if (record.isUserChange === true) {
        const summary = [record.title, record.note, record.summary].find((item) => typeof item === "string" && item.trim());
        return typeof summary === "string" ? summary : null;
      }
    }
  } catch {
    // Older change records were saved as plain text.
  }
  return value;
}

function Kpi({ label, value, detail, icon: Icon, accent = "emerald" }: {
  label: string; value: string; detail: string; icon: LucideIcon; accent?: "emerald" | "sky" | "violet" | "amber";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
    sky: "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
    violet: "bg-violet-50 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200",
    amber: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  };
  return (
    <article className="min-w-0 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-secondary">{label}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">{value}</p>
        </div>
        <span className={`rounded-lg p-2 ${tones[accent]}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
      </div>
      <p className="mt-2 text-xs leading-5 text-text-secondary">{detail}</p>
    </article>
  );
}

function StageBreakdown({ metrics }: { metrics: Metrics }) {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => (ar ? a : e);
  const [selected, setSelected] = useState<(typeof stageKeys)[number] | null>(null);
  const labels: Record<(typeof stageKeys)[number], string> = {
    APPLIED: text("تم التقديم", "Applied"),
    ASSIGNMENT: text("تكليف", "Assignment"),
    INTERVIEW: text("مقابلة", "Interview"),
    DECISION: text("قرار", "Decision"),
    CLOSED: text("مغلق", "Closed"),
  };
  const tones: Record<(typeof stageKeys)[number], string> = {
    APPLIED: "bg-emerald-600", ASSIGNMENT: "bg-sky-600", INTERVIEW: "bg-violet-600", DECISION: "bg-amber-500", CLOSED: "bg-neutral-500",
  };
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <span className="rounded-lg bg-emerald-50 p-2 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"><BriefcaseBusiness className="h-4 w-4" aria-hidden="true" /></span>
        <div>
          <h2 className="text-lg font-semibold">{text("مسار الطلبات الحالي", "Current recruitment pipeline")}</h2>
          <p className="mt-1 text-sm text-text-secondary">{text("مكان الطلب دلوقتي، بناءً على آخر مرحلة محفوظة.", "Where each application sits now, based on its latest recorded stage.")}</p>
        </div>
      </header>
      {metrics.logged > 0 ? (
        <>
          <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800" aria-label={text("توزيع المراحل الحالية", "Current stage distribution")}>
            {stageKeys.map((key) => {
              const value = metrics.stages[key];
              return value > 0 ? <span key={key} className={`${tones[key]} h-full`} style={{ width: `${(value / metrics.logged) * 100}%` }} title={`${labels[key]}: ${number(value)}`} /> : null;
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {stageKeys.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={selected === key}
                onClick={() => setSelected((current) => current === key ? null : key)}
                className={`flex min-h-10 items-center justify-between gap-2 rounded-lg px-2.5 text-start text-sm transition-colors ${selected === key ? "bg-neutral-100 ring-1 ring-emerald-700 dark:bg-neutral-800" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/70"}`}
              >
                <span className="flex min-w-0 items-center gap-2"><i className={`h-2.5 w-2.5 shrink-0 rounded-full ${tones[key]}`} aria-hidden="true" /><span className="truncate">{labels[key]}</span></span>
                <strong className="tabular-nums">{number(metrics.stages[key])}</strong>
              </button>
            ))}
          </div>
          <p className="mt-3 min-h-5 text-xs text-text-secondary" role="status">
            {selected ? `${labels[selected]} · ${number(metrics.stages[selected])} / ${number(metrics.logged)} ${text("طلبات", "applications")}` : `${text("الإجمالي", "Total")}: ${number(metrics.logged)} ${text("طلبات", "applications")}`}
          </p>
        </>
      ) : (
        <p className="mt-5 rounded-lg bg-neutral-50 p-3 text-sm text-text-secondary dark:bg-neutral-900/60">{text("لسه مفيش طلبات علشان نعرض مراحلها.", "There are no recorded applications to break into stages yet.")}</p>
      )}
    </section>
  );
}

function OutcomeBreakdown({ metrics }: { metrics: Metrics }) {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => (ar ? a : e);
  const labels: Record<(typeof outcomeKeys)[number], string> = {
    NONE: text("مستمرة / بلا نتيجة نهائية", "Pending / no final outcome"),
    ACCEPTED: text("قبول", "Accepted"),
    REJECTED: text("رفض", "Rejected"),
    WITHDRAWN: text("انسحاب", "Withdrawn"),
    NO_RESPONSE: text("بلا رد", "No response"),
  };
  const colors: Record<(typeof outcomeKeys)[number], string> = {
    NONE: "bg-neutral-400", ACCEPTED: "bg-emerald-600", REJECTED: "bg-rose-600", WITHDRAWN: "bg-amber-500", NO_RESPONSE: "bg-slate-500",
  };
  const observed = outcomeKeys.filter((key) => metrics.outcomes[key] > 0);
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <span className="rounded-lg bg-violet-50 p-2 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200"><TrendingUp className="h-4 w-4" aria-hidden="true" /></span>
        <div>
          <h2 className="text-lg font-semibold">{text("النتائج الحالية", "Current outcomes")}</h2>
          <p className="mt-1 text-sm text-text-secondary">{text("منفصلة عن المرحلة الحالية؛ كل طلب له نتيجة نهائية واحدة أو يظل بلا نتيجة.", "Outcomes are separate from current stage. Each application has one final outcome or remains pending.")}</p>
        </div>
      </header>
      {observed.length ? (
        <ul className="mt-4 divide-y divide-border">
          {observed.map((key) => (
            <li key={key} className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2"><i className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors[key]}`} aria-hidden="true" /><span>{labels[key]}</span></span>
              <strong className="tabular-nums">{number(metrics.outcomes[key])}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-lg bg-neutral-50 p-3 text-sm text-text-secondary dark:bg-neutral-900/60">{text("مفيش نتائج محفوظة لحد دلوقتي.", "No application outcomes are recorded yet.")}</p>
      )}
      {metrics.unknownInterviews > 0 && (
        <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {text(`تاريخ المرحلة غير مكتمل في ${number(metrics.unknownInterviews)} طلبات؛ مش بنفترض إنها ماوصلتش لمقابلة.`, `${number(metrics.unknownInterviews)} applications have incomplete stage history; they are not assumed to have had no interview.`)}
        </p>
      )}
    </section>
  );
}

function MilestoneSummary({ metrics }: { metrics: Metrics }) {
  const { locale, number } = useI18n();
  const text = (a: string, e: string) => (locale === "ar" ? a : e);
  const rows = [
    [text("وصلوا لتكليف", "Reached assignment"), metrics.milestones.assignments],
    [text("وصلوا لمقابلة", "Reached interview"), metrics.milestones.interviews],
    [text("وصلوا لقرار", "Reached decision"), metrics.milestones.decisions],
  ] as const;
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="text-base font-semibold">{text("محطات وصلتلها الطلبات", "Historical milestones reached")}</h2>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {rows.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2.5 text-sm dark:bg-neutral-900/60"><span>{label}</span><strong className="text-lg tabular-nums">{number(value)}</strong></div>)}
      </div>
      <p className="mt-2 text-xs text-text-secondary">{text("الطلب الواحد ممكن يظهر في أكتر من محطة؛ الأعداد دي متداخلة ومش أجزاء من إجمالي واحد.", "An application may appear in more than one milestone; these counts overlap and are not parts of one total.")}</p>
    </section>
  );
}

function ObservationPeriods({ report }: { report: Report }) {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => (ar ? a : e);
  const [mounted, setMounted] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  useEffect(() => setMounted(true), []);
  const periods = report.periodComparisons;
  const rows = periods.map((period) => ({
    id: period.id,
    title: period.kind === "BEFORE_FIRST_CHECKPOINT" ? text("قبل أول تغيير محفوظ", "Before first saved change") : period.title,
    logged: period.metrics.logged,
    positive: period.metrics.positive,
    startAt: period.startAt,
    endAt: period.endAt,
  }));
  const selected = rows.find((row) => row.id === selectedId) ?? rows.at(-1);
  const tooltip = ({ active, payload }: ComparisonTooltipProps) => {
    const row = payload?.[0]?.payload;
    if (!active || !row) return null;
    return <div dir={ar ? "rtl" : "ltr"} className="rounded-lg border border-border bg-surface p-3 text-sm shadow-lg"><strong>{row.title}</strong><p>{text("طلبات أُنشئت", "Applications created")}: {number(row.logged)}</p><p>{text("تقدم إيجابي موثق حاليًا", "Current positive progression")}: {number(row.positive)}</p></div>;
  };
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <span className="rounded-lg bg-amber-50 p-2 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"><Activity className="h-4 w-4" aria-hidden="true" /></span>
        <div>
          <h2 className="text-lg font-semibold">{text("فترات الملاحظة والتغييرات", "Observation periods and recorded changes")}</h2>
          <p className="mt-1 text-sm text-text-secondary">{text("الطلبات تتجمع حسب تاريخ إنشائها بين نقاط CV أو التغيير اليدوي المحفوظة.", "Applications are grouped by their creation date between persisted CV or manual-change checkpoints.")}</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <p className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm text-text-secondary dark:bg-neutral-900/60">{text("لسه مفيش نقطة تغيير محفوظة. مفيش baseline افتراضي أو تغيير متخيل.", "No saved change checkpoint yet. No baseline or checkpoint is invented.")}</p>
      ) : rows.length === 1 ? (
        <div className="mt-4 rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900/60">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{text("فترة الملاحظة الأولى", "First observation period")}</p>
              <p className="mt-1 text-sm text-text-secondary">{dateLabel(rows[0].startAt, locale, true)} — {rows[0].endAt ? dateLabel(rows[0].endAt, locale, true) : text("حتى الآن", "to present")}</p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-sm">{number(rows[0].logged)} {text("طلبات", "applications")}</span>
          </div>
          <p className="mt-3 text-sm">{text("تقدم إيجابي موثق حاليًا", "Current positive progression")}: <strong>{number(rows[0].positive)}</strong>{rows[0].logged ? <span className="text-text-secondary"> · {number(Math.round((rows[0].positive / rows[0].logged) * 100))}% {text("من الطلبات", "of applications")}</span> : null}</p>
          <p className="mt-2 text-xs text-text-secondary">{text("المقارنة تظهر لما تتسجل نقطة وفترة تانية؛ مفيش حاجة مطلوبة منك لمجرد ملء الرسم.", "A comparison appears after another valid checkpoint. You do not need to create a change just to fill a chart.")}</p>
        </div>
      ) : (
        <>
          <div role="img" aria-label={text("مقارنة عدد الطلبات والتقدم الإيجابي الحالي بين فترات الملاحظة. جدول بديل أسفل الرسم.", "Comparison of applications and current positive progression across observation periods. A data table follows the chart.")} className="mt-4 h-[220px] w-full min-w-0">
            {mounted ? <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.12} strokeDasharray="3 5" />
                <XAxis dataKey="title" tick={{ fontSize: 10, fill: "currentColor" }} tickLine={false} axisLine={false} interval={0} />
                <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} />
                <Tooltip content={tooltip} />
                <Bar dataKey="logged" name={text("طلبات أُنشئت", "Applications created")} fill="#059669" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="positive" name={text("تقدم إيجابي موثق حاليًا", "Current positive progression")} fill="#0284c7" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer> : <div className="h-full rounded-lg bg-neutral-50 dark:bg-neutral-900/50" aria-hidden="true" />}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm"><span>{text("تفاصيل الفترة", "Period details")}</span><select className="field-control min-h-9 w-auto py-1" value={selected?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)}>{rows.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}</select></label>
            {selected && <p className="text-xs text-text-secondary">{dateLabel(selected.startAt, locale, true)} — {selected.endAt ? dateLabel(selected.endAt, locale, true) : text("حتى الآن", "to present")} · {number(selected.logged)} {text("طلب", "apps")} · {number(selected.positive)} {text("تقدم إيجابي حالي", "current positive")}</p>}
          </div>
          <details className="mt-2 text-sm">
            <summary className="min-h-9 cursor-pointer py-2 font-medium text-emerald-800 underline dark:text-emerald-300">{text("عرض جدول الفترات", "View period data table")}</summary>
            <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[34rem] text-start text-sm"><caption className="sr-only">{text("المقارنة الفعلية للفترات", "Observed period comparison")}</caption><thead className="bg-neutral-100 dark:bg-neutral-800"><tr><th className="p-2 text-start">{text("الفترة", "Period")}</th><th className="p-2 text-start">{text("من", "From")}</th><th className="p-2 text-start">{text("إلى", "To")}</th><th className="p-2 text-start">{text("طلبات", "Applications")}</th><th className="p-2 text-start">{text("تقدم إيجابي", "Positive")}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border"><th scope="row" className="p-2 text-start font-medium">{row.title}</th><td className="p-2">{dateLabel(row.startAt, locale, true)}</td><td className="p-2">{row.endAt ? dateLabel(row.endAt, locale, true) : text("حتى الآن", "to present")}</td><td className="p-2 tabular-nums">{number(row.logged)}</td><td className="p-2 tabular-nums">{number(row.positive)}</td></tr>)}</tbody></table></div>
          </details>
        </>
      )}
      <details className="mt-2 text-xs text-text-secondary">
        <summary className="min-h-9 cursor-pointer py-2 font-medium text-emerald-800 underline dark:text-emerald-300">{text("طريقة الحساب", "How this comparison is calculated")}</summary>
        <p className="pb-2 leading-5">{text("الطلبات تُنسب للفترة حسب تاريخ إنشائها، والتقدم يعرض حالتها الحالية وقت اللقطة. وقت انتظار الرد يختلف، ومافيش رابط محفوظ بين طلب ونسخة CV بعينها؛ المقارنة وصفية ولا تثبت إن التغيير سبب النتيجة.", "Applications are assigned by creation date and progression shows their current evidence as of this snapshot. Response waiting time varies, and no application-to-CV link is stored; this comparison is descriptive and does not establish causation.")}</p>
      </details>
    </section>
  );
}

function ChangeTimeline({ report }: { report: Report }) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => (ar ? a : e);
  const [filter, setFilter] = useState<TimelineKind | "ALL">("ALL");
  const [showAll, setShowAll] = useState(false);
  const labels: Record<TimelineKind | "ALL", string> = {
    ALL: text("الكل", "All"), CV: text("CV", "CV"), CHANGE: text("تغييرات", "Changes"), REFLECTION: text("مراجعات", "Reflections"), POST: text("LinkedIn", "LinkedIn"), OUTREACH: text("تواصل", "Outreach"), LEGACY: text("سجلات قديمة", "Legacy records"),
  };
  const timeline = useMemo<TimelineItem[]>(() => {
    const cvs: TimelineItem[] = report.cvs.map((cv) => ({
      id: `cv-${cv.id}`, kind: "CV", date: cv.uploadedAt,
      title: `${text("نسخة السيرة", "CV version")} ${locale === "ar" ? cv.versionNumber.toLocaleString("ar-EG") : cv.versionNumber}`,
      body: cv.originalName,
    }));
    const activities: TimelineItem[] = report.activities.flatMap((activity) => {
      const kind: TimelineKind | null = activity.legacyChange ? "LEGACY" : activity.type === "USER_CHANGE" ? "CHANGE" : activity.type === "WEEKLY_REVIEW" ? "REFLECTION" : activity.type === "LINKEDIN_POST" ? "POST" : activity.type === "OUTREACH_CONTACT" ? "OUTREACH" : null;
      if (!kind) return [];
      const title = kind === "LEGACY" ? text("سجل قديم غير مصنف", "Unclassified legacy record") : kind === "CHANGE" ? text("تغيير مهني محفوظ", "Saved professional change") : kind === "REFLECTION" ? text("مراجعة أسبوعية", "Weekly reflection") : kind === "POST" ? text("نشاط LinkedIn", "LinkedIn activity") : text("تواصل مهني", "Professional outreach");
      const body = kind === "CHANGE" ? summaryFromChange(activity.summary) : activity.summary ?? activity.postTopic ?? ([activity.contactName, activity.companyName].filter(Boolean).join(" · ") || null);
      return [{ id: activity.id, kind, date: activity.createdAt, title, body }];
    });
    return [...cvs, ...activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [report.cvs, report.activities, locale, ar]);
  const filtered = timeline.filter((item) => filter === "ALL" || item.kind === filter);
  const shown = showAll ? filtered : filtered.slice(0, 5);
  const icons: Record<TimelineKind, string> = { CV: "bg-emerald-600", CHANGE: "bg-amber-500", REFLECTION: "bg-violet-600", POST: "bg-sky-600", OUTREACH: "bg-indigo-600", LEGACY: "bg-neutral-500" };
  return (
    <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold">{text("سجل النشاط والتغييرات", "Activity and change timeline")}</h2><p className="mt-1 text-sm text-text-secondary">{text("نسخ CV والتغييرات اليدوية والمراجعات والأنشطة محفوظة كأنواع منفصلة.", "CV versions, manual changes, reflections, and activity remain distinct persisted event types.")}</p></div>
        {timeline.length > 0 && <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold tabular-nums dark:bg-neutral-800">{timeline.length}</span>}
      </header>
      {timeline.length > 0 && <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={text("تصفية سجل النشاط", "Filter activity timeline")}>{timelineFilters.map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setShowAll(false); }} className={`min-h-9 rounded-full border px-3 text-sm transition-colors ${filter === value ? "border-emerald-700 bg-emerald-700 text-white" : "border-border hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}>{labels[value]}</button>)}</div>}
      {shown.length ? (
        <ol className="mt-4 space-y-0">
          {shown.map((item, index) => <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
            <div className="relative flex w-4 shrink-0 justify-center"><span className={`z-10 mt-1.5 h-2.5 w-2.5 rounded-full ${icons[item.kind]}`} aria-hidden="true" />{index < shown.length - 1 && <span className="absolute bottom-0 top-4 w-px bg-border" aria-hidden="true" />}</div>
            <article className="min-w-0 flex-1 rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-neutral-900/60">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h3 className="text-sm font-semibold">{item.title}</h3><time dateTime={item.date} className="text-xs text-text-secondary">{dateLabel(item.date, locale, true)}</time></div>
              {item.body && <p className="mt-1 break-words whitespace-pre-wrap text-sm leading-5 text-text-secondary">{item.body}</p>}
            </article>
          </li>)}
        </ol>
      ) : <p className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm text-text-secondary dark:bg-neutral-900/60">{timeline.length ? text("مفيش أحداث من النوع ده.", "No events of this type.") : text("لسه مفيش أنشطة أو تغييرات محفوظة.", "No saved activity or change events yet.")}</p>}
      {filtered.length > 5 && <button type="button" className="mt-4 min-h-10 text-sm font-semibold text-emerald-800 underline underline-offset-2 dark:text-emerald-300" onClick={() => setShowAll((value) => !value)}>{showAll ? text("عرض أقل", "Show less") : text(`عرض ${filtered.length - 5} أحداث كمان`, `Show ${filtered.length - 5} more events`)}</button>}
    </section>
  );
}

function AnalyticsInterpretation({ metrics, canNavigate }: { metrics: Metrics; canNavigate: boolean }) {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => (ar ? a : e);
  const observations: string[] = [];
  if (metrics.logged === 0) {
    observations.push(text("سجل أول طلب علشان يبدأ عندك خط زمني تقيس عليه نشاطك.", "Record your first application to establish an activity timeline."));
  } else if (metrics.logged === 1) {
    observations.push(text("دي أول نقطة مسجلة؛ لسه بدري على استنتاج نمط من طلب واحد.", "This is your first recorded point; one application is too early to establish a pattern."));
  } else if (metrics.logged < 7) {
    observations.push(text(`عندك ${number(metrics.logged)} طلبات محفوظة؛ اعتبرها ملاحظات أولية لحد ما تكبر العينة.`, `You have ${number(metrics.logged)} recorded applications; treat this as an early observation while the sample grows.`));
  } else if (metrics.positive > 0) {
    observations.push(text(`${number(metrics.positive)} طلبات فيها دليل تقدم إيجابي محفوظ من ${number(metrics.logged)}.`, `${number(metrics.positive)} of ${number(metrics.logged)} applications have recorded positive progression evidence.`));
  } else {
    observations.push(text(`لم يُسجل تقدم إيجابي في ${number(metrics.logged)} طلبات حتى الآن؛ راجع تحديث المراحل وانتظار الرد.`, `No positive progression is recorded across ${number(metrics.logged)} applications yet; review stage updates and response timing.`));
  }
  if (metrics.unknownInterviews > 0) observations.push(text(`${number(metrics.unknownInterviews)} طلبات تاريخ مراحلها غير مكتمل؛ التقرير بيعرضها كبيانات غير معروفة.`, `${number(metrics.unknownInterviews)} applications have incomplete stage history and remain marked as unknown.`));
  return (
    <aside className="rounded-xl border border-emerald-800/15 bg-emerald-50/70 p-4 dark:border-emerald-300/15 dark:bg-emerald-950/30">
      <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-100"><Sparkles className="h-4 w-4" aria-hidden="true" /><h2 className="font-semibold">{text("ملاحظة من بياناتك", "What the recorded data shows")}</h2></div>
      <ul className="mt-3 space-y-2 text-sm leading-5 text-text-primary">{observations.slice(0, 2).map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" /><span>{item}</span></li>)}</ul>
      {metrics.logged === 0 && canNavigate && <Link className="mt-3 inline-flex min-h-10 items-center gap-1 font-semibold text-emerald-800 underline dark:text-emerald-300" to="/applications">{text("افتح سجل الطلبات", "Open applications")} <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>}
    </aside>
  );
}

function ChangeMarkers({ report, locale }: { report: Report; locale: string }) {
  const markers = useMemo(() => {
    const ar = locale === "ar";
    const localize = (a: string, e: string) => ar ? a : e;
    return [
      ...report.cvs.map((cv) => ({ date: cv.uploadedAt.slice(0, 10), title: `${localize("رفع CV", "CV upload")} v${cv.versionNumber}` })),
      ...report.activities.filter((activity) => activity.type === "USER_CHANGE" && !activity.legacyChange).map((activity) => ({ date: activity.createdAt.slice(0, 10), title: localize("تغيير مهني محفوظ", "Saved professional change") })),
    ];
  }, [report.cvs, report.activities, locale]);
  return <ActivityResponseChart points={report.daily} markers={markers} />;
}

export default function PerformanceAnalytics({ report, metrics, canNavigate }: Props) {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => (ar ? a : e);
  const rate = metrics.positiveRate === null ? "—" : `${number(metrics.positiveRate)}%`;
  return (
    <div className="space-y-5">
      <section aria-labelledby="performance-overview-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 id="performance-overview-title" className="text-lg font-semibold">{text("ملخص الأداء", "Performance overview")}</h2><p className="mt-1 text-sm text-text-secondary">{text("لقطة للأنشطة والنتائج المسجلة لحد دلوقتي.", "A snapshot of activity and outcomes recorded so far.")}</p></div><span className="text-xs text-text-secondary">{text("محدّث", "As of")} {dateLabel(report.asOf, locale, true)}</span></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={text("طلبات مسجلة", "Applications recorded")} value={number(metrics.logged)} detail={metrics.logged === 0 ? text("ابدأ أول فترة ملاحظة.", "Your first observation period starts here.") : text(`${number(metrics.tailored)} طلبات مخصصة`, `${number(metrics.tailored)} tailored applications`)} icon={BriefcaseBusiness} />
          <Kpi label={text("تقدم إيجابي موثق", "Positive progression evidence")} value={number(metrics.positive)} detail={metrics.logged ? text(`من إجمالي ${number(metrics.logged)} طلبات · ${rate} من الطلبات`, `Of ${number(metrics.logged)} applications · ${rate} of applications`) : text("النسبة تظهر بعد وجود طلبات.", "A rate appears after applications are recorded.")} icon={TrendingUp} accent="sky" />
          <Kpi label={text("وصلت لمقابلة", "Reached interview")} value={number(metrics.interviews)} detail={metrics.unknownInterviews ? text(`${number(metrics.unknownInterviews)} سجلات تاريخها غير مكتمل`, `${number(metrics.unknownInterviews)} records have incomplete history`) : text("انتقالات المقابلات المثبتة فقط.", "Only evidenced interview milestones are counted.")} icon={Activity} accent="violet" />
          <Kpi label={text("أنشطة مهنية مسجلة", "Professional activity recorded")} value={number(metrics.posts + metrics.outreach)} detail={text(`${number(metrics.posts)} منشورات · ${number(metrics.outreach)} تواصل`, `${number(metrics.posts)} posts · ${number(metrics.outreach)} outreach records`)} icon={FileText} accent="amber" />
        </div>
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(16rem,.8fr)]">
        <div className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <header className="mb-3"><h2 className="text-lg font-semibold">{text("النشاط واستجابة التوظيف", "Activity and recruitment response")}</h2><p className="mt-1 text-sm text-text-secondary">{text("عدد الطلبات بتاريخ إنشائها، وانتقالات المراحل بتاريخ حدوثها الفعلي.", "Applications use their creation date; stage transitions use their actual event date.")}</p></header>
          {metrics.logged === 0 ? (
            <div className="flex min-h-32 flex-col items-start justify-center rounded-lg bg-neutral-50 p-4 dark:bg-neutral-900/60"><p className="font-medium">{text("لسه مفيش نشاط زمني", "Your timeline is ready when you are")}</p><p className="mt-1 text-sm text-text-secondary">{text("أول طلب هيسجل نقطة بداية من غير رسم فاضي أو أرقام افتراضية.", "Your first application will create a real starting point; no empty chart or sample values are shown.")}</p>{canNavigate && <Link className="mt-3 inline-flex min-h-10 items-center gap-2 font-semibold text-emerald-800 underline dark:text-emerald-300" to="/applications">{text("سجّل أول طلب", "Record your first application")} <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>}</div>
          ) : metrics.logged === 1 ? (
            <div className="flex min-h-36 items-center justify-between gap-4 rounded-lg bg-emerald-50/70 p-4 dark:bg-emerald-950/30"><div className="flex items-start gap-3"><span className="rounded-lg bg-emerald-100 p-2 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100"><BriefcaseBusiness className="h-5 w-5" aria-hidden="true" /></span><div><p className="font-semibold">{text("أول طلب اتسجل", "First application recorded")}</p><p className="mt-1 text-sm text-text-secondary">{report.daily[0] ? dateLabel(report.daily[0].date, locale, true) : text("تاريخ التسجيل غير متاح", "Record date unavailable")}</p><p className="mt-2 text-sm text-text-secondary">{text("خط زمني البداية بدأ؛ محتاجين بيانات أكتر قبل مقارنة الاتجاهات.", "Your timeline has started; more records are needed before comparing trends.")}</p></div></div><span className="text-4xl font-bold tabular-nums text-emerald-800 dark:text-emerald-200">1</span></div>
          ) : (
            <ChangeMarkers report={report} locale={locale} />
          )}
        </div>
        <AnalyticsInterpretation metrics={metrics} canNavigate={canNavigate} />
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-2">
        <StageBreakdown metrics={metrics} />
        <OutcomeBreakdown metrics={metrics} />
      </section>
      <MilestoneSummary metrics={metrics} />
      <ObservationPeriods report={report} />
      <ChangeTimeline report={report} />
      <details className="rounded-xl border border-border bg-surface px-4 sm:px-5">
        <summary className="min-h-12 cursor-pointer py-3 font-semibold">{text("تعريفات المقاييس وطريقة الحساب", "Metric definitions and methodology")}</summary>
        <div className="space-y-2 pb-4 text-sm leading-6 text-text-secondary">
          <p>{text("التقدم الإيجابي يعني وجود دليل محفوظ على تكليف أو مقابلة أو قرار أو قبول. الرفض وحده مش تقدم إيجابي، وNO_RESPONSE وWITHDRAWN مستبعدين.", "Positive progression requires persisted evidence of assignment, interview, decision, or acceptance. Rejection alone is not positive; NO_RESPONSE and WITHDRAWN are excluded.")}</p>
          <p>{text("أحداث الرسم مؤرخة بوقت إنشاء الطلب أو انتقال المرحلة الفعلي. قد يحتوي الطلب الواحد على أكتر من انتقال؛ لذلك عدد الانتقالات مش عدد الطلبات.", "Chart events use application creation and actual stage-transition timestamps. One application can have multiple transitions, so event count is not application count.")}</p>
          <p>{text("المرحلة الحالية والنتيجة النهائية والتاريخ اللي وصل له الطلب مقاييس مختلفة. سجل تاريخ ناقص يفضل غير معروف ولا يتحول لصفر.", "Current stage, final outcome, and historical milestone are distinct measures. Missing history remains unknown rather than being turned into zero.")}</p>
        </div>
      </details>
    </div>
  );
}
