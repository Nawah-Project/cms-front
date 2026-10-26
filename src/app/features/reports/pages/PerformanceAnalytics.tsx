import { AnchoredSelect } from "../../../components/ui/AnchoredSelect";
import { useEffect, useId, useMemo, useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  FileText,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "../../../i18n";
import type { Metrics, Report } from "./ReportsPage";
import { FeatureTour } from "../../../components/FeatureTour";
import { ANALYTICS_TOUR } from "../../journey/lib/week-one-tours";
import { analyticsAccess, ChangeLab } from "./JourneyAnalytics";

type Props = {
  report: Report;
  metrics: Metrics;
  canNavigate: boolean;
  admin?: boolean;
  onAddUpdate: () => void;
};

function dateLabel(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function ProgressChart({ report, admin }: { report: Report; admin: boolean }) {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const t = (a: string, e: string) => (ar ? a : e);
  const [scope, setScope] = useState("ALL");
  const [mounted, setMounted] = useState(false);
  const gradient = useId().replace(/:/g, "");
  useEffect(() => setMounted(true), []);
  const periods = report.periodComparisons.filter(
    (p) =>
      admin || analyticsAccess(report).freeChanges || p.kind !== "USER_CHANGE",
  );
  const period = periods.find((p) => p.id === scope);
  const markers = [
    ...report.cvs.map((c) => ({
      date: c.uploadedAt.slice(0, 10),
      title: `CV ${Math.max(0, c.versionNumber - 1)}`,
    })),
    ...report.activities
      .filter(
        (a) =>
          a.type === "USER_CHANGE" &&
          (admin || analyticsAccess(report).freeChanges),
      )
      .map((a) => ({
        date: a.createdAt.slice(0, 10),
        title: t("تحديث محفوظ", "Saved update"),
      })),
  ];
  const data = useMemo(() => {
    const days = new Map<
      string,
      { date: string; logged: number; positive: number }
    >();
    if (period?.applications) {
      for (const app of period.applications) {
        const key = app.createdAt.slice(0, 10);
        const row = days.get(key) ?? { date: key, logged: 0, positive: 0 };
        row.logged++;
        row.positive += Number(app.positive === true);
        days.set(key, row);
      }
    } else {
      for (const point of report.dailyCohorts ??
        report.daily.map((d) => ({
          date: d.date,
          logged: d.logged,
          positive: 0,
        })))
        days.set(point.date, { ...point });
    }
    for (const checkpoint of [
      ...report.cvs.map((c) => ({ at: c.uploadedAt })),
      ...report.activities
        .filter(
          (a) =>
            a.type === "USER_CHANGE" &&
            (admin || analyticsAccess(report).freeChanges),
        )
        .map((a) => ({ at: a.createdAt })),
    ]) {
      if (
        period &&
        (new Date(checkpoint.at) < new Date(period.startAt) ||
          (period.endAt && new Date(checkpoint.at) >= new Date(period.endAt)))
      )
        continue;
      const key = checkpoint.at.slice(0, 10);
      if (!days.has(key)) days.set(key, { date: key, logged: 0, positive: 0 });
    }
    const actual = [...days.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    if (!actual.length) return [];
    // A separate labelled origin is a cumulative zero, never a fabricated activity day.
    const rows: {
      date: string;
      logged: number;
      positive: number;
      origin?: boolean;
    }[] = [{ date: "origin", logged: 0, positive: 0, origin: true }];
    let logged = 0,
      positive = 0;
    for (const point of actual) {
      logged += point.logged;
      positive += point.positive;
      rows.push({ ...point, logged, positive });
    }
    return rows;
  }, [
    period,
    report.daily,
    report.dailyCohorts,
    report.cvs,
    report.activities,
    admin,
  ]);
  const total = period?.metrics ?? report.overall;

  return (
    <section data-guide="analytics-chart" className="overflow-hidden rounded-2xl border border-border bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div>
          <h2 className="text-lg font-bold">
            {t(
              "منحنى التقدم واستجابة الطلبات",
              "Application progress over time",
            )}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {t(
              "تطور الطلبات المسجلة والطلبات اللي فيها تقدم إيجابي حاليًا، مع نقاط التغيير المحفوظة.",
              "Recorded applications and applications with current positive progression, alongside saved change checkpoints.",
            )}
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-text-secondary dark:bg-neutral-800">
          {t("عرض تراكمي", "Cumulative view")}
        </span>
      </header>
      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="grid min-w-0 grid-cols-2 gap-2 lg:block">
          <label className="col-span-2 block rounded-xl border border-border p-3 text-xs text-text-secondary sm:p-4">
            {t("النطاق المعروض", "Displayed period")}
            <AnchoredSelect className="mt-2 w-full" label={t("نطاق المنحنى","Chart period")} value={period?.id??"ALL"} onChange={setScope} options={[{value:"ALL",label:t("كل الرحلة","Whole journey")},...periods.map((p,i)=>({value:p.id,label:p.kind==="CV"?p.title:p.kind==="BEFORE_FIRST_CHECKPOINT"?t("قبل أول تعديل","Before first change"):t(`تحديث ${number(i+1)}`,`Update ${number(i+1)}`)}))]} />
          </label>
          <div className="rounded-xl border border-border p-3 sm:p-4 lg:mt-3">
            <p className="text-xs text-text-secondary">
              {t("طلبات مسجلة", "Applications recorded")}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums sm:mt-2 sm:text-3xl">
              {number(total.logged)}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {number(total.logged - total.stages.CLOSED)} {t("مفتوح", "open")}{" "}
              · {number(total.stages.CLOSED)} {t("مغلق", "closed")}
            </p>
          </div>
          <div className="rounded-xl border border-border p-3 sm:p-4 lg:mt-3">
            <p className="text-xs text-text-secondary">
              {t(
                "طلبات بتقدم إيجابي موثق",
                "Applications with positive progression",
              )}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums sm:mt-2 sm:text-3xl text-sky-800 dark:text-sky-300">
              {number(total.positive)}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {total.positiveRate === null
                ? "—"
                : `${number(total.positiveRate)}%`}{" "}
              {t("من طلبات النطاق", "of this period's applications")}
            </p>
          </div>
        </div>
        <div className="min-w-0 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900/40">
          {data.length ? (
            <>
              <div
                role="img"
                aria-label={t(
                  "النمو التراكمي للطلبات والتقدم الحالي. جدول البيانات متاح أسفل الرسم.",
                  "Cumulative applications and current progression. A data table follows.",
                )}
                className="h-[220px] sm:h-[340px]"
              >
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <ComposedChart
                      data={data}
                      margin={{ top: 20, left: 0, right: 12, bottom: 10 }}
                    >
                      <defs>
                        <linearGradient
                          id={gradient}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#059669"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="100%"
                            stopColor="#059669"
                            stopOpacity={0.015}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        vertical={false}
                        stroke="currentColor"
                        strokeOpacity={0.1}
                        strokeDasharray="3 5"
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v) =>
                          v === "origin"
                            ? t("نقطة الانطلاق", "Starting point")
                            : dateLabel(v, locale)
                        }
                        minTickGap={35}
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        width={34}
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        labelFormatter={(v) =>
                          v === "origin"
                            ? t("نقطة الانطلاق", "Starting point")
                            : dateLabel(String(v), locale)
                        }
                      />
                      <Area
                        dataKey="logged"
                        name={t("طلبات مسجلة", "Applications recorded")}
                        type="linear"
                        stroke="#059669"
                        strokeWidth={3}
                        fill={`url(#${gradient})`}
                        isAnimationActive={false}
                      />
                      {report.dailyCohorts && (
                        <Line
                          dataKey="positive"
                          name={t(
                            "طلبات بتقدم إيجابي حالي",
                            "Applications with current progression",
                          )}
                          type="linear"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          strokeDasharray="5 4"
                          dot={false}
                          isAnimationActive={false}
                        />
                      )}
                      {markers
                        .filter((m) => data.some((d) => d.date === m.date))
                        .map((m, i) => (
                          <ReferenceDot
                            key={`${m.date}-${i}`}
                            x={m.date}
                            y={data.find((d) => d.date === m.date)?.logged ?? 0}
                            r={5}
                            fill="#d97706"
                            stroke="white"
                          />
                        ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-text-secondary">
                <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-700" aria-hidden="true" />{t("طلبات مسجلة", "Applications recorded")}</span>
                {report.dailyCohorts && (
                  <span className="text-indigo-700 dark:text-indigo-300">
                    <i className="inline-block w-4 border-t-2 border-dashed border-indigo-600" aria-hidden="true" /> {t("تقدم إيجابي حالي", "Current positive progression")}
                  </span>
                )}
                <span className="text-amber-700 dark:text-amber-300">
                  <i className="inline-block h-2.5 w-2.5 rounded-full bg-amber-600" aria-hidden="true" /> {t("تغيير محفوظ", "Saved change")}
                </span>
              </div>
              <details className="mt-3 text-xs">
                <summary className="min-h-9 cursor-pointer py-2 font-medium underline">
                  {t("عرض جدول البيانات", "View data table")}
                </summary>
                <div className="max-h-48 overflow-auto">
                  <table className="w-full text-start">
                    <thead>
                      <tr>
                        <th className="p-2 text-start">
                          {t("التاريخ", "Date")}
                        </th>
                        <th className="p-2 text-start">
                          {t("طلبات تراكمية", "Cumulative applications")}
                        </th>
                        {report.dailyCohorts && (
                          <th className="p-2 text-start">
                            {t("تقدم حالي", "Current progression")}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {data
                        .filter((d) => !d.origin)
                        .map((d) => (
                          <tr key={d.date}>
                            <td className="p-2">
                              <time dateTime={`${d.date}T00:00:00Z`}>
                                {dateLabel(d.date, locale)}
                              </time>
                            </td>
                            <td className="p-2">{number(d.logged)}</td>
                            {report.dailyCohorts && (
                              <td className="p-2">{number(d.positive)}</td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          ) : (
            <div className="flex min-h-60 items-center justify-center p-6 text-center text-sm text-text-secondary">
              {t(
                "سجّل أول طلب عشان تبدأ متابعة تقدمك هنا.",
                "Record your first application to start your progress chart.",
              )}
            </div>
          )}
        </div>
      </div>
      <p className="border-t border-border px-5 py-3 text-xs leading-5 text-text-secondary">
        {t(
          "التقدم الإيجابي هو دليل محفوظ على تكليف أو مقابلة أو قرار أو قبول. المنحنى يجمّع الطلبات بتاريخ تسجيلها ويعرض وضعها الحالي؛ لا يعرض تاريخ وصول الرد.",
          "Positive progression requires saved assignment, interview, decision or acceptance evidence. The chart groups applications by recording date and shows their current status, not when replies arrived.",
        )}
      </p>
    </section>
  );
}

export default function PerformanceAnalytics({
  report,
  metrics,
  admin = false,
  onAddUpdate,
}: Props) {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const t = (a: string, e: string) => (ar ? a : e);
  const access = analyticsAccess(report);
  const cards = [
    {
      label: t("طلبات مسجلة", "Applications recorded"),
      value: metrics.logged,
      detail: access.tailoring
        ? t(
            `${number(metrics.tailored)} طلبات مخصصة`,
            `${number(metrics.tailored)} tailored applications`,
          )
        : t(
            "كل طلب بتسجّله هو خطوة جديدة.",
            "Every recorded application is a new step.",
          ),
      icon: BriefcaseBusiness,
    },
    {
      label: t("تقدم إيجابي موثق", "Positive progression evidence"),
      value: metrics.positive,
      detail:
        metrics.positiveRate === null
          ? t(
              "يظهر المعدل بعد تسجيل طلبات.",
              "A rate appears once applications are recorded.",
            )
          : t(
              `${number(metrics.positiveRate)}% من ${number(metrics.logged)} طلبات`,
              `${number(metrics.positiveRate)}% of ${number(metrics.logged)} applications`,
            ),
      icon: TrendingUp,
    },
    {
      label: t("وصلت لمقابلة", "Reached interview"),
      value: metrics.interviews,
      detail: t(
        "المقابلات المثبتة في سجلات طلباتك.",
        "Interviews evidenced in your application records.",
      ),
      icon: Activity,
    },
    ...(admin || access.publishing
      ? [
          {
            label: t("منشورات موثقة", "Recorded posts"),
            value: metrics.posts,
            detail: t(
              "المنشورات اللي سجّلتها بالفعل.",
              "Posts you have actually recorded.",
            ),
            icon: FileText,
          },
        ]
      : []),
    ...(admin || access.networking
      ? [
          {
            label: t("تواصل مهني موثق", "Recorded outreach"),
            value: metrics.outreach,
            detail: t(
              "محاولات التواصل اللي سجّلتها بالفعل.",
              "Outreach you have actually recorded.",
            ),
            icon: Activity,
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-5">
      <FeatureTour feature="analytics-week1-v1" enabled={!admin} steps={ANALYTICS_TOUR} />
      <section data-guide="analytics-summary">
        <div className="mb-3">
          <h2 className="text-lg font-semibold">
            {t("ملخص الأداء", "Performance overview")}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {t(
              "الأرقام المتاحة ليك في مرحلتك الحالية، من نشاطك المسجل.",
              "Insights available at your current stage, based on recorded activity.",
            )}
          </p>
        </div>
        <div
          className={`grid grid-cols-3 gap-2 sm:gap-3 sm:grid-cols-2 ${cards.length === 3 ? "xl:grid-cols-3" : cards.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-5"}`}
        >
          {cards.map((c) => (
            <article
              key={c.label}
              className="min-w-0 rounded-xl border border-border bg-surface p-2.5 sm:p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="min-h-8 text-[11px] leading-4 text-neutral-700 sm:min-h-0 sm:text-sm dark:text-neutral-200">{c.label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums sm:mt-2 sm:text-3xl">
                    {number(c.value)}
                  </p>
                </div>
                <span className="hidden sm:block rounded-lg bg-emerald-50 p-2 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  <c.icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-text-secondary sm:mt-3 sm:text-xs sm:leading-5">
                {c.detail}
              </p>
            </article>
          ))}
        </div>
      </section>
      <ProgressChart report={report} admin={admin} />
      <ChangeLab report={report} admin={admin} onAddUpdate={onAddUpdate} />
    </div>
  );
}
