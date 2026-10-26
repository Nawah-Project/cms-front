export type ChartMode = "period" | "cumulative";
export type ChartBucket = "day" | "week" | "month";

export interface DailyReportPoint {
  date: string;
  logged: number;
  positiveEvents: number;
}

export interface AnalyticsChartPoint {
  date: string;
  applications: number;
  progressionEvents: number;
  markerTitles: string[];
}

export interface ChangeMarker {
  date: string;
  title: string;
}

function parseUtcDay(value: string): Date | null {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfBucket(date: Date, bucket: ChartBucket): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  if (bucket === "week") {
    const mondayOffset = (result.getUTCDay() + 6) % 7;
    result.setUTCDate(result.getUTCDate() - mondayOffset);
  } else if (bucket === "month") {
    result.setUTCDate(1);
  }
  return result;
}

function advanceBucket(date: Date, bucket: ChartBucket): Date {
  const result = new Date(date);
  if (bucket === "day") result.setUTCDate(result.getUTCDate() + 1);
  else if (bucket === "week") result.setUTCDate(result.getUTCDate() + 7);
  else result.setUTCMonth(result.getUTCMonth() + 1);
  return result;
}

/**
 * Fills missing UTC dates, adds real change markers, and aggregates long histories
 * before cumulative values are calculated. It never invents activity values.
 */
export function buildAnalyticsChartRows(
  points: DailyReportPoint[],
  markers: ChangeMarker[],
  mode: ChartMode,
): { bucket: ChartBucket; rows: AnalyticsChartPoint[] } {
  const dates = [
    ...points.map((point) => parseUtcDay(point.date)).filter((date): date is Date => date !== null),
    ...markers.map((marker) => parseUtcDay(marker.date)).filter((date): date is Date => date !== null),
  ].sort((a, b) => a.getTime() - b.getTime());
  if (!dates.length) return { bucket: "day", rows: [] };

  const daySpan = Math.floor((dates.at(-1)!.getTime() - dates[0].getTime()) / 86_400_000) + 1;
  const bucket: ChartBucket = daySpan <= 90 ? "day" : daySpan <= 730 ? "week" : "month";
  const aggregates = new Map<string, AnalyticsChartPoint>();
  const dateKeyFor = (date: Date) => startOfBucket(date, bucket).toISOString().slice(0, 10);

  for (const point of points) {
    const date = parseUtcDay(point.date);
    if (!date) continue;
    const key = dateKeyFor(date);
    const row = aggregates.get(key) ?? { date: key, applications: 0, progressionEvents: 0, markerTitles: [] };
    row.applications += point.logged;
    row.progressionEvents += point.positiveEvents;
    aggregates.set(key, row);
  }
  for (const marker of markers) {
    const date = parseUtcDay(marker.date);
    if (!date) continue;
    const key = dateKeyFor(date);
    const row = aggregates.get(key) ?? { date: key, applications: 0, progressionEvents: 0, markerTitles: [] };
    row.markerTitles.push(marker.title);
    aggregates.set(key, row);
  }

  const first = startOfBucket(dates[0], bucket);
  const last = startOfBucket(dates.at(-1)!, bucket);
  const rows: AnalyticsChartPoint[] = [];
  for (let cursor = first; cursor <= last; cursor = advanceBucket(cursor, bucket)) {
    const key = cursor.toISOString().slice(0, 10);
    const row = aggregates.get(key) ?? { date: key, applications: 0, progressionEvents: 0, markerTitles: [] };
    rows.push({ ...row, markerTitles: [...row.markerTitles] });
  }

  if (mode === "cumulative") {
    let applications = 0;
    let progressionEvents = 0;
    return {
      bucket,
      rows: rows.map((row) => {
        applications += row.applications;
        progressionEvents += row.progressionEvents;
        return { ...row, applications, progressionEvents };
      }),
    };
  }
  return { bucket, rows };
}
