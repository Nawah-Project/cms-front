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
      {/* 1. EMAIL & NOTIFICATION QUOTA MONITOR */}
      <section aria-label="Email & Notifications" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
              {isAr ? "مراقبة استهلاك البريد الإلكتروني والإشعارات (Quota Monitor)" : "Email & Notification Quotas"}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isAr
                ? "متابعة الحصص اليومية والشهرية لتفادي تجاوز حدود مزود البريد، مع الاحتياطي الآمن لكود OTP"
                : "Live telemetry on daily and monthly email usage, safe OTP reserve, and internal notifications"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSendTestEmail}
            disabled={sendingTestEmail || !notifications.smtp.active}
            className="button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-40"
          >
            <Mail className="h-3.5 w-3.5 text-emerald-400" />
            <span>{sendingTestEmail ? (isAr ? "جارٍ الإرسال..." : "Sending...") : (isAr ? "إرسال بريد تجريبي" : "Send Test Email")}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Daily & Monthly Bars */}
          <div className="lg:col-span-8 rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-6">
            {/* Daily Quota Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span>{isAr ? "الاستهلاك اليومي للبريد (Daily Quota Bar)" : "Daily Email Quota"}</span>
                </span>
                <span className="text-xs font-mono font-bold text-neutral-100">
                  {number(dailyUsed)} / {number(dailyLimit)} ({dailyPercent}%)
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    dailyPercent > 90
                      ? "bg-red-500 shadow-sm shadow-red-500/50"
                      : dailyPercent > 70
                      ? "bg-amber-400 shadow-sm shadow-amber-500/50"
                      : "bg-emerald-400"
                  }`}
                  style={{ width: `${Math.max(3, dailyPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span>{isAr ? `متبقي لليوم: ${number(notifications.daily.remaining)} رسالة` : `${number(notifications.daily.remaining)} remaining`}</span>
                <span>{isAr ? `الاحتياطي الآمن لـ OTP: ${notifications.daily.otpSafeReserve} رسالة` : `OTP Reserve: ${notifications.daily.otpSafeReserve}`}</span>
              </div>
            </div>

            {/* Monthly Quota Bar */}
            <div className="space-y-2 pt-4 border-t border-border-subtle">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  <span>{isAr ? "الاستهلاك الشهري التراكمي (Monthly Quota Bar)" : "Monthly Email Quota"}</span>
                </span>
                <span className="text-xs font-mono font-bold text-neutral-100">
                  {number(monthlyUsed)} / {number(monthlyLimit)} ({monthlyPercent}%)
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    monthlyPercent > 90
                      ? "bg-red-500 shadow-sm shadow-red-500/50"
                      : monthlyPercent > 70
                      ? "bg-amber-400"
                      : "bg-blue-400"
                  }`}
                  style={{ width: `${Math.max(3, monthlyPercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span>{isAr ? `متبقي للشهر: ${number(notifications.monthly.remaining)} رسالة` : `${number(notifications.monthly.remaining)} remaining this month`}</span>
              </div>
            </div>

            {/* Notification Stats Mini Cards */}
            <div className="pt-4 border-t border-border-subtle grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
                <span className="text-[10px] text-neutral-500 uppercase font-bold block">{isAr ? "إجمالي الإشعارات" : "Total Alerts"}</span>
                <span className="text-lg font-bold font-mono text-neutral-200">
                  {number(notifications.stats.totalNotifications)}
                </span>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
                <span className="text-[10px] text-neutral-500 uppercase font-bold block">{isAr ? "غير المقروءة" : "Unread"}</span>
                <span className="text-lg font-bold font-mono text-amber-400">
                  {number(notifications.stats.unreadNotifications)}
                </span>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
                <span className="text-[10px] text-neutral-500 uppercase font-bold block">{isAr ? "نسبة القراءة" : "Read Rate"}</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {notifications.stats.readRate}%
                </span>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3">
                <span className="text-[10px] text-neutral-500 uppercase font-bold block">{isAr ? "مزود الخدمة" : "Provider"}</span>
                <span className="text-xs font-bold text-neutral-200 flex items-center gap-1 mt-1">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      notifications.smtp.active ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  <span>{notifications.smtp.active ? "SMTP Ready" : "Simulated"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Recent Delivery Logs */}
          <div className="lg:col-span-4 rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              {isAr ? "أحدث سجلات الإرسال (Live Logs)" : "Recent Delivery Logs"}
            </h3>
            {!notifications.recentLogs.length ? (
              <EmptyState>{isAr ? "لا توجد سجلات بعد" : "No logs recorded"}</EmptyState>
            ) : (
              <div className="space-y-2 text-xs">
                {notifications.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-border-subtle bg-neutral-900/40 p-2.5 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-200 truncate max-w-[150px]">
                        {log.recipientName || log.recipientEmail}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                          log.status === "DELIVERED"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : log.status === "FAILED"
                            ? "bg-red-500/20 text-red-300"
                            : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate">{log.subject}</p>
                    <p className="text-[10px] text-neutral-500">{relativeTime(log.createdAt, locale)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. BACKGROUND JOBS & AUTOMATION CONTROL */}
      <section aria-label="Background Processors" className="space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            {isAr ? "التحكم في المعالجات الخلفية التلقائية (Automation Jobs)" : "Background Automation Control"}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isAr
              ? "مراقبة معالج إغلاق الطلبات المنتهية دون رد تلقائياً وتشغيله يدوياً عند الحاجة"
              : "Monitor scheduled automated workers and execute manual on-demand health sweeps"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-100">
                    {isAr ? "معالج إغلاق الطلبات غير المستجابة (7-Days Auto-Close)" : "No-Response Auto-Close Worker"}
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {isAr ? "نشط · يعمل كل 15 دقيقة" : "Active · Runs every 15m"}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isAr
                    ? "يقوم بفحص طلبات التقديم التي لم تتلق رداً بعد 7 أيام من آخر تحديث ويحول حالتها تلقائياً إلى «مغلقة: لم يُرد عليها»"
                    : "Automatically moves applications without updates after 7 days into CLOSED: NO_RESPONSE"}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={runningProcessor}
              onClick={handleRunNoResponse}
              className="button-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-40"
            >
              <Play className="h-4 w-4" />
              <span>{runningProcessor ? (isAr ? "جارٍ الفحص..." : "Running...") : (isAr ? "تشغيل الفحص الآن يدوياً" : "Run Sweep Now")}</span>
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-400 block">{isAr ? "إجمالي الطلبات المغلقة تلقائياً حتى الآن" : "Total Automatically Closed"}</span>
                <span className="text-2xl font-bold font-mono text-neutral-100">
                  {number(noResponseProcessor.autoClosedCount)}
                </span>
              </div>
              <CheckCircle className="h-6 w-6 text-emerald-400" />
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-400 block">{isAr ? "مرشحة للإغلاق خلال الـ 24 ساعة القادمة" : "Pending Closure in Next 24h"}</span>
                <span className="text-2xl font-bold font-mono text-amber-400">
                  {number(noResponseProcessor.candidatesNext24h)}
                </span>
              </div>
              <Clock className="h-6 w-6 text-amber-400" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. STORAGE & CV ASSETS MONITOR */}
      <section aria-label="Storage Assets" className="space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            {isAr ? "مراقبة مساحة التخزين وملفات السير الذاتية (Storage & CVs)" : "Storage & CV Assets Monitor"}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isAr
              ? "متابعة الملفات المخزنة وسجل النسخ السابقة، مع أداة تنظيف الملفات المؤقتة واليتيمة"
              : "Monitor storage footprint from uploaded candidate resumes and version history"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-100">
                  {isAr ? "مستودع السير الذاتية والنسخ السابقة (Private CV Storage)" : "Private CV Storage Volume"}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
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
              className="button-secondary inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4 text-amber-400" />
              <span>{cleaningOrphans ? (isAr ? "جارٍ التنظيف..." : "Cleaning...") : (isAr ? "تنظيف الملفات اليتيمة غير المرتبطة" : "Cleanup Orphaned Files")}</span>
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-300">
                {isAr ? "المساحة المستهلكة" : "Storage Consumed"}: <strong className="text-neutral-100 font-mono">{storage.totalMegabytes} MB</strong>
              </span>
              <span className="text-neutral-500 font-mono">
                {isAr ? "الحد التنبيهي:" : "Limit:"} {storage.limitMegabytes} MB ({storage.percentUsed}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  storage.percentUsed > 80 ? "bg-red-500" : storage.percentUsed > 50 ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${Math.max(2, storage.percentUsed)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. SYSTEM HEALTH, RATE LIMITS & EVENT LOG */}
      <section aria-label="System Health" className="space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            {isAr ? "صحة النظام وقاعدة البيانات والحماية (System Health)" : "System Health & Rate Limits"}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isAr
              ? "مؤشرات أداء PostgreSQL وسجل تدقيق الأحداث الشامل وحماية معدل الطلبات"
              : "Database ping latency, domain event log audit volume, and rate limiting status"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: PostgreSQL Latency */}
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-semibold">{isAr ? "قاعدة بيانات PostgreSQL" : "PostgreSQL Database"}</span>
              <Database className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {systemHealth.dbLatencyMs} ms
              </span>
              <span className="text-xs text-neutral-400 font-medium">{isAr ? "استجابة سريعة" : "Ping Latency"}</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              {isAr ? "الاتصال نشط وصحي" : "Connected & Healthy"}
            </p>
          </div>

          {/* Card 2: DomainEventLog Volume */}
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-semibold">{isAr ? "سجل الأحداث (DomainEventLog)" : "Domain Event Log"}</span>
              <Server className="h-4 w-4 text-blue-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-neutral-100">
                {number(systemHealth.domainEventsCount)}
              </span>
              <span className="text-xs text-neutral-400 font-medium">{isAr ? "حدثاً موثقاً" : "Audit Events"}</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              {isAr ? "سجل غير قابل للتعديل" : "Immutable Audit Trail"}
            </p>
          </div>

          {/* Card 3: Throttler Protection */}
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-semibold">{isAr ? "حماية معدل الطلبات (Throttler)" : "Rate Limiter Shield"}</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {systemHealth.rateLimiter.limit}
              </span>
              <span className="text-xs text-neutral-400 font-medium">req / min</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              {isAr ? "درع الحماية من الهجمات نشط" : "DDoS & Flood Protection Active"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

