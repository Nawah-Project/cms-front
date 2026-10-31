import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OpsPoint } from "./operationsApi";
type Channel = { key: keyof OpsPoint; label: string; color: string };
export function OperationsChart({
  title,
  description,
  points,
  channels,
  limits = [],
  ar,
  unit = "",
  percent = false,
}: {
  title: string;
  description: string;
  points: OpsPoint[];
  channels: Channel[];
  limits?: { value: number; label: string; color: string }[];
  ar: boolean;
  unit?: string;
  percent?: boolean;
}) {
  const time = (value: string) =>
    new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
      timeZone: "Africa/Cairo",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  const hasData = points.some((p) => channels.some((c) => p[c.key] != null));
  return (
    <section className="ops-chart ops-card">
      <header>
        <h3>{title}</h3>
        <p>{description}</p>
        {limits.length > 0 && (
          <div className="ops-chart-limits">
            {limits.map((l) => (
              <span key={l.label}>
                <i style={{ borderColor: l.color }} />
                {l.label}:{" "}
                <b>
                  {new Intl.NumberFormat(ar ? "ar-EG" : "en-GB").format(
                    l.value,
                  )}
                </b>{" "}
                {unit}
              </span>
            ))}
          </div>
        )}
      </header>
      {!hasData ? (
        <div className="ops-chart-empty" role="status">
          {ar
            ? "لم تُجمع عينات لهذا المؤشر بعد. لن تُعرض أرقام مفترضة."
            : "No samples for this metric yet. No values are fabricated."}
        </div>
      ) : (
        <>
          <div className="ops-chart-plot" dir="ltr">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart
                data={points}
                margin={{ top: 18, right: 14, left: 0, bottom: 6 }}
                accessibilityLayer
              >
                <CartesianGrid
                  stroke="#e4ece6"
                  strokeDasharray="3 5"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tickFormatter={time}
                  minTickGap={45}
                  tick={{ fill: "#73847b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  width={48}
                  domain={percent ? [0, 100] : [0, "auto"]}
                  tick={{ fill: "#73847b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(v) =>
                    new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
                      timeZone: "Africa/Cairo",
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(String(v)))
                  }
                  formatter={(v: any, name: any) => [
                    typeof v === "number"
                      ? unit === "ms" && v > 30000
                        ? "> 30,000 ms"
                        : `${Math.round(v * 100) / 100} ${unit}`
                      : "—",
                    name,
                  ]}
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "#c9dbd0",
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="plainline"
                  wrapperStyle={{ fontSize: 11, paddingTop: 14 }}
                />
                {limits.map((l) => (
                  <ReferenceLine
                    key={l.label}
                    y={l.value}
                    stroke={l.color}
                    strokeDasharray="5 5"
                    ifOverflow="extendDomain"
                    label={{
                      value: l.label,
                      fill: l.color,
                      fontSize: 9,
                      position: "insideTopRight",
                    }}
                  />
                ))}
                {channels.map((c) => (
                  <Line
                    key={String(c.key)}
                    type="linear"
                    dataKey={c.key}
                    name={c.label}
                    stroke={c.color}
                    strokeWidth={2.5}
                    dot={points.length < 3 ? { r: 3 } : false}
                    activeDot={{ r: 4 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <details className="ops-chart-data">
            <summary>
              {ar ? "عرض جدول القيم" : "View accessible data table"}
            </summary>
            <div className="ops-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{ar ? "وقت القاهرة" : "Cairo time"}</th>
                    {channels.map((c) => (
                      <th key={c.label}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.time}>
                      <td>{time(p.time)}</td>
                      {channels.map((c) => (
                        <td key={c.label}>
                          {typeof p[c.key] === "number"
                            ? unit === "ms" && Number(p[c.key]) > 30000
                              ? "> 30,000"
                              : Math.round(Number(p[c.key]) * 100) / 100
                            : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
