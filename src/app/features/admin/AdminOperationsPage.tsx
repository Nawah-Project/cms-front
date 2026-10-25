import { useEffect, useState } from "react";
import {
  adminApi,
  type NotificationLogItem,
  type OperationsStatsResponse,
} from "./api/adminApi";
import { useI18n } from "../../i18n";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  relativeTime,
} from "./components/AdminUI";
import { useToast } from "../../components/ui/ToastProvider";
import {
  Activity,
  AlertCircle,
  Archive,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Mail,
  Play,
  RefreshCw,
  Send,
  Server,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";

export default function AdminOperationsPage() {
  const { t, locale, number } = useI18n();
  const isAr = locale === "ar";
  const toast = useToast();

  const [stats, setStats] = useState<OperationsStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Action busy states
  const [runningProcessor, setRunningProcessor] = useState(false);
  const [cleaningOrphans, setCleaningOrphans] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    adminApi
      .operationsStats()
      .then((res) => {
        setStats(res);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleRunNoResponse = async () => {
    setRunningProcessor(true);
    try {
      const res = await adminApi.runNoResponseProcessor();
      toast.success(res.message || (isAr ? "تم تشغيل الفحص التلقائي بنجاح" : "Job ran successfully"));
      load();
    } catch {
      toast.error(isAr ? "فشل تشغيل المعالج" : "Failed to run processor");
    } finally {
      setRunningProcessor(false);
    }
  };

  const handleCleanupOrphans = async () => {
    setCleaningOrphans(true);
    try {
      const res = await adminApi.cleanupOrphanedFiles();
      toast.success(res.message || (isAr ? "تم تنظيف الملفات اليتيمة بنجاح" : "Orphaned files cleaned"));
      load();
    } catch {
      toast.error(isAr ? "فشل تنظيف الملفات" : "Failed to cleanup files");
    } finally {
      setCleaningOrphans(false);
    }
  };

  const handleSendTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      await adminApi.sendTestEmail();
      toast.success(isAr ? "تم إرسال البريد التجريبي بنجاح" : "Test email sent");
      load();
    } catch {
      toast.error(isAr ? "فشل إرسال البريد التجريبي" : "Failed to send test email");
    } finally {
      setSendingTestEmail(false);
    }
  };

  if (loading) return <LoadingState label={isAr ? "جارٍ فحص المؤشرات التشغيلية..." : "Loading operations data..."} />;
  if (error || !stats)
    return (
      <ErrorState
        label={isAr ? "تعذر تحميل المؤشرات التشغيلية" : "Failed to load operations"}
        onRetry={load}
      />
    );

  const { notifications, noResponseProcessor, storage, systemHealth } = stats;

  const dailyUsed = notifications.daily.sent;
  const dailyLimit = notifications.daily.limit;
  const dailyPercent = notifications.daily.percentUsed;

  const monthlyUsed = notifications.monthly.sent;
  const monthlyLimit = notifications.monthly.limit;
  const monthlyPercent = notifications.monthly.percentUsed;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. CARD 1: EMAIL & NOTIFICATION QUOTA MONITOR */}
      <section aria-label="Email & Notifications" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              {isAr ? "1. مراقبة استهلاك البريد الإلكتروني وحدود الإرسال" : "1. Email Quotas & Rate Limits"}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isAr
                ? "متابعة الحصص اليومية والشهرية لتفادي تجاوز حدود مزود البريد، مع الاحتياطي الآمن لكود OTP"
                : "Live telemetry on daily and monthly email quotas, safe OTP reserve, and SMTP connectivity"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSendTestEmail}
            disabled={sendingTestEmail || !notifications.smtp.active}
            className="button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-40"
          >
            <Mail className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
            <span>{sendingTestEmail ? (isAr ? "جارٍ الإرسال..." : "Sending...") : (isAr ? "إرسال بريد تجريبي" : "Send Test Email")}</span>
          </button>
        </div>

        <div className="rounded-2xl border border-neutral-200/80 bg-surface p-5 shadow-xs dark:border-neutral-800 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Quota Bar */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-950 dark:text-neutral-100 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isAr ? "الاستهلاك اليومي للبريد" : "Daily Email Quota"}</span>
                </span>
                <span className="text-xs font-mono font-bold text-neutral-950 dark:text-neutral-100">
                  {number(dailyUsed)} / {number(dailyLimit)} ({dailyPercent}%)
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    dailyPercent > 90
                      ? "bg-rose-500"
                      : dailyPercent > 70
                      ? "bg-amber-500"
                      : "bg-neutral-900 dark:bg-white"
                  }`}
                  style={{ width: `${Math.max(2, dailyPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span>{isAr ? `متبقي لليوم: ${number(notifications.daily.remaining)} رسالة` : `${number(notifications.daily.remaining)} remaining today`}</span>
                <span>{isAr ? `احتياطي OTP: ${notifications.daily.otpSafeReserve}` : `OTP Reserve: ${notifications.daily.otpSafeReserve}`}</span>
              </div>
            </div>

            {/* Monthly Quota Bar */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-950 dark:text-neutral-100 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-info-strong" />
                  <span>{isAr ? "الاستهلاك الشهري التراكمي" : "Monthly Email Quota"}</span>
                </span>
                <span className="text-xs font-mono font-bold text-neutral-950 dark:text-neutral-100">
                  {number(monthlyUsed)} / {number(monthlyLimit)} ({monthlyPercent}%)
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    monthlyPercent > 90
                      ? "bg-rose-500"
                      : monthlyPercent > 70
                      ? "bg-amber-500"
                      : "bg-info-strong"
                  }`}
                  style={{ width: `${Math.max(2, monthlyPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span>{isAr ? `متبقي للشهر: ${number(notifications.monthly.remaining)} رسالة` : `${number(notifications.monthly.remaining)} remaining this month`}</span>
                <span>{isAr ? `الحد الشهري: ${number(monthlyLimit)}` : `Monthly limit: ${number(monthlyLimit)}`}</span>
              </div>
            </div>
          </div>

          {/* Mini Cards Strip */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">{isAr ? "إجمالي الإشعارات" : "Total Alerts"}</span>
              <span className="text-lg font-bold font-mono text-neutral-950 dark:text-neutral-100">
                {number(notifications.stats.totalNotifications)}
              </span>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">{isAr ? "غير المقروءة" : "Unread Alerts"}</span>
              <span className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400">
                {number(notifications.stats.unreadNotifications)}
              </span>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">{isAr ? "نسبة القراءة" : "Read Rate"}</span>
              <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {notifications.stats.readRate}%
              </span>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">{isAr ? "حالة المزود" : "Provider Status"}</span>
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 mt-1">
                <span
                  className={`h-2 w-2 rounded-full ${
                    notifications.smtp.active ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                <span>{notifications.smtp.active ? "SMTP / Ready" : "Simulated"}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CARD 2: STORAGE & DATABASE SYSTEM HEALTH */}
      <section aria-label="Storage & Database Health" className="space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            {isAr ? "2. موارد التخزين وقاعدة البيانات (Storage & System Health)" : "2. Storage Volume & Database Health"}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isAr
              ? "متابعة السير الذاتية المرفوعة، المساحة المستهلكة، وسرعة استجابة قاعدة البيانات وحماية الـ Rate Limiter"
              : "Resume file storage metrics, database latency ping, and DDoS rate limiter protection"}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200/80 bg-surface p-5 shadow-xs dark:border-neutral-800 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-info-soft text-info-strong dark:bg-info-soft/20">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-950 dark:text-neutral-100">
                  {isAr ? "مستودع السير الذاتية والنسخ السابقة (Private CV Storage)" : "Private CV Storage Volume"}
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                  {isAr
                    ? `إجمالي ${storage.totalFiles} ملف مخزن (${storage.activeCvCount} سيرة نشطة + ${storage.cvHistoryCount} نسخة في السجل)`
                    : `${storage.totalFiles} stored files (${storage.activeCvCount} active + ${storage.cvHistoryCount} history versions)`}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={cleaningOrphans}
              onClick={handleCleanupOrphans}
              className="button-secondary inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5 text-neutral-500" />
              <span>{cleaningOrphans ? (isAr ? "جارٍ التنظيف..." : "Cleaning...") : (isAr ? "تنظيف الملفات اليتيمة" : "Cleanup Orphaned Files")}</span>
            </button>
          </div>

          {/* Storage Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                {isAr ? "المساحة المستهلكة:" : "Storage Consumed:"} <strong className="text-neutral-950 dark:text-white font-mono">{storage.totalMegabytes} MB</strong>
              </span>
              <span className="text-neutral-500 font-mono">
                {isAr ? "الحد الأقصى:" : "Limit:"} {storage.limitMegabytes} MB ({storage.percentUsed}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  storage.percentUsed > 80 ? "bg-rose-500" : storage.percentUsed > 50 ? "bg-amber-500" : "bg-neutral-900 dark:bg-white"
                }`}
                style={{ width: `${Math.max(2, storage.percentUsed)}%` }}
              />
            </div>
          </div>

          {/* System Health Strip */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5 space-y-1.5 dark:border-neutral-700 dark:bg-neutral-800/50">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-semibold">{isAr ? "قاعدة بيانات PostgreSQL" : "PostgreSQL Database"}</span>
                <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  {systemHealth.dbLatencyMs} ms
                </span>
                <span className="text-xs text-neutral-500 font-medium">{isAr ? "استجابة سريعة" : "Latency"}</span>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5 space-y-1.5 dark:border-neutral-700 dark:bg-neutral-800/50">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-semibold">{isAr ? "سجل الأحداث (DomainEventLog)" : "Domain Event Log"}</span>
                <Server className="h-4 w-4 text-info-strong" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-neutral-950 dark:text-neutral-100">
                  {number(systemHealth.domainEventsCount)}
                </span>
                <span className="text-xs text-neutral-500 font-medium">{isAr ? "حدثاً موثقاً" : "Audit Events"}</span>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5 space-y-1.5 dark:border-neutral-700 dark:bg-neutral-800/50">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-xs font-semibold">{isAr ? "حماية معدل الطلبات" : "Rate Limiter Shield"}</span>
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-neutral-950 dark:text-neutral-100">
                  {systemHealth.rateLimiter.limit}
                </span>
                <span className="text-xs text-neutral-500 font-medium">req / min</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CARD 3: NOTIFICATION LOGS & MAINTENANCE JOBS */}
      <section aria-label="Logs & Maintenance" className="space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            {isAr ? "3. سجل الإشعارات والرسائل وأدوات الصيانة التلقائية" : "3. Notification Logs & Automation Jobs"}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isAr
              ? "معالج إغلاق الطلبات المنتهية دون رد، وسجل بأحدث رسائل البريد والإشعارات المرسلة للأعضاء"
              : "No-response auto-close background worker and recent dispatch logs"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Worker Controller (lg:col-span-6) */}
          <div className="lg:col-span-6 rounded-2xl border border-neutral-200/80 bg-surface p-5 shadow-xs dark:border-neutral-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-neutral-100">
                    {isAr ? "معالج إغلاق الطلبات غير المستجابة" : "No-Response Auto-Close Worker"}
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {isAr ? "نشط · يعمل تلقائياً كل 15 دقيقة" : "Active · Runs every 15m"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={runningProcessor}
                onClick={handleRunNoResponse}
                className="button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold cursor-pointer disabled:opacity-40"
              >
                <Play className="h-3.5 w-3.5" />
                <span>{runningProcessor ? (isAr ? "جارٍ الفحص..." : "Running...") : (isAr ? "تشغيل الفحص الآن" : "Run Sweep")}</span>
              </button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {isAr
                ? "يقوم بفحص طلبات التقديم التي لم تتلق رداً بعد 7 أيام من آخر تحديث ويحول حالتها تلقائياً إلى «مغلقة: لم يُرد عليها» لتحديث لوحة تحكم المتدرب."
                : "Automatically moves applications without updates after 7 days into CLOSED: NO_RESPONSE to keep pipelines clean."}
            </p>

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
                <span className="text-[10px] text-neutral-500 uppercase font-bold block">{isAr ? "المغلقة تلقائياً" : "Auto-Closed"}</span>
                <span className="text-xl font-bold font-mono text-neutral-950 dark:text-neutral-100">
                  {number(noResponseProcessor.autoClosedCount)}
                </span>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
                <span className="text-[10px] text-neutral-500 uppercase font-bold block">{isAr ? "مرشحة خلال 24 ساعة" : "Candidates Next 24h"}</span>
                <span className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400">
                  {number(noResponseProcessor.candidatesNext24h)}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Logs (lg:col-span-6) */}
          <div className="lg:col-span-6 rounded-2xl border border-neutral-200/80 bg-surface p-5 shadow-xs dark:border-neutral-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              {isAr ? "أحدث سجلات الإرسال (Live Delivery Logs)" : "Recent Delivery Logs"}
            </h3>
            {!notifications.recentLogs.length ? (
              <EmptyState>{isAr ? "لا توجد سجلات بعد" : "No logs recorded"}</EmptyState>
            ) : (
              <div className="space-y-2 text-xs max-h-[280px] overflow-y-auto pe-1">
                {notifications.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-2.5 space-y-1 dark:border-neutral-700 dark:bg-neutral-800/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-950 dark:text-neutral-100 truncate max-w-[180px]">
                        {log.recipientName || log.recipientEmail}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                          log.status === "DELIVERED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            : log.status === "FAILED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                            : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">{log.subject}</p>
                    <p className="text-[10px] text-neutral-400">{relativeTime(log.createdAt, locale)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
