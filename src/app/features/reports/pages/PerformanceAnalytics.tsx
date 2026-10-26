import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Activity, Info, Sparkles, TrendingUp } from "lucide-react";
import { useI18n } from "../../../i18n";
import type { Metrics, Report } from "./ReportsPage";

type Props = {
  report: Report;
  metrics: Metrics;
  scopeLabel: string;
  canNavigate: boolean;
};

type ChartMode = "period" | "cumulative";

const stageKeys = [
  "APPLIED",
  "ASSIGNMENT",
  "INTERVIEW",
  "DECISION",
  "CLOSED",
] as const;
const outcomeKeys = [
  "NONE",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
  "NO_RESPONSE",
] as const;
const milestoneKeys = ["assignments", "interviews", "decisions"] as const;

function formatDate(value: string, locale: string, withYear = false) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
        day: "numeric",
        month: "short",
        ...(withYear ? { year: "numeric" } : {}),
      }).format(date);
}

function summaryFromChange(value: string | null) {
  if (!value) return "";
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      const row = parsed as Record<string, unknown>;
      if (row.isUserChange === true) {
        return (
          ([row.title, row.note, row.summary].find(
            (part) => typeof part === "string" && part.trim(),
          ) as string | undefined) ?? ""
        );
      }
    }
  } catch {
    // Current manual-change records can be plain text; keep their saved text.
  }
  return value;
}

function RatioBar({
  value,
  denominator,
  tone = "emerald",
}: {
  value: number;
  denominator: number;
  tone?: "emerald" | "blue" | "amber" | "rose";
}) {
  const width = denominator ? Math.min(100, (value / denominator) * 100) : 0;
  const color = {
    emerald: "bg-emerald-600",
    blue: "bg-sky-600",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  }[tone];
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-neutral-50 dark:bg-neutral-900/50"
      aria-hidden="true"
    >
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function PerformanceAnalytics({
  report,
  metrics,
  scopeLabel,
  canNavigate,
}: Props) {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => (ar ? a : e);
  const [mode, setMode] = useState<ChartMode>("cumulative");
  const [showApplications, setShowApplications] = useState(true);
  const [showResponses, setShowResponses] = useState(true);

  const markers = useMemo(() => {
    const byDate = new Map<string, string[]>();
    for (const cv of report.cvs) {
      const day = cv.uploadedAt.slice(0, 10);
      byDate.set(day, [
        ...(byDate.get(day) ?? []),
        `${text("رفع سيرة", "CV upload")} v${cv.versionNumber}`,
      ]);
    }
    for (const activity of report.activities) {
      if (activity.type !== "USER_CHANGE") continue;
      const day = activity.createdAt.slice(0, 10);
      byDate.set(day, [
        ...(byDate.get(day) ?? []),
        text("تغيير مهني مسجل", "Recorded professional change"),
      ]);
    }
    return [...byDate.entries()].map(([date, titles]) => ({
      date,
      title: titles.join(" · "),
    }));
  }, [report.cvs, report.activities, ar]);

  const chart = useMemo(() => {
    let runningApplications = 0;
    let runningEvents = 0;
    const rows = report.daily.map((day) => {
      runningApplications += day.logged;
      runningEvents += day.positiveEvents;
      return {
        ...day,
        applicationValue:
          mode === "cumulative" ? runningApplications : day.logged,
        eventValue: mode === "cumulative" ? runningEvents : day.positiveEvents,
      };
    });
    const dates = [
      ...rows.map((row) => row.date),
      ...markers.map((marker) => marker.date),
    ].sort();
    const minDay = dates[0];
    const maxDay = dates.at(-1);
    const minTime = minDay ? new Date(`${minDay}T00:00:00.000Z`).getTime() : 0;
    const maxTime = maxDay
      ? new Date(`${maxDay}T00:00:00.000Z`).getTime()
      : minTime;
    const left = 58;
    const right = 780;
    const top = 20;
    const bottom = 236;
    const maxValue = Math.max(
      1,
      ...rows.flatMap((row) => [row.applicationValue, row.eventValue]),
    );
    const x = (date: string) => {
      const time = new Date(`${date}T00:00:00.000Z`).getTime();
      return maxTime === minTime
        ? (left + right) / 2
        : left + ((time - minTime) / (maxTime - minTime)) * (right - left);
    };
    const y = (value: number) => bottom - (value / maxValue) * (bottom - top);
    const path = (field: "applicationValue" | "eventValue") =>
      rows
        .map(
          (row, index) =>
            `${index ? "L" : "M"} ${x(row.date).toFixed(1)} ${y(row[field]).toFixed(1)}`,
        )
        .join(" ");
    const tickValues = [0, Math.ceil(maxValue / 2), maxValue].filter(
      (value, index, all) => all.indexOf(value) === index,
    );
    return {
      rows,
      minDay,
      maxDay,
      left,
      right,
      top,
      bottom,
      maxValue,
      x,
      y,
      path,
      tickValues,
    };
  }, [report.daily, markers, mode]);

  const timeline = useMemo(() => {
    const rows = [
      ...report.cvs.map((cv) => ({
        id: `cv-${cv.id}`,
        kind: "CV" as const,
        date: cv.uploadedAt,
        title: `${text("نسخة السيرة", "CV version")} v${number(cv.versionNumber)}`,
        body: cv.originalName,
      })),
      ...report.activities
        .filter((activity) =>
          [
            "USER_CHANGE",
            "WEEKLY_REVIEW",
            "LINKEDIN_POST",
            "OUTREACH_CONTACT",
          ].includes(activity.type),
        )
        .map((activity) => {
          const kind =
            activity.type === "USER_CHANGE"
              ? ("CHANGE" as const)
              : activity.type === "WEEKLY_REVIEW"
                ? ("REVIEW" as const)
                : activity.type === "LINKEDIN_POST"
                  ? ("POST" as const)
                  : ("OUTREACH" as const);
          const title = activity.legacyChange
            ? text("سجل قديم غير مصنف", "Unclassified legacy record")
            : kind === "CHANGE"
              ? text("تغيير مهني مسجل", "Recorded professional change")
              : kind === "REVIEW"
                ? text("مراجعة أسبوعية", "Weekly reflection")
                : kind === "POST"
                  ? text("منشور مهني", "Professional post")
                  : text("تواصل مهني", "Professional outreach");
          const body =
            kind === "CHANGE"
              ? summaryFromChange(activity.summary)
              : activity.summary ||
                activity.postTopic ||
                [activity.contactName, activity.companyName]
                  .filter(Boolean)
                  .join(" · ");
          return {
            id: activity.id,
            kind,
            date: activity.createdAt,
            title,
            body,
          };
        }),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return rows;
  }, [report.cvs, report.activities, ar, locale, number]);

  const maxPeriodApplications = Math.max(
    1,
    ...report.periodComparisons.map((period) => period.metrics.logged),
  );

  const stageLabels: Record<(typeof stageKeys)[number], string> = {
    APPLIED: text("تم التقديم", "Applied"),
    ASSIGNMENT: text("تكليف", "Assignment"),
    INTERVIEW: text("مقابلة", "Interview"),
    DECISION: text("قرار", "Decision"),
    CLOSED: text("مغلق", "Closed"),
  };
  const outcomeLabels: Record<(typeof outcomeKeys)[number], string> = {
    NONE: text("لسه بدون نتيجة نهائية", "No final outcome yet"),
    ACCEPTED: text("قبول", "Accepted"),
    REJECTED: text("رفض", "Rejected"),
    WITHDRAWN: text("انسحاب", "Withdrawn"),
    NO_RESPONSE: text("بلا رد", "No response"),
  };
  const milestoneLabels: Record<(typeof milestoneKeys)[number], string> = {
    assignments: text("وصل لتكليف", "Reached assignment"),
    interviews: text("وصل لمقابلة", "Reached interview"),
    decisions: text("وصل لمرحلة قرار", "Reached decision"),
  };
  const metricRows = [
    {
      label: text("طلبات مسجلة", "Applications logged"),
      value: metrics.logged,
      tone: "emerald" as const,
    },
    {
      label: text("طلبات مخصصة", "Tailored applications"),
      value: metrics.tailored,
      tone: "blue" as const,
    },
    {
      label: text("تقدم إيجابي موثق", "Recorded positive progression"),
      value: metrics.positive,
      tone: "emerald" as const,
    },
    {
      label: text("تاريخ مقابلات غير مكتمل", "Unknown interview history"),
      value: metrics.unknownInterviews,
      tone: "amber" as const,
    },
  ];

  const guidance =
    metrics.logged === 0
      ? text(
          "لسه مفيش طلبات محفوظة؛ ابدأ بتسجيل طلباتك علشان يبقى عندك خط زمني تراجعه. مفيش استنتاج أداء ممكن من غير بيانات.",
          "No applications are recorded yet. Log your applications to start a timeline; there is not enough evidence for a performance conclusion.",
        )
      : metrics.logged < 5
        ? text(
            `العينة الحالية ${number(metrics.logged)} طلبات. راجع كل طلب ومرحلة الرد، وخد الأرقام كملاحظة أولية مش كنمط ثابت.`,
            `The current sample is ${number(metrics.logged)} applications. Review each stage and response as an early observation, not a stable pattern.`,
          )
        : metrics.positive > 0
          ? text(
              `في ${number(metrics.positive)} طلبات عليها دليل تقدم إيجابي محفوظ من إجمالي ${number(metrics.logged)}. راجع أين وصلت الطلبات وإيه الخطوة العملية التالية، من غير افتراض سبب للنتيجة.`,
              `${number(metrics.positive)} of ${number(metrics.logged)} applications have recorded positive progression evidence. Review their stages and choose a practical next step without assuming a cause.`,
            )
          : text(
              `لم يُسجل تقدم إيجابي في العينة الحالية (${number(metrics.logged)} طلبات). راجع اكتمال تحديث المراحل وانتظار الرد؛ غياب السجل مش دليل وحده على سبب النتيجة.`,
              `No positive progression is recorded in this ${number(metrics.logged)}-application sample. Check stage updates and response waiting time; missing evidence alone does not establish a cause.`,
            );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {text(
                  "التقدم واستجابة سوق العمل",
                  "Progress and Market Response",
                )}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {text(
                  "الرسم الزمني يشمل الرحلة بالكامل. ملخص الأرقام يخص",
                  "The timeline covers the whole journey. The summary below is for",
                )}{" "}
                {scopeLabel}.
              </p>
            </div>
          </div>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={text("طريقة عرض الرسم", "Chart view mode")}
          >
            {(["cumulative", "period"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={
                  mode === value ? "button-primary" : "button-secondary"
                }
              >
                {value === "cumulative"
                  ? text("تراكمي", "Cumulative")
                  : text("حسب الفترة", "By period")}
              </button>
            ))}
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showApplications}
                  onChange={(event) =>
                    setShowApplications(event.target.checked)
                  }
                />
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600"
                  aria-hidden="true"
                />
                {text("طلبات مسجلة", "Applications logged")}
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showResponses}
                  onChange={(event) => setShowResponses(event.target.checked)}
                />
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full bg-sky-600"
                  aria-hidden="true"
                />
                {text(
                  "انتقالات تقدم إيجابي",
                  "Positive progression transitions",
                )}
              </label>
              <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                {text(
                  "العلامات الرأسية تغييرات محفوظة",
                  "Vertical markers are persisted changes",
                )}
              </span>
            </div>
            {chart.rows.length ? (
              <>
                <svg
                  viewBox="0 0 800 280"
                  role="img"
                  aria-label={text(
                    "رسم زمني للطلبات وانتقالات التقدم الإيجابي",
                    "Timeline of applications and positive progression transitions",
                  )}
                  className="block h-auto max-h-[22rem] w-full overflow-visible"
                >
                  {chart.tickValues.map((tick) => (
                    <g key={tick}>
                      <line
                        x1={chart.left}
                        x2={chart.right}
                        y1={chart.y(tick)}
                        y2={chart.y(tick)}
                        stroke="currentColor"
                        className="text-border"
                        strokeDasharray="4 5"
                      />
                    </g>
                  ))}
                  {markers
                    .filter(
                      (marker) =>
                        marker.date >= (chart.minDay ?? "") &&
                        marker.date <= (chart.maxDay ?? ""),
                    )
                    .map((marker) => (
                      <g key={`${marker.date}-${marker.title}`}>
                        <line
                          x1={chart.x(marker.date)}
                          x2={chart.x(marker.date)}
                          y1={chart.top}
                          y2={chart.bottom}
                          stroke="currentColor"
                          className="text-amber-500"
                          strokeDasharray="3 4"
                        />
                        <title>{`${formatDate(marker.date, locale, true)} — ${marker.title}`}</title>
                      </g>
                    ))}
                  {showApplications && chart.rows.length > 1 && (
                    <path
                      d={chart.path("applicationValue")}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {showResponses && chart.rows.length > 1 && (
                    <path
                      d={chart.path("eventValue")}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {chart.rows.map((row) => (
                    <g key={row.date}>
                      {showApplications && (
                        <circle
                          cx={chart.x(row.date)}
                          cy={chart.y(row.applicationValue)}
                          r="4"
                          fill="#059669"
                        >
                          <title>{`${row.date} · ${text("الطلبات", "Applications")}: ${number(row.applicationValue)}`}</title>
                        </circle>
                      )}
                      {showResponses && (
                        <circle
                          cx={chart.x(row.date)}
                          cy={chart.y(row.eventValue)}
                          r="4"
                          fill="#0284c7"
                        >
                          <title>{`${row.date} · ${text("انتقالات التقدم", "Progress transitions")}: ${number(row.eventValue)}`}</title>
                        </circle>
                      )}
                    </g>
                  ))}
                  <line
                    x1={chart.left}
                    x2={chart.right}
                    y1={chart.bottom}
                    y2={chart.bottom}
                    stroke="currentColor"
                    className="text-border"
                  />
                </svg>
                <div
                  dir="ltr"
                  className="grid grid-cols-3 items-center gap-1 text-xs text-text-secondary"
                >
                  <span className="text-start">
                    {chart.minDay ? formatDate(chart.minDay, locale) : "—"}
                  </span>
                  <span className="text-center">
                    {text("عدد السجلات", "Record count")} · 0–
                    {number(chart.maxValue)}
                  </span>
                  <span className="text-end">
                    {chart.maxDay ? formatDate(chart.maxDay, locale) : "—"}
                  </span>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm text-emerald-800 underline dark:text-emerald-300">
                    {text(
                      "عرض بيانات الرسم كجدول",
                      "View chart data as a table",
                    )}
                  </summary>
                  <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-border">
                    <table className="w-full text-start text-sm">
                      <thead>
                        <tr className="bg-neutral-50 dark:bg-neutral-900/50">
                          <th className="p-2">{text("التاريخ", "Date")}</th>
                          <th className="p-2">
                            {text("الطلبات", "Applications")}
                          </th>
                          <th className="p-2">
                            {text("انتقالات إيجابية", "Positive transitions")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {chart.rows.map((row) => (
                          <tr key={row.date} className="border-t border-border">
                            <td className="p-2">{row.date}</td>
                            <td className="p-2">
                              {number(row.applicationValue)}
                            </td>
                            <td className="p-2">{number(row.eventValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-neutral-50 dark:bg-neutral-900/50 p-6 text-center">
                <Activity
                  className="mb-2 h-7 w-7 text-text-secondary"
                  aria-hidden="true"
                />
                <p className="font-semibold">
                  {text(
                    "مفيش نشاط زمني محفوظ لسه",
                    "No timeline activity is recorded yet",
                  )}
                </p>
                <p className="mt-1 max-w-lg text-sm text-text-secondary">
                  {text(
                    "أول ما تضيف طلبات أو يحصل انتقال مرحلة محفوظ، الرسم هيعرض التواريخ الفعلية.",
                    "Once applications or stage transitions are recorded, the chart will use their actual dates.",
                  )}
                </p>
              </div>
            )}
            <p className="text-xs text-text-secondary">
              {text(
                "انتقالات التقدم مبنية على changedAt من السجل التاريخي؛ الطلب الواحد ممكن ينتج عنه أكتر من انتقال. التراكم هو مجموع الأحداث المسجلة، مش عدد أشخاص أو طلبات فريدة وصلت للمرحلة.",
                "Positive progression uses actual transition timestamps; one application can produce multiple events. Cumulative events count recorded transitions, not unique applications that reached a stage.",
              )}
            </p>
          </div>

          <aside
            className="grid grid-cols-2 gap-3 lg:grid-cols-1"
            aria-label={text("ملخص النطاق", "Scope summary")}
          >
            {metricRows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-border bg-neutral-50 dark:bg-neutral-900/50 p-3"
              >
                <p className="text-xs text-text-secondary">{row.label}</p>
                <strong className="mt-1 block text-2xl tabular-nums">
                  {number(row.value)}
                </strong>
                <RatioBar
                  value={row.value}
                  denominator={metrics.logged}
                  tone={row.tone}
                />
              </div>
            ))}
            <div className="col-span-2 rounded-xl border border-border p-3 lg:col-span-1">
              <p className="text-xs text-text-secondary">
                {text(
                  "معدل التقدم الإيجابي الموثق",
                  "Recorded positive progression rate",
                )}
              </p>
              <strong className="mt-1 block text-xl tabular-nums">
                {metrics.positiveRate === null
                  ? "—"
                  : `${number(metrics.positiveRate)}%`}
              </strong>
              <p className="text-xs text-text-secondary">
                {text(
                  "عدد الطلبات الإيجابية ÷ الطلبات المسجلة؛ مش معدل ردود سببي.",
                  "Positive applications divided by logged applications; not a causal response rate.",
                )}
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <header>
            <h2 className="font-bold">
              {text("توزيع المرحلة الحالية", "Current stage distribution")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {text(
                "كل طلب يظهر في مرحلته الحالية فقط. المقام هو الطلبات المسجلة في النطاق المحدد.",
                "Each application appears once in its current stage. The denominator is logged applications in the selected scope.",
              )}
            </p>
          </header>
          {metrics.logged === 0 ? (
            <p className="rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-4 text-sm text-text-secondary">
              {text(
                "لا توجد طلبات لتوزيعها بعد.",
                "There are no applications to distribute yet.",
              )}
            </p>
          ) : (
            <div className="space-y-3">
              {stageKeys.map((key) => {
                const value = metrics.stages[key];
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between gap-3 text-sm">
                      <span>{stageLabels[key]}</span>
                      <span className="tabular-nums">
                        {number(value)} ·{" "}
                        {number(Math.round((value / metrics.logged) * 100))}%
                      </span>
                    </div>
                    <RatioBar
                      value={value}
                      denominator={metrics.logged}
                      tone={key === "CLOSED" ? "amber" : "emerald"}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <header>
            <h2 className="font-bold">
              {text("النتائج النهائية الحالية", "Current final outcomes")}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {text(
                "الحالات دي متنافية في السجل الحالي ومجموعها يساوي الطلبات؛ المراحل التاريخية بتظهر لوحدها.",
                "These outcomes are mutually exclusive current states and sum to logged applications; historical stages are separate.",
              )}
            </p>
          </header>
          {metrics.logged === 0 ? (
            <p className="rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-4 text-sm text-text-secondary">
              {text(
                "النتائج هتظهر بعد تسجيل طلب.",
                "Outcomes will appear after applications are recorded.",
              )}
            </p>
          ) : (
            <div className="space-y-3">
              {outcomeKeys.map((key) => {
                const value = metrics.outcomes[key];
                const tone =
                  key === "ACCEPTED"
                    ? "emerald"
                    : key === "REJECTED" || key === "NO_RESPONSE"
                      ? "rose"
                      : "blue";
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between gap-3 text-sm">
                      <span>{outcomeLabels[key]}</span>
                      <span className="tabular-nums">
                        {number(value)} ·{" "}
                        {number(Math.round((value / metrics.logged) * 100))}%
                      </span>
                    </div>
                    <RatioBar
                      value={value}
                      denominator={metrics.logged}
                      tone={tone}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
        <header>
          <h2 className="font-bold">
            {text(
              "معالم الوصول المسجلة عبر التاريخ",
              "Recorded historical milestones",
            )}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {text(
              "دي طلبات لها دليل إنها وصلت للمعلم في المرحلة الحالية أو سجل الانتقالات. الأعداد ممكن تتداخل؛ ومفيش history كامل لكل السجلات القديمة.",
              "These applications have evidence of reaching a milestone in current state or transition history. Counts can overlap, and older transition history may be incomplete.",
            )}
          </p>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          {milestoneKeys.map((key) => {
            const value = metrics.milestones[key];
            return (
              <div key={key} className="rounded-xl border border-border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm">{milestoneLabels[key]}</span>
                  <strong className="text-xl tabular-nums">
                    {number(value)}
                  </strong>
                </div>
                <RatioBar
                  value={value}
                  denominator={metrics.logged}
                  tone="blue"
                />
                <p className="mt-1 text-xs text-text-secondary">
                  {metrics.logged
                    ? `${number(Math.round((value / metrics.logged) * 100))}% ${text("من الطلبات", "of applications")}`
                    : text("مفيش مقام للحساب", "No denominator yet")}
                </p>
              </div>
            );
          })}
        </div>
        {metrics.unknownInterviews > 0 && (
          <p
            role="note"
            className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
          >
            {text(
              "السجل لا يكفي لتحديد تاريخ مقابلة سابقة في",
              "Interview history is insufficient to determine whether an interview occurred for",
            )}{" "}
            {number(metrics.unknownInterviews)}{" "}
            {text(
              "طلبات. ما اعتبرناهاش صفر مقابلات.",
              "applications. They are not counted as zero interviews.",
            )}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
        <header className="flex items-start gap-3">
          <div className="rounded-lg bg-sky-50 p-2 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-bold">
              {text(
                "فترات التجهيز والنتائج المرصودة",
                "Preparation periods and observed results",
              )}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {text(
                "المقارنة تستخدم فترات الطلبات المسجلة بين تغييرات CV أو التغييرات المهنية المحفوظة. النتيجة الحالية محسوبة حتى",
                "This compares application cohorts between persisted CV uploads or professional changes. Current outcomes are measured as of",
              )}{" "}
              {formatDate(report.asOf, locale, true)}.
            </p>
          </div>
        </header>
        {report.periodComparisons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-neutral-50 dark:bg-neutral-900/50 p-5 text-sm text-text-secondary">
            {text(
              "لا توجد نقاط تغيير محفوظة تسمح بمقارنة فترات لسه. رفع CV فعلي أو تسجيل تغيير مهني هيضيف نقطة زمنية؛ مش بننشئ baseline افتراضي.",
              "There are no persisted change checkpoints for a period comparison yet. A real CV upload or saved professional change adds a timeline point; no baseline is invented.",
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {report.periodComparisons.map((period) => {
              const dateRange = `${formatDate(period.startAt, locale, true)} — ${period.endAt ? formatDate(period.endAt, locale, true) : text("حتى الآن", "to present")}`;
              return (
                <article
                  key={period.id}
                  className="rounded-xl border border-border p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">
                        {period.kind === "BEFORE_FIRST_CHECKPOINT"
                          ? text(
                              "قبل أول نقطة تغيير محفوظة",
                              "Before first recorded checkpoint",
                            )
                          : period.kind === "CV"
                            ? `${text("السيرة", "CV")} · ${period.title}`
                            : `${text("تغيير يدوي", "Manual change")} · ${period.title}`}
                      </h3>
                      <p className="text-xs text-text-secondary">{dateRange}</p>
                    </div>
                    <span className="rounded-full border border-border px-2 py-1 text-xs">
                      {number(period.metrics.logged)} {text("طلب", "apps")}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>
                          {text(
                            "طلبات أُنشئت في الفترة",
                            "Applications created in period",
                          )}
                        </span>
                        <span>{number(period.metrics.logged)}</span>
                      </div>
                      <RatioBar
                        value={period.metrics.logged}
                        denominator={maxPeriodApplications}
                        tone="blue"
                      />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>
                          {text(
                            "تقدم إيجابي موثق حاليًا",
                            "Currently recorded positive progression",
                          )}
                        </span>
                        <span>
                          {number(period.metrics.positive)}
                          {period.metrics.positiveRate === null
                            ? ""
                            : ` · ${number(period.metrics.positiveRate)}%`}
                        </span>
                      </div>
                      <RatioBar
                        value={period.metrics.positive}
                        denominator={maxPeriodApplications}
                        tone="emerald"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                    <span>
                      {text("مقابلات موثقة", "Interviews evidenced")}:{" "}
                      {number(period.metrics.interviews)}
                    </span>
                    <span>
                      {text("تكليفات", "Assignments")}:{" "}
                      {number(period.metrics.assignments)}
                    </span>
                    <span>
                      {text("نتائج غير مكتملة history", "Unknown history")}:{" "}
                      {number(period.metrics.unknownInterviews)}
                    </span>
                  </div>
                  {period.metrics.logged < 5 && (
                    <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      {text(
                        "عينة صغيرة؛ المقارنة وصفية ومش كفاية لاستنتاج نمط.",
                        "Small sample; this is descriptive and too limited to establish a pattern.",
                      )}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
        <p className="text-xs text-text-secondary">
          {text(
            "المقارنة تتبع وقت إنشاء الطلبات، وتعرض نتائجها الحالية كما في تاريخ اللقطة؛ وقت انتظار الرد مش موحد بين الفترات. الانتقالات اليومية تظهر في الرسم حسب وقتها الفعلي. مفيش إثبات إن الطلب استخدم CV معينة أو إن التغيير سبب اختلاف النتائج.",
            "Periods group applications by creation date and show their current outcomes as of the snapshot; response waiting time is not equal across periods. Daily transitions remain dated by their actual timestamps. This does not prove an application used a specific CV or that a change caused an outcome difference.",
          )}
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
        <header className="flex items-start gap-3">
          <div className="rounded-lg bg-violet-50 p-2 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-bold">
              {text(
                "إرشاد نواة من البيانات المتاحة",
                "Nawah guidance from available evidence",
              )}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {text(
                "ملاحظات وصفية، مش تشخيص آلي ولا ادعاء بسبب النتيجة.",
                "Descriptive observations, not an automated diagnosis or causal claim.",
              )}
            </p>
          </div>
        </header>
        <p>{guidance}</p>
        {metrics.unknownInterviews > 0 && (
          <p className="text-sm text-text-secondary">
            {text(
              "في سجلات قديمة مش كفاية لتحديد هل وصلت لمقابلة؛ تحديث المرحلة لو عندك معلومة أدق يساعد التقرير من غير تخمين.",
              "Some older records lack enough history to determine interview progression. Updating a stage when you have better information improves the report without guessing.",
            )}
          </p>
        )}
        <p className="text-sm text-text-secondary">
          {text(
            "التغييرات المسجلة هنا توقيتها مرتبط بفترات الملاحظة فقط؛ مش بيثبت استخدام CV أو portfolio بعينه ولا يثبت علاقة سببية.",
            "Recorded changes define observation periods only; they do not prove that a specific CV or portfolio was used or caused an outcome.",
          )}
        </p>
        {canNavigate && metrics.logged === 0 && (
          <Link
            className="text-emerald-700 underline dark:text-emerald-300"
            to="/applications"
          >
            {text("ابدأ بتسجيل أول طلب", "Log your first application")}
          </Link>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
        <header>
          <h2 className="font-bold">
            {text("تاريخ التغييرات والتجارب", "Change and experiment history")}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {text(
              "الخط الزمني يعرض السجلات المحفوظة فقط. رفع CV والمراجعة الأسبوعية والتغيير اليدوي أنواع منفصلة.",
              "This timeline shows persisted records only. CV uploads, weekly reflections, and manual changes remain distinct types.",
            )}
          </p>
        </header>
        {timeline.length ? (
          <ol className="relative space-y-3 border-s border-border ps-5">
            {timeline.map((item) => (
              <li
                key={item.id}
                className="relative rounded-xl border border-border bg-neutral-50 dark:bg-neutral-900/50 p-3"
              >
                <span
                  className="absolute -start-[1.65rem] top-4 h-3 w-3 rounded-full border-2 border-surface bg-emerald-600"
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong className="text-sm">{item.title}</strong>
                  <time
                    className="text-xs text-text-secondary"
                    dateTime={item.date}
                  >
                    {formatDate(item.date, locale, true)}
                  </time>
                </div>
                {item.body && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-text-secondary">
                    {item.body}
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-lg bg-neutral-50 dark:bg-neutral-900/50 p-4 text-sm text-text-secondary">
            {text(
              "مفيش CV أو تغييرات أو مراجعات محفوظة حتى الآن.",
              "No CV uploads, changes, or reflections are recorded yet.",
            )}
          </p>
        )}
      </section>
    </div>
  );
}
