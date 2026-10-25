import { useEffect, useState } from "react";
import {
  adminApi,
  type AdminGroup,
  type AdminMember,
  type GranularFunnelResponse,
  type GranularFunnelStage,
} from "./api/adminApi";
import { AdminMemberDetail } from "./components/AdminMemberDetail";
import { FeedbackFormDialog } from "../professional-development/components/FeedbackFormDialog";
import { useI18n } from "../../i18n";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "./components/AdminUI";
import { useToast } from "../../components/ui/ToastProvider";
import {
  AlertTriangle,
  ArrowDown,
  BarChart2,
  CheckCircle2,
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

  // Member inspect & feedback modals
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
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

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. TOP BOTTLENECK ALERT BANNER */}
      {topBottleneck && (
        <section
          aria-label="Top Bottleneck"
          className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-surface to-surface p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                  {isAr ? "أكبر نقطة توقف حالية في الرحلة (Top Drop-off Bottleneck)" : "Top Drop-off Bottleneck"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-neutral-100">
                {isAr ? topBottleneck.titleAr : topBottleneck.titleEn}
              </h3>
              <p className="text-xs text-neutral-400 max-w-2xl">
                {isAr
                  ? `يقف عند هذه المحطة حالياً ${number(topBottleneck.count)} عضو (${topBottleneck.percent}% من إجمالي المسجلين). يحتاجون إلى متابعة وتوجيه مباشر لتجاوز هذا الحاجز.`
                  : `${number(topBottleneck.count)} members (${topBottleneck.percent}% of total) currently stalled here. Targeted coaching recommended.`}
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-neutral-900/80 px-4 py-2.5 text-end">
              <span className="text-[11px] text-neutral-400 block">{isAr ? "العالقون في المحطة" : "Stalled Members"}</span>
              <span className="text-2xl font-bold font-mono text-amber-400">
                {topBottleneck.count} <span className="text-xs text-neutral-500">/ {totalUsers}</span>
              </span>
            </div>
          </div>

          {/* Members in bottleneck */}
          {Boolean(topBottleneck.stuckUsers?.length) && (
            <div className="mt-4 pt-3 border-t border-amber-500/20 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                {isAr ? "أبرز الأعضاء الواقفين عند نقطة التوقف:" : "Members Stalled at this Stage:"}
              </p>
              <div className="flex flex-wrap gap-2">
                {topBottleneck.stuckUsers.slice(0, 8).map((u) => (
                  <div
                    key={u.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/90 px-2.5 py-1 text-xs"
                  >
                    <span className="font-semibold text-neutral-200">{u.name}</span>
                    <span className="text-[10px] text-neutral-500">
                      {isAr ? `منذ ${u.daysAtStage} يوم` : `${u.daysAtStage}d stalled`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFeedbackTarget(u as any)}
                      className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
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

      {/* 2. GRANULAR JOURNEY FUNNEL (8 Stages) */}
      <section aria-label="Funnel" className="space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            {isAr ? "خريطة قمع العبور التراكمي ونقاط التوقف الدقيقة" : "Granular Journey Drop-off Funnel"}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isAr
              ? "متابعة تدفق الأعضاء بالتفصيل من لحظة التسجيل وحتى إتمام الرحلة، لاكتشاف العوائق السلوكية فوراً"
              : "Step-by-step member pipeline breakdown from registration to completion"}
          </p>
        </div>

        <div className="space-y-2.5">
          {stages.map((stage, idx) => {
            const isBottleneck = stage.isTopBottleneck;
            const barWidth = Math.max(4, stage.percent);

            return (
              <div
                key={stage.code}
                className={`rounded-2xl border p-4 transition-all shadow-xs ${
                  isBottleneck
                    ? "border-amber-500/50 bg-amber-950/15"
                    : "border-border bg-surface hover:border-neutral-700"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-[280px]">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-xs font-bold text-neutral-300 font-mono">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                        {isAr ? stage.titleAr : stage.titleEn}
                        {isBottleneck && (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.2 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                            {isAr ? "أكبر عنق زجاجة !" : "Top Bottleneck !"}
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-neutral-400">
                        {isAr ? stage.descriptionAr : stage.descriptionEn}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-end">
                      <span className="text-base font-bold font-mono text-neutral-100">
                        {number(stage.count)}
                      </span>
                      <span className="text-xs text-neutral-500 ms-1">({stage.percent}%)</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-800/80">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isBottleneck
                        ? "bg-amber-400 shadow-sm shadow-amber-500/50"
                        : idx === stages.length - 1
                        ? "bg-purple-400"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. A/B/C EXPERIMENTATION & ONBOARDING LAB */}
      <section aria-label="A/B/C Experiment" className="space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            {isAr ? "معمل اختبارات A/B/C وإعدادات التهيئة" : "A/B/C Experimentation & Onboarding Lab"}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isAr
              ? "مقارنة أداء نسخ واجهة الباحث وتعيين النسخة الافتراضية والنسخ المخصصة للمجموعات"
              : "Compare variant performance and assign group variant overrides"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Comparison Table */}
          <div className="lg:col-span-7 rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-200">
              {isAr ? "مقارنة أداء النسخ الثلاث (A vs B vs C)" : "Variant Performance Metrics"}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="border-b border-border bg-neutral-900/40 text-neutral-400 font-semibold">
                  <tr>
                    <th className="px-3 py-2.5 text-start">{isAr ? "النسخة" : "Variant"}</th>
                    <th className="px-3 py-2.5 text-start">{isAr ? "المستخدمون" : "Users"}</th>
                    <th className="px-3 py-2.5 text-start">{isAr ? "إجمالي التفاعلات" : "Interactions"}</th>
                    <th className="px-3 py-2.5 text-start">{isAr ? "الحالة" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {VARIANTS.map((v) => {
                    const stats = abSummary[v] || { usersCount: 0, interactionsCount: 0 };
                    const isDefault = defaultVariant === v;

                    return (
                      <tr key={v} className="hover:bg-neutral-800/25">
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-800 font-mono font-bold text-emerald-400">
                              {v}
                            </span>
                            <span className="font-semibold text-neutral-200">
                              {v === "A"
                                ? isAr ? "النسخة A (الكلاسيكية)" : "Variant A (Classic)"
                                : v === "B"
                                ? isAr ? "النسخة B (الحديثة)" : "Variant B (Modern)"
                                : isAr ? "النسخة C (التفاعلية)" : "Variant C (Interactive)"}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono font-bold text-neutral-200">
                          {number(stats.usersCount ?? 0)}
                        </td>
                        <td className="px-3 py-3 font-mono text-neutral-400">
                          {number(stats.interactionsCount ?? 0)}
                        </td>
                        <td className="px-3 py-3">
                          {isDefault ? (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                              {isAr ? "النسخة النشطة الافتراضية" : "Active Default"}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void saveConfig(v, groupVariants)}
                              disabled={savingConfig}
                              className="text-xs text-neutral-400 hover:text-emerald-400 hover:underline cursor-pointer"
                            >
                              {isAr ? "تعيين كافتراضية" : "Set Default"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Intro Video URL */}
            <div className="pt-3 border-t border-border space-y-2">
              <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Video className="h-4 w-4 text-emerald-400" />
                <span>{isAr ? "رابط الفيديو التعريفي للتهيئة (Intro Video URL)" : "Onboarding Intro Video URL"}</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={introVideoUrl}
                  onChange={(e) => setIntroVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="field-control flex-1 text-xs"
                />
                <button
                  type="button"
                  onClick={() => void saveConfig(defaultVariant, groupVariants, introVideoUrl)}
                  disabled={savingConfig}
                  className="button-primary px-4 py-1.5 text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  {savingConfig ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ الرابط" : "Save URL")}
                </button>
              </div>
            </div>
          </div>

          {/* Group Overrides */}
          <div className="lg:col-span-5 rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-neutral-200">
              {isAr ? "تخصيص النسخ حسب المجموعات" : "Cohort Variant Overrides"}
            </h3>
            <p className="text-xs text-neutral-400">
              {isAr
                ? "يمكنك إسناد نسخة معينة لمجموعة محددة لملاحظة الفروق السلوكية:"
                : "Assign specific variants per group to test behavioral variances:"}
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {groups.map((group) => {
                const assigned = groupVariants[group.id] || defaultVariant;

                return (
                  <div
                    key={group.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border-subtle bg-neutral-900/40 p-2.5"
                  >
                    <span className="text-xs font-semibold text-neutral-200 truncate flex-1">
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
                              ? "bg-emerald-500 text-neutral-950 shadow-xs"
                              : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
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

      {/* 4. V2 FEATURE ADOPTION METRICS */}
      <section aria-label="Feature Adoption" className="space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
            {isAr ? "مؤشرات التفاعل مع أدوات الإصدار الثاني (V2 Feature Adoption)" : "V2 Feature Adoption Metrics"}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isAr
              ? "قياس تفاعل الأعضاء الحقيقي مع أدوات V2 المضافة مؤخراً في المنصة"
              : "Telemetry measuring user adoption of newly shipped V2 features"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Guided Tour */}
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-semibold">{isAr ? "جولة أول طلب التفاعلية" : "7-Step Guided Tour"}</span>
              <Compass className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-neutral-100">
              {adoptionMetrics.tourCompletionRate}%
            </p>
            <p className="text-xs text-neutral-500">
              {isAr
                ? `أتمها ${number(adoptionMetrics.tourCompletedCount)} عضو`
                : `${number(adoptionMetrics.tourCompletedCount)} members completed tour`}
            </p>
          </div>

          {/* Card 2: Job Explorer */}
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-semibold">{isAr ? "استكشاف الوظائف" : "Job Market Explorer"}</span>
              <MousePointerClick className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-neutral-100">
              {number(adoptionMetrics.jobExplorerClicksCount)}
            </p>
            <p className="text-xs text-neutral-500">
              {isAr ? "نقرة على روابط المنصات" : "Platform clickouts"}
            </p>
          </div>

          {/* Card 3: Plot Guidance Reads */}
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-semibold">{isAr ? "قراءات إرشادات الحبكة" : "Plot Guidance Reads"}</span>
              <FileText className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-neutral-100">
              {number(adoptionMetrics.plotGuidanceReadsCount)}
            </p>
            <p className="text-xs text-neutral-500">
              {isAr
                ? `عبر ${adoptionMetrics.plotGuidancePostsCount} محطة إرشادية`
                : `Across ${adoptionMetrics.plotGuidancePostsCount} plot posts`}
            </p>
          </div>

          {/* Card 4: Smart Prompts Copied */}
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-xs font-semibold">{isAr ? "نسخ البرومبتات الذكية" : "AI Prompts Copied"}</span>
              <Copy className="h-4 w-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold font-mono text-neutral-100">
              {number(adoptionMetrics.promptCopiesCount)}
            </p>
            <p className="text-xs text-neutral-500">
              {isAr ? "مرة استخدام للبرومبتات" : "Prompt copies recorded"}
            </p>
          </div>
        </div>

        {/* Top Platforms in Explorer */}
        {Boolean(adoptionMetrics.topPlatforms?.length) && (
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              {isAr ? "المنصات الأكثر نقراً في مستكشف الوظائف:" : "Top Clicked Job Platforms:"}
            </h4>
            <div className="flex flex-wrap gap-2">
              {adoptionMetrics.topPlatforms.map((p) => (
                <span
                  key={p.name}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1 text-xs font-semibold text-neutral-200 border border-neutral-700"
                >
                  <span>{p.name}</span>
                  <span className="rounded bg-neutral-900 px-1.5 py-0.2 text-[10px] font-mono text-emerald-400 font-bold">
                    {p.clicks}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Member Details Drawer */}
      {selectedMember && (
        <AdminMemberDetail
          member={selectedMember}
          onClose={() => {
            setSelectedMember(null);
            loadData();
          }}
        />
      )}

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

