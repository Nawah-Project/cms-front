import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Clock3,
  Cpu,
  Database,
  Download,
  HardDrive,
  Mail,
  Pause,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
  Wifi,
  Zap,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useI18n } from "../../i18n";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/ToastProvider";
import { adminApi } from "./api/adminApi";
import { operationsApi, type OpsSettings } from "./operations/operationsApi";
import { OperationsChart } from "./operations/OperationsChart";
import "./operations/operations.css";
type Tab = "overview" | "resources" | "delivery";
export default function AdminOperationsPage() {
  const { locale } = useI18n(),
    ar = locale === "ar",
    text = (a: string, e: string) => (ar ? a : e);
  const qc = useQueryClient(),
    toast = useToast();
  const [minutes, setMinutes] = useState(1440),
    [tab, setTab] = useState<Tab>("overview"),
    [guide, setGuide] = useState(false),
    [draft, setDraft] = useState<OpsSettings | null>(null),
    [confirm, setConfirm] = useState<
      "settings" | "pause" | "cleanup" | "processor" | "email" | null
    >(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const q = useQuery({
    queryKey: ["operations-console", minutes],
    queryFn: () => operationsApi.overview(minutes),
    staleTime: 15000,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });
  const n = (v: number | null | undefined, digits = 0) =>
    v == null
      ? "—"
      : new Intl.NumberFormat(ar ? "ar-EG" : "en-GB", {
          maximumFractionDigits: digits,
        }).format(v);
  const latency = (v: number | null | undefined) =>
    v != null && v > 30000 ? "> " + n(30000) : n(v);
  const stamp = (v: string | null | undefined) =>
    v
      ? new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
          timeZone: "Africa/Cairo",
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(v))
      : "—";
  const clock = (v: string) =>
    new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
      timeZone: "Africa/Cairo",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(v));
  const bytes = (v: number | null | undefined) =>
    v == null
      ? "—"
      : v >= 1073741824
        ? n(v / 1073741824, 2) + " GiB"
        : n(v / 1048576, 2) + " MiB";
  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["operations-console"] });
  const data = q.data,
    s = data?.settings,
    last = data?.latest;
  const critical = data?.alerts.filter((a) => a.severity === "CRITICAL") ?? [],
    warning = data?.alerts.filter((a) => a.severity === "WARNING") ?? [];
  const sourceUnknown = !last?.host.available || last.host.cpu == null;
  const state =
    data?.coverage.stale || q.isError
      ? "UNKNOWN"
      : critical.length
        ? "CRITICAL"
        : warning.length
          ? "WARNING"
          : sourceUnknown
            ? "UNKNOWN"
            : "OK";
  const stateText = {
    OK: text(
      "المؤشرات داخل حدودك الحالية",
      "Within your current operating thresholds",
    ),
    WARNING: text("في مؤشرات تستحق المتابعة", "Some signals need attention"),
    CRITICAL: text(
      "خفّض القبول وراجع سبب التشبع",
      "Slow admission and inspect the bottleneck",
    ),
    UNKNOWN: text(
      "القراءة غير مكتملة أو قديمة",
      "Readings are incomplete or stale",
    ),
  };
  const names: Record<string, string> = {
    mailDaily: text("حصة البريد اليومية", "Daily mail budget"),
    mailMonthly: text("حصة البريد الشهرية", "Monthly mail budget"),
    mailFailed: text("محاولات بريد فاشلة حديثة", "Recent failed mail attempts"),
    active: text("النشطون الآن", "Active accounts"),
    clientLatency: text("زمن الطلب عند المستخدم", "Browser API latency"),
    latency: text("زمن الاستجابة", "Response latency"),
    errors: text("أخطاء الخادم", "Server errors"),
    cpu: text("المعالج", "CPU"),
    memory: text("الذاكرة", "Memory"),
    cv: text("حصة ملفات CV", "CV allocation"),
    disk: text("مساحة القرص الآمنة", "Disk reserve"),
    loop: text("انشغال عملية API", "API event loop"),
    connections: text("اتصالات قاعدة البيانات", "Database connections"),
    database: text("اتصال قاعدة البيانات", "Database availability"),
    frontend: text("استجابة الفرونت الداخلية", "Internal frontend probe"),
    tunnel: text("اتصال Cloudflare Tunnel", "Cloudflare Tunnel connection"),
    fewErrors: text("أخطاء في عينة صغيرة", "Errors in a small sample"),
  };
  const startEdit = () => {
    if (s) {
      setDraft({ ...s });
      setError("");
    }
  };
  const action = async () => {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      if (confirm === "settings" && draft) await operationsApi.save(draft);
      else if (confirm === "pause")
        await operationsApi.save({ ...data.settings, admissionMode: "PAUSED" });
      else if (confirm === "cleanup") {
        const r = await adminApi.cleanupOrphanedFiles();
        toast.success(
          text(
            `تم حذف ${r.deletedCount} ملف غير مرتبط، وتحرير ${bytes(r.freedBytes)}.`,
            `Removed ${r.deletedCount} unreferenced files; freed ${bytes(r.freedBytes)}.`,
          ),
        );
      } else if (confirm === "processor")
        await adminApi.runNoResponseProcessor();
      else if (confirm === "email") await adminApi.sendTestEmail();
      if (confirm === "settings" || confirm === "pause")
        toast.success(
          text("اتحفظت إعدادات التشغيل.", "Operating settings saved."),
        );
      setConfirm(null);
      setDraft(null);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : text(
              "تعذر تنفيذ الإجراء. حدّث البيانات وحاول مرة أخرى.",
              "Could not complete the operation. Refresh and retry.",
            ),
      );
    } finally {
      setBusy(false);
    }
  };
  const exportCsv = () => {
    if (!data) return;
    const rows = [
      [
        "cairo_time",
        "active_5m_peak",
        "requests_per_second",
        "successful_api_p95_ms",
        "browser_api_p95_ms",
        "server_error_percent",
        "cpu_percent",
        "memory_percent",
        "nic_tx_mbps",
        "nic_rx_mbps",
        "cv_mib",
      ],
      ...data.series.map((p) => [
        stamp(p.time),
        p.active,
        p.rps,
        p.p95 != null && p.p95 > 30000 ? ">30000" : p.p95,
        p.clientP95 != null && p.clientP95 > 30000 ? ">30000" : p.clientP95,
        p.errors,
        p.cpu,
        p.memory,
        p.tx,
        p.rx,
        p.cvMiB,
      ]),
    ];
    const blob = new Blob(
        [
          "\ufeff" +
            rows
              .map((row) =>
                row
                  .map((v) => '"' + String(v ?? "").replaceAll('"', '""') + '"')
                  .join(","),
              )
              .join("\r\n"),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "nawah-operations.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const fields: [keyof OpsSettings, string, string][] = [
    [
      "maxMembers",
      text("سقف الحسابات للقبول المحدود", "Limited-admission account cap"),
      text(
        "لا يُفعّل إلا عند اختيار «محدود». لا يحذف حسابات موجودة.",
        "Only enforced in LIMITED mode; existing accounts are retained.",
      ),
    ],
    [
      "cvQuotaMiB",
      text("حصة تخزين CV بالميجا (MiB)", "CV storage allocation (MiB)"),
      text(
        "حد فعلي لإجمالي الملفات الفريدة الحالية والتاريخية.",
        "Enforced allocation for unique current and historical files.",
      ),
    ],
    [
      "diskReserveMiB",
      text("مساحة القرص المحجوزة للأمان (MiB)", "Minimum disk reserve (MiB)"),
      text(
        "يتوقف رفع ملفات جديدة قبل النزول عن هذا المتبقي.",
        "New CV uploads stop before free space drops below this reserve.",
      ),
    ],
    [
      "uplinkMbps",
      text("سرعة الرفع المرجعية (Mbps)", "Reference uplink speed (Mbps)"),
      text(
        "مرجع يدوي للرسم؛ لا يغيّر سرعة اتصالك.",
        "A manual chart reference; does not change your connection.",
      ),
    ],
    [
      "activeWarn",
      text("تحذير النشطين", "Active warning"),
      text(
        "حد قرار تشغيلي تختاره؛ ليس نتيجة اختبار ضغط.",
        "Your operating target, not a load-tested capacity.",
      ),
    ],
    ["activeCritical", text("خطر النشطين", "Active critical"), ""],
    [
      "latencyWarnMs",
      text("تحذير P95 بالملّي ثانية", "P95 warning (ms)"),
      text("للردود الناجحة من API فقط.", "Successful API responses only."),
    ],
    [
      "latencyCriticalMs",
      text("خطر P95 بالملّي ثانية", "P95 critical (ms)"),
      "",
    ],
    [
      "errorWarnPercent",
      text("تحذير أخطاء 5xx (%)", "5xx warning (%)"),
      text(
        "تُقيّم النسبة بعد 20 طلبًا في العينة.",
        "Percentage assessed after 20 requests in the sample.",
      ),
    ],
    ["errorCriticalPercent", text("خطر أخطاء 5xx (%)", "5xx critical (%)"), ""],
    ["cpuWarn", text("تحذير المعالج (%)", "CPU warning (%)"), ""],
    ["cpuCritical", text("خطر المعالج (%)", "CPU critical (%)"), ""],
    ["memoryWarn", text("تحذير الذاكرة (%)", "Memory warning (%)"), ""],
    ["memoryCritical", text("خطر الذاكرة (%)", "Memory critical (%)"), ""],
  ];
  if (!data)
    return (
      <div className="ops-console">
        <div className="ops-loading" role={q.isError ? "alert" : "status"}>
          <Activity size={30} />
          <h1>
            {q.isError
              ? text(
                  "تعذر تحميل غرفة العمليات",
                  "Operations could not be loaded",
                )
              : text("بنجهّز قراءات التشغيل…", "Loading operating signals…")}
          </h1>
          {q.isError && (
            <button onClick={() => q.refetch()}>
              {text("إعادة المحاولة", "Retry")}
            </button>
          )}
        </div>
      </div>
    );
  const settings = data.settings;
  const points = data.series;
  const ranges: [[number, string, string], ...[number, string, string][]] = [
    [15, "15 دقيقة", "15 minutes"],
    [60, "ساعة", "1 hour"],
    [1440, "24 ساعة", "24 hours"],
    [10080, "7 أيام", "7 days"],
  ];
  const alerts = [...critical, ...warning];
  return (
    <div className="ops-console" dir={ar ? "rtl" : "ltr"}>
      <header className="ops-masthead">
        <div>
          <span className="ops-eyebrow">
            <Activity size={15} />
            {text(
              "مركز قيادة المنصة · التشغيل الفعلي",
              "Platform command center · live operations",
            )}
          </span>
          <h1>{text("غرفة العمليات والموارد", "Operations & resources")}</h1>
          <p>
            {text(
              "راقب الطلب، حدّد التشبع، وافتح الدفعة التالية على أساس قياس.",
              "Watch demand, locate saturation and admit the next cohort using evidence.",
            )}
          </p>
        </div>
        <div className="ops-mast-actions">
          <button onClick={() => setGuide(true)}>
            <BookOpen size={16} />
            {text("دليل القرار", "Decision guide")}
          </button>
          <button onClick={startEdit}>
            <Settings2 size={16} />
            {text("إعدادات التشغيل", "Operating controls")}
          </button>
        </div>
      </header>
      <div className="ops-status-strip">
        <span className={`ops-status ${state.toLowerCase()}`}>
          <i />
          {stateText[state]}
        </span>
        <span>
          {text("آخر عينة", "Last sample")}: {stamp(last?.capturedAt)} ·{" "}
          {text("توقيت القاهرة", "Cairo time")}
        </span>
        <button
          onClick={() => q.refetch()}
          disabled={q.isFetching}
          aria-label={text("تحديث القراءات", "Refresh readings")}
        >
          <RefreshCw size={15} />
          {q.isFetching
            ? text("تحديث…", "Refreshing…")
            : text("تحديث", "Refresh")}
        </button>
      </div>
      {q.isError && (
        <p className="ops-note danger" role="alert">
          {text(
            "تعذر التحديث. المعروض آخر بيانات محفوظة، وليس قراءة حية.",
            "Refresh failed. These are the last available readings, not a live reading.",
          )}
        </p>
      )}
      <nav
        className="ops-tabs"
        aria-label={text("أقسام التشغيل", "Operations sections")}
      >
        {(
          [
            ["overview", "نظرة تشغيلية", "Operating overview", Activity],
            [
              "resources",
              "الموارد وحدود القبول",
              "Resources & admission",
              HardDrive,
            ],
            ["delivery", "البريد والصيانة", "Delivery & maintenance", Mail],
          ] as const
        ).map(([id, a, e, Icon]) => (
          <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id}>
            <Icon size={16} />
            {text(a, e)}
          </button>
        ))}
      </nav>
      <section
        className="ops-kpis"
        aria-label={text(
          "أهم مؤشرات اللحظة الحالية",
          "Current operating signals",
        )}
      >
        {[
          [
            Users,
            text("حسابات نشطة", "Active accounts"),
            n(last?.activeUsers),
            text(
              "نشاط موثّق خلال آخر 5 دقائق؛ دون الأدمن وحساب الاختبار.",
              "Observed activity in the last 5 minutes; excludes admins and QA.",
            ),
          ],
          [
            Clock3,
            text("P95 استجابة API", "API response P95"),
            latency(last?.p95Ms) + " ms",
            text(
              "تقدير P95 من مدرج زمني؛ ما فوق 30 ثانية يظهر بعلامة >.",
              "Bucketed P95 estimate; results above 30 seconds are marked >.",
            ),
          ],
          [
            Activity,
            text("طلبات / دقيقة", "Requests / minute"),
            n(last ? last.rps * 60 : null, 1),
            text(
              "معدل فعلي؛ لا يشمل فحص الصحة أو تحديث هذه اللوحة.",
              "Observed rate; excludes health checks and this dashboard polling.",
            ),
          ],
          [
            ShieldCheck,
            text("أخطاء الخادم", "Server errors"),
            last?.requests ? n(last.errorPercent, 1) + "%" : "—",
            text(
              `${n(last?.errors)} رد 5xx · ${n(last?.clientErrors)} رد 4xx (منها ${n(last?.rateLimited)} رفض 429) · انقطاعات ${n(last?.aborted)}`,
              `${n(last?.errors)} 5xx · ${n(last?.clientErrors)} 4xx (including ${n(last?.rateLimited)} 429) · ${n(last?.aborted)} aborted`,
            ),
          ],
          [
            Cpu,
            text("معالج السيرفر", "Server CPU"),
            n(last?.host.cpu, 1) + (last?.host.cpu != null ? "%" : ""),
            text(
              "كل العمليات والحاويات، وليس API وحده.",
              "All host processes and containers, not just the API.",
            ),
          ],
          [
            Database,
            text("ذاكرة السيرفر", "Server memory"),
            n(last?.host.memory, 1) + (last?.host.memory != null ? "%" : ""),
            text(
              "محسوبة من الذاكرة المتاحة، لا من الكاش القابل للتحرير.",
              "Uses available memory; does not treat reclaimable cache as exhausted memory.",
            ),
          ],
        ].map(([Icon, title, value, copy], i) => {
          const I = Icon as typeof Users;
          return (
            <article className="ops-kpi" key={i}>
              <div>
                <I size={19} />
                <span>{String(title)}</span>
              </div>
              <strong>{String(value)}</strong>
              <p>{String(copy)}</p>
            </article>
          );
        })}
      </section>
      {alerts.length > 0 && (
        <section
          className="ops-alerts"
          aria-label={text("مؤشرات تحتاج إجراء", "Signals needing action")}
        >
          {alerts.map((a) => (
            <div key={a.key} className={a.severity.toLowerCase()}>
              <AlertTriangle size={16} />
              <span>{names[a.key] ?? a.key}</span>
              <b>
                {a.severity === "CRITICAL"
                  ? text("خطر", "Critical")
                  : text("متابعة", "Watch")}
              </b>
            </div>
          ))}
          <button
            onClick={() => {
              setConfirm("pause");
              setError("");
            }}
            disabled={settings.admissionMode === "PAUSED"}
          >
            <Pause size={14} />
            {text("إيقاف التسجيل الجديد", "Pause new registration")}
          </button>
        </section>
      )}
      {tab === "overview" && (
        <>
          <section className="ops-peak-row">
            <div>
              <span className="ops-eyebrow">
                {text("ذروة اليوم · القاهرة", "Today’s peaks · Cairo")}
              </span>
              <h2>{text("إمتى الضغط زاد؟", "When did demand peak?")}</h2>
              <p>
                {text(
                  "من العينات المسجلة اليوم فقط، وليس اليوم السابق للنشر.",
                  "Recorded samples from today only; no backfilled history.",
                )}
              </p>
            </div>
            {(
              [
                ["active", "أعلى نشاط", "Peak activity", ""],
                ["rps", "أعلى طلب", "Peak request rate", " req/s"],
                ["latency", "أعلى P95", "Peak P95", " ms"],
              ] as const
            ).map(([key, a, e, unit]) => {
              const peak = data.peaks[key];
              return (
                <article key={key}>
                  <span>{text(a, e)}</span>
                  <strong>
                    {key === "latency"
                      ? latency(peak?.value)
                      : n(peak?.value, 1)}
                    <small>{unit}</small>
                  </strong>
                  <p>
                    {peak
                      ? clock(peak.at)
                      : text("بانتظار العينات", "Awaiting samples")}
                  </p>
                </article>
              );
            })}
          </section>
          <div className="ops-chart-toolbar">
            <div>
              <h2>{text("نبض التشغيل", "Operating trends")}</h2>
              <p>
                {text(
                  `عينات كل 30 ثانية · تجميع كل ${data.coverage.bucketMinutes} دقيقة · الخطوط المتقطعة حدودك الحالية`,
                  `30-second samples · ${data.coverage.bucketMinutes}-minute groups · dashed lines show current thresholds`,
                )}
              </p>
            </div>
            <div className="ops-range">
              {ranges.map(([v, a, e]) => (
                <button
                  key={v}
                  aria-pressed={v === minutes}
                  onClick={() => setMinutes(v)}
                >
                  {text(a, e)}
                </button>
              ))}
              <button
                onClick={exportCsv}
                aria-label={text(
                  "تصدير مؤشرات الفترة CSV",
                  "Export this period as CSV",
                )}
              >
                <Download size={15} />
              </button>
            </div>
          </div>
          <div className="ops-chart-grid">
            <OperationsChart
              ar={ar}
              points={points}
              title={text("النشاط المتزامن", "Concurrent activity")}
              description={text(
                "أعلى عدد حسابات نشطة في كل فترة؛ ليس عدد التابات أو المسجلين.",
                "Peak active-account count per bucket; not tabs or registered accounts.",
              )}
              channels={[
                {
                  key: "active",
                  label: text("النشطون", "Active"),
                  color: "#125e4e",
                },
              ]}
              limits={[
                {
                  value: settings.activeWarn,
                  label: text("تحذير", "Warning"),
                  color: "#b1822b",
                },
                {
                  value: settings.activeCritical,
                  label: text("خطر", "Critical"),
                  color: "#b9494a",
                },
              ]}
            />
            <OperationsChart
              ar={ar}
              points={points}
              title={text(
                "استجابة العمليات الفعلية",
                "Successful API response latency",
              )}
              description={text(
                "الداخلي للردود الناجحة؛ المتصفح يشمل نقل البيانات والاتصال دون ملفات CV، ولا يمثل تحميل الصفحة كاملًا.",
                "Internal: successful API responses. Browser: data transfer and network time, excluding CVs; not full page-load time.",
              )}
              unit="ms"
              channels={[
                { key: "p95", label: "API P95", color: "#174c87" },
                {
                  key: "clientP95",
                  label: text("من المتصفح P95", "Browser P95"),
                  color: "#527ba6",
                },
              ]}
              limits={[
                {
                  value: settings.latencyWarnMs,
                  label: text("تحذير", "Warning"),
                  color: "#b1822b",
                },
                {
                  value: settings.latencyCriticalMs,
                  label: text("خطر", "Critical"),
                  color: "#b9494a",
                },
              ]}
            />
            <OperationsChart
              ar={ar}
              points={points}
              title={text("حجم الطلب على API", "API traffic")}
              description={text(
                "طلبات في الثانية. رقم 120 القديم ليس سعة السيرفر ولا يُستخدم كخط خطر.",
                "Requests per second. The old 120 figure is not server capacity or a saturation threshold.",
              )}
              unit="req/s"
              channels={[
                { key: "rps", label: text("المعدل", "Rate"), color: "#125e4e" },
              ]}
            />
            <OperationsChart
              ar={ar}
              points={points}
              title={text("معدل أخطاء الخادم", "Server error rate")}
              description={text(
                "ردود 5xx فقط؛ الرفض 429 وأخطاء المستخدم 4xx تظهر منفصلة.",
                "5xx responses only; 429 rejections and other 4xx responses are separate.",
              )}
              unit="%"
              channels={[{ key: "errors", label: "5xx", color: "#a14c4e" }]}
              limits={[
                {
                  value: settings.errorWarnPercent,
                  label: text("تحذير", "Warning"),
                  color: "#b1822b",
                },
                {
                  value: settings.errorCriticalPercent,
                  label: text("خطر", "Critical"),
                  color: "#b9494a",
                },
              ]}
            />
            <OperationsChart
              ar={ar}
              points={points}
              title={text("ضغط المعالج والذاكرة", "CPU & memory saturation")}
              description={text(
                "أعلى قيمة مقاسة في الفترة على السيرفر كله؛ غياب المصدر يظهر فراغًا.",
                "Maximum sampled host values per bucket; missing sources remain gaps.",
              )}
              unit="%"
              percent
              channels={[
                { key: "cpu", label: "CPU", color: "#125e4e" },
                {
                  key: "memory",
                  label: text("الذاكرة", "Memory"),
                  color: "#174c87",
                },
              ]}
              limits={[
                {
                  value: settings.cpuCritical,
                  label: text("خطر CPU", "CPU critical"),
                  color: "#b9494a",
                },
                {
                  value: settings.memoryCritical,
                  label: text("خطر RAM", "RAM critical"),
                  color: "#9d6b67",
                },
              ]}
            />
            <OperationsChart
              ar={ar}
              points={points}
              title={text(
                "حركة واجهة شبكة السيرفر",
                "Server network-interface traffic",
              )}
              description={text(
                "قد تشمل LAN. ليست قياسًا لباقتك أو سرعة WAN الفعلية؛ المرجع هو سرعة الرفع التي أدخلتها.",
                "May include LAN. Not ISP quota or measured WAN speed; reference is your configured uplink.",
              )}
              unit="Mbps"
              channels={[
                {
                  key: "tx",
                  label: text("إرسال", "Transmit"),
                  color: "#125e4e",
                },
                {
                  key: "rx",
                  label: text("استقبال", "Receive"),
                  color: "#527ba6",
                },
              ]}
              limits={[
                {
                  value: settings.uplinkMbps,
                  label: text("مرجع الرفع", "Uplink reference"),
                  color: "#b1822b",
                },
              ]}
            />
          </div>
          <section className="ops-card ops-inspect">
            <header>
              <h2>{text("أين نبدأ الفحص؟", "Where to inspect first")}</h2>
              <p>
                {text(
                  "أبطأ مسارات API في آخر عينة؛ أسماء مسارات عامة دون بيانات أعضاء أو روابط خاصة.",
                  "Slowest API route patterns in the latest sample; no member data or private URLs.",
                )}
              </p>
            </header>
            <div className="ops-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{text("المسار", "Route")}</th>
                    <th>{text("طلبات", "Requests")}</th>
                    <th>P95</th>
                    <th>5xx</th>
                  </tr>
                </thead>
                <tbody>
                  {last?.routes.map((r) => (
                    <tr key={r.method + r.route}>
                      <td>
                        <code dir="ltr">
                          {r.method} {r.route}
                        </code>
                      </td>
                      <td>{n(r.requests)}</td>
                      <td>{latency(r.p95Ms)} ms</td>
                      <td>{n(r.errors)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!last?.routes.length && (
                <p className="ops-empty">
                  {text(
                    "لا توجد طلبات مقاسة في آخر عينة.",
                    "No measured requests in the latest sample.",
                  )}
                </p>
              )}
            </div>
          </section>
        </>
      )}
      {tab === "resources" && (
        <>
          <section className="ops-resource-grid">
            <article className="ops-card ops-admission">
              <span className="ops-eyebrow">
                <Users size={16} />
                {text("قبول الحملة", "Campaign admission")}
              </span>
              <h2>
                {settings.admissionMode === "PAUSED"
                  ? text("التسجيل الجديد متوقف", "New registration paused")
                  : settings.admissionMode === "LIMITED"
                    ? text(
                        "قبول محدود بسقف حسابات",
                        "Admission capped by account count",
                      )
                    : text("التسجيل الجديد مفتوح", "New registration open")}
              </h2>
              <strong>
                {n(data.members)}
                <small>
                  {text("حساب عضو حالي", "current member accounts")}
                </small>
              </strong>
              <p>
                {settings.admissionMode === "LIMITED"
                  ? text(
                      `المتبقي للدفعة: ${n(Math.max(0, settings.maxMembers - data.members))} من سقف ${n(settings.maxMembers)}.`,
                      `Remaining places: ${n(Math.max(0, settings.maxMembers - data.members))} of ${n(settings.maxMembers)}.`,
                    )
                  : text(
                      "سقف الحسابات لا يساوي سعة المتزامنين. وقف القبول لا يمنع الأعضاء الحاليين من الدخول.",
                      "An account cap is not concurrent capacity. Pausing admission keeps existing members able to sign in.",
                    )}
              </p>
              <div className="ops-actions">
                <button className="ops-primary" onClick={startEdit}>
                  <Settings2 size={15} />
                  {text("إدارة القبول", "Manage admission")}
                </button>
                <button
                  onClick={() => {
                    setConfirm("pause");
                    setError("");
                  }}
                  disabled={settings.admissionMode === "PAUSED"}
                >
                  <Pause size={15} />
                  {text("إيقاف مؤقت", "Pause new accounts")}
                </button>
              </div>
            </article>
            <article className="ops-card ops-storage">
              <span className="ops-eyebrow">
                <HardDrive size={16} />
                {text("تخزين السير الذاتية", "Private CV storage")}
              </span>
              <h2>
                {text(
                  "مساحة فعلية، بلا حساب مزدوج",
                  "Physical usage, without double counting",
                )}
              </h2>
              <div className="ops-storage-value">
                <strong>{bytes(data.storage.bytes)}</strong>
                <span>/ {n(settings.cvQuotaMiB)} MiB</span>
              </div>
              <progress
                max={settings.cvQuotaMiB * 1048576}
                value={data.storage.bytes}
              />
              <p>
                {text(
                  `${n(data.storage.files)} ملف PDF فريد على القرص. الملف الحالي المشترك مع سجل النسخ يُحسب مرة واحدة.`,
                  `${n(data.storage.files)} unique PDF files. A current file shared with history is counted once.`,
                )}
              </p>
              <div className="ops-actions">
                <button onClick={startEdit}>
                  {text("تعديل الحصة", "Adjust allocation")}
                </button>
                <button
                  onClick={() => {
                    setConfirm("cleanup");
                    setError("");
                  }}
                >
                  {text("تنظيف غير المرتبط فقط", "Clean unreferenced files")}
                </button>
              </div>
            </article>
          </section>
          <section className="ops-health-grid">
            {[
              [
                text("متاح على قرص CV", "CV disk available"),
                bytes(data.storage.diskAvailableBytes),
                text(
                  `الاحتياطي المانع للرفع: ${bytes(settings.diskReserveMiB * 1048576)}`,
                  `Upload-blocking reserve: ${bytes(settings.diskReserveMiB * 1048576)}`,
                ),
              ],
              [
                text("متاح على قرص النظام", "Root filesystem available"),
                bytes(last?.host.rootFreeBytes),
                text(
                  "مصدر قياس السيرفر؛ لا يُستنتج من الحاوية.",
                  "Host source; never inferred from container memory.",
                ),
              ],
              [
                text("الذاكرة المتاحة", "Available host memory"),
                bytes(last?.host.memoryAvailableBytes),
                text(
                  `Swap مستخدم ${bytes(last?.host.swapUsedBytes)}`,
                  `Used swap ${bytes(last?.host.swapUsedBytes)}`,
                ),
              ],
              [
                text("قاعدة البيانات", "Database"),
                last?.database.available
                  ? text("متصلة", "Connected")
                  : text("غير متاحة", "Unavailable"),
                text(
                  `${n(last?.database.connections)} / ${n(last?.database.maxConnections)} اتصال · ${bytes(last?.database.sizeBytes)}`,
                  `${n(last?.database.connections)} / ${n(last?.database.maxConnections)} connections · ${bytes(last?.database.sizeBytes)}`,
                ),
              ],
              [
                text("عملية API", "API process"),
                bytes(last?.process.rssBytes),
                text(
                  `انشغال ${n(last?.process.cpuPercent, 1)}% من نواة · تأخر الدورة ${n(last?.process.eventLoopP95Ms, 1)} ms`,
                  `${n(last?.process.cpuPercent, 1)}% of one CPU core · loop delay ${n(last?.process.eventLoopP95Ms, 1)} ms`,
                ),
              ],
              [
                text("الخدمات التابعة", "Dependencies"),
                last?.services?.frontend.available == null
                  ? "—"
                  : last.services.frontend.available
                    ? text("الفرونت يستجيب", "Frontend responding")
                    : text("الفرونت لا يستجيب", "Frontend unavailable"),
                last?.services?.tunnel.available == null
                  ? text("فحص النفق غير موصول", "Tunnel probe unavailable")
                  : last.services.tunnel.available
                    ? text(
                        "Cloudflare Tunnel متصل",
                        "Cloudflare Tunnel connected",
                      )
                    : text(
                        "نفق Cloudflare غير جاهز",
                        "Cloudflare Tunnel not ready",
                      ),
              ],
            ].map(([title, value, copy]) => (
              <article className="ops-card" key={title}>
                <span>{title}</span>
                <strong>{value}</strong>
                <p>{copy}</p>
              </article>
            ))}
          </section>
          <OperationsChart
            ar={ar}
            points={points}
            title={text("نمو ملفات السيرة", "CV storage growth")}
            description={text(
              "الملفات الفريدة الحالية والتاريخية وغير المرتبطة؛ الحصة لا تزيد حجم القرص نفسه.",
              "Unique current, historical and unreferenced files; allocation does not enlarge the disk.",
            )}
            unit="MiB"
            channels={[
              {
                key: "cvMiB",
                label: text("استخدام فعلي", "Physical usage"),
                color: "#125e4e",
              },
            ]}
            limits={[
              {
                value: settings.cvQuotaMiB,
                label: text("الحصة الحالية", "Current allocation"),
                color: "#b9494a",
              },
            ]}
          />
          <section className="ops-card ops-audit">
            <header>
              <h2>
                {text(
                  "آخر تغييرات التشغيل",
                  "Recent operating-control changes",
                )}
              </h2>
              <p>
                {text(
                  "تغييرات محفوظة برقم إصدار وتوقيت. لا تُعاد كتابة التاريخ عند تعديل الحدود.",
                  "Revisioned, timestamped changes; editing thresholds does not rewrite history.",
                )}
              </p>
            </header>
            {data.audit.length ? (
              data.audit.map((a) => (
                <article key={a.id}>
                  <span>#{n(a.revision)}</span>
                  <div>
                    <b>{stamp(a.createdAt)}</b>
                    <p>
                      {text(
                        `القبول ${a.next.admissionMode} · سقف ${n(a.next.maxMembers)} · CV ${n(a.next.cvQuotaMiB)} MiB`,
                        `Admission ${a.next.admissionMode} · cap ${n(a.next.maxMembers)} · CV ${n(a.next.cvQuotaMiB)} MiB`,
                      )}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <p className="ops-empty">
                {text(
                  "لم تُعدّل الإعدادات بعد.",
                  "Operating settings have not been changed yet.",
                )}
              </p>
            )}
          </section>
        </>
      )}
      {tab === "delivery" && (
        <>
          <section className="ops-card ops-mail">
            <header>
              <div>
                <span className="ops-eyebrow">
                  <Mail size={16} />
                  {text("قدرة الإرسال", "Mail delivery budget")}
                </span>
                <h2>
                  {text(
                    "احمِ وصول كود التحقق وقت الحملة",
                    "Protect verification delivery during the campaign",
                  )}
                </h2>
                <p>
                  {text(
                    "حدود البريد منفصلة عن سعة الموقع. احتياطي OTP يحمي التسجيل من استهلاك الرسائل الجماعية للحصة.",
                    "Mail limits are separate from site capacity. OTP reserve protects verification against bulk-mail usage.",
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setConfirm("email");
                  setError("");
                }}
              >
                {text("إرسال اختبار لبريد الأدمن", "Send a test to the admin")}
              </button>
            </header>
            <div className="ops-mail-budgets">
              {[
                [text("اليوم", "Today"), data.mail.daily],
                [text("الشهر", "Month"), data.mail.monthly],
              ].map(([label, v]) => {
                const budget = v as typeof data.mail.daily;
                return (
                  <article key={String(label)}>
                    <span>{String(label)}</span>
                    <strong>
                      {n(budget.sent)} / {n(budget.limit)}
                    </strong>
                    <progress
                      className={
                        budget.percentUsed >= 95
                          ? "critical"
                          : budget.percentUsed >= 80
                            ? "warning"
                            : ""
                      }
                      value={budget.sent}
                      max={budget.limit}
                    />
                    <p>
                      {text(
                        `متبقي ${n(budget.remaining)} رسالة`,
                        `Remaining: ${n(budget.remaining)} messages`,
                      )}
                    </p>
                  </article>
                );
              })}
            </div>
            <p className="ops-note">
              {text(
                `احتياطي OTP: ${n(data.mail.daily.otpSafeReserve)} · المتاح الآمن للجماعي ${n(data.mail.daily.safeAvailableForBulk)}. إعداد SMTP ${data.mail.smtp.configured ? "موجود" : "غير مكتمل"}؛ وجود الإعداد لا يثبت وصول الرسائل.`,
                `OTP reserve: ${n(data.mail.daily.otpSafeReserve)} · safe bulk budget ${n(data.mail.daily.safeAvailableForBulk)}. SMTP ${data.mail.smtp.configured ? "configured" : "incomplete"}; configuration does not prove delivery.`,
              )}
            </p>
          </section>
          <section className="ops-resource-grid">
            <article className="ops-card">
              <span className="ops-eyebrow">
                <Clock3 size={16} />
                {text("الصيانة التلقائية", "Automatic maintenance")}
              </span>
              <h2>
                {text(
                  "طلبات بلا تحديث مرحلة منذ 7 أيام",
                  "Applications with no stage change for 7 days",
                )}
              </h2>
              <p>
                {text(
                  "الفحص يعمل كل 15 دقيقة. يغلق الطلب المؤهل بسبب «لم يتم الرد»، ولا يحذف الطلب أو الحساب.",
                  "Runs every 15 minutes. Eligible applications become Closed / No response; neither accounts nor applications are deleted.",
                )}
              </p>
              <dl className="ops-mini-values">
                <div>
                  <dt>{text("مغلقة بهذا السبب", "Closed as no response")}</dt>
                  <dd>{n(data.maintenance.autoClosedCount)}</dd>
                </div>
                <div>
                  <dt>
                    {text(
                      "تستحق الفحص أو خلال 24 ساعة",
                      "Due now or within 24 hours",
                    )}
                  </dt>
                  <dd>{n(data.maintenance.candidatesNext24h)}</dd>
                </div>
              </dl>
              <button
                onClick={() => {
                  setConfirm("processor");
                  setError("");
                }}
              >
                {text("تشغيل الفحص الآن", "Run inspection now")}
              </button>
            </article>
            <article className="ops-card">
              <span className="ops-eyebrow">
                <Check size={16} />
                {text("آخر محاولات البريد", "Recent mail attempts")}
              </span>
              <h2>
                {text("نتيجة محاولة الإرسال", "Recorded sending outcomes")}
              </h2>
              <div className="ops-delivery-list">
                {data.mail.recentLogs.map((log) => (
                  <div key={log.id}>
                    <span>{log.recipientName || log.recipientEmail}</span>
                    <b className={log.status === "FAILED" ? "failed" : ""}>
                      {log.status === "DELIVERED"
                        ? text("قبله المزوّد", "Accepted by provider")
                        : log.status === "FAILED"
                          ? text("فشل", "Failed")
                          : text("قيد الانتظار", "Pending")}
                    </b>
                    <small>{stamp(log.createdAt)}</small>
                  </div>
                ))}
                {!data.mail.recentLogs.length && (
                  <p>
                    {text(
                      "لا توجد محاولات إرسال مسجلة.",
                      "No delivery attempts recorded.",
                    )}
                  </p>
                )}
              </div>
            </article>
          </section>
        </>
      )}
      <footer className="ops-footer">
        <span>
          <Wifi size={13} />
          {text("مصدر موارد السيرفر", "Host resource source")}:{" "}
          {last?.host.available
            ? last.host.source
            : text(
                "غير متاح؛ لا يُعرض صفر بدلًا منه",
                "Unavailable; never replaced with zero",
              )}
        </span>
        <span>
          {text("بداية بيانات الفترة", "Available history begins")}:{" "}
          {stamp(data.coverage.first)} ·{" "}
          {text("حفظ 14 يومًا", "14-day retention")}
        </span>
      </footer>
      {guide && (
        <Modal
          isOpen
          size="xl"
          onClose={() => setGuide(false)}
          title={text("دليل التشغيل واتخاذ القرار", "Operating decision guide")}
        >
          <article className="ops-guide" dir={ar ? "rtl" : "ltr"}>
            <p>
              {text(
                "اللوحة مبنية على أربع إشارات: حجم الطلب، زمن الاستجابة، الأخطاء، وتشبع الموارد. قراءة واحدة أو عدد حسابات مسجلة لا يثبت قدرة السيرفر.",
                "The dashboard uses four signals: traffic, latency, errors and saturation. One reading or a registered-account count does not certify capacity.",
              )}
            </p>
            {[
              [
                text("1. قبل إطلاق دفعة", "1. Before admitting a cohort"),
                text(
                  "راجع حد التسجيل، قدرة البريد واحتياطي OTP، مساحة CV والقرص، وتأكد أن مصادر القياس حديثة. حد النشطين هدف تشغيلي قابل للتعديل وليس اختبار قدرة مضمون.",
                  "Review admission controls, mail/OTP budget, CV/disk space and source freshness. Active-account thresholds are operating targets, not certified capacity.",
                ),
              ],
              [
                text("2. أثناء الحملة", "2. During the campaign"),
                text(
                  "راقب P95 مع عدد الطلبات. إذا زاد الزمن أو ظهرت 5xx مع ضغط CPU/ذاكرة، قلّل القبول وافحص المسار الأبطأ. لا تعتبر 401 أو 429 خطأ خادم؛ 429 يعني رفضًا من الحماية ويظهر وحده.",
                  "Read P95 alongside traffic. Rising latency/5xx with resource pressure suggests slowing admission and inspecting slow routes. A 401 or 429 is not a 5xx server failure; 429 is counted separately.",
                ),
              ],
              [
                text(
                  "3. تفسير الأعداد والذروة",
                  "3. Interpreting activity and peaks",
                ),
                text(
                  "النشط هو حساب عضو متحقق له طلب ناجح يعكس استخدامًا خلال 5 دقائق؛ استطلاع الإشعارات وتجديد الجلسة لا يكفيان. الحساب يُحسب مرة مهما فتح تابات. تُستبعد حسابات الأدمن والاختبار. القياس يُعاد تكوينه بعد إعادة تشغيل API، والتاريخ المحفوظ لا يختفي. ذروة اليوم وفق القاهرة ومن العينات المتاحة فقط.",
                  "An active account has an authenticated successful usage request within five minutes; notification/session polling alone does not count. Multiple tabs count once; admins and QA are excluded. Live activity warms up after API restart, while persisted history remains. Daily peaks use Cairo time and available samples only.",
                ),
              ],
              [
                text(
                  "4. فهم الحدود والمصادر",
                  "4. Understanding sources and thresholds",
                ),
                text(
                  "P95 خاص بزمن API الداخلي الناجح، لا زمن فتح الصفحة عند المستخدم. CPU والذاكرة يشملان أدوات التطوير والحاويات الأخرى. حركة eno1 قد تشمل الشبكة المحلية؛ ليست عداد باقة أو قياس WAN. فحص الفرونت والنفق داخلي؛ لا يثبت تجربة زائر خارجي.",
                  "P95 is successful internal API time, not browser page load. Host CPU/memory includes development tools and other containers. Interface traffic may include LAN; it is not quota or WAN measurement. Internal frontend/tunnel probes do not prove external-user availability.",
                ),
              ],
              [
                text(
                  "5. التخزين والتحكم الآمن",
                  "5. Storage and safe controls",
                ),
                text(
                  "الحصة الفعلية تشمل الملفات الفريدة فقط؛ لا تُحسب السيرة مرتين لأنها حالية ولها سجل تاريخي. زيادة الحصة لا تضيف قرصًا جديدًا. التنظيف يحذف الملفات غير المرتبطة بعد فترة الأمان فقط. إيقاف التسجيل يشمل التسجيل العادي وGoogle للحسابات الجديدة، ويترك دخول الحسابات الموجودة متاحًا.",
                  "The enforced allocation counts unique files, not duplicate current/history references. Increasing it does not add disk capacity. Cleanup removes only unreferenced files after a grace period. Pausing admission covers new password/Google accounts and preserves existing-account sign-in.",
                ),
              ],
              [
                text(
                  "6. متى توقف فتح دفعة جديدة؟",
                  "6. When to pause new admission",
                ),
                text(
                  "أوقفها مؤقتًا عند خطأ مستمر أو ارتفاع P95 مع التشبع، أو عند اقتراب حصة CV/البريد من النفاد. لا يوجد تحويل آلي من «مسجلين» إلى سعة متزامنين، ولا توقف اللوحة تسجيلات تلقائيًا لمجرد لون تحذير؛ حدود LIMITED وحصة CV وحدود القرص فقط مُنفذة فعليًا.",
                  "Pause when errors persist, latency rises with saturation, or CV/mail budgets near exhaustion. Registered accounts do not imply a concurrent capacity. Warning colors do not automatically pause admission; LIMITED account caps, CV allocation and disk reserve are enforced.",
                ),
              ],
            ].map(([title, copy]) => (
              <section key={title}>
                <h3>{title}</h3>
                <p>{copy}</p>
              </section>
            ))}
            <p>
              {text("منهج القياس", "Measurement references")}:{" "}
              <a
                href="https://sre.google/sre-book/monitoring-distributed-systems/"
                target="_blank"
                rel="noreferrer"
              >
                Google SRE — Golden signals
              </a>{" "}
              ·{" "}
              <a
                href="https://prometheus.io/docs/practices/histograms/"
                target="_blank"
                rel="noreferrer"
              >
                Histograms & quantiles
              </a>
            </p>
          </article>
        </Modal>
      )}
      {draft && confirm !== "settings" && (
        <Modal
          isOpen
          onClose={() => {
            if (!busy) setDraft(null);
          }}
          size="xl"
          title={text(
            "حدود التشغيل والقبول",
            "Operating thresholds & admission",
          )}
        >
          <form
            className="ops-settings"
            dir={ar ? "rtl" : "ltr"}
            onSubmit={(e) => {
              e.preventDefault();
              setConfirm("settings");
              setError("");
            }}
          >
            <p className="ops-note">
              {text(
                "تحكمات محفوظة على السيرفر. خطوط التحذير لا توقف الأعضاء الحاليين ولا تعيد تعيين تجاربهم.",
                "Persisted server controls. Warning thresholds do not block existing members or reset experiment assignments.",
              )}
            </p>
            <label>
              {text("وضع قبول الحسابات الجديدة", "New-account admission mode")}
              <select
                aria-label={text(
                  "وضع قبول الحسابات الجديدة",
                  "New-account admission mode",
                )}
                value={draft.admissionMode}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    admissionMode: e.target
                      .value as OpsSettings["admissionMode"],
                  })
                }
              >
                <option value="OPEN">{text("مفتوح", "Open")}</option>
                <option value="LIMITED">
                  {text("محدود بسقف الحسابات", "Limited by account cap")}
                </option>
                <option value="PAUSED">{text("متوقف مؤقتًا", "Paused")}</option>
              </select>
            </label>
            <div className="ops-settings-grid">
              {fields.map(([key, label, help]) => (
                <label key={key}>
                  {label}
                  <input
                    required
                    aria-label={label}
                    type="number"
                    min={
                      key === "cvQuotaMiB"
                        ? 10
                        : key === "diskReserveMiB"
                          ? 128
                          : key === "uplinkMbps" || key.includes("Percent")
                            ? 0.1
                            : 1
                    }
                    max={
                      key.includes("cpu") ||
                      key.includes("memory") ||
                      key.includes("Percent")
                        ? 100
                        : 1000000
                    }
                    step={
                      key === "uplinkMbps" || key.includes("Percent") ? 0.1 : 1
                    }
                    value={Number(draft[key])}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: Number(e.target.value) })
                    }
                  />
                  {help && <small>{help}</small>}
                </label>
              ))}
            </div>
            {error && (
              <p role="alert" className="ops-note danger">
                {error}
              </p>
            )}
            <div className="ops-modal-actions">
              <button className="ops-primary" type="submit">
                {text("مراجعة التغييرات", "Review changes")}
              </button>
              <button type="button" onClick={() => setDraft(null)}>
                {text("إلغاء", "Cancel")}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {confirm && (
        <Modal
          isOpen
          onClose={() => {
            if (!busy) {
              setConfirm(null);
              setError("");
            }
          }}
          title={text("تأكيد إجراء تشغيلي", "Confirm operating action")}
        >
          <div className="ops-confirm" dir={ar ? "rtl" : "ltr"}>
            <p>
              {confirm === "settings"
                ? text(
                    `حفظ وضع القبول ${draft?.admissionMode}، سقف ${n(draft?.maxMembers)}، وحصة CV ${n(draft?.cvQuotaMiB)} MiB، وحدود الرسومات. لا تُحذف حسابات أو ملفات.`,
                    `Save admission ${draft?.admissionMode}, cap ${n(draft?.maxMembers)}, CV allocation ${n(draft?.cvQuotaMiB)} MiB and chart thresholds. No accounts/files are deleted.`,
                  )
                : confirm === "pause"
                  ? text(
                      "إيقاف إنشاء حسابات جديدة الآن. الأعضاء الحاليون يقدروا يدخلوا ويكملوا شغلهم.",
                      "Pause new account creation now. Existing members can continue signing in and working.",
                    )
                  : confirm === "cleanup"
                    ? text(
                        "سيُحذف فقط PDF غير مرتبط بأي سيرة حالية أو تاريخية بعد فترة الأمان. لا تُحذف نسخ CV المرتبطة أو حسابات الأعضاء.",
                        "Only unreferenced PDFs beyond the grace period are removed. Referenced current/history CVs and accounts are retained.",
                      )
                    : confirm === "processor"
                      ? text(
                          "سيُفحص الطلب المؤهل بعد 7 أيام دون انتقال مرحلة، وقد يتغير إلى مغلق / لم يتم الرد. هذا يعدّل حالات طلبات فعلية.",
                          "Eligible applications without a stage change for seven days may become Closed / No response. This updates real application states.",
                        )
                      : text(
                          "سيُرسل بريد تجريبي واحد لبريد حساب الأدمن الحالي، ويُحسب من حصة الإرسال.",
                          "One test email will be sent to the signed-in administrator and consumes mail budget.",
                        )}
            </p>
            {error && (
              <p className="ops-note danger" role="alert">
                {error}
              </p>
            )}
            <div className="ops-modal-actions">
              <button className="ops-primary" onClick={action} disabled={busy}>
                {busy
                  ? text("تنفيذ…", "Applying…")
                  : text("تأكيد التنفيذ", "Confirm action")}
              </button>
              <button
                onClick={() => {
                  setConfirm(null);
                  setError("");
                }}
                disabled={busy}
              >
                {text("رجوع", "Back")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
