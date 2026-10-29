import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownLeft,
  Copy,
  Eye,
  Link2,
  Megaphone,
  MousePointerClick,
  RefreshCw,
  Repeat2,
  UserCheck,
  Users,
} from "lucide-react";
import { useI18n } from "../../i18n";
import { useToast } from "../../components/ui/ToastProvider";
import { marketingApi } from "./marketing/marketingApi";
import "./marketing/marketing.css";

const COLORS = ["#145844", "#4f8068", "#8eac78", "#c3a15a"];

export default function AdminMarketingPage() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const text = (a: string, e: string) => (ar ? a : e);
  const toast = useToast();
  const [days, setDays] = useState(30);
  const [source, setSource] = useState("youtube");
  const [medium, setMedium] = useState("video");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const query = useQuery({
    queryKey: ["marketing-overview", days],
    queryFn: () => marketingApi.overview(days),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const data = query.data;
  const n = (value: number | null | undefined, digits = 0) =>
    value == null
      ? "—"
      : new Intl.NumberFormat(ar ? "ar-EG" : "en-GB", {
          maximumFractionDigits: digits,
        }).format(value);
  const duration = (seconds: number | null) =>
    seconds == null
      ? "—"
      : seconds < 60
        ? `${n(seconds)} ${text("ث", "sec")}`
        : `${n(seconds / 60, 1)} ${text("د", "min")}`;
  const dayLabel = (value: string) =>
    new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
      month: "short",
      day: "numeric",
      timeZone: "Africa/Cairo",
    }).format(new Date(`${value}T12:00:00Z`));
  const campaignUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL("/auth/register", window.location.origin);
    if (source.trim()) url.searchParams.set("utm_source", source.trim());
    if (medium.trim()) url.searchParams.set("utm_medium", medium.trim());
    if (campaign.trim()) url.searchParams.set("utm_campaign", campaign.trim());
    if (content.trim()) url.searchParams.set("utm_content", content.trim());
    return url.toString();
  }, [source, medium, campaign, content]);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(campaignUrl);
      toast.success(text("تم نسخ رابط الحملة", "Campaign link copied"));
    } catch {
      toast.error(text("تعذر النسخ؛ حدد الرابط وانسخه يدويًا.", "Could not copy; select the link and copy it manually."));
    }
  };

  if (query.isLoading)
    return (
      <div className="mk-loading" role="status">
        <RefreshCw className="animate-spin" />
        {text("نجمع صورة الزيارات والحملات…", "Building the acquisition view…")}
      </div>
    );
  if (query.isError || !data)
    return (
      <div className="mk-error" role="alert">
        <p>{text("تعذر تحميل متركس المركتنج.", "Could not load marketing metrics.")}</p>
        <button className="button-secondary" onClick={() => void query.refetch()}>
          {text("إعادة المحاولة", "Retry")}
        </button>
      </div>
    );

  const summary = data.summary;
  const peak = Math.max(1, ...data.hours.map((row) => row.sessions));
  const cards = [
    { label: text("الزوار المميزون", "Unique visitors"), value: n(summary.visitors), detail: text("متصفح مختلف داخل الفترة", "Distinct browsers in range"), icon: Users },
    { label: text("زوار لأول مرة", "First-time visitors"), value: n(summary.newVisitors), detail: `${n(summary.visitors ? (summary.newVisitors / summary.visitors) * 100 : 0, 1)}% ${text("من الزوار", "of visitors")}`, icon: ArrowDownLeft },
    { label: text("زوار عائدون", "Returning visitors"), value: n(summary.returningVisitors), detail: text("رجعوا في جلسة ثانية أو أكثر", "Returned for another session"), icon: Repeat2 },
    { label: text("الجلسات", "Sessions"), value: n(summary.sessions), detail: `${n(summary.pagesPerSession, 2)} ${text("صفحة/جلسة", "pages/session")}`, icon: MousePointerClick },
    { label: text("التسجيلات", "Sign-ups"), value: n(summary.signups), detail: `${n(summary.signupRate, 1)}% ${text("من الزوار", "visitor conversion")}`, icon: UserCheck },
    { label: text("نشطون الآن", "Active now"), value: n(data.realtime.active5m), detail: `${n(data.realtime.active30m)} ${text("خلال 30 دقيقة", "in 30 minutes")}`, icon: Activity },
    { label: text("مشاهدات الصفحات", "Page views"), value: n(summary.pageViews), detail: text("تشمل إعادة الزيارة والتحديث", "Includes revisits and reloads"), icon: Eye },
  ];

  return (
    <div className="mk-page">
      <section className="mk-hero">
        <div>
          <span className="mk-eyebrow"><Megaphone size={15} /> {text("مركز قياس النمو", "Acquisition command center")}</span>
          <h2>{text("اعرف كل حملة جابت كام زيارة، واتحوّلوا لإيه", "See the visits and conversions each campaign brought")}</h2>
          <p>{text("قراءة من أول زيارة مجهولة إلى التسجيل وإكمال الاستقبال، بدون تخزين IP أو بريد الزائر.", "Measure anonymous first touch through sign-up and onboarding, without storing visitor IP or email.")}</p>
        </div>
        <div className="mk-period" aria-label={text("الفترة", "Period")}>
          {[7, 30, 90].map((value) => (
            <button key={value} className={days === value ? "active" : ""} onClick={() => setDays(value)}>
              {value} {text("يوم", "days")}
            </button>
          ))}
          <button className="mk-refresh" aria-label={text("تحديث", "Refresh")} onClick={() => void query.refetch()}><RefreshCw size={15} /></button>
        </div>
      </section>

      <p className="mk-measurement-help">{text("الزائر الجديد قد يرجع خلال نفس الفترة فيُحسب أيضًا ضمن العائدين؛ لذلك مجموعهما قد يتجاوز الزوار المميزين. الجلسة تنتهي بعد 30 دقيقة دون نشاط. مصدر التحويل هو رابط الحملة في جلسة التحويل، والتسجيلات تشمل الحسابات الجديدة من البريد وGoogle.", "A new visitor can return in the same period and count in both categories. Sessions expire after 30 minutes without activity. Conversion attribution uses the campaign in the converting session. Sign-ups include new email and Google accounts.")}</p>

      <section className="mk-kpis">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <article className="mk-kpi" key={label}>
            <span><Icon size={18} /></span><p>{label}</p><strong>{value}</strong><small>{detail}</small>
          </article>
        ))}
      </section>

      <section className="mk-grid mk-grid-main">
        <article className="mk-panel mk-trend">
          <header><div><span>{text("حركة الوصول", "Acquisition trend")}</span><h3>{text("الجدد والعائدون والتحويل اليومي", "New, returning, and daily conversion")}</h3></div></header>
          <div className="mk-chart" dir="ltr" role="img" aria-label={text("رسم يومي للزوار الجدد والعائدين والتسجيلات؛ الأرقام متاحة في الجدول التالي.", "Daily new visitors, returning visitors, and sign-ups; values are available in the following table.")}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={data.trend} margin={{ top: 18, right: 12, left: -18, bottom: 2 }} accessibilityLayer>
                <defs>
                  <linearGradient id="newVisitors" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#145844" stopOpacity={0.3}/><stop offset="95%" stopColor="#145844" stopOpacity={0.02}/></linearGradient>
                  <linearGradient id="returningVisitors" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8eac78" stopOpacity={0.35}/><stop offset="95%" stopColor="#8eac78" stopOpacity={0.03}/></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#dbe7df" strokeDasharray="3 5" />
                <XAxis dataKey="date" tickFormatter={dayLabel} minTickGap={38} tick={{ fontSize: 10, fill: "#708077" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: "#708077" }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip labelFormatter={(v) => dayLabel(String(v))} contentStyle={{ borderRadius: 12, borderColor: "#c8d8ce", fontSize: 12 }}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
                <Area type="monotone" dataKey="newVisitors" name={text("جدد", "New")} stroke="#145844" fill="url(#newVisitors)" strokeWidth={2.5}/>
                <Area type="monotone" dataKey="returningVisitors" name={text("عائدون", "Returning")} stroke="#8eac78" fill="url(#returningVisitors)" strokeWidth={2}/>
                <Line type="monotone" dataKey="signups" name={text("تسجيل", "Sign-ups")} stroke="#b48935" strokeWidth={2.5} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <details className="mk-data-details"><summary>{text("عرض بيانات الرسم كجدول", "Show chart data as a table")}</summary><div className="mk-table-wrap"><table><thead><tr><th>{text("اليوم", "Day")}</th><th>{text("زوار", "Visitors")}</th><th>{text("جدد", "New")}</th><th>{text("عائدون", "Returning")}</th><th>{text("تسجيل", "Sign-ups")}</th></tr></thead><tbody>{data.trend.map(row => <tr key={row.date}><td>{dayLabel(row.date)}</td><td>{n(row.visitors)}</td><td>{n(row.newVisitors)}</td><td>{n(row.returningVisitors)}</td><td>{n(row.signups)}</td></tr>)}</tbody></table></div></details>
        </article>

        <article className="mk-panel mk-funnel">
          <header><span>{text("قمع التحويل", "Conversion funnel")}</span><h3>{text("من الزيارة إلى بداية الرحلة", "From visit to journey start")}</h3></header>
          <div className="mk-funnel-steps">
            {[
              [text("زائر مميز", "Unique visitor"), summary.visitors, 100],
              [text("أنشأ حسابًا", "Created account"), summary.signups, summary.signupRate],
              [text("أكمل الاستقبال", "Completed onboarding"), summary.onboarded, summary.visitors ? (summary.onboarded / summary.visitors) * 100 : 0],
            ].map(([label, value, percent], index) => (
              <div className="mk-funnel-step" key={String(label)}>
                <div><b>{index + 1}</b><span>{label}</span><strong>{n(Number(value))}</strong></div>
                <i><em style={{ width: `${Math.max(2, Math.min(100, Number(percent)))}%` }}/></i>
                <small>{n(Number(percent), 1)}%</small>
              </div>
            ))}
          </div>
          <div className="mk-secondary-metrics">
            <div><span>{text("جلسة بصفحة واحدة دون تحويل", "Single-page sessions without conversion")}</span><b>{n(summary.bounceRate, 1)}%</b></div>
            <div><span>{text("متوسط المدة المرصودة للجلسة", "Avg. observed session duration")}</span><b>{duration(summary.averageSessionSeconds)}</b></div>
          </div>
          <p className="mk-measurement-help">{text("المراحل تعرض ما حدث في الفترة المختارة؛ قد يُكمل شخص الاستقبال اليوم بعد تسجيله في فترة سابقة. المدة تُقدّر من الأحداث والتفاعل المرصود، ولا تشمل وقتًا غير مرصود بعد آخر حدث.", "Stages show events in the selected period; onboarding may follow a sign-up from an earlier period. Duration is estimated from observed events and activity, excluding unobserved time after the last event.")}</p>
        </article>
      </section>

      <section className="mk-grid mk-grid-half">
        <article className="mk-panel">
          <header><span>{text("مصادر الوصول", "Traffic sources")}</span><h3>{text("مين بيجيب الزيارات والتسجيلات؟", "Who brings visits and sign-ups?")}</h3></header>
          {data.sources.length ? (
            <div className="mk-chart mk-chart-small" dir="ltr">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={data.sources.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 14, left: 20, bottom: 0 }} accessibilityLayer>
                  <CartesianGrid horizontal={false} stroke="#e1e9e4" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="source" width={95} tick={{ fontSize: 10, fill: "#4d6256" }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#c8d8ce", fontSize: 12 }}/>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="visitors" name={text("زوار", "Visitors")} fill="#145844" radius={[0, 6, 6, 0]}/>
                  <Bar dataKey="signups" name={text("تسجيل", "Sign-ups")} fill="#c3a15a" radius={[0, 6, 6, 0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty ar={ar} />}
        </article>

        <article className="mk-panel">
          <header><span>{text("توزيع الأجهزة", "Device mix")}</span><h3>{text("أين يشاهد الناس الحملة؟", "Where do people see the campaign?")}</h3></header>
          {data.devices.length ? (
            <div className="mk-device-wrap">
              <div className="mk-device-chart" dir="ltr"><ResponsiveContainer width="100%" height="100%" minWidth={0}><PieChart><Pie data={data.devices} dataKey="visitors" nameKey="device" innerRadius={48} outerRadius={78} paddingAngle={3}>{data.devices.map((entry, index) => <Cell key={entry.device} fill={COLORS[index % COLORS.length]}/>)}</Pie><Tooltip contentStyle={{ borderRadius: 12, borderColor: "#c8d8ce", fontSize: 12 }}/></PieChart></ResponsiveContainer></div>
              <ul>{data.devices.map((row, index) => <li key={row.device}><i style={{ background: COLORS[index % COLORS.length] }}/><span>{row.device === "mobile" ? text("موبايل", "Mobile") : row.device === "tablet" ? text("تابلت", "Tablet") : text("ديسكتوب", "Desktop")}</span><b>{n(row.visitors)}</b></li>)}</ul>
            </div>
          ) : <Empty ar={ar} />}
        </article>
      </section>

      <section className="mk-panel mk-campaigns">
        <header><span>{text("أداء الحملات", "Campaign performance")}</span><h3>{text("قارن الفيديوهات والمنشورات بنفس معيار التحويل", "Compare videos and posts on the same conversion standard")}</h3></header>
        {data.campaigns.length ? (
          <div className="mk-table-wrap" tabIndex={0} aria-label={text("أداء الحملات، مرر أفقيًا لعرض الأعمدة", "Campaign performance, scroll horizontally for columns")}><table><thead><tr><th>{text("الحملة", "Campaign")}</th><th>{text("الفيديو / المحتوى", "Video / content")}</th><th>{text("المصدر / الوسيط", "Source / medium")}</th><th>{text("زوار", "Visitors")}</th><th>{text("جلسات", "Sessions")}</th><th>{text("تسجيل", "Sign-ups")}</th><th>{text("أكمل الاستقبال", "Onboarded")}</th><th>{text("التحويل", "Conversion")}</th></tr></thead><tbody>{data.campaigns.map((row) => <tr key={`${row.campaign}-${row.source}-${row.medium}-${row.content}`}><td><b>{row.campaign}</b></td><td>{row.content}</td><td>{row.source} <small>/ {row.medium}</small></td><td>{n(row.visitors)}</td><td>{n(row.sessions)}</td><td>{n(row.signups)}</td><td>{n(row.onboarded)}</td><td><span className="mk-rate">{n(row.signupRate, 1)}%</span></td></tr>)}</tbody></table></div>
        ) : <Empty ar={ar} />}
      </section>

      <section className="mk-grid mk-grid-half">
        <article className="mk-panel">
          <header><span>{text("وقت الذروة — القاهرة", "Peak time — Cairo")}</span><h3>{text("متى تنشر أو تدفع الحملة؟", "When should you publish or boost?")}</h3></header>
          <div className="mk-hours" dir="ltr">{data.hours.map((row) => <div key={row.hour} title={`${row.hour}:00 — ${row.sessions}`} style={{ "--heat": Math.max(0.08, row.sessions / peak), color: row.sessions / peak > 0.55 ? '#fff' : '#17372b' } as React.CSSProperties}><b>{String(row.hour).padStart(2, "0")}</b><span>{n(row.sessions)}</span></div>)}</div>
        </article>
        <article className="mk-panel">
          <header><span>{text("الصفحات الأكثر مشاهدة", "Top pages")}</span><h3>{text("أين يذهب الزائر بعد الوصول؟", "Where visitors go after landing")}</h3></header>
          {data.pages.length ? <ol className="mk-pages">{data.pages.map((row, index) => <li key={row.path}><b>{index + 1}</b><code dir="ltr">{row.path}</code><span><Eye size={13}/>{n(row.views)} <small>({n(row.visitors)} {text("زائر", "visitors")})</small></span></li>)}</ol> : <Empty ar={ar} />}
        </article>
      </section>

      <section className="mk-panel mk-builder">
        <header><span><Link2 size={14}/> {text("منشئ رابط الحملة", "Campaign URL builder")}</span><h3>{text("اعمل رابطًا مختلفًا لكل فيديو أو منشور", "Give every video or post its own measurable link")}</h3><p>{text("استخدم اسم حملة ثابت، وغيّر المحتوى لكل نسخة فيديو أو زر. هتظهر النتائج في الجدول فوق.", "Keep the campaign name stable and change content per video or CTA. Results will appear above.")}</p></header>
        <div className="mk-builder-fields">
          <label><span>utm_source</span><input value={source} onChange={(e) => setSource(e.target.value)} placeholder="youtube" dir="ltr"/></label>
          <label><span>utm_medium</span><input value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="video" dir="ltr"/></label>
          <label><span>utm_campaign</span><input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="launch_october" dir="ltr"/></label>
          <label><span>utm_content</span><input value={content} onChange={(e) => setContent(e.target.value)} placeholder="short_01" dir="ltr"/></label>
        </div>
        <div className="mk-link-output"><code dir="ltr">{campaignUrl}</code><button className="button-primary" onClick={() => void copyLink()}><Copy size={15}/>{text("نسخ الرابط", "Copy link")}</button></div>
      </section>

      <footer className="mk-note"><b>{text("حدود القياس:", "Measurement boundaries:")}</b> {text("الزائر المميز معرف مجهول محفوظ في المتصفح؛ مسح بيانات المتصفح يجعله يظهر كزائر جديد. الأرقام تبدأ من لحظة نشر هذه الخاصية ولا تعيد بناء زيارات قديمة.", "A unique visitor is an anonymous browser ID; clearing browser data makes that browser appear new. Metrics begin when this release is deployed and do not reconstruct historical visits.")}</footer>
    </div>
  );
}

function Empty({ ar }: { ar: boolean }) {
  return <div className="mk-empty">{ar ? "لسه مفيش بيانات كفاية في الفترة دي." : "Not enough data in this period yet."}</div>;
}
