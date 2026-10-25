import React, { useEffect, useState, useMemo } from "react";
import {
  adminApi,
  type AdminGroup,
  type AdminMember,
  type CumulativeFunnelStage,
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
  Search,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  Trophy,
  User,
  Users,
  Video,
  X,
  Zap,
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

  // Funnel Tab Selection & Hover State
  const [selectedFunnelIndex, setSelectedFunnelIndex] = useState<number>(0);
  const [hoveredFunnelIndex, setHoveredFunnelIndex] = useState<number | null>(null);
  const [isSendingNudge, setIsSendingNudge] = useState(false);

  // Studio State
  const [savingCohort, setSavingCohort] = useState<string | null>(null);
  const [isSettingDefaultVariant, setIsSettingDefaultVariant] = useState(false);
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

      const [
        overviewResult,
        funnelResult,
        journeyResult,
        guidanceResult,
        membersResult,
        groupsResult,
      ] = await Promise.allSettled([
        adminApi.uxLabOverview(),
        adminApi.granularFunnel(),
        adminApi.journeyNodes(),
        adminApi.plotGuidance(),
        adminApi.users({ limit: 100 }),
        adminApi.groups(),
      ]);

      if (overviewResult.status === "fulfilled") {
        setOverviewData(overviewResult.value);
        setIntroVideoUrl(overviewResult.value.introVideoUrl || "");
      } else {
        console.error("Failed to load uxLabOverview:", overviewResult.reason);
      }

      if (funnelResult.status === "fulfilled") {
        setFunnelData(funnelResult.value);
      } else {
        console.error("Failed to load granularFunnel:", funnelResult.reason);
      }

      if (journeyResult.status === "fulfilled") {
        setJourneyNodes(Array.isArray(journeyResult.value) ? journeyResult.value : []);
      } else {
        console.error("Failed to load journeyNodes:", journeyResult.reason);
      }

      if (guidanceResult.status === "fulfilled") {
        setPlotGuidances(Array.isArray(guidanceResult.value) ? guidanceResult.value : []);
      } else {
        console.error("Failed to load plotGuidance:", guidanceResult.reason);
      }

      if (membersResult.status === "fulfilled") {
        setMembers(membersResult.value?.items || []);
      } else {
        console.error("Failed to load members:", membersResult.reason);
      }

      if (groupsResult.status === "fulfilled") {
        setGroups(groupsResult.value?.items || []);
      } else {
        console.error("Failed to load groups:", groupsResult.reason);
      }

      if (overviewResult.status === "rejected" && funnelResult.status === "rejected") {
        const err = overviewResult.reason;
        throw new Error(err instanceof Error ? err.message : "Failed to load UX Lab telemetry data");
      }
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

  // Inspect Friction Node
  const handleInspectFrictionNode = (nodeCode: string) => {
    setHighlightNodeCode(nodeCode);
    setActiveTab("MAP");
  };

  // Assign Variant to Group
  const handleAssignGroupVariant = async (groupId: string, variant: ExperimentVariant) => {
    try {
      setSavingCohort(groupId);
      await adminApi.assignUxVariants({
        variant,
        groupIds: [groupId],
      });
      toast.show(isAr ? "تم تحديث نسخة المجموعة بنجاح" : "Group variant updated", { type: "success" });
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

  // Apply Variant to all groups
  const handleApplyVariantToAllGroups = async (variant: ExperimentVariant) => {
    try {
      setSavingCohort("ALL");
      await adminApi.assignUxVariants({
        variant,
        groupIds: groups.map((g) => g.id),
      });
      toast.show(isAr ? `تم تعميم النسخة (${variant}) على جميع المجموعات` : `Variant ${variant} applied to all groups`, { type: "success" });
      await loadData();
    } catch (err: unknown) {
      toast.show(isAr ? "تعذر تعميم النسخة" : "Failed to apply variant to all groups", { type: "error" });
    } finally {
      setSavingCohort(null);
    }
  };

  // Set Platform Default Variant
  const handleSetPlatformDefaultVariant = async (variant: ExperimentVariant) => {
    try {
      setIsSettingDefaultVariant(true);
      await adminApi.updateUxConfig({ defaultVariant: variant });
      toast.show(isAr ? `تم تعيين النسخة (${variant}) كنسخة افتراضية للمنصة` : `Variant ${variant} is now platform default`, { type: "success" });
      if (overviewData) {
        setOverviewData({
          ...overviewData,
          defaultVariant: variant,
        });
      }
    } catch (err: unknown) {
      toast.show(isAr ? "تعذر تعيين النسخة الافتراضية" : "Failed to set default variant", { type: "error" });
    } finally {
      setIsSettingDefaultVariant(false);
    }
  };

  // User override assignment
  const handleApplyUserOverrides = async () => {
    if (selectedOverrideUsers.length === 0) return;
    try {
      setIsApplyingOverride(true);
      await adminApi.assignUxVariants({
        variant: overrideVariant,
        userIds: selectedOverrideUsers,
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

  // Remove user override
  const handleRemoveUserOverride = async (userId: string) => {
    try {
      setIsRemovingOverride(userId);
      await adminApi.assignUxVariants({
        variant: "DEFAULT",
        userIds: [userId],
      });
      toast.show(isAr ? "تم إلغاء التخصيص وإعادة العضو لنسخة مجموعته" : "User override removed", { type: "success" });
      await loadData();
    } catch (err: unknown) {
      toast.show(isAr ? "تعذر إلغاء التخصيص" : "Failed to remove user override", { type: "error" });
    } finally {
      setIsRemovingOverride(null);
    }
  };

  // Instant User Variant Switcher for ALL 17 members
  const [updatingUserVariantId, setUpdatingUserVariantId] = useState<string | null>(null);
  const [allMembersVariantSearch, setAllMembersVariantSearch] = useState("");

  const handleInstantUserVariantChange = async (userId: string, variant: "A" | "B" | "C" | "DEFAULT") => {
    try {
      setUpdatingUserVariantId(userId);
      const targetMember = members.find((m) => m.id === userId);
      if (targetMember) {
        targetMember.uxVariant = variant === "DEFAULT" ? null : variant;
      }
      await adminApi.assignUxVariants({
        variant,
        userIds: [userId],
      });
      toast.show(
        isAr
          ? variant === "DEFAULT"
            ? "تمت إعادة الباحث للنسخة الافتراضية"
            : `تم تعيين الباحث للنسخة (${variant}) بنجاح`
          : `User variant updated to ${variant}`,
        { type: "success" }
      );
      await loadData();
    } catch (err: unknown) {
      toast.show(isAr ? "تعذر تغيير النسخة للباحث" : "Failed to change user variant", { type: "error" });
    } finally {
      setUpdatingUserVariantId(null);
    }
  };

  // Send Nudge to Stalled Users in Funnel Bottleneck
  const handleSendMotivationalNudge = async () => {
    const targetIds = funnelData?.funnelInsights?.actionableCta?.targetUserIds || [];
    if (targetIds.length === 0) {
      toast.show(isAr ? "لا يوجد باحثون متوقفون لإرسال التنبيه لهم" : "No target users", { type: "error" });
      return;
    }
    try {
      setIsSendingNudge(true);
      await adminApi.sendCustomNotification({
        recipientUserIds: targetIds,
        subject: isAr ? "دفعة حماسية لمواصلة انطلاقة التقديم! 🚀" : "Keep up your application momentum! 🚀",
        message: isAr
          ? "أنت قريب جداً من إتمام أول 5 تقديمات وفتح مجموعتك الخاصة! راجع مستكشف الوظائف وسجل تقديمك اليوم."
          : "You are very close to reaching 5 applications and unlocking your cohort group! Keep going.",
        channels: ["IN_APP"],
      });
      toast.show(isAr ? `تم إرسال التنبيه التحفيزي بنجاح إلى ${targetIds.length} باحث` : `Nudge sent to ${targetIds.length} users`, { type: "success" });
    } catch (err: unknown) {
      toast.show(isAr ? "تعذر إرسال التنبيه التحفيزي" : "Failed to send nudge", { type: "error" });
    } finally {
      setIsSendingNudge(false);
    }
  };

  // Save intro video
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

  // Filtered candidate users for override picker
  const filteredCandidateUsers = useMemo(() => {
    if (!userOverrideSearch.trim()) return [];
    const q = userOverrideSearch.toLowerCase().trim();
    return members
      .filter((m) => m.name.toLowerCase().includes(q) || (m.email && m.email.toLowerCase().includes(q)))
      .slice(0, 10);
  }, [members, userOverrideSearch]);

  // Filtered all 17 members for experiment switcher matrix
  const filteredAllMembers = useMemo(() => {
    if (!allMembersVariantSearch.trim()) return members;
    const q = allMembersVariantSearch.toLowerCase().trim();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.group?.name && m.group.name.toLowerCase().includes(q))
    );
  }, [members, allMembersVariantSearch]);

  // Cumulative Stages list
  const cumulativeStages: CumulativeFunnelStage[] = useMemo(() => {
    if (funnelData?.cumulativeStages && funnelData.cumulativeStages.length > 0) {
      return funnelData.cumulativeStages;
    }
    return [];
  }, [funnelData]);

  // Active selected funnel stage
  const activeFunnelStage = useMemo(() => {
    if (cumulativeStages.length === 0) return null;
    return cumulativeStages[selectedFunnelIndex] || cumulativeStages[0];
  }, [cumulativeStages, selectedFunnelIndex]);

  if (loading && !overviewData && !funnelData) {
    return <LoadingState message={isAr ? "جاري تحميل مرصد تحليلات السلوك..." : "Loading UX Observatory..."} />;
  }

  if (error && !overviewData && !funnelData) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const ribbon = overviewData?.ribbon;
  const scorecard = overviewData?.variantScorecard;
  const insights = funnelData?.funnelInsights;

  return (
    <div className="space-y-5 pb-16">
      {/* ========================================================================= */}
      {/* المحور الأول: شريط التنقل الداخلي الكبسولي البارز في قمة الصفحة            */}
      {/* (High-Contrast Segmented Control Bar - NO DUPLICATE HEADER)               */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/90 bg-neutral-100/90 p-1.5 shadow-inner dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {/* 1. Journey Flow Map */}
          <button
            type="button"
            onClick={() => setActiveTab("MAP")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold transition-all ${
              activeTab === "MAP"
                ? "bg-neutral-950 text-white shadow-md dark:bg-white dark:text-neutral-950"
                : "text-neutral-600 hover:text-neutral-950 hover:bg-white/60 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/60"
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>{isAr ? "🗺️ مرصد تدفق الرحلة (Journey Flow Map)" : "🗺️ Journey Flow Map"}</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === "MAP" ? "bg-white/20 text-white dark:bg-black/20 dark:text-black" : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"}`}>
              26
            </span>
          </button>

          {/* 2. Conversion Funnel & Insights */}
          <button
            type="button"
            onClick={() => setActiveTab("FUNNEL")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold transition-all ${
              activeTab === "FUNNEL"
                ? "bg-neutral-950 text-white shadow-md dark:bg-white dark:text-neutral-950"
                : "text-neutral-600 hover:text-neutral-950 hover:bg-white/60 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/60"
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            <span>{isAr ? "🔻 قمع العبور والتسرب (Conversion Funnel & Insights)" : "🔻 Conversion Funnel & Insights"}</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === "FUNNEL" ? "bg-white/20 text-white dark:bg-black/20 dark:text-black" : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"}`}>
              6
            </span>
          </button>

          {/* 3. A/B/C Experiment Studio */}
          <button
            type="button"
            onClick={() => setActiveTab("STUDIO")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold transition-all ${
              activeTab === "STUDIO"
                ? "bg-neutral-950 text-white shadow-md dark:bg-white dark:text-neutral-950"
                : "text-neutral-600 hover:text-neutral-950 hover:bg-white/60 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/60"
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            <span>{isAr ? "🧪 معمل التجارب (A/B/C Experiment Studio)" : "🧪 A/B/C Experiment Studio"}</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === "STUDIO" ? "bg-white/20 text-white dark:bg-black/20 dark:text-black" : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"}`}>
              A/B/C
            </span>
          </button>
        </div>

        {/* Refresh Telemetry Button embedded in the bar */}
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface px-3 py-1.5 text-xs font-bold text-neutral-800 shadow-xs transition hover:bg-neutral-100 disabled:opacity-50 dark:bg-surface-elevated dark:text-neutral-200 dark:hover:bg-neutral-800"
          title={isAr ? "تحديث كافة بيانات ومقاييس المرصد" : "Refresh Telemetry"}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{isAr ? "تحديث" : "Refresh"}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* المحور الثاني: التبويب 1 — مرصد تدفق الرحلة (Journey Flow Map)             */}
      {/* ========================================================================= */}
      {activeTab === "MAP" && (
        <section aria-label="Journey Topology Section" className="space-y-4">
          {/* Compact Telemetry Strip for Map Tab */}
          {ribbon && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Primary Friction Node */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5 shadow-xs dark:border-rose-900/50 dark:bg-rose-950/20 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{isAr ? "نقطة الاحتكاك الحرجة على الخريطة" : "Primary Friction Node"}</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-base font-black text-rose-950 dark:text-rose-100">
                      {isAr ? ribbon.primaryFrictionNode.titleAr : ribbon.primaryFrictionNode.titleEn}
                    </span>
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                      ({number(ribbon.primaryFrictionNode.count)} {isAr ? "باحث" : "users"})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleInspectFrictionNode(ribbon.primaryFrictionNode.code)}
                  className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition"
                >
                  {isAr ? "تركيز الكاميرا ↗" : "Focus ↗"}
                </button>
              </div>

              {/* Plot Guidance Engagement */}
              <div className="rounded-2xl border border-border-subtle bg-surface p-3.5 shadow-xs dark:bg-surface-elevated flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    {isAr ? "تفاعل التوجيهات والقوالب الذكية" : "Plot Guidance Engagement"}
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-black text-neutral-950 dark:text-neutral-50">
                      {number(ribbon.guidancePromptEngagement.count)}
                    </span>
                    <span className="text-xs text-neutral-500">
                      ({number(ribbon.guidancePromptEngagement.readsCount)} {isAr ? "قراءة" : "reads"} • {number(ribbon.guidancePromptEngagement.promptCopiesCount)} {isAr ? "نسخ" : "copies"})
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Travellers on Map */}
              <div className="rounded-2xl border border-border-subtle bg-surface p-3.5 shadow-xs dark:bg-surface-elevated flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                    <Compass className="h-4 w-4 text-brand-primary" />
                    {isAr ? "إجمالي مسارات الباحثين الموزعة" : "Tracked Member Paths"}
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-black text-neutral-950 dark:text-neutral-50">
                      {number(members.length)}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {isAr ? "عبر كافة المحطات الـ 26" : "across all 26 nodes"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Topology Canvas with foreignObject & Zoom Lock */}
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
      {/* المحور الثالث: التبويب 2 — قمع العبور والتسرب (Conversion Funnel)          */}
      {/* (Interactive Tapered Trapezoid & Bead Funnel + Live Insights)             */}
      {/* ========================================================================= */}
      {activeTab === "FUNNEL" && (
        <section aria-label="Stepped Conversion Funnel" className="space-y-5">
          {/* Compact Telemetry Strip for Funnel Tab */}
          {ribbon && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Activation Rate */}
              <div className="rounded-2xl border border-border-subtle bg-surface p-3.5 shadow-xs dark:bg-surface-elevated">
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                  {isAr ? "معدل التفعيل المبكر (Activation)" : "Activation Rate"}
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-black text-neutral-950 dark:text-neutral-50">
                    {number(ribbon.activationRate.percent)}%
                  </span>
                  <span className="text-xs text-neutral-500">
                    ({number(ribbon.activationRate.count)} / {number(ribbon.activationRate.total)})
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  {isAr ? "أنهوا التهيئة وسجلوا أول طلب تقديم" : "Completed onboarding & logged 1st app"}
                </p>
              </div>

              {/* Task 0 Conversion */}
              <div className="rounded-2xl border border-border-subtle bg-surface p-3.5 shadow-xs dark:bg-surface-elevated">
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                  {isAr ? "تحويل مرحلة الصفر (Task 0)" : "Task 0 Conversion"}
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-black text-neutral-950 dark:text-neutral-50">
                    {number(ribbon.task0Conversion.percent)}%
                  </span>
                  <span className="text-xs text-neutral-500">
                    ({number(ribbon.task0Conversion.count)} {isAr ? "باحث" : "users"})
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  {isAr ? "أنجزوا 5 تقديمات وفتحوا المجموعات" : "Reached 5 apps & unlocked groups"}
                </p>
              </div>

              {/* Primary Drop-off Leak */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-xs dark:border-rose-900/40 dark:bg-rose-950/20">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {isAr ? "أكبر فجوة تسرب حالية" : "Primary Funnel Leak"}
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-black text-rose-950 dark:text-rose-100">
                    {insights?.biggestLeak ? `-${number(insights.biggestLeak.droppedCount)} ${isAr ? "باحث" : "users"}` : "10 باحثين"}
                  </span>
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                    ({insights?.biggestLeak ? `${number(insights.biggestLeak.droppedPercent)}%` : "67%"})
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-rose-700/80 dark:text-rose-400/80">
                  {isAr ? "بين إتمام التهيئة واجتياز أول 5 تقديمات" : "Between Onboarding & Task 0 completion"}
                </p>
              </div>
            </div>
          )}

          {/* TWO-COLUMN ARCHITECTURE: Funnel SVG (7 cols) + Insights & Inspector (5 cols) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* COLUMN 1 (7 cols): Interactive Tapered Trapezoid & Bead Funnel with Dark Observatory Canvas */}
            <div className="lg:col-span-7 rounded-2xl border border-neutral-800 bg-[#090d16] p-5 shadow-2xl text-neutral-100">
              <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-sky-400" />
                    <span>{isAr ? "الشكل الهندسي لقمع العبور التراكمي (Tapered Funnel)" : "Interactive Tapered Trapezoid Funnel"}</span>
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {isAr
                      ? "تدرج رياضي تراكمي تنازلي يبدأ من 100% ويمثل الأعضاء ككرات حية داخل كل شريحة."
                      : "Strictly descending cumulative math with live member beads inside each trapezoid."}
                  </p>
                </div>

                <div className="text-[11px] font-semibold text-neutral-400">
                  {isAr ? "انقر على أي شريحة لفحص المتوقفين 👈" : "Click layer to inspect 👈"}
                </div>
              </div>

              {/* Tapered Trapezoid SVG Funnel Viewport with ample margins and guaranteed contrast */}
              <div className="mt-4 flex justify-center overflow-x-auto">
                <svg
                  dir="ltr"
                  viewBox="0 0 880 560"
                  className="w-full max-w-[880px] select-none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="funnel-grad-normal" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                    <linearGradient id="funnel-grad-active" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e3a8a" />
                      <stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                    <linearGradient id="funnel-grad-bottleneck" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4c0519" />
                      <stop offset="100%" stopColor="#1e1b4b" />
                    </linearGradient>
                  </defs>

                  {cumulativeStages.map((stage, idx) => {
                    const isSelected = selectedFunnelIndex === idx;
                    const isHovered = hoveredFunnelIndex === idx;
                    const isBottleneckLayer = idx === 2 || idx === 3; // Largest drop-off stages

                    // Trapezoid geometry coordinates
                    const y = 30 + idx * 84;
                    const height = 74;
                    const cx = 440;

                    // Width calculations progressively tapering down
                    const topWidths = [360, 300, 240, 180, 130, 90];
                    const bottomWidths = [300, 240, 180, 130, 90, 60];

                    const wTop = topWidths[idx] || 100;
                    const wBottom = bottomWidths[idx] || 80;

                    const p1 = `${cx - wTop / 2},${y}`;
                    const p2 = `${cx + wTop / 2},${y}`;
                    const p3 = `${cx + wBottom / 2},${y + height}`;
                    const p4 = `${cx - wBottom / 2},${y + height}`;
                    const polyPoints = `${p1} ${p2} ${p3} ${p4}`;

                    // Bead distribution
                    const beads = stage.beads || [];

                    return (
                      <g
                        key={stage.code}
                        onClick={() => setSelectedFunnelIndex(idx)}
                        onMouseEnter={() => setHoveredFunnelIndex(idx)}
                        onMouseLeave={() => setHoveredFunnelIndex(null)}
                        className="cursor-pointer transition-all duration-200"
                        style={{
                          transform: isHovered || isSelected ? "scale(1.01)" : "none",
                          transformOrigin: `${cx}px ${y + height / 2}px`,
                        }}
                      >
                        {/* Shadow / Glow layer */}
                        {isSelected && (
                          <polygon
                            points={polyPoints}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="4"
                            filter="drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))"
                          />
                        )}

                        {/* Trapezoid Polygon Body */}
                        <polygon
                          points={polyPoints}
                          fill={
                            isSelected
                              ? "url(#funnel-grad-active)"
                              : isBottleneckLayer
                              ? "url(#funnel-grad-bottleneck)"
                              : "url(#funnel-grad-normal)"
                          }
                          stroke={
                            isSelected
                              ? "#38bdf8"
                              : isBottleneckLayer
                              ? "rgba(244, 63, 94, 0.6)"
                              : "rgba(255, 255, 255, 0.18)"
                          }
                          strokeWidth={isSelected ? "2.5" : "1.5"}
                          className="transition-colors duration-200"
                        />

                        {/* Left Leader Line & Stat Callouts (Always High Contrast on Dark Enclosure) */}
                        <g>
                          <line
                            x1={cx - wTop / 2 + 10}
                            y1={y + height / 2}
                            x2={210}
                            y2={y + height / 2}
                            stroke="rgba(255,255,255,0.25)"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                          />
                          <circle cx={cx - wTop / 2 + 10} cy={y + height / 2} r="3" fill="#ffffff" />

                          {/* Left Callout: Percentage & Count */}
                          <text
                            x={200}
                            y={y + height / 2 - 4}
                            textAnchor="end"
                            fill="#ffffff"
                            fontSize="13"
                            fontWeight="bold"
                          >
                            {stage.cumulativePercent}% ({number(stage.cumulativeCount)} {isAr ? "باحث" : ""})
                          </text>

                          {idx > 0 && (
                            <text
                              x={200}
                              y={y + height / 2 + 14}
                              textAnchor="end"
                              fill={stage.dropoffCount > 0 ? "#fb7185" : "#4ade80"}
                              fontSize="11"
                              fontWeight="bold"
                            >
                              {isAr
                                ? `↓ ${stage.stepConversionRate}% تحويل · تسرب ${stage.dropoffCount}`
                                : `↓ ${stage.stepConversionRate}% CVR · -${stage.dropoffCount} drop`}
                            </text>
                          )}
                        </g>

                        {/* Right Leader Line & Stage Label (Guaranteed Room & No Edge Collision) */}
                        <g>
                          <line
                            x1={cx + wTop / 2 - 10}
                            y1={y + height / 2}
                            x2={670}
                            y2={y + height / 2}
                            stroke="rgba(255,255,255,0.25)"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                          />
                          <circle cx={cx + wTop / 2 - 10} cy={y + height / 2} r="3" fill="#ffffff" />

                          <text
                            x={680}
                            y={y + height / 2 - 3}
                            textAnchor="start"
                            fill="#f8fafc"
                            fontSize="12"
                            fontWeight="bold"
                          >
                            {isAr ? stage.titleAr : stage.titleEn}
                          </text>
                          <text
                            x={680}
                            y={y + height / 2 + 14}
                            textAnchor="start"
                            fill="#94a3b8"
                            fontSize="10"
                          >
                            {stage.stalledCount > 0
                              ? isAr
                                ? `متوقف هنا: ${stage.stalledCount} باحث`
                                : `Stalled here: ${stage.stalledCount}`
                              : isAr ? "عبر الجميع بنجاح" : "All cleared"}
                          </text>
                        </g>

                        {/* Living Member Beads inside the trapezoid */}
                        <g>
                          {beads.slice(0, 12).map((bead, bIdx) => {
                            const beadStartX = cx - (Math.min(beads.length, 6) * 16) / 2 + 8;
                            const beadX = beadStartX + (bIdx % 6) * 16;
                            const beadY = y + 36 + Math.floor(bIdx / 6) * 16;
                            const isConverted = bead.status === "CONVERTED";

                            return (
                              <g key={bead.id || bIdx} className="transition-transform duration-300">
                                <circle
                                  cx={beadX}
                                  cy={beadY}
                                  r="4"
                                  fill={isConverted ? "#22c55e" : "#f43f5e"}
                                  stroke={isConverted ? "rgba(34, 197, 94, 0.4)" : "rgba(244, 63, 94, 0.4)"}
                                  strokeWidth="3"
                                  className={isConverted ? "" : "animate-pulse"}
                                />
                              </g>
                            );
                          })}
                        </g>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* COLUMN 2 (5 cols): Live Funnel Insights & Stalled Drop-off Inspector */}
            <div className="lg:col-span-5 space-y-4">
              {/* 3 AI/Rule-based Diagnostic Insights */}
              <div className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-sm dark:bg-surface-elevated space-y-3">
                <div className="border-b border-border-subtle pb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-neutral-50 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>{isAr ? "الرؤى التشخيصية الذكية للقمع" : "Funnel Diagnostic Insights"}</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-neutral-500">
                    3 {isAr ? "رؤى آلية" : "insights"}
                  </span>
                </div>

                {insights?.biggestLeak && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 space-y-1.5 dark:border-rose-900/40 dark:bg-rose-950/20">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{isAr ? "الرؤية 1: أكبر فجوة تسرب (Biggest Leak)" : "Biggest Funnel Leak"}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-rose-950 dark:text-rose-200">
                      {isAr ? insights.biggestLeak.descriptionAr : insights.biggestLeak.descriptionEn}
                    </p>
                  </div>
                )}

                {insights?.velocityInsight && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 space-y-1.5 dark:border-blue-900/40 dark:bg-blue-950/20">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 dark:text-blue-400">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>{isAr ? "الرؤية 2: سرعة العبور ومعدل الركود" : "Velocity & Stalling"}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-blue-950 dark:text-blue-200">
                      {isAr ? insights.velocityInsight.descriptionAr : insights.velocityInsight.descriptionEn}
                    </p>
                  </div>
                )}

                {insights?.actionableCta && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-2 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-400">
                      <Zap className="h-3.5 w-3.5" />
                      <span>{isAr ? "الرؤية 3: إجراء المعالجة السريع" : "Actionable Remediation"}</span>
                    </div>
                    <p className="text-xs text-emerald-950 dark:text-emerald-200">
                      {isAr
                        ? `يوجد ${number(insights.actionableCta.count)} باحث متوقف في فجوة البداية يمكن تنبيههم دفعة واحدة.`
                        : `${insights.actionableCta.count} stalled users can be nudged instantly.`}
                    </p>
                    <button
                      type="button"
                      disabled={isSendingNudge}
                      onClick={handleSendMotivationalNudge}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      {isSendingNudge ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span>{isAr ? insights.actionableCta.labelAr : insights.actionableCta.labelEn}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Inspector for Stalled Members in Selected Funnel Layer */}
              <div className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-sm dark:bg-surface-elevated space-y-3">
                <div className="border-b border-border-subtle pb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-brand-primary" />
                      <span>
                        {isAr ? "الباحثون المتوقفون في:" : "Stalled Members in:"}{" "}
                        <span className="text-brand-primary">{activeFunnelStage ? (isAr ? activeFunnelStage.titleAr : activeFunnelStage.titleEn) : ""}</span>
                      </span>
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                    {activeFunnelStage?.stalledCount || 0} {isAr ? "باحث" : "users"}
                  </span>
                </div>

                {(!activeFunnelStage?.stalledUsers || activeFunnelStage.stalledUsers.length === 0) ? (
                  <div className="py-8 text-center text-xs text-neutral-500">
                    {isAr ? "رائع! لا يوجد أي عضو متوقف عند هذه المحطة حالياً." : "No stalled members in this stage."}
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-border-subtle space-y-1">
                    {activeFunnelStage.stalledUsers.map((stuck) => {
                      const fullMember = members.find((m) => m.id === stuck.id);
                      return (
                        <div key={stuck.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Initials name={stuck.name} className="h-8 w-8 text-xs font-bold" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-neutral-950 dark:text-neutral-50">
                                  {stuck.name}
                                </span>
                                {stuck.groupName && (
                                  <span className="rounded bg-neutral-100 px-1.5 py-0.2 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                                    {stuck.groupName}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                  {isAr ? `متوقف منذ ${number(stuck.daysAtStage)} يوم` : `Stalled ${stuck.daysAtStage}d`}
                                </span>
                                <span>•</span>
                                <span>{number(stuck.applicationsCount)} {isAr ? "تقديمات" : "apps"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedMemberId(stuck.id)}
                              className="rounded-lg border border-border-subtle bg-surface px-2 py-1 text-[11px] font-bold text-neutral-800 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-200"
                            >
                              {isAr ? "الملف 360°" : "360°"}
                            </button>
                            {fullMember && (
                              <button
                                type="button"
                                onClick={() => setFeedbackMember(fullMember)}
                                className="rounded-lg bg-neutral-900 px-2 py-1 text-[11px] font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950"
                              >
                                {isAr ? "توجيه 💬" : "Guide"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* المحور الرابع: التبويب 3 — معمل التجارب (A/B/C Experiment Studio)          */}
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
                        ? "حققت النسخة B أعلى معدل إنجاز لمرحلة الصفر (Task 0) وقراءة التوجيهات بنسبة استبقاء ممتازة بفضل الجولة التفاعلية."
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
                  onClick={() => handleApplyVariantToAllGroups(scorecard.winnerVariant)}
                  className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 transition"
                >
                  {isAr ? `تعميم النسخة (${scorecard.winnerVariant}) على جميع المجموعات` : `Apply Winner (${scorecard.winnerVariant}) to All Cohorts`}
                </button>
              </div>
            </div>
          )}

          {/* 1. بطاقات تعريف ومقارنة النسخ الثلاث مع أشرطة تقدم بصرية */}
          <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm dark:bg-surface-elevated">
            <div className="border-b border-border-subtle pb-4">
              <h2 className="text-base font-bold text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-brand-primary" />
                <span>{isAr ? "بطاقات تعريف ومقارنة النسخ الثلاث (Visual Variant Comparison Cards)" : "Visual Variant Comparison Cards"}</span>
              </h2>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                {isAr
                  ? "مقارنة دقيقة توضح الفارق في تجربة الباحث لكل نسخة ومقاييس الأداء الحقيقية مع أشرطة تقدم بصرية."
                  : "Side-by-side comparison illustrating the researcher UI experience and live performance progress bars."}
              </p>
            </div>

            {scorecard ? (
              <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
                {(["A", "B", "C"] as const).map((variantKey) => {
                  const m = scorecard[variantKey];
                  const isWinner = scorecard.winnerVariant === variantKey;
                  const isPlatformDefault = overviewData?.defaultVariant === variantKey;

                  const variantInfo = {
                    A: {
                      titleAr: "النسخة A: الواجهة القياسية المباشرة",
                      titleEn: "Variant A: Standard Baseline",
                      descAr: "واجهة تقليدية بدون جولة توجيهية إجبارية أو درج مهام عائم؛ مناسبة للمستخدمين ذوي الخبرة السابقة.",
                      descEn: "Standard workflow without mandatory coachmark tour or side drawer.",
                      badgeColor: "bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-300",
                    },
                    B: {
                      titleAr: "النسخة B: التوجيه المعزز التفاعلي",
                      titleEn: "Variant B: Interactive Guidance",
                      descAr: "الجولة الإرشادية التفاعلية المكونة من 7 خطوات + درج المهام الذكي + إرشادات الحبكة والبرومبتات اللحظية.",
                      descEn: "Interactive 7-step guided tour + smart task drawer + live plot prompts.",
                      badgeColor: "bg-purple-100 text-purple-900 dark:bg-purple-950/50 dark:text-purple-300",
                    },
                    C: {
                      titleAr: "النسخة C: التحدي السريع والتركيز المكثف",
                      titleEn: "Variant C: Sprint & Focus Mode",
                      descAr: "واجهة سباق يومي تركز على إتمام التقديمات دون مشتتات جانبية، وتكشف الأدوات تدريجياً وفق السرعة.",
                      descEn: "Sprint-focused interface emphasizing daily goals and delayed tool reveals.",
                      badgeColor: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
                    },
                  }[variantKey];

                  return (
                    <div
                      key={variantKey}
                      className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all shadow-sm ${
                        isWinner
                          ? "border-amber-400 bg-amber-50/20 ring-2 ring-amber-300/40 dark:border-amber-700/60 dark:bg-amber-950/10"
                          : "border-border-subtle bg-surface dark:bg-surface-elevated"
                      }`}
                    >
                      {/* Card Header */}
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-9 w-9 items-center justify-center rounded-xl text-base font-black ${
                                isWinner
                                  ? "bg-amber-500 text-white shadow-sm"
                                  : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                              }`}
                            >
                              {variantKey}
                            </span>
                            <div>
                              <div className="text-sm font-bold text-neutral-950 dark:text-neutral-50">
                                {isAr ? variantInfo.titleAr : variantInfo.titleEn}
                              </div>
                              <div className="text-[11px] font-semibold text-neutral-500">
                                {number(m.usersCount)} {isAr ? "باحث معين" : "assigned users"}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {isWinner && (
                              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-950 dark:bg-amber-900 dark:text-amber-200">
                                🏆 {isAr ? "الأعلى أداءً" : "Winner"}
                              </span>
                            )}
                            {isPlatformDefault && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                ✓ {isAr ? "افتراضية المنصة" : "Platform Default"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Experience Description */}
                        <p className="mt-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 min-h-[38px]">
                          {isAr ? variantInfo.descAr : variantInfo.descEn}
                        </p>

                        {/* Metrics with Mini Visual Progress Bars */}
                        <div className="mt-4 space-y-2.5 pt-3 border-t border-border-subtle">
                          {/* Onboarding Rate */}
                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-600 dark:text-neutral-400">{isAr ? "إكمال التهيئة الفورية" : "Onboarding Completion"}</span>
                              <span className="font-bold text-neutral-950 dark:text-neutral-50">{number(m.onboardingRate)}%</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, m.onboardingRate)}%` }} />
                            </div>
                          </div>

                          {/* Task 0 Rate */}
                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-600 dark:text-neutral-400">{isAr ? "اجتياز مرحلة الصفر (5+ طلبات)" : "Task 0 Done (5+ Apps)"}</span>
                              <span className="font-bold text-neutral-950 dark:text-neutral-50">{number(m.task0CompletionRate)}%</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                              <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(100, m.task0CompletionRate)}%` }} />
                            </div>
                          </div>

                          {/* Avg Apps Per User */}
                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-600 dark:text-neutral-400">{isAr ? "متوسط التقديمات / باحث" : "Avg Apps / User"}</span>
                              <span className="font-bold text-neutral-950 dark:text-neutral-50">{(m?.avgAppsPerUser ?? 0).toFixed(1)}</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                              <div className="h-full rounded-full bg-purple-500" style={{ width: `${Math.min(100, (m.avgAppsPerUser / 10) * 100)}%` }} />
                            </div>
                          </div>

                          {/* Guidance Read Rate */}
                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-600 dark:text-neutral-400">{isAr ? "قراءة التوجيهات والقوالب" : "Guidance Engagement"}</span>
                              <span className="font-bold text-neutral-950 dark:text-neutral-50">{number(m.guidanceReadRate)}%</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                              <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, m.guidanceReadRate)}%` }} />
                            </div>
                          </div>

                          {/* Active Retention */}
                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-600 dark:text-neutral-400">{isAr ? "معدل النشاط الأسبوعي" : "Active Weekly Retention"}</span>
                              <span className="font-bold text-neutral-950 dark:text-neutral-50">{number(m.activeRetentionRate)}%</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, m.activeRetentionRate)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-5 pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={isPlatformDefault || isSettingDefaultVariant}
                          onClick={() => handleSetPlatformDefaultVariant(variantKey)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs ${
                            isPlatformDefault
                              ? "bg-emerald-500 text-white cursor-default"
                              : "border border-border-subtle bg-surface text-neutral-800 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-200"
                          }`}
                        >
                          {isPlatformDefault
                            ? isAr ? "✓ النسخة الافتراضية" : "✓ Default"
                            : isAr ? "تعيين كافتراضية للمنصة" : "Set as Default"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            window.open("/dashboard?ux_variant=" + variantKey, "_blank");
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
                          title={isAr ? "معاينة منظور الباحث لهذه النسخة" : "Preview researcher view"}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>{isAr ? "معاينة" : "Preview"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* 2. مصفوفة توزيع واستهداف العينات (Unified Cohort & User Assignment Matrix) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Right Side (5 cols): Cohort Variant Distribution */}
            <div className="lg:col-span-5 rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm dark:bg-surface-elevated">
              <div className="border-b border-border-subtle pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-brand-primary" />
                    <span>{isAr ? "توزيع المجموعات (Cohort Assignment)" : "Cohort Variant Distribution"}</span>
                  </h3>
                  <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                    {isAr ? "إسناد النسخة الافتراضية لكل دفعة أو مجموعة." : "Assign default variant per group."}
                  </p>
                </div>
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

                      <div className="flex items-center gap-1.5">
                        {(["A", "B", "C"] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleAssignGroupVariant(group.id, v)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-2xs ${
                              currentVariant === v
                                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                                : "border border-border-subtle bg-surface text-neutral-600 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-300"
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

            {/* Left Side (7 cols): Individual User Overrides Picker & Active List */}
            <div className="lg:col-span-7 rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm dark:bg-surface-elevated space-y-4">
              <div className="border-b border-border-subtle pb-4">
                <h3 className="text-sm font-bold text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
                  <User className="h-4 w-4 text-brand-primary" />
                  <span>{isAr ? "تخصيص استثنائي لأعضاء محددين (User Overrides)" : "Individual User Override Picker"}</span>
                </h3>
                <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                  {isAr
                    ? "اختر باحثاً أو أكثر لفرض نسخة محددة عليهم بضغطة واحدة بغض النظر عن مجموعتهم."
                    : "Force assign specific members to a custom variant overriding their group default."}
                </p>
              </div>

              {/* Searchable Multi-User Input */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    value={userOverrideSearch}
                    onChange={(e) => setUserOverrideSearch(e.target.value)}
                    placeholder={isAr ? "ابحث باسم العضو أو بريده لاختياره..." : "Search user to override..."}
                    className="w-full rounded-xl border border-border-subtle bg-surface py-2 pr-9 pl-3 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none dark:bg-surface-elevated dark:text-neutral-100"
                  />
                </div>

                {/* Candidate Dropdown */}
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
                            <span className="font-bold">{u.name}</span> <span className="opacity-75">({u.email})</span>
                          </div>
                          <span>{isSelected ? "✓" : "+"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selected User Pills & Action Bar */}
                {selectedOverrideUsers.length > 0 && (
                  <div className="rounded-xl border border-dashed border-border-strong p-3 space-y-3 bg-neutral-50/50 dark:bg-neutral-900/50">
                    <div className="flex flex-wrap gap-1.5">
                      {selectedOverrideUsers.map((uid) => {
                        const m = members.find((x) => x.id === uid);
                        return (
                          <span
                            key={uid}
                            className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-bold text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                          >
                            <span>{m?.name || uid}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedOverrideUsers(selectedOverrideUsers.filter((id) => id !== uid))}
                              className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-subtle">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">{isAr ? "تعيين لـ:" : "Assign:"}</span>
                        {(["A", "B", "C"] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setOverrideVariant(v)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                              overrideVariant === v
                                ? "bg-brand-primary text-white"
                                : "border border-border-subtle bg-surface text-neutral-700 dark:bg-surface-elevated dark:text-neutral-300"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        disabled={isApplyingOverride}
                        onClick={handleApplyUserOverrides}
                        className="rounded-xl bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-950 transition"
                      >
                        {isApplyingOverride ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : isAr ? "تطبيق التخصيص الاستثنائي" : "Apply Override"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Full 17 Researchers Interactive Matrix & Instant Switchers */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {isAr ? "مصفوفة تعيين الباحثين الـ 17 وأزرار التبديل الفورية:" : "17 Researchers Matrix & Instant Switchers:"}
                      </span>
                      <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-bold text-brand-primary">
                        {filteredAllMembers.length} {isAr ? "باحث" : "users"}
                      </span>
                    </div>

                    <div className="relative min-w-[200px]">
                      <Search className="absolute right-2.5 top-2 h-3.5 w-3.5 text-neutral-400" />
                      <input
                        type="text"
                        value={allMembersVariantSearch}
                        onChange={(e) => setAllMembersVariantSearch(e.target.value)}
                        placeholder={isAr ? "فلترة الباحثين بالاسم أو البريد..." : "Filter researchers..."}
                        className="w-full rounded-lg border border-border-subtle bg-surface py-1 pr-8 pl-2.5 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none dark:bg-surface-elevated dark:text-neutral-100"
                      />
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-xl border border-border-subtle divide-y divide-border-subtle">
                    {filteredAllMembers.length === 0 ? (
                      <div className="p-4 text-center text-xs text-neutral-500">
                        {isAr ? "لا يوجد باحثون مطابقون لبحثك." : "No matching researchers."}
                      </div>
                    ) : (
                      filteredAllMembers.map((m) => {
                        const isOverridden = Boolean(m.uxVariant);
                        const effectiveVariant =
                          (m.uxVariant as "A" | "B" | "C") ||
                          (m.group?.id && overviewData?.groupVariants?.[m.group.id]) ||
                          overviewData?.defaultVariant ||
                          "B";
                        const isUpdating = updatingUserVariantId === m.id;

                        return (
                          <div
                            key={m.id}
                            className="flex flex-wrap items-center justify-between gap-3 p-2.5 transition hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40"
                          >
                            {/* User Info */}
                            <div className="flex items-center gap-2.5 min-w-[190px]">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-neutral-950 dark:text-neutral-50 truncate max-w-[130px]">
                                    {m.name}
                                  </span>
                                  {isOverridden && (
                                    <span className="rounded bg-purple-100 px-1 py-0.2 text-[9px] font-bold text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                                      {isAr ? "مخصص" : "Override"}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-neutral-500 truncate max-w-[150px]">
                                  {m.group?.name ? `${m.group.name}` : isAr ? "بدون مجموعة" : "No group"}
                                </div>
                              </div>
                            </div>

                            {/* Current Journey Stage & Apps */}
                            <div className="text-[11px] text-neutral-600 dark:text-neutral-400 min-w-[110px]">
                              <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                {m.journey?.nodeCode || (!m.profileComplete ? "ONBOARDING" : "TASK_0")}
                              </div>
                              <div className="text-[10px] text-neutral-500">
                                {m.applicationsCount || 0} {isAr ? "تقديمات" : "apps"}
                              </div>
                            </div>

                            {/* Active Variant Badge */}
                            <div className="flex items-center gap-1">
                              <span
                                className={`rounded-md px-2 py-0.5 text-xs font-black ${
                                  effectiveVariant === "A"
                                    ? "bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300"
                                    : effectiveVariant === "B"
                                    ? "bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300"
                                    : "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300"
                                }`}
                              >
                                {effectiveVariant}
                              </span>
                              <span className="text-[9px] text-neutral-400">
                                {isOverridden ? (isAr ? "يدوي" : "manual") : (isAr ? "تلقائي" : "auto")}
                              </span>
                            </div>

                            {/* Instant Switcher Buttons */}
                            <div className="flex items-center gap-1">
                              {(["A", "B", "C"] as const).map((v) => {
                                const isCurrent = effectiveVariant === v;
                                return (
                                  <button
                                    key={v}
                                    type="button"
                                    disabled={isUpdating}
                                    onClick={() => handleInstantUserVariantChange(m.id, v)}
                                    className={`rounded-lg px-2 py-0.8 text-xs font-bold transition shadow-2xs ${
                                      isCurrent
                                        ? v === "A"
                                          ? "bg-blue-600 text-white shadow-xs"
                                          : v === "B"
                                          ? "bg-purple-600 text-white shadow-xs"
                                          : "bg-amber-600 text-white shadow-xs"
                                        : "border border-border-subtle bg-surface text-neutral-600 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-300"
                                    }`}
                                    title={isAr ? `تعيين للنسخة ${v}` : `Set to Variant ${v}`}
                                  >
                                    {v}
                                  </button>
                                );
                              })}

                              {isOverridden && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleInstantUserVariantChange(m.id, "DEFAULT")}
                                  className="rounded-lg border border-border-subtle bg-surface px-1.5 py-0.8 text-[10px] font-semibold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-400 dark:hover:text-white"
                                  title={isAr ? "إعادة للنسخة الافتراضية" : "Reset to default"}
                                >
                                  {isAr ? "افتراضي" : "Reset"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. استنتاجات المعمل وإعدادات فيديو التهيئة */}
          <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm dark:bg-surface-elevated space-y-4">
            <div className="border-b border-border-subtle pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-950 dark:text-neutral-50 flex items-center gap-2">
                  <Video className="h-4 w-4 text-brand-primary" />
                  <span>{isAr ? "إعدادات وسائط التهيئة الترحيبية (Onboarding Media Settings)" : "Onboarding Media Settings"}</span>
                </h3>
                <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                  {isAr
                    ? "رابط الفيديو الترحيبي المضمن في نافذة التهيئة الأولى للباحث للنسخة المعتمدة."
                    : "Video embedded inside first-time onboarding modal for active researchers."}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="url"
                value={introVideoUrl}
                onChange={(e) => setIntroVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full sm:flex-1 rounded-xl border border-border-subtle bg-surface px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none dark:bg-surface-elevated dark:text-neutral-100"
              />

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {introVideoUrl && (
                  <a
                    href={introVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white underline px-2 py-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>{isAr ? "معاينة الرابط" : "Preview"}</span>
                  </a>
                )}

                <button
                  type="button"
                  disabled={isSavingVideo}
                  onClick={handleSaveIntroVideo}
                  className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-white dark:text-neutral-950 transition"
                >
                  {isSavingVideo ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : isAr ? "حفظ وتحديث الفيديو" : "Save Video"}
                </button>
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
