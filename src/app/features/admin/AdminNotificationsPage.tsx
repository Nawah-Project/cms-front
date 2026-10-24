import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminApi,
  type AdminGroup,
  type AdminMember,
  type NotificationLogItem,
  type NotificationStats,
  type PreviewRecipientsResult,
  type SendCustomNotificationInput,
} from "./api/adminApi";
import {
  AlertCircleIcon,
  BellIcon,
  CheckCircleIcon,
  CheckIcon,
  CloseIcon,
  ExternalLinkIcon,
  SearchIcon,
  SparklesIcon,
  SpinnerIcon,
} from "../../components/Icons";
import { PageHeading } from "./components/AdminUI";
import { useToast } from "../../components/ui/ToastProvider";

const TEMPLATES = [
  {
    id: "encourage",
    name: "تشجيع المتعثرين",
    subject: "دفعة للأمام: كيف تتجاوز التحدي الحالي في نواة؟",
    body: `مرحباً {اسم_العضو}،

لاحظنا بعض التباطؤ في تقدمك في {المهمة_الحالية}. لا تقلق، فهذه مرحلة طبيعية يمر بها الكثير من الزملاء في {اسم_المجموعة}.

نحن هنا لمساعدتك خطوة بخطوة. تفقد التوجيهات المرفقة أو تواصل معنا عبر المجتمع لاستكمال المهام بنجاح.`,
    ctaText: "الانتقال إلى المهام",
    ctaLink: "/tasks",
  },
  {
    id: "weekly_reminder",
    name: "تذكير بالمهام الأسبوعية",
    subject: "تذكير أسبوعي بمهام رحلتك المهنية في نواة",
    body: `مرحباً {اسم_العضو}،

نود تذكيرك بالمهام المستحقة لهذا الأسبوع. الالتزام بتسليم المهام في موعدها يمنحك التقييم الدقيق ويساعدك في إتمام مرحلتك المهنية في {اسم_المجموعة}.

نتمنى لك أسبوعاً مليئاً بالإنجاز والتقدم!`,
    ctaText: "عرض قائمة المهام",
    ctaLink: "/tasks",
  },
  {
    id: "congrats",
    name: "تهنئة بالإنجاز",
    subject: "إنجاز رائع يا {اسم_العضو}! استمر في التألق",
    body: `مرحباً {اسم_العضو}،

فخورون جداً بالجهد المتميز والتقدم الذي حققته مؤخراً في {المهمة_الحالية}! هذا الالتزام يعكس جديتك ورغبتك الحقيقية في التطور.

استمر بنفس الطاقة الإيجابية ونحن بانتظار إنجازك القادم!`,
    ctaText: "متابعة لوحة التقدم",
    ctaLink: "/members-progress",
  },
  {
    id: "platform_update",
    name: "تحديث تقني هام",
    subject: "تحديث هام بخصوص تجربة الاستخدام في منصة نواة",
    body: `مرحباً {اسم_العضو}،

أطلقنا مجموعة من التحسينات الجديدة في منصة نواة لتعزيز تجربة استكشاف الفرص وإدارة المهام اليومية في {اسم_المجموعة}.

ندعوك لتسجيل الدخول والاطلاع على التحديثات وتحديث ملفك الشخصي.`,
    ctaText: "الدخول إلى المنصة",
    ctaLink: "/",
  },
];

export default function AdminNotificationsPage() {
  const toast = useToast();
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [remindingUnverified, setRemindingUnverified] = useState(false);

  // Composer State
  const [targetType, setTargetType] = useState<
    "MEMBERS" | "GROUP" | "SMART_SEGMENT"
  >("SMART_SEGMENT");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedSegment, setSelectedSegment] = useState<
    "TASK_0_STALLED" | "INACTIVE_7_DAYS" | "OVERDUE_TASKS" | "UNASSIGNED_GROUP"
  >("TASK_0_STALLED");
  const [channel, setChannel] = useState<
    "EMAIL_AND_BELL" | "EMAIL_ONLY" | "BELL_ONLY"
  >("EMAIL_AND_BELL");

  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [body, setBody] = useState(TEMPLATES[0].body);
  const [ctaText, setCtaText] = useState(TEMPLATES[0].ctaText);
  const [ctaLink, setCtaLink] = useState(TEMPLATES[0].ctaLink);

  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [previewResult, setPreviewResult] =
    useState<PreviewRecipientsResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);

  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Logs State
  const [logs, setLogs] = useState<NotificationLogItem[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsFilter, setLogsFilter] = useState("ALL");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<NotificationLogItem | null>(
    null,
  );
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  // Load Initial Stats & Lookups
  const loadStats = useCallback(async () => {
    try {
      const data = await adminApi.notificationStats();
      setStats(data);
    } catch {
      toast.error("فشل تحميل إحصائيات البريد والإشعارات");
    } finally {
      setLoadingStats(false);
    }
  }, [toast]);

  const loadGroupsAndMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const [groupRes, userRes] = await Promise.all([
        adminApi.groups(),
        adminApi.users({ page: 1, limit: 100 }),
      ]);
      const groupList = groupRes.items || [];
      setGroups(groupList);
      if (groupList.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groupList[0].id);
      }
      setMembers(userRes.items.filter((u) => u.role === "USER"));
    } catch {
      // Non-blocking
    } finally {
      setLoadingMembers(false);
    }
  }, [selectedGroupId]);

  const loadLogs = useCallback(
    async (page = 1, filter = logsFilter) => {
      setLoadingLogs(true);
      try {
        const res = await adminApi.notificationLogs(page, 15, filter);
        setLogs(res.items);
        setLogsPage(res.page);
        setLogsTotalPages(res.pages || 1);
      } catch {
        toast.error("فشل تحميل سجل الإشعارات والبريد");
      } finally {
        setLoadingLogs(false);
      }
    },
    [logsFilter, toast],
  );

  useEffect(() => {
    loadStats();
    loadGroupsAndMembers();
  }, [loadStats, loadGroupsAndMembers]);

  useEffect(() => {
    loadLogs(logsPage, logsFilter);
  }, [logsPage, logsFilter, loadLogs]);

  // Preview Recipients when target changes
  useEffect(() => {
    let active = true;
    const fetchPreview = async () => {
      setLoadingPreview(true);
      try {
        const res = await adminApi.previewRecipients({
          targetType,
          memberIds: targetType === "MEMBERS" ? selectedMemberIds : undefined,
          groupId: targetType === "GROUP" ? selectedGroupId : undefined,
          smartSegment:
            targetType === "SMART_SEGMENT" ? selectedSegment : undefined,
        });
        if (active) setPreviewResult(res);
      } catch {
        if (active) setPreviewResult({ count: 0, recipients: [] });
      } finally {
        if (active) setLoadingPreview(false);
      }
    };

    fetchPreview();
    return () => {
      active = false;
    };
  }, [targetType, selectedMemberIds, selectedGroupId, selectedSegment]);

  // Handlers
  const handleSendTestEmail = async () => {
    setTestingEmail(true);
    try {
      const res = await adminApi.sendTestEmail();
      toast.success(res.message || "تم إرسال البريد التجريبي إلى حسابك بنجاح");
      loadStats();
      loadLogs(1, logsFilter);
    } catch (err: any) {
      toast.error(err?.message || "فشل إرسال البريد التجريبي");
    } finally {
      setTestingEmail(false);
    }
  };

  const handleRemindUnverified = async () => {
    setRemindingUnverified(true);
    try {
      const res = await adminApi.remindUnverifiedUsers();
      toast.success(
        res.message || `تم إرسال ${res.sentCount} رسالة تذكير لتأكيد الحساب`,
      );
      loadStats();
      loadLogs(1, logsFilter);
    } catch (err: any) {
      toast.error(err?.message || "فشل إرسال رسائل التذكير");
    } finally {
      setRemindingUnverified(false);
    }
  };

  const handleInsertVariable = (variableName: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setBody((prev) => prev + variableName);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = body;
    const updated =
      current.substring(0, start) + variableName + current.substring(end);
    setBody(updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + variableName.length,
        start + variableName.length,
      );
    }, 0);
  };

  const handleSelectTemplate = (templateId: string) => {
    const tmpl = TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;
    setSubject(tmpl.subject);
    setBody(tmpl.body);
    setCtaText(tmpl.ctaText);
    setCtaLink(tmpl.ctaLink);
  };

  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const handleRetryLog = async (logId: string) => {
    setRetryingLogId(logId);
    try {
      const res = await adminApi.retryNotificationLog(logId);
      toast.success(res.message || "تمت إعادة محاولة الإرسال بنجاح");
      loadStats();
      loadLogs(logsPage, logsFilter);
      if (selectedLog?.id === logId) {
        setSelectedLog(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "فشلت إعادة محاولة الإرسال");
    } finally {
      setRetryingLogId(null);
    }
  };

  const handleSendNotification = async () => {
    if (!subject.trim()) {
      toast.error("يرجى كتابة عنوان الإشعار / موضوع البريد");
      return;
    }
    if (!body.trim()) {
      toast.error("يرجى كتابة نص الرسالة");
      return;
    }
    if (!previewResult || previewResult.count === 0) {
      toast.error("لم يتم تحديد أي مستلمين لتلقي هذا الإشعار");
      return;
    }

    const payload: SendCustomNotificationInput = {
      targetType,
      memberIds: targetType === "MEMBERS" ? selectedMemberIds : undefined,
      groupId: targetType === "GROUP" ? selectedGroupId : undefined,
      smartSegment:
        targetType === "SMART_SEGMENT" ? selectedSegment : undefined,
      channel,
      subject: subject.trim(),
      body: body.trim(),
      ctaText: ctaText.trim() || undefined,
      ctaLink: ctaLink.trim() || undefined,
    };

    setSendingNotification(true);
    try {
      const res = await adminApi.sendCustomNotification(payload);
      toast.success(res.message || "تم إرسال الإشعار بنجاح");
      loadStats();
      loadLogs(1, logsFilter);
      if (targetType === "MEMBERS") setSelectedMemberIds([]);
    } catch (err: any) {
      toast.error(err?.message || "فشل إرسال الإشعار");
    } finally {
      setSendingNotification(false);
    }
  };

  // Quota Calculations
  const targetedCount = previewResult?.count ?? 0;
  const consumesEmail = channel === "EMAIL_AND_BELL" || channel === "EMAIL_ONLY";
  const emailQuotaNeeded = consumesEmail ? targetedCount : 0;
  const dailyRemaining = stats?.daily.remaining ?? 100;
  const otpReserve = stats?.config.otpSafeReserve ?? 15;
  const reserveEnabled = stats?.config.otpSafeReserveEnabled ?? true;
  const safeCapacity = reserveEnabled
    ? Math.max(0, dailyRemaining - otpReserve)
    : dailyRemaining;
  const violatesOtpReserve =
    consumesEmail && reserveEnabled && emailQuotaNeeded > safeCapacity;
  const remainingAfterSend = Math.max(0, dailyRemaining - emailQuotaNeeded);

  // Filtered members for member selector
  const filteredMemberList = useMemo(() => {
    if (!memberSearchQuery.trim()) return members;
    const q = memberSearchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)),
    );
  }, [members, memberSearchQuery]);

  // Live preview dynamic replacements
  const previewSampleMember = previewResult?.recipients[0] || {
    id: "sample",
    name: "أحمد السعيد",
    email: "ahmed.saeed@example.com",
    groupName: "مجموعة الأمل",
    currentQuestTitle: "المهمة 0: إعداد الملف التعريفي والهدف المهني",
  };

  const renderedPreviewSubject = useMemo(() => {
    return subject
      .replace(/{اسم_العضو}/g, previewSampleMember.name)
      .replace(
        /{اسم_المجموعة}/g,
        previewSampleMember.groupName || "المجموعة المهنية",
      )
      .replace(
        /{المهمة_الحالية}/g,
        previewSampleMember.currentQuestTitle || "المهمة النشطة",
      );
  }, [subject, previewSampleMember]);

  const renderedPreviewBody = useMemo(() => {
    return body
      .replace(/{اسم_العضو}/g, previewSampleMember.name)
      .replace(
        /{اسم_المجموعة}/g,
        previewSampleMember.groupName || "المجموعة المهنية",
      )
      .replace(
        /{المهمة_الحالية}/g,
        previewSampleMember.currentQuestTitle || "المهمة النشطة",
      );
  }, [body, previewSampleMember]);

  return (
    <div className="space-y-8" dir="rtl" lang="ar">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading
          eyebrow="لوحة التحكم والتواصل"
          title="البريد والإشعارات"
          description="إدارة قنوات التواصل، مراقبة استهلاك باقة البريد اليومية والشهرية، وإرسال تنبيهات موجهة للأعضاء والمجموعات."
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadStats}
            className="button-ghost px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
          >
            تحديث المؤشرات
          </button>
        </div>
      </div>

      {/* Block A: SMTP Health & Quota Banner */}
      <section
        aria-label="حالة الاتصال والبريد"
        className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              حالة مزود البريد (SMTP / Resend):
            </span>
            {loadingStats ? (
              <span className="status-badge status-neutral">
                <SpinnerIcon className="h-3 w-3 animate-spin" /> جاري الفحص...
              </span>
            ) : stats?.smtp?.active ? (
              <span className="status-badge status-success inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                متصل ونشط ({stats.smtp.from || stats.smtp.user || "no-reply@nawah-project.com"})
              </span>
            ) : (
              <span className="status-badge status-warning inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                في انتظار ربط SMTP (الإرسال البريدي متوقف مؤقتاً)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={testingEmail || !stats?.smtp?.active}
              onClick={handleSendTestEmail}
              className="button-secondary px-3.5 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testingEmail ? (
                <>
                  <SpinnerIcon className="h-3.5 w-3.5 animate-spin" /> جاري الإرسال...
                </>
              ) : (
                "إرسال بريد تجريبي لنفسي"
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="button-ghost px-3.5 py-2 text-xs border border-border"
            >
              إعدادات الحد والأمان
            </button>
          </div>
        </div>
      </section>

      {/* Block B: Quota & Usage Monitoring Cards */}
      <section
        aria-label="مراقبة الرصيد والاستهلاك"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {/* Card 1: Daily Quota */}
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              استهلاك البريد اليومي (يتجدد 12:00 ص)
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                {stats?.daily.sent ?? 0} / {stats?.daily.limit ?? 100}
              </span>
              <span className="text-xs text-neutral-500 tabular-nums">
                ({stats?.daily.percentUsed ?? 0}%)
              </span>
            </div>
            {/* Progress Bar */}
            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
              role="progressbar"
              aria-valuenow={stats?.daily.percentUsed ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full transition-all duration-300 ${
                  (stats?.daily.percentUsed ?? 0) > 85
                    ? "bg-rose-500"
                    : (stats?.daily.percentUsed ?? 0) >= 70
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
                style={{
                  width: `${Math.min(100, stats?.daily.percentUsed ?? 0)}%`,
                }}
              />
            </div>
          </div>
          <p className="mt-4 text-xs text-neutral-500 leading-relaxed tabular-nums">
            متبقي {stats?.daily.remaining ?? 100} رسالة اليوم (محجوز{" "}
            {stats?.config.otpSafeReserve ?? 15} لأكواد التفعيل OTP).
          </p>
        </div>

        {/* Card 2: Monthly Quota */}
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              استهلاك الباقة الشهري (Resend)
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                {stats?.monthly.sent ?? 0} /{" "}
                {(stats?.monthly.limit ?? 3000).toLocaleString("en-US")}
              </span>
              <span className="text-xs text-neutral-500 tabular-nums">
                ({stats?.monthly.percentUsed ?? 0}%)
              </span>
            </div>
            {/* Progress Bar */}
            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
              role="progressbar"
              aria-valuenow={stats?.monthly.percentUsed ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{
                  width: `${Math.min(100, stats?.monthly.percentUsed ?? 0)}%`,
                }}
              />
            </div>
          </div>
          <p className="mt-4 text-xs text-neutral-500 leading-relaxed tabular-nums">
            متبقي {(stats?.monthly.remaining ?? 3000).toLocaleString("en-US")} رسالة
            هذا الشهر ({stats?.monthly.percentUsed ?? 0}% مستهلك).
          </p>
        </div>

        {/* Card 3: Deliverability & Verification */}
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              حسابات موثقة بالبريد (Verified)
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                {stats?.verification.verifiedUsers ?? 0} /{" "}
                {stats?.verification.totalUsers ?? 0}
              </span>
              <span className="text-xs text-neutral-500 tabular-nums">
                ({stats?.verification.verifiedPercent ?? 0}%)
              </span>
            </div>
            {/* Progress Bar */}
            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
              role="progressbar"
              aria-valuenow={stats?.verification.verifiedPercent ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${Math.min(100, stats?.verification.verifiedPercent ?? 0)}%`,
                }}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-neutral-500 tabular-nums">
              غير موثق: {stats?.verification.unverifiedUsers ?? 0}
            </span>
            {(stats?.verification.unverifiedUsers ?? 0) > 0 && (
              <button
                type="button"
                disabled={remindingUnverified || !stats?.smtp?.active}
                onClick={handleRemindUnverified}
                className="text-xs font-semibold text-neutral-900 hover:underline dark:text-neutral-100 disabled:opacity-50"
              >
                {remindingUnverified
                  ? "جاري التذكير..."
                  : `تذكير (${stats?.verification.unverifiedUsers})`}
              </button>
            )}
          </div>
        </div>

        {/* Card 4: OTP Safe-Reserve Guard */}
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                درع حماية أكواد التفعيل (OTP)
              </p>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={stats?.config.otpSafeReserveEnabled ?? true}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    try {
                      await adminApi.updateNotificationConfig({
                        otpSafeReserveEnabled: checked,
                      });
                      loadStats();
                      toast.success(
                        checked
                          ? "تم تفعيل درع حماية أكواد OTP"
                          : "تم تعطيل درع الحماية مؤقتاً",
                      );
                    } catch {
                      toast.error("فشل تعديل إعداد درع الأمان");
                    }
                  }}
                  className="peer sr-only"
                />
                <div className="peer h-5 w-9 rounded-full bg-neutral-300 after:absolute after:top-[2px] after:right-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-neutral-900 peer-checked:after:-translate-x-full dark:bg-neutral-700 dark:peer-checked:bg-white" />
              </label>
            </div>
            <div className="mt-2">
              <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                حجز آخر {stats?.config.otpSafeReserve ?? 15} إيميل يومياً
              </span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-neutral-500 leading-normal">
            يمنع الإشعارات الجماعية من استنفاد الرصيد اليومي لضمان عدم تعطل تسجيل
            الأعضاء الجدد واستقبال أكواد الدخول.
          </p>
        </div>
      </section>

      {/* Block C: Custom Notification Composer */}
      <section
        aria-label="استوديو إرسال الإشعارات المخصصة"
        className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs space-y-6"
      >
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            استوديو إرسال الإشعارات المخصصة
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            حدد الجمهور المستهدف، صمم محتوى الرسالة، وعاين الشكل النهائي كما
            سيظهر في صندوق البريد للمستلم.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          {/* Form Side */}
          <div className="space-y-6">
            {/* 1. Audience Selector */}
            <div className="space-y-3">
              <label className="field-label font-bold text-neutral-900 dark:text-neutral-100">
                1. تحديد الجمهور المستهدف
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "SMART_SEGMENT", label: "شرائح ذكية" },
                  { id: "GROUP", label: "مجموعة كاملة" },
                  { id: "MEMBERS", label: "أعضاء محددون" },
                ].map((item) => {
                  const isSelected = targetType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setTargetType(item.id as typeof targetType)
                      }
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        isSelected
                          ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900 shadow-xs"
                          : "border-border bg-surface text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Sub-selectors */}
              {targetType === "SMART_SEGMENT" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      id: "TASK_0_STALLED",
                      title: "المتعثرون في المهمة 0",
                      desc: "من لم يسلموا المهمة التمهيدية",
                    },
                    {
                      id: "INACTIVE_7_DAYS",
                      title: "غير النشطين منذ 7 أيام",
                      desc: "أعضاء بلا أي نشاط مؤخراً",
                    },
                    {
                      id: "OVERDUE_TASKS",
                      title: "المتأخرون في تسليم المهام",
                      desc: "لديهم مهام متأخرة عن موعدها",
                    },
                    {
                      id: "UNASSIGNED_GROUP",
                      title: "أعضاء بدون مجموعة",
                      desc: "لم يتم تسكينهم في مجموعة بعد",
                    },
                  ].map((seg) => (
                    <div
                      key={seg.id}
                      onClick={() =>
                        setSelectedSegment(seg.id as typeof selectedSegment)
                      }
                      className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                        selectedSegment === seg.id
                          ? "border-neutral-900 bg-neutral-100/90 text-neutral-950 ring-1 ring-neutral-900 dark:border-white dark:bg-neutral-800 dark:text-white dark:ring-white"
                          : "border-border bg-neutral-50/50 hover:bg-neutral-100 dark:bg-neutral-900/50"
                      }`}
                    >
                      <p className="text-xs font-semibold">{seg.title}</p>
                      <p className="mt-0.5 text-[11px] text-neutral-500">
                        {seg.desc}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {targetType === "GROUP" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-600 dark:text-neutral-400">
                    اختر المجموعة:
                  </label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="field-control"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.memberCount} عضو)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === "MEMBERS" && (
                <div className="space-y-3">
                  <div className="relative">
                    <SearchIcon className="absolute right-3 top-2.5 h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="field-control pr-9 text-xs"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-border p-2 divide-y divide-border-subtle">
                    {loadingMembers ? (
                      <p className="p-2 text-center text-xs text-neutral-500">
                        جاري تحميل الأعضاء...
                      </p>
                    ) : filteredMemberList.length === 0 ? (
                      <p className="p-2 text-center text-xs text-neutral-500">
                        لا يوجد أعضاء مطابقون
                      </p>
                    ) : (
                      filteredMemberList.map((m) => {
                        const isSelected = selectedMemberIds.includes(m.id);
                        return (
                          <label
                            key={m.id}
                            className="flex items-center justify-between p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleMember(m.id)}
                                className="h-3.5 w-3.5 rounded border-border text-neutral-900 accent-neutral-900"
                              />
                              <div>
                                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                  {m.name}
                                </span>
                                {m.email && (
                                  <span className="text-[11px] text-neutral-500 mr-1.5">
                                    ({m.email})
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-neutral-400">
                              {m.group?.name || "بدون مجموعة"}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Target Count Indicator */}
              <div className="flex items-center justify-between rounded-xl border border-border/80 bg-neutral-50/50 p-2.5 text-xs text-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300">
                <span>الجمهور المستهدف حالياً:</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {loadingPreview ? (
                    <SpinnerIcon className="inline h-3.5 w-3.5 animate-spin" />
                  ) : (
                    `سيصل الإشعار إلى (${targetedCount}) عضواً`
                  )}
                </span>
              </div>
            </div>

            {/* 2. Channel Selector */}
            <div className="space-y-2">
              <label className="field-label font-bold text-neutral-900 dark:text-neutral-100">
                2. قناة الإرسال
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  {
                    id: "EMAIL_AND_BELL",
                    label: "الجرس + البريد",
                    badge: "موصى به",
                  },
                  { id: "EMAIL_ONLY", label: "البريد الإلكتروني فقط" },
                  { id: "BELL_ONLY", label: "إشعار الجرس فقط (مجاني)" },
                ].map((ch) => {
                  const isSelected = channel === ch.id;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setChannel(ch.id as typeof channel)}
                      className={`rounded-xl border p-2.5 text-center text-xs transition-all ${
                        isSelected
                          ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900 font-bold shadow-xs"
                          : "border-border bg-surface text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-900 dark:text-neutral-300"
                      }`}
                    >
                      <div className={isSelected ? "text-white dark:text-neutral-900 font-bold" : "text-neutral-800 dark:text-neutral-200 font-medium"}>
                        {ch.label}
                      </div>
                      {ch.badge && (
                        <span
                          className={`mt-1 inline-block text-[10px] ${
                            isSelected
                              ? "text-emerald-300 dark:text-emerald-700 font-semibold"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {ch.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Quick Templates Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  قوالب جاهزة سريعة:
                </label>
                <span className="text-[11px] text-neutral-400">
                  اضغط لتعبئة النموذج
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className="button-ghost border border-border px-2.5 py-1 text-xs rounded-full hover:border-neutral-400"
                  >
                    <SparklesIcon className="h-3 w-3 inline text-amber-500 ml-1" />
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Dynamic Variables Chips */}
            <div className="space-y-1.5">
              <label className="text-xs text-neutral-600 dark:text-neutral-400">
                المتغيرات المتاحة (تُستبدل تلقائياً لكل مستلم):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: "{اسم_العضو}", label: "اسم العضو" },
                  { tag: "{اسم_المجموعة}", label: "اسم المجموعة" },
                  { tag: "{المهمة_الحالية}", label: "المهمة الحالية" },
                ].map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => handleInsertVariable(v.tag)}
                    className="rounded-md border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs font-mono text-neutral-800 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    + {v.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Subject & Body */}
            <div className="space-y-4">
              <label className="grid gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                موضوع البريد / عنوان الإشعار
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: دفعة للأمام لتجاوز التحدي الحالي..."
                  className="field-control"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                نص الرسالة
                <textarea
                  ref={bodyTextareaRef}
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="اكتب رسالتك التوجيهية هنا..."
                  className="field-control leading-relaxed font-sans"
                />
              </label>
            </div>

            {/* 6. CTA Link & Text */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                نص زر الإجراء (CTA)
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="مثال: الانتقال إلى المهمة"
                  className="field-control"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                رابط الزر (داخلي أو خارجي)
                <input
                  type="text"
                  value={ctaLink}
                  onChange={(e) => setCtaLink(e.target.value)}
                  placeholder="مثال: /tasks"
                  className="field-control font-mono text-xs"
                />
              </label>
            </div>

            {/* 7. Quota Impact Box */}
            <div
              className={`rounded-xl border p-4 transition-colors ${
                violatesOtpReserve
                  ? "border-rose-300 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/20"
                  : "border-border/80 bg-neutral-50/50 dark:bg-neutral-900/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {violatesOtpReserve ? (
                    <AlertCircleIcon className="h-5 w-5 text-rose-500" />
                  ) : (
                    <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                  )}
                </div>
                <div className="flex-1 space-y-1 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      أثر الإرسال على رصيد اليوم:
                    </span>
                    <span className="font-bold tabular-nums">
                      {consumesEmail
                        ? `استهلاك: ${emailQuotaNeeded} إيميل | المتبقي بعد الإرسال: ${remainingAfterSend}`
                        : "0 استهلاك بريدي (مجاني عبر لوحة الإشعارات)"}
                    </span>
                  </div>

                  {violatesOtpReserve && (
                    <p className="text-rose-600 dark:text-rose-400 leading-relaxed font-medium">
                      ⚠️ لا يمكن الإرسال: هذا الإجراء يتعدى على درع حماية أكواد
                      التفعيل (محجوز {otpReserve} إيميل). يمكنك تقليل عدد
                      المستلمين، أو التحويل لقناة &quot;إشعار الجرس فقط&quot;.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={
                  sendingNotification ||
                  targetedCount === 0 ||
                  violatesOtpReserve ||
                  !subject.trim() ||
                  !body.trim()
                }
                onClick={handleSendNotification}
                className="button-primary px-6 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendingNotification ? (
                  <>
                    <SpinnerIcon className="h-4 w-4 animate-spin ml-1.5" />
                    جاري الإرسال للمستهدفين...
                  </>
                ) : (
                  `إرسال الإشعار الآن (${targetedCount})`
                )}
              </button>
            </div>
          </div>

          {/* Preview Side (Gmail Live Preview Box) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                معاينة البريد الحي (Gmail Style)
              </span>
              <span className="text-[10px] text-neutral-500">
                تحديث لحظي بالمتغيرات
              </span>
            </div>

            {/* Gmail Window Shell */}
            <div className="rounded-xl border border-neutral-300 bg-white shadow-xs dark:border-neutral-700 dark:bg-neutral-900 overflow-hidden text-neutral-900 dark:text-neutral-100 font-sans">
              {/* Window Header */}
              <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-100/80 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/80 dark:text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[11px] font-medium">
                  صندوق الوارد · Nawah Mail
                </span>
                <span className="text-[10px] tabular-nums">الآن</span>
              </div>

              {/* Message Details */}
              <div className="p-4 space-y-4">
                {/* Subject */}
                <h3 className="text-base font-bold text-neutral-950 dark:text-white leading-snug">
                  {renderedPreviewSubject || "(بدون عنوان)"}
                </h3>

                {/* Sender & Recipient */}
                <div className="flex items-start gap-2.5 border-b border-neutral-100 pb-3 text-xs dark:border-neutral-800">
                  <div className="h-7 w-7 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0 dark:bg-white dark:text-neutral-900">
                    ن
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        نواة - Nawah Project
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        &lt;no-reply@nawah-project.com&gt;
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      إلى: {previewSampleMember.name} &lt;{previewSampleMember.email}&gt;
                    </p>
                  </div>
                </div>

                {/* Email Body */}
                <div className="text-xs leading-relaxed text-neutral-800 dark:text-neutral-200 space-y-3 whitespace-pre-line min-h-[140px]">
                  {renderedPreviewBody || "(نص الرسالة فارغ)"}
                </div>

                {/* CTA Button */}
                {ctaText.trim() && (
                  <div className="pt-2 text-center">
                    <a
                      href={ctaLink || "#"}
                      onClick={(e) => e.preventDefault()}
                      className="inline-block rounded-lg bg-neutral-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                    >
                      {ctaText}
                    </a>
                  </div>
                )}

                {/* Footer Notice */}
                <div className="border-t border-neutral-100 pt-3 text-[10px] text-neutral-400 text-center leading-normal dark:border-neutral-800">
                  أنت تتلقى هذا الإشعار بصفتك عضواً في منصة نواة. يمكنك دائماً
                  متابعة حالة مهامك عبر مساحة العمل الخاصة بك.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Block D: Notifications & Email Log */}
      <section
        aria-label="سجل الإشعارات والبريد"
        className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              سجل الإشعارات والبريد الإلكتروني
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              سجل تفصيلي لكافة الرسائل الصادرة، حالة التسليم، وسجلات الأخطاء.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1">
            {[
              { id: "ALL", label: "الكل" },
              { id: "MENTOR_DIRECT", label: "توجيهات المرشد" },
              { id: "VERIFICATION_OTP", label: "أكواد OTP" },
              { id: "SYSTEM_ANNOUNCEMENT", label: "إعلانات ونظام" },
              { id: "FAILED", label: "الفاشلة فقط" },
            ].map((f) => {
              const isSelected = logsFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setLogsFilter(f.id);
                    setLogsPage(1);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-neutral-900 text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="application-table-shell overflow-x-auto">
          <table className="data-table w-full text-right text-xs">
            <thead className="data-table-head bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="p-3">المستلم</th>
                <th className="p-3">النوع</th>
                <th className="p-3">الموضوع</th>
                <th className="p-3">القناة</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loadingLogs ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-neutral-500">
                    <SpinnerIcon className="inline h-4 w-4 animate-spin ml-2" />
                    جاري تحميل السجل...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-neutral-500">
                    لا توجد رسائل مسجلة مطابقة للفلتر المحدد
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="data-table-row hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50"
                  >
                    <td className="data-table-cell p-3">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {log.recipientName || log.user?.name || "عضو"}
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        {log.recipientEmail}
                      </div>
                    </td>
                    <td className="data-table-cell p-3">
                      <span className="text-[11px] text-neutral-600 dark:text-neutral-300">
                        {log.type === "VERIFICATION_OTP"
                          ? "رمز دخول OTP"
                          : log.type === "MENTOR_DIRECT"
                            ? "توجيه مرشد"
                            : "إشعار نظام"}
                      </span>
                    </td>
                    <td className="data-table-cell p-3 max-w-[220px] truncate font-medium">
                      {log.subject}
                    </td>
                    <td className="data-table-cell p-3">
                      <span className="text-[11px] text-neutral-500">
                        {log.channel === "EMAIL_AND_BELL"
                          ? "بريد + جرس"
                          : log.channel === "BELL"
                            ? "جرس"
                            : "بريد"}
                      </span>
                    </td>
                    <td className="data-table-cell p-3">
                      {log.status === "DELIVERED" ? (
                        <span className="status-badge status-success">
                          تم التسليم
                        </span>
                      ) : log.status === "FAILED" ? (
                        <span className="status-badge status-danger">فشل</span>
                      ) : log.status === "PENDING" ? (
                        <span className="status-badge status-warning">
                          معلق
                        </span>
                      ) : (
                        <span className="status-badge status-neutral">
                          تخطي
                        </span>
                      )}
                    </td>
                    <td className="data-table-cell p-3 text-neutral-500 tabular-nums text-[11px]">
                      {new Date(log.createdAt).toLocaleDateString("ar-EG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="data-table-cell p-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="button-ghost px-2 py-1 text-xs"
                        >
                          عرض
                        </button>
                        {log.status === "FAILED" && (
                          <button
                            type="button"
                            disabled={retryingLogId === log.id}
                            onClick={() => handleRetryLog(log.id)}
                            className="button-secondary px-2 py-1 text-xs text-neutral-900 dark:text-neutral-100"
                          >
                            {retryingLogId === log.id ? (
                              <SpinnerIcon className="h-3 w-3 animate-spin" />
                            ) : (
                              "إعادة"
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {logsTotalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-neutral-500 tabular-nums">
              صفحة {logsPage} من {logsTotalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={logsPage <= 1}
                onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                className="button-ghost border border-border px-3 py-1 text-xs disabled:opacity-40"
              >
                السابقة
              </button>
              <button
                type="button"
                disabled={logsPage >= logsTotalPages}
                onClick={() => setLogsPage((p) => Math.min(logsTotalPages, p + 1))}
                className="button-ghost border border-border px-3 py-1 text-xs disabled:opacity-40"
              >
                التالية
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Settings Modal */}
      {showSettingsModal && stats && (
        <NotificationSettingsModal
          config={stats.config}
          onClose={() => setShowSettingsModal(false)}
          onSaved={() => {
            setShowSettingsModal(false);
            loadStats();
          }}
        />
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <NotificationLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onRetry={handleRetryLog}
          retrying={retryingLogId === selectedLog.id}
        />
      )}
    </div>
  );
}

// Subcomponent: Settings Modal
function NotificationSettingsModal({
  config,
  onClose,
  onSaved,
}: {
  config: NotificationStats["config"];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [dailyLimit, setDailyLimit] = useState(config.dailyEmailLimit);
  const [monthlyLimit, setMonthlyLimit] = useState(config.monthlyEmailLimit);
  const [otpReserve, setOtpReserve] = useState(config.otpSafeReserve);
  const [otpEnabled, setOtpEnabled] = useState(config.otpSafeReserveEnabled);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.updateNotificationConfig({
        dailyEmailLimit: Number(dailyLimit),
        monthlyEmailLimit: Number(monthlyLimit),
        otpSafeReserve: Number(otpReserve),
        otpSafeReserveEnabled: otpEnabled,
      });
      toast.success("تم تحديث إعدادات الحد والأمان بنجاح");
      onSaved();
    } catch {
      toast.error("فشل حفظ إعدادات الحد والأمان");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-5"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            إعدادات الحد والأمان للبريد
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <label className="grid gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            الحد اليومي للإرسال (رسالة/يوم):
            <input
              type="number"
              min={1}
              max={10000}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
              className="field-control font-mono"
            />
            <span className="text-[11px] text-neutral-400">
              يتجدد العداد تلقائياً يومياً عند الساعة 12:00 منتصف الليل.
            </span>
          </label>

          <label className="grid gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            الحد الشهري للباقة (Resend):
            <input
              type="number"
              min={1}
              max={100000}
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(Number(e.target.value))}
              className="field-control font-mono"
            />
            <span className="text-[11px] text-neutral-400">
              حسب سعة الباقة المجانية أو المدفوعة في مزود Resend.
            </span>
          </label>

          <label className="grid gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            حجم درع حماية أكواد التفعيل (OTP Reserve):
            <input
              type="number"
              min={0}
              max={500}
              value={otpReserve}
              onChange={(e) => setOtpReserve(Number(e.target.value))}
              className="field-control font-mono"
            />
            <span className="text-[11px] text-neutral-400">
              عدد الرسائل اليومية المحجوزة حصراً لأكواد الدخول والتسجيل.
            </span>
          </label>

          <label className="flex items-center gap-2.5 pt-1 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={otpEnabled}
              onChange={(e) => setOtpEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border text-neutral-900 accent-neutral-900"
            />
            <span className="font-medium text-neutral-800 dark:text-neutral-200">
              تفعيل درع الحماية ومنع الإرسال الجماعي عند استنفاد الرصيد المخصص
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="button-ghost px-4 py-2 text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="button-primary px-5 py-2 text-xs"
            >
              {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Subcomponent: Log Detail Modal
function NotificationLogDetailModal({
  log,
  onClose,
  onRetry,
  retrying,
}: {
  log: NotificationLogItem;
  onClose: () => void;
  onRetry: (id: string) => void;
  retrying: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl space-y-4"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            تفاصيل سجل الإرسال
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-neutral-400">المستلم:</span>
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                {log.recipientName || log.user?.name || "عضو"}
              </p>
              <p className="font-mono text-neutral-500">{log.recipientEmail}</p>
            </div>
            <div>
              <span className="text-neutral-400">الحالة:</span>
              <p className="mt-0.5">
                {log.status === "DELIVERED" ? (
                  <span className="status-badge status-success">تم التسليم</span>
                ) : log.status === "FAILED" ? (
                  <span className="status-badge status-danger">فشل</span>
                ) : (
                  <span className="status-badge status-neutral">معلق</span>
                )}
              </p>
            </div>
          </div>

          <div>
            <span className="text-neutral-400">الموضوع:</span>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">
              {log.subject}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-neutral-400">النوع:</span>
              <p className="font-mono text-neutral-700 dark:text-neutral-300">
                {log.type}
              </p>
            </div>
            <div>
              <span className="text-neutral-400">وقت الإرسال:</span>
              <p className="tabular-nums text-neutral-700 dark:text-neutral-300">
                {new Date(log.createdAt).toLocaleString("ar-EG")}
              </p>
            </div>
          </div>

          {log.errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              <span className="font-semibold">تفاصيل الخطأ:</span>
              <p className="mt-1 font-mono text-[11px] leading-relaxed">
                {log.errorMessage}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="button-ghost px-4 py-2 text-xs"
          >
            إغلاق
          </button>
          {log.status === "FAILED" && (
            <button
              type="button"
              disabled={retrying}
              onClick={() => onRetry(log.id)}
              className="button-primary px-4 py-2 text-xs"
            >
              {retrying ? "جاري إعادة الإرسال..." : "إعادة المحاولة الآن"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
