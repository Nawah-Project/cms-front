import { useEffect, useMemo, useState } from "react";
import {
  Bar,
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
import {
  buildAnalyticsChartRows,
  type AnalyticsChartPoint,
  type ChartMode,
  type ChangeMarker,
  type DailyReportPoint,
} from "./analytics-model";

type Props = {
  points: DailyReportPoint[];
  markers?: ChangeMarker[];
  compact?: boolean;
  showLowDataMessage?: boolean;
};

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload?: AnalyticsChartPoint }>;
};

function formatDate(value: string, locale: string, bucket: "day" | "week" | "month") {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
    day: bucket === "month" ? undefined : "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function ChartTooltip({
  active,
  payload,
  locale,
  bucket,
  text,
  number,
}: TooltipProps & {
  locale: string;
  bucket: "day" | "week" | "month";
  text: (ar: string, en: string) => string;
  number: (value: number) => string;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="max-w-64 rounded-xl border border-border bg-surface p-3 text-sm shadow-lg"
    >
      <p className="mb-2 font-semibold">{formatDate(row.date, locale, bucket)}</p>
      <p>{text("طلبات جديدة", "Applications recorded")}: {number(row.applications)}</p>
      <p>{text("انتقالات مراحل مسجلة", "Recorded stage transitions")}: {number(row.progressionEvents)}</p>
      {row.markerTitles.length > 0 && (
        <div className="mt-2 border-t border-border pt-2">
          <p className="font-medium text-amber-700 dark:text-amber-300">{text("نقطة تغيير محفوظة", "Persisted change checkpoint")}</p>
          {row.markerTitles.map((title) => <p key={title} className="mt-1 text-xs text-text-secondary">{title}</p>)}
        </div>
      )}
    </div>
  );
}

export default function ActivityResponseChart({ points, markers = [], compact = false }: Props) {
  const { locale, number } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => (ar ? a : e);
  const [mode, setMode] = useState<ChartMode>("period");
  const [showApplications, setShowApplications] = useState(true);
  const [showProgression, setShowProgression] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { bucket, rows } = useMemo(
    () => buildAnalyticsChartRows(points, markers, mode),
    [points, markers, mode],
  );
  const selected = rows.find((row) => row.date === selectedDate) ?? rows.at(-1);
  const heightClass = compact ? "h-[220px] sm:h-[245px]" : "h-[250px] sm:h-[320px]";

  if (!points.length && !markers.length) {
    return (
      <div className="flex min-h-28 items-center rounded-xl bg-neutral-50 px-4 py-3 text-sm text-text-secondary dark:bg-neutral-900/60">
        {text("مفيش نشاط زمني محفوظ في النطاق ده.", "No dated activity is recorded in this period.")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border p-1" role="group" aria-label={text("طريقة عرض النشاط", "Activity chart mode")}>
          {(["period", "cumulative"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`min-h-9 rounded-md px-3 text-sm font-medium transition-colors ${mode === value ? "bg-emerald-700 text-white" : "text-text-secondary hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
            >
              {value === "period" ? text("حسب الفترة", "By period") : text("تراكمي", "Cumulative")}
            </button>
          ))}
        </div>
        <p className="text-xs text-text-secondary">
          {bucket === "day" ? text("تجميع يومي · UTC", "Daily · UTC") : bucket === "week" ? text("تجميع أسبوعي · UTC", "Weekly · UTC") : text("تجميع شهري · UTC", "Monthly · UTC")}
        </p>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <label className="inline-flex min-h-8 cursor-pointer items-center gap-2">
          <input type="checkbox" checked={showApplications} onChange={(event) => setShowApplications(event.target.checked)} className="accent-emerald-700" />
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-600" aria-hidden="true" />
          {text("طلبات جديدة", "Applications")}
        </label>
        <label className="inline-flex min-h-8 cursor-pointer items-center gap-2">
          <input type="checkbox" checked={showProgression} onChange={(event) => setShowProgression(event.target.checked)} className="accent-sky-700" />
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-600" aria-hidden="true" />
          {text("انتقالات مراحل", "Stage transitions")}
        </label>
      </div>

      {!showApplications && !showProgression && (
        <p role="status" className="text-sm text-text-secondary">{text("اختار مقياس واحد على الأقل لعرضه.", "Select at least one series to display.")}</p>
      )}

      <div
        role="img"
        aria-label={text("رسم تفاعلي للطلبات المسجلة وانتقالات المراحل الفعلية حسب التاريخ. يوجد جدول بيانات بديل أسفل الرسم.", "Interactive chart of recorded applications and actual stage transitions by date. An accessible data table is available below.")}
        className={`${heightClass} w-full min-w-0`}
      >
        {!mounted ? (
          <div className="h-full rounded-xl bg-neutral-50 dark:bg-neutral-900/50" aria-hidden="true" />
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.12} strokeDasharray="3 5" />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => formatDate(value, locale, bucket)}
                minTickGap={18}
                tick={{ fontSize: 11, fill: "currentColor" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip locale={locale} bucket={bucket} text={text} number={number} />} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
              {showApplications && <Bar dataKey="applications" name={text("طلبات جديدة", "Applications")} fill="#125e4e" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />}
              {showProgression && <Line dataKey="progressionEvents" name={text("انتقالات مراحل", "Stage transitions")} type="monotone" stroke="#174c87" strokeWidth={2.5} dot={{ r: 2.5, fill: "#174c87" }} activeDot={{ r: 5 }} isAnimationActive={false} />}
              {rows.filter((row) => row.markerTitles.length > 0).map((row) => (
                <ReferenceDot key={`${row.date}-${row.markerTitles.join("|")}`} x={row.date} y={0} r={5} fill="#e7b85a" stroke="#8b641b" />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {selected && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-900/60">
          <label className="flex items-center gap-2">
            <span className="text-text-secondary">{text("تفاصيل فترة", "Inspect period")}</span>
            <select className="field-control min-h-9 w-auto py-1" value={selectedDate || selected.date} onChange={(event) => setSelectedDate(event.target.value)}>
              {rows.map((row) => <option key={row.date} value={row.date}>{formatDate(row.date, locale, bucket)}</option>)}
            </select>
          </label>
          <span>{text("الطلبات", "Applications")}: <strong className="tabular-nums">{number(selected.applications)}</strong></span>
          <span>{text("انتقالات مراحل", "Stage transitions")}: <strong className="tabular-nums">{number(selected.progressionEvents)}</strong></span>
          {selected.markerTitles.length > 0 && <span className="text-amber-800 dark:text-amber-300">{selected.markerTitles.join(" · ")}</span>}
        </div>
      )}

      <details className="text-sm">
        <summary className="min-h-9 cursor-pointer py-2 font-medium text-emerald-800 underline underline-offset-2 dark:text-emerald-300">
          {text("عرض جدول البيانات", "View data table")}
        </summary>
        <div className="max-h-72 overflow-auto rounded-lg border border-border">
          <table className="w-full min-w-[34rem] border-collapse text-start text-sm">
            <caption className="sr-only">{text("القيم الفعلية حسب الفترة", "Observed values by period")}</caption>
            <thead className="sticky top-0 bg-neutral-100 text-text-secondary dark:bg-neutral-800">
              <tr>
                <th scope="col" className="p-2 text-start">{text("التاريخ", "Date")}</th>
                <th scope="col" className="p-2 text-start">{text("طلبات جديدة", "Applications")}</th>
                <th scope="col" className="p-2 text-start">{text("انتقالات مراحل", "Stage transitions")}</th>
                <th scope="col" className="p-2 text-start">{text("نقاط التغيير", "Change checkpoints")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.date} className="border-t border-border">
                  <th scope="row" className="p-2 text-start font-medium"><time dateTime={row.date}>{formatDate(row.date, locale, bucket)}</time></th>
                  <td className="p-2 tabular-nums">{number(row.applications)}</td>
                  <td className="p-2 tabular-nums">{number(row.progressionEvents)}</td>
                  <td className="p-2">{row.markerTitles.length ? row.markerTitles.join(" · ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
