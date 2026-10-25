import { useEffect, useState } from "react";
import {
  adminApi,
  type AdminGroup,
  type AdminMember,
  type GranularFunnelResponse,
  type GranularFunnelStage,
} from "./api/adminApi";
import { MemberInspectorDrawer } from "./components/MemberInspectorDrawer";
import { FeedbackFormDialog } from "../professional-development/components/FeedbackFormDialog";
import { useI18n } from "../../i18n";
import {
  EmptyState,
  ErrorState,
  Initials,
  LoadingState,
  relativeTime,
} from "./components/AdminUI";
import { useToast } from "../../components/ui/ToastProvider";
import {
  AlertTriangle,
  ArrowDown,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Layers,
  Link as LinkIcon,
  MousePointerClick,
  Send,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Video,
} from "lucide-react";
import { type ExperimentVariant, isValidVariant } from "../../utils/uxAnalytics";

const VARIANTS: ExperimentVariant[] = ["A", "B", "C"];

export default function AdminUxLabPage() {
  const { t, locale, number } = useI18n();
  const isAr = locale === "ar";
  const toast = useToast();

  const [funnelData, setFunnelData] = useState<GranularFunnelResponse | null>(null);
  const [uxMetrics, setUxMetrics] = useState<any>(null);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // A/B/C Settings
  const [defaultVariant, setDefaultVariant] = useState<ExperimentVariant>("B");
  const [groupVariants, setGroupVariants] = useState<Record<string, ExperimentVariant>>({});
  const [introVideoUrl, setIntroVideoUrl] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  // Interactive Funnel: expanded stage code
  const [expandedStageCode, setExpandedStageCode] = useState<string | null>(null);

  // Member inspect & feedback modals
  const [inspectorMemberId, setInspectorMemberId] = useState<string | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<AdminMember | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(false);
    Promise.all([
      adminApi.granularFunnel(),
      adminApi.uxAnalytics(),
      adminApi.groups(),
    ])
      .then(([funnelRes, uxRes, groupsRes]) => {
        setFunnelData(funnelRes);
        setUxMetrics(uxRes);
        setGroups(groupsRes.items);

        const config = uxRes?.config;
        if (config) {
          if (isValidVariant(config.defaultVariant)) {
            setDefaultVariant(config.defaultVariant);
          }
          if (config.groupVariants) {
            setGroupVariants(config.groupVariants);
          }
          if (typeof config.introVideoUrl === "string") {
            setIntroVideoUrl(config.introVideoUrl);
          }
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveConfig = async (
    newDefault: ExperimentVariant,
    newGroups: Record<string, ExperimentVariant>,
    newVideo?: string,
  ) => {
    setSavingConfig(true);
    try {
      await adminApi.updateUxConfig({
        defaultVariant: newDefault,
        groupVariants: newGroups,
        introVideoUrl: newVideo !== undefined ? newVideo : introVideoUrl,
      });
      toast.success(isAr ? "تم حفظ إعدادات معمل التجارب بنجاح" : "Experiment settings saved");
      loadData();
    } catch {
      toast.error(isAr ? "فشل حفظ الإعدادات" : "Failed to save settings");
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) return <LoadingState label={isAr ? "جارٍ تحميل تحليلات التجربة..." : "Loading UX analytics..."} />;
  if (error || !funnelData)
    return (
      <ErrorState
        label={isAr ? "تعذر تحميل بيانات مختبر التجربة" : "Failed to load UX Lab data"}
        onRetry={loadData}
      />
    );

  const { stages, topBottleneck, totalUsers, adoptionMetrics } = funnelData;
  const abSummary = uxMetrics?.abTestSummary ?? {};

  const toggleStageExpand = (stageCode: string) => {
    setExpandedStageCode((prev) => (prev === stageCode ? null : stageCode));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. TOP BOTTLENECK ALERT BANNER */}
      {topBottleneck && (
        <section
          aria-label="Top Bottleneck"
          className="rounded-2xl border border-amber-300 bg-amber-50/70 p-5 shadow-xs dark:border-amber-800 dark:bg-amber-950/20"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200/80 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <span className="rounded-md bg-amber-200/80 px-2 py-0.5 text-xs font-bold text-amber-900 uppercase tracking-wider dark:bg-amber-900/60 dark:text-amber-300">
                  {isAr ? "أكبر نقطة توقف حالية في الرحلة (Top Drop-off Bottleneck)" : "Top Drop-off Bottleneck"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-neutral-950 dark:text-neutral-100">
                {isAr ? topBottleneck.titleAr : topBottleneck.titleEn}
              </h3>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 max-w-2xl leading-relaxed">
                {isAr
                  ? `يقف عند هذه المحطة حالياً ${number(topBottleneck.count)} عضو (${topBottleneck.percent}% من إجمالي المسجلين). يحتاجون إلى متابعة وتوجيه مباشر لتجاوز هذا الحاجز.`
                  : `${number(topBottleneck.count)} members (${topBottleneck.percent}% of total) currently stalled here. Targeted coaching recommended.`}
              </p>
            </div>

            <div className="rounded-xl border border-amber-300 bg-surface px-4 py-2.5 text-end dark:border-amber-800">
              <span className="text-[11px] text-neutral-500 block">{isAr ? "العالقون في المحطة" : "Stalled Members"}</span>
              <span className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-400">
                {topBottleneck.count} <span className="text-xs text-neutral-500">/ {totalUsers}</span>
              </span>
            </div>
          </div>

          {/* Members in bottleneck */}
          {Boolean(topBottleneck.stuckUsers?.length) && (
            <div className="mt-4 pt-3 border-t border-amber-200/80 dark:border-amber-800/60 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                {isAr ? "أبرز الأعضاء الواقفين عند نقطة التوقف:" : "Members Stalled at this Stage:"}
              </p>
              <div className="flex flex-wrap gap-2">
                {topBottleneck.stuckUsers.slice(0, 8).map((u) => (
                  <div
                    key={u.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-surface px-2.5 py-1 text-xs shadow-2xs dark:border-neutral-700"
                  >
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{u.name}</span>
                    <span className="text-[10px] text-neutral-500">
                      {isAr ? `منذ ${u.daysAtStage} يوم` : `${u.daysAtStage}d stalled`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setInspectorMemberId(u.id)}
                      className="text-[11px] font-bold text-info-strong hover:underline cursor-pointer"
                    >
                      {isAr ? "الملف" : "Profile"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackTarget(u as any)}
                      className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer dark:text-emerald-400"
                    >
                      {isAr ? "توجيه" : "Guide"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 2. GRANULAR JOURNEY FUNNEL (8 Stages with Zero% fix and expandability) */}
      <section aria-label="Funnel" className="space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            {isAr ? "خريطة قمع العبور التراكمي ونقاط التوقف الدقيقة (8 مراحل)" : "Granular Journey Drop-off Funnel (8 Stages)"}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isAr
              ? "اضغط على أي مرحلة لعرض قائمة الأعضاء المتوقفين عندها فوراً مع إمكانية إرسال توجيه أو فتح ملف العضو"
              : "Click any stage to expand stalled members and trigger direct coaching"}
          </p>
        </div>

        <div className="space-y-2.5">
          {stages.map((stage, idx) => {
            const isBottleneck = stage.isTopBottleneck;
            const isZero = stage.count === 0 || stage.percent === 0;
            const barWidth = isZero ? 0 : stage.percent;
            const isExpanded = expandedStageCode === stage.code;
            const stuckList = stage.stuckUsers || [];

            return (
              <div
                key={stage.code}
                className={`rounded-2xl border transition-all shadow-xs overflow-hidden ${
                  isBottleneck
                    ? "border-amber-300 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20"
                    : "border-neutral-200/80 bg-surface dark:border-neutral-800"
                }`}
              >
                <div
                  onClick={() => toggleStageExpand(stage.code)}
                  className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-[280px]">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-xs font-bold text-neutral-800 font-mono border border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-neutral-950 dark:text-neutral-100">
                            {isAr ? stage.titleAr : stage.titleEn}
                          </h4>
                          {isBottleneck && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.2 text-[10px] font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                              {isAr ? "أكبر عنق زجاجة !" : "Top Bottleneck !"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                          {isAr ? stage.descriptionAr : stage.descriptionEn}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-end">
                        <span className="text-base font-bold font-mono text-neutral-950 dark:text-neutral-100">
                          {number(stage.count)}
                        </span>
                        <span className="text-xs text-neutral-500 ms-1 font-semibold">({stage.percent}%)</span>
                      </div>

                      <div className="text-neutral-400">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar (Fixed 0% bug) */}
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    {barWidth > 0 && (
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isBottleneck
                            ? "bg-amber-500"
                            : idx === stages.length - 1
                            ? "bg-purple-600"
                            : "bg-neutral-900 dark:bg-white"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    )}
                  </div>
                </div>

                {/* Stalled members accordion dropdown */}
                {isExpanded && (
                  <div className="p-4 pt-3 border-t border-neutral-200/80 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-900/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                        {isAr ? `الأعضاء المتوقفون في هذه المرحلة (${stuckList.length}):` : `Stalled members (${stuckList.length}):`}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {isAr ? "اضغط على الملف للفحص الشامل أو توجيه لملاحظة فورية" : "Inspect 360° or send direct coaching note"}
                      </span>
                    </div>

                    {!stuckList.length ? (
                      <p className="text-xs text-neutral-500 py-2">
                        {isAr ? "لا يوجد أعضاء متوقفون عند هذه المرحلة حالياً." : "No members stalled at this stage."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {stuckList.map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-200 bg-surface shadow-2xs dark:border-neutral-700"
                          >
                            <div className="min-w-0 me-2">
                              <p className="text-xs font-bold text-neutral-950 dark:text-neutral-100 truncate">{u.name}</p>
                              <p className="text-[10px] text-neutral-500">
                                {isAr ? `متوقف منذ ${u.daysAtStage} يوم` : `${u.daysAtStage} days stalled`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setInspectorMemberId(u.id)}
                                className="button-secondary text-[10px] px-2 py-1 font-semibold cursor-pointer"
                              >
                                {isAr ? "الملف" : "Profile"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setFeedbackTarget(u as any)}
                                className="button-primary text-[10px] px-2 py-1 font-bold cursor-pointer"
                              >
                                {isAr ? "توجيه" : "Guide"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. A/B/C EXPERIMENTATION & ONBOARDING LAB */}
      <section aria-label="A/B/C Experiment" className="space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            {isAr ? "معمل اختبارات A/B/C وإعدادات واجهة المتدرب" : "A/B/C Experimentation & Variant Overrides"}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isAr
              ? "مقارنة أداء نسخ واجهة الباحث وتعيين النسخة الافتراضية والنسخ المخصصة للدفعات"
              : "Compare variant performance and set cohort variant overrides"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Comparison Table */}
          <div className="lg:col-span-7 rounded-2xl border border-neutral-200/80 bg-surface p-5 shadow-xs dark:border-neutral-800 space-y-4">
            <h3 className="text-sm font-bold text-neutral-950 dark:text-neutral-100">
              {isAr ? "مقارنة تفاعل النسخ الثلاث (A vs B vs C)" : "Variant Performance Breakdown"}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="border-b border-neutral-200 bg-neutral-50/90 text-neutral-600 font-semibold dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400">
                  <tr>
                    <th className="px-3 py-2.5 text-start">{isAr ? "النسخة" : "Variant"}</th>
                    <th className="px-3 py-2.5 text-start">{isAr ? "المستخدمون" : "Users"}</th>
                    <th className="px-3 py-2.5 text-start">{isAr ? "إجمالي التفاعلات" : "Interactions"}</th>
                    <th className="px-3 py-2.5 text-start">{isAr ? "الحالة" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {VARIANTS.map((v) => {
                    const count = abSummary[v]?.usersCount ?? 0;
                    const events = abSummary[v]?.totalEvents ?? 0;
                    const isDef = defaultVariant === v;

                    return (
                      <tr key={v} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="px-3 py-3 font-bold text-neutral-950 dark:text-neutral-100 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-100 text-xs font-mono font-black text-neutral-800 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700">
                            {v}
                          </span>
                          <span>
                            {v === "A"
                              ? isAr ? "النسخة التقليدية A" : "Standard Variant A"
                              : v === "B"
                              ? isAr ? "نسخة التوجيه المعزز B" : "Guided Variant B"
                              : isAr ? "نسخة التحدي السريع C" : "Accelerated Variant C"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-neutral-700 dark:text-neutral-300 font-mono">
                          {number(count)}
                        </td>
                        <td className="px-3 py-3 text-neutral-700 dark:text-neutral-300 font-mono">
                          {number(events)}
                        </td>
                        <td className="px-3 py-3">
                          {isDef ? (
                            <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                              {isAr ? "النسخة العامة الافتراضية" : "Default"}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDefaultVariant(v);
                                void saveConfig(v, groupVariants);
                              }}
                              className="text-[11px] font-semibold text-info-strong hover:underline cursor-pointer"
                            >
                              {isAr ? "تعيين كافتراضية" : "Set as default"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Group Overrides */}
          <div className="lg:col-span-5 rounded-2xl border border-neutral-200/80 bg-surface p-5 shadow-xs dark:border-neutral-800 space-y-3">
            <h3 className="text-sm font-bold text-neutral-950 dark:text-neutral-100">
              {isAr ? "تخصيص النسخ حسب المجموعات" : "Cohort Variant Overrides"}
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {isAr
                ? "يمكنك إسناد نسخة معينة لمجموعة محددة لملاحظة الفروق السلوكية:"
                : "Assign specific variants per cohort to test behavioral variances:"}
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {groups.map((group) => {
                const assigned = groupVariants[group.id] || defaultVariant;

                return (
                  <div
                    key={group.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50/70 p-2.5 dark:border-neutral-700 dark:bg-neutral-800/50"
                  >
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate flex-1">
                      {group.name}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      {VARIANTS.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            const next = { ...groupVariants, [group.id]: v };
                            setGroupVariants(next);
                            void saveConfig(defaultVariant, next);
                          }}
                          className={`h-7 w-7 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer ${
                            assigned === v
                              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                              : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-300"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 4. V2 FEATURE ADOPTION METRICS (Real Database Stats) */}
      <section aria-label="Feature Adoption" className="space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            {isAr ? "مؤشرات التفاعل مع أدوات V2 من قاعدة البيانات الفعلية" : "V2 Feature Adoption Metrics (Live Database Stats)"}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isAr
              ? "قياس تفاعل الأعضاء الحقيقي مع أدوات V2 من سجلات التقديم، إرشادات الحبكة، والمهام الجانبية"
              : "Real telemetry and record counts measuring member engagement with shipped V2 features"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Guided Tour & First Application */}
          <div className="rounded-2xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
              <span className="text-xs font-semibold">{isAr ? "إتمام التقديم الأول والجولة" : "Application & Tour Rate"}</span>
              <Compass className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl font-black font-mono text-neutral-950 dark:text-neutral-100">
              {adoptionMetrics.tourCompletionRate}%
            </p>
            <p className="text-xs text-neutral-500">
              {isAr
                ? `سجل ${number(adoptionMetrics.tourCompletedCount)} عضو أول طلب تقديم فعلي`
                : `${number(adoptionMetrics.tourCompletedCount)} members registered first app`}
            </p>
          </div>

          {/* Card 2: Platform & Job Explorer */}
          <div className="rounded-2xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
              <span className="text-xs font-semibold">{isAr ? "التقديمات عبر المنصات ومستكشف الوظائف" : "Platform Apps & Explorer"}</span>
              <MousePointerClick className="h-4 w-4 text-info-strong" />
            </div>
            <p className="text-2xl font-black font-mono text-neutral-950 dark:text-neutral-100">
              {number(adoptionMetrics.jobExplorerClicksCount)}
            </p>
            <p className="text-xs text-neutral-500">
              {isAr ? "طلب تقديم مع روابط وتخصيص" : "Tailored applications / links"}
            </p>
          </div>

          {/* Card 3: Plot Guidance Reads */}
          <div className="rounded-2xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
              <span className="text-xs font-semibold">{isAr ? "سجلات قراءة إرشادات الحبكة" : "Plot Guidance Reads"}</span>
              <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-black font-mono text-neutral-950 dark:text-neutral-100">
              {number(adoptionMetrics.plotGuidanceReadsCount)}
            </p>
            <p className="text-xs text-neutral-500">
              {isAr
                ? `سجل قراءة في قاعدة البيانات`
                : `Actual database read records`}
            </p>
          </div>

          {/* Card 4: Smart Prompts & Side Tasks */}
          <div className="rounded-2xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
              <span className="text-xs font-semibold">{isAr ? "تفاعل المهام والبرومبتات" : "Prompts & Side Tasks"}</span>
              <Copy className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-black font-mono text-neutral-950 dark:text-neutral-100">
              {number(adoptionMetrics.promptCopiesCount)}
            </p>
            <p className="text-xs text-neutral-500">
              {isAr ? "مهمة جانبية ونسخ برومبت مسجل" : "Submissions & prompt copies"}
            </p>
          </div>
        </div>
      </section>

      {/* Member 360° Inspector Slide-over Drawer */}
      <MemberInspectorDrawer
        memberId={inspectorMemberId}
        onClose={() => setInspectorMemberId(null)}
        onMemberUpdated={loadData}
      />

      {/* Quick Feedback Form Dialog */}
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
            loadData();
          }}
        />
      )}
    </div>
  );
}
