import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  adminApi,
  type AdminActivity,
  type AdminGroup,
  type AdminMember,
  type AdminOverview,
  type AttentionItem,
  type OperationsStatsResponse,
} from "./api/adminApi";
import { AdminActivityList } from "./components/AdminActivityList";
import { AdminMemberDetail } from "./components/AdminMemberDetail";
import { FeedbackFormDialog } from "../professional-development/components/FeedbackFormDialog";
import { useI18n } from "../../i18n";
import {
  AttentionReasonBadges,
  EmptyState,
  ErrorState,
  Initials,
  JourneyBadge,
  LoadingState,
} from "./components/AdminUI";
import { useToast } from "../../components/ui/ToastProvider";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Compass,
  Cpu,
  Flame,
  Layers,
  Mail,
  Send,
  Sparkles,
  Users,
} from "lucide-react";

export default function AdminOverviewPage() {
  const { t, tp, number, locale } = useI18n();
  const isAr = locale === "ar";
  const toast = useToast();

  const [data, setData] = useState<{
    overview: AdminOverview;
    groups: AdminGroup[];
    activity: AdminActivity[];
    attention: AttentionItem[];
    operations?: OperationsStatsResponse | null;
    uxMetrics?: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<AdminMember | null>(null);

  const load = () => {
    setLoading(true);
    setError(false);
    void Promise.all([
      adminApi.overview(),
      adminApi.groups(),
      adminApi.activity(5),
      adminApi.attention(6).catch(() => ({ total: 0, items: [] })),
      adminApi.operationsStats().catch(() => null),
      adminApi.uxAnalytics().catch(() => null),
    ])
      .then(([overview, groups, activity, attention, operations, uxMetrics]) =>
        setData({
          overview,
          groups: groups.items,
          activity: activity.items,
          attention: attention.items ?? [],
          operations,
          uxMetrics,
        }),
      )
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState label={t("admin.loadingOverview")} />;
  if (error || !data)
    return (
      <ErrorState
        label={t("admin.overviewError")}
        onRetry={load}
        retryLabel={t("common.retry")}
      />
    );

  const { overview, groups, activity, attention, operations, uxMetrics } = data;

  const groupsWithSpace = groups.filter((g) => g.availableSlots > 0).length;
  const totalOpenSlots = groups.reduce((acc, g) => acc + g.availableSlots, 0);

  const journeyWeeks = overview.journey?.weeks ?? [];
  const week0Count = journeyWeeks.find((w) => w.week === 0)?.members ?? 0;
  const week1to4Count = journeyWeeks
    .filter((w) => w.week >= 1)
    .reduce((sum, w) => sum + w.members, 0);

  const activeVariant = uxMetrics?.config?.defaultVariant ?? "B";
  const emailSentToday = operations?.notifications?.daily?.sent ?? 0;
  const emailDailyLimit = operations?.notifications?.daily?.limit ?? 100;
  const emailPercent = Math.min(
    100,
    Math.round((emailSentToday / Math.max(1, emailDailyLimit)) * 100),
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Executive 8 KPI Cards Grid */}
      <section aria-label="KPI Cards" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            {isAr ? "المؤشرات التنفيذية الرئيسية" : "Executive KPIs"}
          </h2>
          <span className="text-xs text-neutral-500">
            {isAr ? "محدثة في الزمن الفعلي" : "Live Real-Time Data"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          {/* Card 1: Total Users */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium">{t("admin.totalUsers")}</span>
              <Users className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white tabular-nums">
              {number(overview.usersCount)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {isAr
                ? `${number(overview.unassignedUsersCount)} غير معينين لمجموعة`
                : `${number(overview.unassignedUsersCount)} unassigned`}
            </p>
          </div>

          {/* Card 2: Active Groups */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium">{t("admin.groupsCount")}</span>
              <Layers className="h-4 w-4 text-info-strong" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white tabular-nums">
              {number(overview.groupsCount)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {isAr
                ? `${number(groupsWithSpace)} مجموعات بها ${number(totalOpenSlots)} مقعد شاغر`
                : `${number(groupsWithSpace)} groups with ${number(totalOpenSlots)} open slots`}
            </p>
          </div>

          {/* Card 3: Active Members (3d) */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium">{t("admin.activeUsers")}</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-500 tabular-nums">
              {number(overview.activeUsersCount)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {isAr ? "نشطون خلال آخر 3 أيام" : "Active in last 3 days"}
            </p>
          </div>

          {/* Card 4: Needs Follow-up (3-6d) */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs hover:border-amber-500/30 transition-all">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium">{t("admin.warningUsers")}</span>
              <Flame className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-amber-500 tabular-nums">
              {number(overview.warningUsersCount)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {isAr ? "انقطاع 3 إلى 6 أيام" : "Inactive for 3-6 days"}
            </p>
          </div>

          {/* Card 5: Inactive (+7d) */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs hover:border-red-500/30 transition-all">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium">{t("admin.criticalUsers")}</span>
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-red-500 tabular-nums">
              {number(overview.criticalUsersCount)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {isAr ? "انقطاع 7 أيام أو أكثر" : "Inactive for 7+ days"}
            </p>
          </div>

          {/* Card 6: Never Active */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs hover:border-neutral-500/30 transition-all">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium">{t("admin.neverActiveUsers")}</span>
              <Users className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-400 tabular-nums">
              {number(overview.neverActiveUsersCount)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {isAr ? "بلا نشاط منذ التسجيل" : "Zero recorded activity"}
            </p>
          </div>

          {/* Card 7: Total Applications */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium">{t("admin.applications")}</span>
              <Send className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white tabular-nums">
              {number(overview.applicationsCount)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {isAr ? "إجمالي التقديمات المسجلة" : "Total job submissions"}
            </p>
          </div>

          {/* Card 8: Available Capacity */}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-xs hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-medium">
                {isAr ? "المقاعد المتاحة" : "Available Seats"}
              </span>
              <Layers className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-400 tabular-nums">
              {number(totalOpenSlots)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {isAr
                ? `في ${number(groupsWithSpace)} مجموعات نشطة`
                : `Across ${number(groupsWithSpace)} active cohorts`}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Quick Operations & Funnel Pulse Strip */}
      <section aria-label="Pulse Strip" className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
          {isAr ? "نبض الأقسام والعمليات السريع" : "Department Pulse Strip"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Pulse Card 1: Journey Engine */}
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                  <Compass className="h-3.5 w-3.5" />
                  {isAr ? "هندسة الرحلة والحبكة" : "Journey Engine"}
                </span>
                <span className="text-xs text-neutral-500">
                  {number(week0Count + week1to4Count)} {isAr ? "عضو" : "members"}
                </span>
              </div>
              <p className="mt-3 text-xs text-neutral-400 leading-relaxed">
                {isAr
                  ? `الأسبوع 0: ${number(week0Count)} عضو في مرحلة التهيئة · الأسابيع 1-4: ${number(week1to4Count)} عضو في المسار المتقدم.`
                  : `Week 0: ${number(week0Count)} onboarding · Weeks 1-4: ${number(week1to4Count)} active.`}
              </p>
            </div>
            <Link
              to="/admin/journey"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <span>{isAr ? "إدارة الرحلة والحبكة ←" : "Open Journey Engine →"}</span>
            </Link>
          </div>

          {/* Pulse Card 2: UX Lab */}
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  {isAr ? "مختبر التجربة والسلوك" : "UX & Behavior Lab"}
                </span>
                <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-xs font-mono font-bold text-neutral-200">
                  {isAr ? `النسخة: ${activeVariant}` : `Variant ${activeVariant}`}
                </span>
              </div>
              <p className="mt-3 text-xs text-neutral-400 leading-relaxed">
                {isAr
                  ? "تحليل قمع العبور التراكمي، نقاط التوقف الدقيقة، ومؤشرات تبني أدوات الإصدار الثاني."
                  : "Granular funnel analysis, top drop-off bottleneck, and feature adoption metrics."}
              </p>
            </div>
            <Link
              to="/admin/ux-lab"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              <span>{isAr ? "فتح تحليلات التجربة ←" : "Open UX Lab →"}</span>
            </Link>
          </div>

          {/* Pulse Card 3: Operations & Quotas */}
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
                  <Cpu className="h-3.5 w-3.5" />
                  {isAr ? "العمليات والموارد" : "Operations & Quotas"}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {isAr ? "الأنظمة سليمة" : "Healthy"}
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>{isAr ? "استهلاك البريد اليومي" : "Daily Email"}</span>
                  <span className="tabular-nums font-semibold text-neutral-200">
                    {emailSentToday} / {emailDailyLimit}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      emailPercent > 85 ? "bg-red-500" : emailPercent > 60 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${emailPercent}%` }}
                  />
                </div>
              </div>
            </div>
            <Link
              to="/admin/operations"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
            >
              <span>{isAr ? "مراقبة العمليات والحدود ←" : "Monitor Operations →"}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Priority Intervention Queue («أعضاء يحتاجون تدخلك الآن») */}
      <section
        aria-label={t("admin.attentionTitle")}
        className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {isAr ? "أعضاء يحتاجون تدخلك الآن" : "Priority Intervention Queue"}
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              {isAr
                ? "قائمة فورية بالأعضاء المتعثرين في المهمة صفر أو المنقطعين منذ أكثر من 3 أيام لإرسال توجيه سريع"
                : "Real-time queue of stalled members in Task 0 or drop-offs requiring coaching guidance"}
            </p>
          </div>
          <Link
            to="/admin/community?tab=members"
            className="text-xs font-semibold text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            <span>{isAr ? "إدارة كل الأعضاء ←" : "All Members →"}</span>
          </Link>
        </div>

        {!attention.length ? (
          <EmptyState>{t("admin.attentionEmpty")}</EmptyState>
        ) : (
          <div className="divide-y divide-border-subtle">
            {attention.map(({ member, reasons }) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Initials name={member.name} avatar={member.avatar} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMember(member)}
                        className="truncate text-sm font-semibold text-neutral-900 hover:underline dark:text-neutral-100 cursor-pointer"
                      >
                        {member.name}
                      </button>
                      <span className="text-xs text-neutral-500">
                        · {member.group?.name ?? t("common.unassigned")}
                      </span>
                      <JourneyBadge journey={member.journey} compact />
                    </div>
                    <div className="mt-1.5">
                      <AttentionReasonBadges reasons={reasons} />
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackTarget(member)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-neutral-950 shadow-xs hover:bg-emerald-400 transition-colors cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isAr ? "إرسال توجيه" : "Direct Guidance"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMember(member)}
                    className="button-secondary px-3 py-1.5 text-xs font-medium cursor-pointer"
                  >
                    {isAr ? "عرض التفاصيل" : "Inspect Profile"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Recent Platform Activity Preview (Top 5) */}
      <section className="space-y-3">
        <div className="flex items-end justify-between border-b border-border pb-3">
          <div>
            <p className="text-xs text-neutral-500">{t("admin.recentChanges")}</p>
            <h3 className="mt-1 text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t("admin.recentActivity")}
            </h3>
          </div>
          <Link
            to="/admin/community?tab=activity"
            className="text-xs font-semibold text-emerald-400 hover:underline"
          >
            {isAr ? "عرض السجل الكامل ←" : "Full Platform Feed →"}
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-4 sm:px-5 py-2">
          <AdminActivityList items={activity.slice(0, 5)} />
        </div>
      </section>

      {selectedMember && (
        <AdminMemberDetail
          member={selectedMember}
          onClose={() => {
            setSelectedMember(null);
            load();
          }}
        />
      )}

      {feedbackTarget && (
        <FeedbackFormDialog
          post={null}
          initialTargetUserId={feedbackTarget.id}
          initialTargetName={feedbackTarget.name}
          initialVisibility="DIRECT"
          onClose={() => setFeedbackTarget(null)}
          onSaved={(msg) => {
            setFeedbackTarget(null);
            toast.success(t(`professionalDevelopment.${msg}`));
          }}
        />
      )}
    </div>
  );
}
