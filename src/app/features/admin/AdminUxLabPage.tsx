import React, { useEffect, useState, useMemo } from "react";
import {
  adminApi,
  type AdminGroup,
  type AdminMember,
  type GranularFunnelResponse,
  type GranularFunnelStage,
  type JourneyNodeItem,
  type PlotGuidanceItem,
  type UxLabOverviewResponse,
  type VariantScorecardMetrics,
} from "./api/adminApi";
import { JourneyTopologyCanvas } from "./components/JourneyTopologyCanvas";
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
  FlaskConical,
  Layers,
  Link as LinkIcon,
  MapPin,
  MousePointerClick,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  Trophy,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import { type ExperimentVariant, isValidVariant } from "../../utils/uxAnalytics";

type ActiveTab = "MAP" | "FUNNEL" | "STUDIO";

export default function AdminUxLabPage() {
  const { t, locale, number } = useI18n();
  const isAr = locale === "ar";
  const toast = useToast();

  // Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("MAP");

  // Highlighted Node on Map (for 1-click inspection from Ribbon)
  const [highlightNodeCode, setHighlightNodeCode] = useState<string | null>(null);

  // Core Data States
  const [overviewData, setOverviewData] = useState<UxLabOverviewResponse | null>(null);
  const [funnelData, setFunnelData] = useState<GranularFunnelResponse | null>(null);
  const [journeyNodes, setJourneyNodes] = useState<JourneyNodeItem[]>([]);
  const [plotGuidances, setPlotGuidances] = useState<PlotGuidanceItem[]>([]);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals / Drawers
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [feedbackMember, setFeedbackMember] = useState<AdminMember | null>(null);

  // Funnel Tab Filters & Expanded Stage
  const [funnelCohortFilter, setFunnelCohortFilter] = useState<string>("ALL");
  const [funnelVariantFilter, setFunnelVariantFilter] = useState<string>("ALL");
  const [expandedStageCode, setExpandedStageCode] = useState<string | null>(null);

  // Studio State
  const [savingCohort, setSavingCohort] = useState<string | null>(null);
  const [userOverrideSearch, setUserOverrideSearch] = useState("");
  const [selectedOverrideUsers, setSelectedOverrideUsers] = useState<string[]>([]);
  const [overrideVariant, setOverrideVariant] = useState<ExperimentVariant>("B");
  const [isApplyingOverride, setIsApplyingOverride] = useState(false);
  const [isRemovingOverride, setIsRemovingOverride] = useState<string | null>(null);

  // Video State
  const [introVideoUrl, setIntroVideoUrl] = useState("");
  const [isSavingVideo, setIsSavingVideo] = useState(false);

  // Load All Data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewRes, funnelRes, journeyRes, membersRes, groupsRes] = await Promise.all([
        adminApi.uxLabOverview(),
        adminApi.granularFunnel(),
        adminApi.journeyNodes(),
        adminApi.users({ limit: 500 }),
        adminApi.groups(),
      ]);

      setOverviewData(overviewRes);
      setFunnelData(funnelRes);
      setJourneyNodes(journeyRes.nodes || []);
      setPlotGuidances(journeyRes.plotGuidances || []);
      setMembers(membersRes.members || []);
      setGroups(groupsRes.groups || []);
      setIntroVideoUrl(overviewRes.introVideoUrl || "");
    } catch (err: unknown) {
      console.error("Failed to load UX Lab data:", err);
      setError(err instanceof Error ? err.message : "Failed to load UX Lab data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handler to jump directly to a node on the Journey Map
  const handleInspectFrictionNode = (nodeCode: string) => {
    setHighlightNodeCode(nodeCode);
    setActiveTab("MAP");
  };

  // Group variant assignment handler
  const handleAssignGroupVariant = async (groupId: string, variant: ExperimentVariant) => {
    try {
      setSavingCohort(groupId);
      await adminApi.assignUxVariants({
        groupAssignments: [{ groupId, variant }],
      });
      toast.show(isAr ? "تم تحديث نسخة المجموعة بنجاح" : "Group variant updated", { type: "success" });
      // Update local state
      if (overviewData) {
        setOverviewData({
          ...overviewData,
          groupVariants: {
            ...overviewData.groupVariants,
            [groupId]: variant,
          },
        });
      }
    } catch (err: unknown) {
      toast.show(isAr ? "تعذر تحديث نسخة المجموعة" : "Failed to update group variant", { type: "error" });
    } finally {
      setSavingCohort(null);
    }
  };

  // User override assignment handler
  const handleApplyUserOverrides = async () => {
    if (selectedOverrideUsers.length === 0) return;
    try {
      setIsApplyingOverride(true);
      await adminApi.assignUxVariants({
        userOverrides: selectedOverrideUsers.map((userId) => ({
          userId,
          variant: overrideVariant,
        })),
      });
      toast.show(isAr ? "تم تطبيق التخصيص الاستثنائي للأعضاء المحددين" : "User overrides applied successfully", { type: "success" });
      setSelectedOverrideUsers([]);
      setUserOverrideSearch("");
      await loadData();
    } catch (err: unknown) {
      toast.show(isAr ? "تعذر تطبيق التخصيص" : "Failed to apply user overrides", { type: "error" });
    } finally {
      setIsApplyingOverride(false);
    }
  };

  // User override remove handler
  const handleRemoveUserOverride = async (userId: string) => {
    try {
      setIsRemovingOverride(userId);
      await adminApi.assignUxVariants({
        userOverrides: [{ userId, variant: null }],
      });
      toast.show(isAr ? "تم إلغاء التخصيص وإعادة العضو لنسخة مجموعته" : "User override removed", { type: "success" });
      await loadData();
    } catch (err: unknown) {
      toast.show(isAr ? "تعذر إلغاء التخصيص" : "Failed to remove user override", { type: "error" });
    } finally {
      setIsRemovingOverride(null);
    }
  };

  // Save intro video handler
  const handleSaveIntroVideo = async () => {
    try {
      setIsSavingVideo(true);
      await adminApi.updateUxConfig({ introVideoUrl });
      toast.show(isAr ? "تم تحديث رابط فيديو التهيئة بنجاح" : "Intro video URL saved", { type: "success" });
    } catch (err: unknown) {
      toast.show(isAr ? "تعذر حفظ رابط الفيديو" : "Failed to save video URL", { type: "error" });
    } finally {
      setIsSavingVideo(false);
    }
  };

  // Filtered members for user override picker
  const filteredCandidateUsers = useMemo(() => {
    if (!userOverrideSearch.trim()) return [];
    const q = userOverrideSearch.toLowerCase().trim();
    return members
      .filter((m) => m.name.toLowerCase().includes(q) || (m.email && m.email.toLowerCase().includes(q)))
      .slice(0, 10);
  }, [members, userOverrideSearch]);

  // Funnel calculations & filtering
  const filteredFunnelStages = useMemo(() => {
    if (!funnelData) return [];
    return funnelData.stages.map((stage) => {
      let filteredStuckUsers = stage.stuckUsers || [];
      if (funnelCohortFilter !== "ALL") {
        filteredStuckUsers = filteredStuckUsers.filter((u) => u.groupName === funnelCohortFilter);
      }
      if (funnelVariantFilter !== "ALL") {
        filteredStuckUsers = filteredStuckUsers.filter((u) => {
          const m = members.find((mem) => mem.id === u.id);
          return m && (m.uxVariant === funnelVariantFilter);
        });
      }
      return {
        ...stage,
        filteredStuckUsers,
      };
    });
  }, [funnelData, funnelCohortFilter, funnelVariantFilter, members]);

  if (loading && !overviewData) {
    return <LoadingState message={isAr ? "جاري تحميل مرصد تحليلات السلوك..." : "Loading UX Observatory..."} />;
  }

  if (error && !overviewData) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const ribbon = overviewData?.ribbon;
  const scorecard = overviewData?.variantScorecard;

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-info-surface text-info-strong dark:bg-info-surface/20">
              <Compass className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
              {isAr ? "تحليلات التجربة والسلوك (UX Lab)" : "UX & Behavior Observatory"}
            </h1>
          </div>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {isAr
              ? "مرصد تفاعلي مباشر لمراقبة مسار الباحثين، قياس نقاط الاحتكاك، واختبار نسخ التجربة (A/B/C)."
              : "Live interactive observatory to trace researcher journeys, measure bottlenecks, and optimize A/B/C experiment variants."}
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-border-subtle bg-surface px-3 py-2 text-xs font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{isAr ? "تحديث البيانات اللحظية" : "Refresh Telemetry"}</span>
        </button>
      </div>

      {/* المحور الأول: شريط مؤشرات التفاعل الحيوية (UX Telemetry Ribbon) */}
      {ribbon && (
        <section aria-label="UX Telemetry Ribbon" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Card 1: Activation Rate */}
          <div className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm transition-all hover:border-border-strong dark:bg-surface-elevated">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {isAr ? "معدل التفعيل المبكر" : "Activation Rate"}
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-950 dark:text-neutral-50">
                {number(ribbon.activationRate.percent)}%
              </span>
              <span className="text-xs font-medium text-neutral-500">
                ({number(ribbon.activationRate.count)} / {number(ribbon.activationRate.total)})
              </span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? "أنهوا التهيئة وسجلوا أول طلب تقديم" : "Completed onboarding & logged 1st app"}
            </p>
          </div>

          {/* Card 2: Task 0 Conversion */}
          <div className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm transition-all hover:border-border-strong dark:bg-surface-elevated">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {isAr ? "تحويل مرحلة الصفر" : "Task 0 Conversion"}
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-950 dark:text-neutral-50">
                {number(ribbon.task0Conversion.percent)}%
              </span>
              <span className="text-xs font-medium text-neutral-500">
                ({number(ribbon.task0Conversion.count)} {isAr ? "باحث" : "users"})
              </span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? "أنجزوا 5 تقديمات وفتحوا المجموعات" : "Reached 5 apps & unlocked groups"}
            </p>
          </div>

          {/* Card 3: Explorer Adoption */}
          <div className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm transition-all hover:border-border-strong dark:bg-surface-elevated">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {isAr ? "تبني مستكشف الفرص" : "Explorer Adoption"}
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                <MousePointerClick className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-950 dark:text-neutral-50">
                {number(ribbon.explorerAdoption.count)}
              </span>
              <span className="text-xs font-medium text-neutral-500">
                {isAr ? "تقديم موثق" : "apps"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              {isAr ? "عبر المنصات ومستكشف الوظائف" : "Logged via job boards & platforms"}
            </p>
          </div>

          {/* Card 4: Guidance & Prompt Engagement */}
          <div className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm transition-all hover:border-border-strong dark:bg-surface-elevated">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {isAr ? "تفاعل التوجيهات والقوالب" : "Guidance Engagement"}
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-950 dark:text-neutral-50">
                {number(ribbon.guidancePromptEngagement.count)}
              </span>
              <span className="text-xs font-medium text-neutral-500">
                {isAr ? "تفاعل" : "actions"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              {number(ribbon.guidancePromptEngagement.readsCount)} {isAr ? "قراءة" : "reads"} • {number(ribbon.guidancePromptEngagement.promptCopiesCount)} {isAr ? "نسخ برومبت" : "copies"}
            </p>
          </div>

          {/* Card 5: Primary Friction Node */}
          <div className="relative rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm transition-all hover:border-rose-300 dark:border-rose-900/40 dark:bg-rose-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {isAr ? "نقطة الاحتكاك الحرجة" : "Primary Friction Node"}
              </span>
              <button
                type="button"
                onClick={() => handleInspectFrictionNode(ribbon.primaryFrictionNode.code)}
                className="text-[11px] font-bold text-rose-700 hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-200 underline flex items-center gap-0.5"
              >
                {isAr ? "فحص ↗" : "Inspect ↗"}
              </button>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-bold text-rose-950 dark:text-rose-100 truncate max-w-[150px]" title={isAr ? ribbon.primaryFrictionNode.titleAr : ribbon.primaryFrictionNode.titleEn}>
                {isAr ? ribbon.primaryFrictionNode.titleAr : ribbon.primaryFrictionNode.titleEn}
              </span>
              <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                {number(ribbon.primaryFrictionNode.count)} {isAr ? "باحث" : "users"}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-rose-700/80 dark:text-rose-400/80">
              {isAr
                ? `يمثلون ${number(ribbon.primaryFrictionNode.percent)}% بمتوسط تأخير ${number(ribbon.primaryFrictionNode.daysStalledAvg)} يوم`
                : `${number(ribbon.primaryFrictionNode.percent)}% of users, avg ${number(ribbon.primaryFrictionNode.daysStalledAvg)}d stall`}
            </p>
          </div>
        </section>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-border-subtle">
        <nav className="flex space-x-2 rtl:space-x-reverse" aria-label="UX Lab Navigation Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("MAP")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === "MAP"
                ? "border-neutral-900 text-neutral-950 dark:border-white dark:text-white"
                : "border-transparent text-neutral-600 hover:border-border-strong hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>{isAr ? "خريطة تدفق الرحلة التفاعلية (Journey Flow Map)" : "Journey Flow Topology"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("FUNNEL")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === "FUNNEL"
                ? "border-neutral-900 text-neutral-950 dark:border-white dark:text-white"
                : "border-transparent text-neutral-600 hover:border-border-strong hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            <span>{isAr ? "قمع العبور والتحويل المرحلي (Conversion Funnel)" : "Stepped Conversion Funnel"}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("STUDIO")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === "STUDIO"
                ? "border-neutral-900 text-neutral-950 dark:border-white dark:text-white"
                : "border-transparent text-neutral-600 hover:border-border-strong hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            <span>{isAr ? "معمل التجارب والانسيات (A/B/C Experiment Studio)" : "A/B/C Experiment Studio"}</span>
          </button>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* التبويب الأول: خريطة تدفق الرحلة التفاعلية (Journey Flow Topology Canvas) */}
      {/* ========================================================================= */}
      {activeTab === "MAP" && (
        <section aria-label="Journey Topology Section" className="space-y-4">
          <JourneyTopologyCanvas
            nodes={journeyNodes}
            plotGuidances={plotGuidances}
            members={members}
            groups={groups}
            highlightNodeCode={highlightNodeCode}
            onInspectMember={(id) => setSelectedMemberId(id)}
            onSendFeedback={(m) => setFeedbackMember(m)}
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* التبويب الثاني: قمع العبور والتحويل المرحلي التفاعلي (Stepped Conversion Funnel) */}
      {/* ========================================================================= */}
      {activeTab === "FUNNEL" && (
        <section aria-label="Stepped Conversion Funnel" className="space-y-6">
          {/* Top Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm dark:bg-surface-elevated">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-neutral-500" />
                {isAr ? "تصفية القمع التراكمي:" : "Funnel Filters:"}
              </span>

              {/* Filter by Cohort */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  {isAr ? "المجموعة:" : "Cohort:"}
                </label>
                <select
                  value={funnelCohortFilter}
                  onChange={(e) => setFunnelCohortFilter(e.target.value)}
                  className="rounded-xl border border-border-subtle bg-surface px-3 py-1.5 text-xs font-bold text-neutral-900 shadow-sm focus:border-brand-primary focus:outline-none dark:bg-surface-elevated dark:text-neutral-100"
                >
                  <option value="ALL">{isAr ? "جميع المجموعات" : "All Cohorts"}</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name} ({g.memberCount})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Experiment Variant */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  {isAr ? "النسخة التجريبية:" : "Variant:"}
                </label>
                <select
                  value={funnelVariantFilter}
                  onChange={(e) => setFunnelVariantFilter(e.target.value)}
                  className="rounded-xl border border-border-subtle bg-surface px-3 py-1.5 text-xs font-bold text-neutral-900 shadow-sm focus:border-brand-primary focus:outline-none dark:bg-surface-elevated dark:text-neutral-100"
                >
                  <option value="ALL">{isAr ? "جميع النسخ" : "All Variants"}</option>
                  <option value="A">النسخة A (الافتراضية الأساسية)</option>
                  <option value="B">النسخة B (الدليل التفاعلي المكثف)</option>
                  <option value="C">النسخة C (التوجيه السريع التلقائي)</option>
                </select>
              </div>
            </div>

            <div className="text-xs font-medium text-neutral-500">
              {isAr
                ? `إجمالي من وصلوا لأول مرحلة: ${number(funnelData?.stages[0]?.count || 0)} باحث`
                : `Total reached entry stage: ${number(funnelData?.stages[0]?.count || 0)} users`}
            </div>
          </div>

          {/* Stepped Funnel Container */}
          <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm dark:bg-surface-elevated">
            <div className="space-y-4">
              {filteredFunnelStages.map((stage, idx) => {
                const prevStage = idx > 0 ? filteredFunnelStages[idx - 1] : null;
                const conversionFromPrev = prevStage && prevStage.count > 0
                  ? Math.round((stage.count / prevStage.count) * 100)
                  : 100;
                const dropoffFromPrev = prevStage
                  ? Math.max(0, prevStage.count - stage.count)
                  : 0;
                const dropoffRateFromPrev = prevStage && prevStage.count > 0
                  ? Math.round((dropoffFromPrev / prevStage.count) * 100)
                  : 0;

                const isExpanded = expandedStageCode === stage.code;
                const baseWidthPercent = Math.max(28, stage.percent);

                return (
                  <div key={stage.code} className="space-y-3">
                    {/* Conversion Bridge Between Stages */}
                    {prevStage && (
                      <div className="mx-auto flex max-w-lg items-center justify-center gap-4 py-1">
                        <div className="h-6 w-px bg-border-subtle" />
                        <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-neutral-50 px-3 py-1 shadow-2xs text-[11px] font-semibold dark:bg-neutral-900">
                          <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <span className="text-xs">⬆️</span>
                            {isAr ? "عبور:" : "CVR:"} {number(conversionFromPrev)}%
                          </span>
                          <span className="text-neutral-300 dark:text-neutral-700">|</span>
                          <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1">
                            <span className="text-xs">🔻</span>
                            {isAr ? "متساقطين:" : "Drop-off:"} {number(dropoffRateFromPrev)}% ({number(dropoffFromPrev)} {isAr ? "باحث" : "users"})
                          </span>
                        </div>
                        <div className="h-6 w-px bg-border-subtle" />
                      </div>
                    )}

                    {/* Funnel Stage Bar */}
                    <div
                      className="mx-auto transition-all duration-300"
                      style={{ width: `${baseWidthPercent}%` }}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedStageCode(isExpanded ? null : stage.code)}
                        className={`w-full rounded-2xl border p-4 text-start transition-all shadow-sm ${
                          stage.isTopBottleneck
                            ? "border-rose-300 bg-rose-50/50 hover:bg-rose-100/50 dark:border-rose-900/60 dark:bg-rose-950/20"
                            : isExpanded
                            ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800"
                            : "border-border-subtle bg-surface hover:border-border-strong dark:bg-surface-elevated"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-neutral-900 text-xs font-black text-white dark:bg-white dark:text-neutral-950">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-neutral-950 dark:text-neutral-50">
                                  {isAr ? stage.titleAr : stage.titleEn}
                                </span>
                                {stage.isTopBottleneck && (
                                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
                                    ⚠️ {isAr ? "أكبر نقطة توقف" : "Top Bottleneck"}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                                {isAr ? stage.descriptionAr : stage.descriptionEn}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-end">
                              <div className="text-base font-black text-neutral-950 dark:text-neutral-50">
                                {number(stage.percent)}%
                              </div>
                              <div className="text-[11px] font-medium text-neutral-500">
                                {number(stage.count)} {isAr ? "باحث اجتازوا" : "completed"}
                              </div>
                            </div>
                            <div className="text-neutral-400">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Progress line */}
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                          <div
                            className={`h-full rounded-full ${
                              stage.isTopBottleneck ? "bg-rose-500" : "bg-neutral-900 dark:bg-white"
                            }`}
                            style={{ width: `${stage.percent}%` }}
                          />
                        </div>

                        {/* Stalled Count Pill */}
                        <div className="mt-2 flex items-center justify-between text-[11px]">
                          <span className="text-neutral-500">
                            {stage.filteredStuckUsers.length > 0 ? (
                              <span className="font-semibold text-rose-700 dark:text-rose-400">
                                🛑 {stage.filteredStuckUsers.length} {isAr ? "باحث متوقف حالياً هنا" : "stalled users here"}
                              </span>
                            ) : (
                              <span className="text-emerald-700 dark:text-emerald-400">
                                ✓ {isAr ? "لا يوجد باحثون متوقفون" : "No stalled users"}
                              </span>
                            )}
                          </span>
                          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 underline">
                            {isExpanded
                              ? isAr ? "إخفاء التفاصيل" : "Hide details"
                              : isAr ? "عرض الأعضاء المتوقفين" : "View stalled members"}
                          </span>
                        </div>
                      </button>

                      {/* Stalled Members List Drawer (when expanded) */}
                      {isExpanded && (
                        <div className="mt-2 rounded-2xl border border-border-subtle bg-neutral-50/80 p-4 shadow-inner dark:bg-neutral-900/60">
                          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5" />
                              {isAr ? "قائمة الباحثين المتوقفين عند هذه المرحلة:" : "Members Stalled at this Stage:"}
                            </h4>
                            <span className="text-[11px] text-neutral-500">
                              {stage.filteredStuckUsers.length} {isAr ? "باحث" : "users"}
                            </span>
                          </div>

                          {stage.filteredStuckUsers.length === 0 ? (
                            <p className="py-4 text-center text-xs text-neutral-500">
                              {isAr ? "رائع! لا يوجد أي عضو متوقف عند هذه المحطة حالياً." : "No members stalled at this stage currently."}
                            </p>
                          ) : (
                            <div className="mt-3 divide-y divide-border-subtle">
                              {stage.filteredStuckUsers.map((stuck) => {
                                const fullMember = members.find((m) => m.id === stuck.id);
                                return (
                                  <div key={stuck.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                                    <div className="flex items-center gap-3">
                                      <Initials name={stuck.name} className="h-8 w-8 text-xs font-bold" />
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-neutral-950 dark:text-neutral-50">
                                            {stuck.name}
                                          </span>
                                          {stuck.groupName && (
                                            <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">
                                              {stuck.groupName}
                                            </span>
                                          )}
                                          {fullMember?.uxVariant && (
                                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                              نسخة {fullMember.uxVariant}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                                          <span>{stuck.email}</span>
                                          <span>•</span>
                                          <span className="text-rose-700 dark:text-rose-400 font-semibold">
                                            {isAr ? `متوقف منذ ${number(stuck.daysAtStage)} يوم` : `Stalled ${stuck.daysAtStage}d`}
                                          </span>
                                          <span>•</span>
                                          <span>
                                            {number(stuck.applicationsCount)} {isAr ? "تقديم مسجل" : "apps logged"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedMemberId(stuck.id)}
                                        className="rounded-lg border border-border-subtle bg-surface px-2.5 py-1 text-xs font-bold text-neutral-800 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-200"
                                      >
                                        {isAr ? "فتح ملف العضو 360°" : "Profile 360°"}
                                      </button>
                                      {fullMember && (
                                        <button
                                          type="button"
                                          onClick={() => setFeedbackMember(fullMember)}
                                          className="rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950"
                                        >
                                          {isAr ? "إرسال توجيه مخصص" : "Send Guidance"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* التبويب الثالث: معمل التجارب وإدارة المجموعات (A/B/C Experiment Studio) */}
      {/* ========================================================================= */}
      {activeTab === "STUDIO" && (
        <section aria-label="Experiment Studio" className="space-y-6">
          {/* Winner Banner */}
          {scorecard && (
            <div className="flex flex-col gap-4 rounded-2xl border border-amber-300 bg-linear-to-r from-amber-50 to-amber-100/60 p-5 shadow-sm dark:border-amber-800/60 dark:from-amber-950/30 dark:to-amber-900/20 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-2xl text-white shadow-md">
                  <Trophy className="h-6 w-6 text-white" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-black text-amber-950 dark:bg-amber-900 dark:text-amber-200">
                      {isAr ? "التوصية السلوكية الذكية" : "Behavioral Recommendation"}
                    </span>
                    <h3 className="text-base font-black text-neutral-950 dark:text-neutral-50">
                      {isAr
                        ? `🏆 النسخة الأعلى أداءً حالياً: النسخة (${scorecard.winnerVariant})`
                        : `🏆 Winning Variant: Variant (${scorecard.winnerVariant})`}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">
                    {scorecard.winnerVariant === "B"
                      ? isAr
                        ? "حققت النسخة B أعلى معدل إنجاز لمرحلة الصفر (Task 0) وقراءة التوجيهات بنسبة استبقاء ممتازة."
                        : "Variant B achieved the highest Task 0 completion and guidance interaction rate."
                      : isAr
                      ? `النسخة ${scorecard.winnerVariant} تتصدر حالياً مقاييس التحويل والاستبقاء التراكمي في التجربة الحية.`
                      : `Variant ${scorecard.winnerVariant} currently leads conversion and active retention metrics.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("cohort-assignment-section");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 dark:bg-white dark:text-neutral-950"
                >
                  {isAr ? "تعميم النسخة الفائزة على المجموعات ↓" : "Apply Winner to Cohorts ↓"}
                </button>
              </div>
            </div>
          )}

          {/* 1. بطاقة الأداء السلوكي المقارنة (A vs B vs C Behavioral Scorecard) */}
          <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm dark:bg-surface-elevated">
            <div className="border-b border-border-subtle pb-4">
              <h2 className="text-base font-bold text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-brand-primary" />
                {isAr ? "بطاقة الأداء السلوكي المقارنة (Behavioral Scorecard)" : "A vs B vs C Behavioral Scorecard"}
              </h2>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                {isAr
                  ? "مقارنة لحظية حية لأداء النسخ الثلاث على المقاييس السلوكية الحقيقية من قاعدة البيانات."
                  : "Live side-by-side comparison of user behavior across all 3 experiment variants."}
              </p>
            </div>

            {scorecard ? (
              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {(["A", "B", "C"] as const).map((variantKey) => {
                  const m = scorecard[variantKey];
                  const isWinner = scorecard.winnerVariant === variantKey;

                  return (
                    <div
                      key={variantKey}
                      className={`relative rounded-2xl border p-5 transition-all shadow-sm ${
                        isWinner
                          ? "border-amber-400 bg-amber-50/30 ring-2 ring-amber-300/40 dark:border-amber-700/60 dark:bg-amber-950/10"
                          : "border-border-subtle bg-surface dark:bg-surface-elevated"
                      }`}
                    >
                      {/* Variant Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black ${
                              isWinner
                                ? "bg-amber-500 text-white"
                                : "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                            }`}
                          >
                            {variantKey}
                          </span>
                          <div>
                            <span className="text-sm font-bold text-neutral-950 dark:text-neutral-50">
                              {variantKey === "A"
                                ? isAr ? "النسخة A (الأساسية)" : "Variant A (Baseline)"
                                : variantKey === "B"
                                ? isAr ? "النسخة B (الدليل المكثف)" : "Variant B (Guided)"
                                : isAr ? "النسخة C (التوجيه السريع)" : "Variant C (Direct)"}
                            </span>
                            <div className="text-[11px] font-medium text-neutral-500">
                              {number(m.usersCount)} {isAr ? "باحث معين" : "assigned users"}
                            </div>
                          </div>
                        </div>

                        {isWinner && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                            🏆 {isAr ? "الأعلى أداءً" : "Winner"}
                          </span>
                        )}
                      </div>

                      {/* Metrics List */}
                      <div className="mt-5 space-y-3 divide-y divide-border-subtle">
                        {/* Onboarding Rate */}
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">
                            {isAr ? "إكمال التهيئة الفورية" : "Onboarding Completion"}
                          </span>
                          <span className="text-xs font-bold text-neutral-950 dark:text-neutral-50">
                            {number(m.onboardingRate)}%
                          </span>
                        </div>

                        {/* Task 0 Rate */}
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">
                            {isAr ? "إنجاز مرحلة الصفر (5 تقديمات)" : "Task 0 Done (5 Apps)"}
                          </span>
                          <span className="text-xs font-bold text-neutral-950 dark:text-neutral-50">
                            {number(m.task0CompletionRate)}%
                          </span>
                        </div>

                        {/* Avg Apps */}
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">
                            {isAr ? "متوسط التقديمات / باحث" : "Avg Apps / User"}
                          </span>
                          <span className="text-xs font-bold text-neutral-950 dark:text-neutral-50">
                            {m.avgAppsPerUser.toFixed(1)}
                          </span>
                        </div>

                        {/* Guidance Read Rate */}
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">
                            {isAr ? "قراءة التوجيهات والقوالب" : "Guidance Engagement"}
                          </span>
                          <span className="text-xs font-bold text-neutral-950 dark:text-neutral-50">
                            {number(m.guidanceReadRate)}%
                          </span>
                        </div>

                        {/* Retention Rate */}
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">
                            {isAr ? "معدل الاستبقاء النشط" : "Active Retention"}
                          </span>
                          <span className="text-xs font-bold text-neutral-950 dark:text-neutral-50">
                            {number(m.activeRetentionRate)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* 2. مدير الاستهداف وتعيين النسخ (Flexible Cohort & User Targeting Manager) */}
          <div id="cohort-assignment-section" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Cohort Variant Assignment */}
            <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm dark:bg-surface-elevated">
              <div className="border-b border-border-subtle pb-4">
                <h3 className="text-sm font-bold text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-brand-primary" />
                  {isAr ? "تعيين النسخ على مستوى المجموعات (Cohorts)" : "Cohort Variant Assignment"}
                </h3>
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                  {isAr
                    ? "اختر النسخة التجريبية المعتمدة لكل مجموعة؛ سيتم توريثها تلقائياً لجميع أعضاء المجموعة."
                    : "Assign default variant to each group; members inherit this unless specifically overridden."}
                </p>
              </div>

              <div className="mt-4 divide-y divide-border-subtle">
                {groups.map((group) => {
                  const currentVariant = overviewData?.groupVariants?.[group.id] || overviewData?.defaultVariant || "B";
                  const isUpdating = savingCohort === group.id;

                  return (
                    <div key={group.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-xs font-bold text-neutral-950 dark:text-neutral-50">
                          {group.name}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {number(group.memberCount)} {isAr ? "عضو مسجل" : "members"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isUpdating && <RefreshCw className="h-3.5 w-3.5 animate-spin text-neutral-500" />}
                        <select
                          value={currentVariant}
                          disabled={isUpdating}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (isValidVariant(val)) {
                              handleAssignGroupVariant(group.id, val);
                            }
                          }}
                          className="rounded-xl border border-border-subtle bg-surface px-3 py-1.5 text-xs font-bold text-neutral-900 shadow-sm focus:border-brand-primary focus:outline-none dark:bg-surface-elevated dark:text-neutral-100"
                        >
                          <option value="A">{isAr ? "النسخة A (الأساسية)" : "Variant A"}</option>
                          <option value="B">{isAr ? "النسخة B (المكثفة)" : "Variant B"}</option>
                          <option value="C">{isAr ? "النسخة C (السريعة)" : "Variant C"}</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual User Override Picker */}
            <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm dark:bg-surface-elevated">
              <div className="border-b border-border-subtle pb-4">
                <h3 className="text-sm font-bold text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
                  <User className="h-4 w-4 text-brand-primary" />
                  {isAr ? "تخصيص استثنائي لأعضاء محددين (User Overrides)" : "Individual User Override Picker"}
                </h3>
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                  {isAr
                    ? "اختر باحثين محددين لتعيينهم لنسخة خاصة، بغض النظر عن نسخة مجموعتهم الأصلية."
                    : "Force assign specific members to a variant overriding their cohort setting."}
                </p>
              </div>

              {/* Selector Box */}
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    value={userOverrideSearch}
                    onChange={(e) => setUserOverrideSearch(e.target.value)}
                    placeholder={isAr ? "ابحث باسم العضو أو بريده لاختياره..." : "Search user to override..."}
                    className="w-full rounded-xl border border-border-subtle bg-surface py-2 pr-9 pl-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-brand-primary focus:outline-none dark:bg-surface-elevated dark:text-neutral-100"
                  />
                </div>

                {/* Search Candidates Dropdown */}
                {filteredCandidateUsers.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-border-subtle bg-surface p-1 shadow-md dark:bg-surface-elevated">
                    {filteredCandidateUsers.map((u) => {
                      const isSelected = selectedOverrideUsers.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedOverrideUsers(selectedOverrideUsers.filter((id) => id !== u.id));
                            } else {
                              setSelectedOverrideUsers([...selectedOverrideUsers, u.id]);
                            }
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-start text-xs transition-colors ${
                            isSelected
                              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                              : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                          }`}
                        >
                          <div className="truncate">
                            <span className="font-bold">{u.name}</span>{" "}
                            <span className="opacity-75">({u.email})</span>
                          </div>
                          <span>{isSelected ? "✓" : "+"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selected Users Pills & Apply Action */}
                {selectedOverrideUsers.length > 0 && (
                  <div className="rounded-xl border border-dashed border-border-strong p-3 space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {selectedOverrideUsers.map((uid) => {
                        const m = members.find((x) => x.id === uid);
                        return (
                          <span
                            key={uid}
                            className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                          >
                            <span>{m?.name || uid}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedOverrideUsers(selectedOverrideUsers.filter((id) => id !== uid))}
                              className="text-neutral-400 hover:text-neutral-600"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-subtle">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                          {isAr ? "تعيين لـ:" : "Set to:"}
                        </label>
                        <select
                          value={overrideVariant}
                          onChange={(e) => {
                            if (isValidVariant(e.target.value)) setOverrideVariant(e.target.value);
                          }}
                          className="rounded-lg border border-border-subtle bg-surface px-2 py-1 text-xs font-bold text-neutral-900 dark:bg-surface-elevated dark:text-neutral-100"
                        >
                          <option value="A">النسخة A</option>
                          <option value="B">النسخة B</option>
                          <option value="C">النسخة C</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        disabled={isApplyingOverride}
                        onClick={handleApplyUserOverrides}
                        className="rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-950"
                      >
                        {isApplyingOverride ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          isAr ? "تطبيق التخصيص الاستثنائي" : "Apply Override"
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Overridden Users Table */}
                <div className="mt-4">
                  <div className="flex items-center justify-between pb-2 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    <span>{isAr ? "الأعضاء المخصصون استثنائياً حالياً:" : "Current Overridden Users:"}</span>
                    <span className="text-[11px] text-neutral-500 font-normal">
                      {overviewData?.overriddenUsers.length || 0} {isAr ? "باحث" : "users"}
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border-subtle divide-y divide-border-subtle">
                    {(!overviewData?.overriddenUsers || overviewData.overriddenUsers.length === 0) ? (
                      <div className="p-4 text-center text-xs text-neutral-500">
                        {isAr ? "لا توجد أي استثناءات فردية؛ جميع الباحثين يتبعون مجموعاتهم." : "No active user overrides."}
                      </div>
                    ) : (
                      overviewData.overriddenUsers.map((u) => (
                        <div key={u.id} className="flex items-center justify-between p-2.5">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-neutral-950 dark:text-neutral-50">{u.name}</span>
                              <span className="rounded bg-purple-100 px-1.5 py-0.2 text-[10px] font-bold text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                نسخة {u.uxVariant}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              {u.email} {u.groupName ? `• ${u.groupName}` : ""}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isRemovingOverride === u.id}
                            onClick={() => handleRemoveUserOverride(u.id)}
                            className="rounded-lg border border-border-subtle bg-surface px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 dark:bg-surface-elevated dark:text-rose-400 dark:hover:bg-rose-950/30"
                            title={isAr ? "إلغاء التخصيص والعودة لنسخة المجموعة" : "Remove override"}
                          >
                            {isRemovingOverride === u.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              isAr ? "إلغاء التخصيص ✕" : "Unassign ✕"
                            )}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. قسم الرؤى والتوجيهات الآلية وفيديو التهيئة (Automated UX Insights & Onboarding Media) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* 3 Automated Diagnostic Cards */}
            <div className="lg:col-span-2 rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm dark:bg-surface-elevated">
              <div className="border-b border-border-subtle pb-4">
                <h3 className="text-sm font-bold text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-primary" />
                  {isAr ? "الرؤى والتشخيصات الآلية الذكية (Automated UX Diagnostics)" : "Automated UX Diagnostics"}
                </h3>
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                  {isAr
                    ? "3 تشخيصات وتوصيات فورية مولدة تلقائياً استناداً لمعدلات السلوك اللحظية."
                    : "Instant diagnostic observations generated directly from real-time behavior patterns."}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {overviewData?.automatedInsights && overviewData.automatedInsights.length > 0 ? (
                  overviewData.automatedInsights.map((insight, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-3.5 space-y-2 ${
                        insight.severity === "CRITICAL"
                          ? "border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20"
                          : insight.severity === "POSITIVE"
                          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                          : "border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">
                          {insight.severity === "CRITICAL" ? "⚠️" : insight.severity === "POSITIVE" ? "✨" : "💡"}
                        </span>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {isAr ? insight.titleAr : insight.titleEn}
                        </h4>
                      </div>
                      <p className="text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                        {isAr ? insight.messageAr : insight.messageEn}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 py-6 text-center text-xs text-neutral-500">
                    {isAr ? "لا توجد مؤشرات حرجة؛ سير الرحلة متوازن." : "No critical alerts. Flow is stable."}
                  </div>
                )}
              </div>
            </div>

            {/* Onboarding Video Configuration */}
            <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm dark:bg-surface-elevated">
              <div className="border-b border-border-subtle pb-4">
                <h3 className="text-sm font-bold text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
                  <Video className="h-4 w-4 text-brand-primary" />
                  {isAr ? "فيديو التهيئة الترحيبي (Onboarding Video)" : "Onboarding Video"}
                </h3>
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                  {isAr ? "رابط الفيديو الترحيبي المضمن في نافذة التهيئة الأولى للباحث." : "Intro video embedded in 1st application onboarding modal."}
                </p>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {isAr ? "رابط الفيديو (YouTube / Vimeo / MP4):" : "Video URL:"}
                  </label>
                  <input
                    type="url"
                    value={introVideoUrl}
                    onChange={(e) => setIntroVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="mt-1 w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:border-brand-primary focus:outline-none dark:bg-surface-elevated dark:text-neutral-100"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  {introVideoUrl ? (
                    <a
                      href={introVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {isAr ? "معاينة الفيديو" : "Preview"}
                    </a>
                  ) : <span />}

                  <button
                    type="button"
                    disabled={isSavingVideo}
                    onClick={handleSaveIntroVideo}
                    className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-950"
                  >
                    {isSavingVideo ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      isAr ? "حفظ وتحديث الفيديو" : "Save Video"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Member 360 Inspector Drawer */}
      <MemberInspectorDrawer
        memberId={selectedMemberId}
        isOpen={Boolean(selectedMemberId)}
        onClose={() => setSelectedMemberId(null)}
        onActionCompleted={loadData}
      />

      {/* Feedback & Guidance Form Dialog */}
      {feedbackMember && (
        <FeedbackFormDialog
          recipientId={feedbackMember.id}
          recipientName={feedbackMember.name}
          recipientEmail={feedbackMember.email}
          initialStage="ONBOARDING"
          isOpen={true}
          onClose={() => setFeedbackMember(null)}
          onSubmitted={() => {
            setFeedbackMember(null);
            toast.show(isAr ? "تم إرسال التوجيه بنجاح" : "Guidance sent successfully", { type: "success" });
            loadData();
          }}
        />
      )}
    </div>
  );
}
