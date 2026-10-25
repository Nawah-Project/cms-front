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
import { MemberInspectorDrawer } from "./components/MemberInspectorDrawer";
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

  const [inspectorMemberId, setInspectorMemberId] = useState<string | null>(null);
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
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            {isAr ? "المؤشرات التنفيذية الرئيسية" : "Executive KPIs"}
          </h2>
          <span className="text-xs text-neutral-500 font-medium">
            {isAr ? "محدثة في الزمن الفعلي" : "Live Real-Time Data"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          {/* Card 1: Total Users */}
          <div className="rounded-xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
              <span className="text-xs font-semibold">{t("admin.totalUsers")}</span>
              <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-neutral-950 dark:text-white tabular-nums">
              {number(overview.usersCount)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {isAr
                ? `${number(overview.unassignedUsersCount)} غير معينين لمجموعة`
                : `${number(overview.unassignedUsersCount)} unassigned`}
            </p>
          </div>

          {/* Card 2: Active Groups */}
          <div className="rounded-xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
              <span className="text-xs font-semibold">{t("admin.groupsCount")}</span>
              <Layers className="h-4 w-4 text-info-strong" />
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-neutral-950 dark:text-white tabular-nums">
              {number(overview.groupsCount)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {isAr
                ? `${number(overview.membershipsCount)} عضو موزع بالدفعات`
                : `${number(overview.membershipsCount)} enrolled members`}
            </p>
          </div>

          {/* Card 3: Active Members */}
          <div className="rounded-xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
              <span className="text-xs font-semibold">{t("admin.activeUsers")}</span>
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-400 tabular-nums">
              {number(overview.activeUsersCount)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {isAr ? "نشط خلال الـ 3 أيام الأخيرة" : "Active in last 3 days"}
            </p>
          </div>

          {/* Card 4: Applications Count */}
          <div className="rounded-xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
              <span className="text-xs font-semibold">{t("admin.applicationsCount")}</span>
              <Send className="h-4 w-4 text-info-strong" />
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-neutral-950 dark:text-white tabular-nums">
              {number(overview.applicationsCount)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {isAr ? "طلب تقديم وظيفي مسجل" : "Total job submissions"}
            </p>
          </div>

          {/* Card 5: Warning Members */}
          <div className="rounded-xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
              <span className="text-xs font-semibold">{isAr ? "بحاجة لمتابعة" : "Needs Followup"}</span>
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-amber-700 dark:text-amber-400 tabular-nums">
              {number(overview.warningUsersCount)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {isAr ? "منقطع 3 - 6 أيام" : "3-6 days inactive"}
            </p>
          </div>

          {/* Card 6: Critical / Inactive */}
          <div className="rounded-xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
              <span className="text-xs font-semibold">{isAr ? "منقطع 7 أيام فأكثر" : "Critical Inactive"}</span>
              <Flame className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
              {number(overview.criticalUsersCount)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {isAr ? "بحاجة لتدخل عاجل" : "Urgent intervention"}
            </p>
          </div>

          {/* Card 7: Never Active */}
          <div className="rounded-xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
              <span className="text-xs font-semibold">{isAr ? "لم يبدأ النشاط" : "Never Active"}</span>
              <Users className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-neutral-700 dark:text-neutral-300 tabular-nums">
              {number(overview.neverActiveUsersCount)}
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {isAr ? "سجل ولم يتفاعل بعد" : "Registered, 0 activities"}
            </p>
          </div>

          {/* Card 8: Available Capacity */}
          <div className="rounded-xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
              <span className="text-xs font-semibold">{isAr ? "المقاعد المتاحة" : "Available Seats"}</span>
              <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-emerald-700 dark:text-emerald-400 tabular-nums">
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
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          {isAr ? "نبض الأقسام والعمليات السريع" : "Department Pulse Strip"}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Pulse Card 1: Journey Engine */}
          <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-surface p-5 shadow-xs dark:border-neutral-800">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  <Compass className="h-3.5 w-3.5" />
                  {isAr ? "هندسة الرحلة والحبكة" : "Journey Engine"}
                </span>
                <span className="text-xs text-neutral-500">
                  {number(week0Count + week1to4Count)} {isAr ? "عضو" : "members"}
                </span>
              </div>
              <p className="mt-3 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {isAr
                  ? `الأسبوع 0: ${number(week0Count)} عضو في مرحلة التهيئة · الأسابيع 1-4: ${number(week1to4Count)} عضو في المسار المتقدم.`
                  : `Week 0: ${number(week0Count)} onboarding · Weeks 1-4: ${number(week1to4Count)} active.`}
              </p>
            </div>
            <Link
              to="/admin/journey"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-neutral-100 hover:underline"
            >
              <span>{isAr ? "إدارة الرحلة والحبكة ←" : "Open Journey Engine →"}</span>
            </Link>
          </div>

          {/* Pulse Card 2: UX Lab */}
          <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-surface p-5 shadow-xs dark:border-neutral-800">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-info-soft px-2.5 py-1 text-xs font-bold text-info-strong border border-blue-200 dark:bg-info-soft/20 dark:border-blue-800">
                  <Sparkles className="h-3.5 w-3.5" />
                  {isAr ? "مختبر التجربة والسلوك" : "UX & Behavior Lab"}
                </span>
                <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-mono font-bold text-neutral-900 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700">
                  {isAr ? `النسخة: ${activeVariant}` : `Variant ${activeVariant}`}
                </span>
              </div>
              <p className="mt-3 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {isAr
                  ? "تحليل قمع العبور التراكمي، نقاط التوقف الدقيقة، ومؤشرات تبني أدوات الإصدار الثاني."
                  : "Granular funnel analysis, top drop-off bottleneck, and feature adoption metrics."}
              </p>
            </div>
            <Link
              to="/admin/ux-lab"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-info-strong hover:underline"
            >
              <span>{isAr ? "فتح تحليلات التجربة ←" : "Open UX Lab →"}</span>
            </Link>
          </div>

          {/* Pulse Card 3: Operations & Quotas */}
          <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-surface p-5 shadow-xs dark:border-neutral-800">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                  <Cpu className="h-3.5 w-3.5" />
                  {isAr ? "العمليات والموارد" : "Operations & Quotas"}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {isAr ? "الأنظمة سليمة" : "Healthy"}
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
                  <span>{isAr ? "استهلاك البريد اليومي" : "Daily Email"}</span>
                  <span className="tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
                    {emailSentToday} / {emailDailyLimit}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      emailPercent > 85 ? "bg-rose-500" : emailPercent > 60 ? "bg-amber-500" : "bg-neutral-900 dark:bg-white"
                    }`}
                    style={{ width: `${emailPercent}%` }}
                  />
                </div>
              </div>
            </div>
            <Link
              to="/admin/operations"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline"
            >
              <span>{isAr ? "مراقبة العمليات والحدود ←" : "Monitor Operations →"}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Priority Intervention Queue («أعضاء يحتاجون تدخلك الآن») */}
      <section
        aria-label={t("admin.attentionTitle")}
        className="rounded-2xl border border-neutral-200/80 bg-surface p-5 sm:p-6 space-y-4 shadow-xs dark:border-neutral-800"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-200/80 pb-4 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-base font-bold text-neutral-950 dark:text-neutral-100">
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
            className="text-xs font-bold text-neutral-900 dark:text-neutral-100 hover:underline inline-flex items-center gap-1"
          >
            <span>{isAr ? "إدارة كل الأعضاء ←" : "All Members →"}</span>
          </Link>
        </div>

        {!attention.length ? (
          <EmptyState>{t("admin.attentionEmpty")}</EmptyState>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
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
                        onClick={() => setInspectorMemberId(member.id)}
                        className="truncate text-sm font-bold text-neutral-950 hover:underline dark:text-neutral-100 cursor-pointer"
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
                    className="button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isAr ? "إرسال توجيه" : "Direct Guidance"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorMemberId(member.id)}
                    className="button-secondary px-3 py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    {isAr ? "عرض التفاصيل 360°" : "Inspect Profile"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Recent Platform Activity Preview (Top 5) */}
      <section className="space-y-3">
        <div className="flex items-end justify-between border-b border-neutral-200/80 pb-3 dark:border-neutral-800">
          <div>
            <p className="text-xs text-neutral-500">{t("admin.recentChanges")}</p>
            <h3 className="mt-1 text-base font-bold text-neutral-950 dark:text-neutral-100">
              {t("admin.recentActivity")}
            </h3>
          </div>
          <Link
            to="/admin/community?tab=activity"
            className="text-xs font-bold text-neutral-900 dark:text-neutral-100 hover:underline"
          >
            {isAr ? "عرض السجل الكامل ←" : "Full Platform Feed →"}
          </Link>
        </div>
        <div className="rounded-2xl border border-neutral-200/80 bg-surface px-4 sm:px-5 py-2 shadow-xs dark:border-neutral-800">
          <AdminActivityList items={activity.slice(0, 5)} />
        </div>
      </section>

      {/* Member 360° Inspector Slide-over Drawer */}
      <MemberInspectorDrawer
        memberId={inspectorMemberId}
        onClose={() => setInspectorMemberId(null)}
        onMemberUpdated={load}
      />

      {/* Quick Direct Guidance Form Dialog */}
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
