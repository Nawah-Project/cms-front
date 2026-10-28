import { journeyResearchApi, type Person } from "./journey-observatory/api";
import { GuidanceMembersModal, type GuidanceAudienceFilter } from "./components/GuidanceMembersModal";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useI18n } from "../../i18n";
import {
  adminApi,
  type JourneyNodeItem,
  type PlotGuidanceItem,
} from "./api/adminApi";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "./components/AdminUI";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/ToastProvider";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle,
  Compass,
  Copy,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  Flag,
  Globe,
  Layers,
  MapPin,
  Plus,
  Send,
  Share2,
  Sparkles,
  User,
  Users,
  Video,
} from "lucide-react";

const TRIGGER_LABELS: Record<string, string> = {
  INSIGHT_TASK_0_CV_BASE: "المهمة 0: صياغة الـ CV الأساسي",
  INSIGHT_W1_INTERVIEW_BASIC: "الأسبوع 1: التجهيز للمقابلة والأسيمنت",
  INSIGHT_W1_TAILORED_CV: "الأسبوع 1: التقديم المخصص (اليوم السابع)",
  INSIGHT_W2_CUSTOM_PREP: "الأسبوع 2: التجهيز المخصص",
  INSIGHT_W2_CONTENT_BUILDING: "الأسبوع 2: بناء المحتوى المهني (اليوم السابع)",
  INSIGHT_W3_TIME_MGMT: "الأسبوع 3: استراتيجيات إدارة الوقت",
  INSIGHT_W3_NETWORKING: "الأسبوع 3: بناء شبكة العلاقات (اليوم السابع)",
  INSIGHT_W4_SELF_CAREER_PLAN: "الأسبوع 4: التخطيط المهني المستمر",
  INSIGHT_INTERVIEW_ADVANCED: "الحدث الشرطي: أول مقابلة / أسيمنت",
};

export default function AdminJourneyEnginePage() {
  const { t, locale, number } = useI18n();
  const isAr = locale === "ar";
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = (searchParams.get("tab") as "nodes" | "guidance") || "nodes";
  const [activeTab, setActiveTab] = useState<"nodes" | "guidance">(tabParam);

  useEffect(() => {
    const tParam = searchParams.get("tab") as "nodes" | "guidance" | null;
    if (tParam && (tParam === "nodes" || tParam === "guidance")) {
      setActiveTab(tParam);
    }
  }, [searchParams]);

  const switchTab = (tab: "nodes" | "guidance") => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  };

  // --- Members Data (for live node/week metrics) ---
  const [members, setMembers] = useState<Person[]>([]);

  // --- Tab 1: Nodes State ---
  const [nodes, setNodes] = useState<JourneyNodeItem[]>([]);
  const [nodesLoading, setNodesLoading] = useState(true);
  const [nodesError, setNodesError] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState<string>("ALL");
  const [editingNode, setEditingNode] = useState<JourneyNodeItem | null>(null);
  const [savingNode, setSavingNode] = useState(false);
  const [selectedNodeForMembers, setSelectedNodeForMembers] = useState<string | null>(null);

  // Edit Node Form state
  const [nodeTitleAr, setNodeTitleAr] = useState("");
  const [nodeTitleEn, setNodeTitleEn] = useState("");
  const [nodeDescAr, setNodeDescAr] = useState("");
  const [nodeDescEn, setNodeDescEn] = useState("");
  const [nodeDuration, setNodeDuration] = useState(1);
  const [reqApps, setReqApps] = useState(5);
  const [reqTailored, setReqTailored] = useState(0);
  const [reqPosts, setReqPosts] = useState(0);
  const [reqOutreach, setReqOutreach] = useState(0);
  const [unlocksInsight, setUnlocksInsight] = useState("");
  const [nextNode, setNextNode] = useState("");

  // --- Tab 2: Plot Guidance State ---
  const [guidanceItems, setGuidanceItems] = useState<PlotGuidanceItem[]>([]);
  const [guidanceAudience, setGuidanceAudience] = useState<{ item: PlotGuidanceItem; filter: GuidanceAudienceFilter } | null>(null);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [guidanceError, setGuidanceError] = useState(false);
  const [editingGuidance, setEditingGuidance] = useState<PlotGuidanceItem | null>(null);
  const [savingGuidance, setSavingGuidance] = useState(false);

  // Guidance Edit Form
  const [guidanceTitleAr, setGuidanceTitleAr] = useState("");
  const [guidanceTitleEn, setGuidanceTitleEn] = useState("");
  const [guidanceSummaryAr, setGuidanceSummaryAr] = useState("");
  const [guidancePrompt, setGuidancePrompt] = useState("");
  const [guidanceContent, setGuidanceContent] = useState("");

  // Use the same read-only, unpaginated research snapshot as the journey map.
  useEffect(() => {
    journeyResearchApi.map({ days: 30, idleDays: 3 }).then(report => setMembers(report.members)).catch(() => toast.error(isAr ? "تعذر تحميل توزيع الأعضاء؛ أعد تحميل الصفحة." : "Could not load member positions; reload the page."));
  }, []);

  // Compute live member distribution
  const membersByNode = useMemo(() => {
    const map: Record<string, Person[]> = {};
    for (const m of members) {
      const code = m.guidanceCode ?? m.currentCode;
      if (code) {
        if (!map[code]) map[code] = [];
        map[code].push(m);
      }
    }
    return map;
  }, [members]);

  const membersByWeek = useMemo(() => {
    const map: Record<number, number> = {};
    for (const m of members) {
      const w = m.guidanceCode === "INSIGHT_TASK_0_CV_BASE" ? 0 : m.currentWeek;
      map[w] = (map[w] || 0) + 1;
    }
    return map;
  }, [members]);

  // Load Journey Nodes
  const loadNodes = () => {
    setNodesLoading(true);
    setNodesError(false);
    adminApi
      .journeyNodes()
      .then((items) => {
        setNodes(items);
      })
      .catch(() => setNodesError(true))
      .finally(() => setNodesLoading(false));
  };

  useEffect(() => {
    loadNodes();
  }, []);

  // Load Plot Guidance Items
  const loadGuidance = () => {
    setGuidanceLoading(true);
    setGuidanceError(false);
    adminApi
      .plotGuidance()
      .then((items) => {
        setGuidanceItems(items);
      })
      .catch(() => setGuidanceError(true))
      .finally(() => setGuidanceLoading(false));
  };

  useEffect(() => {
    if (activeTab === "guidance") {
      loadGuidance();
    }
  }, [activeTab]);

  const openNodeEditor = (node: JourneyNodeItem) => {
    setEditingNode(node);
    setNodeTitleAr(node.titleAr || "");
    setNodeTitleEn(node.titleEn || "");
    setNodeDescAr(node.descriptionAr || "");
    setNodeDescEn(node.descriptionEn || "");
    setNodeDuration(node.durationDays || 1);
    setReqApps(node.requiredAppsCount ?? 5);
    setReqTailored(node.requiredTailoredCount ?? 0);
    setReqPosts(node.requiredPostsCount ?? 0);
    setReqOutreach(node.requiredOutreachCount ?? 0);
    setUnlocksInsight(node.unlocksInsightCode || "");
    setNextNode(node.nextNodeCode || "");
  };

  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode) return;
    setSavingNode(true);
    try {
      await adminApi.updateJourneyNode(editingNode.code, {
        titleAr: nodeTitleAr.trim(),
        titleEn: nodeTitleEn.trim(),
        descriptionAr: nodeDescAr.trim() || null,
        descriptionEn: nodeDescEn.trim() || null,
        durationDays: Number(nodeDuration),
        requiredAppsCount: Number(reqApps),
        requiredTailoredCount: Number(reqTailored),
        requiredPostsCount: Number(reqPosts),
        requiredOutreachCount: Number(reqOutreach),
        unlocksInsightCode: unlocksInsight.trim() || null,
        nextNodeCode: nextNode.trim() || null,
      });
      toast.success(isAr ? "تم تحديث بيانات وشروط المحطة بنجاح" : "Node conditions updated");
      setEditingNode(null);
      loadNodes();
    } catch {
      toast.error(isAr ? "فشل تحديث المحطة" : "Failed to update node");
    } finally {
      setSavingNode(false);
    }
  };

  const openGuidanceEditor = (item: PlotGuidanceItem) => {
    setEditingGuidance(item);
    setGuidanceTitleAr(item.titleAr || item.title || "");
    setGuidanceTitleEn(item.titleEn || "");
    setGuidanceSummaryAr(item.summaryAr || "");
    setGuidancePrompt(item.promptTemplateAr || item.promptTemplate || "");
    setGuidanceContent(item.content || "");
  };

  const handleSaveGuidance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuidance) return;
    setSavingGuidance(true);
    try {
      await adminApi.updatePlotGuidance(editingGuidance.code, {
        title: guidanceTitleAr.trim(),
        titleAr: guidanceTitleAr.trim(),
        titleEn: guidanceTitleEn.trim(),
        summaryAr: guidanceSummaryAr.trim(),
        promptTemplate: guidancePrompt.trim(),
        promptTemplateAr: guidancePrompt.trim(),
        content: guidanceContent.trim(),
      });
      toast.success(isAr ? "تم حفظ وتحديث إرشاد الحبكة بنجاح" : "Plot guidance updated successfully");
      setEditingGuidance(null);
      loadGuidance();
    } catch {
      toast.error(isAr ? "فشل تحديث إرشاد الحبكة" : "Failed to update plot guidance");
    } finally {
      setSavingGuidance(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(isAr ? `تم نسخ ${label} إلى الحافظة` : `${label} copied to clipboard`);
  };

  // Group nodes by weeks: 0, 1, 2, 3, 4
  const groupedNodes = useMemo(() => {
    const weeks: Record<number, JourneyNodeItem[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    for (const node of nodes) {
      const w = node.weekNumber ?? 0;
      if (!weeks[w]) weeks[w] = [];
      weeks[w].push(node);
    }
    // Sort each group by orderIndex
    for (const w in weeks) {
      weeks[w].sort((a, b) => a.orderIndex - b.orderIndex);
    }
    return weeks;
  }, [nodes]);

  const weekLabels: Record<number, { ar: string; en: string }> = {
    0: { ar: "الأسبوع 0: التهيئة والتجهيز المبدئي", en: "Week 0: Foundation & Onboarding" },
    1: { ar: "الأسبوع 1: إطلاق التقديمات وبناء الزخم", en: "Week 1: Pipeline Launch & Momentum" },
    2: { ar: "الأسبوع 2: التخصيص والمحتوى المهني", en: "Week 2: Customization & Outreach" },
    3: { ar: "الأسبوع 3: إدارة المقابلات وشبكة العلاقات", en: "Week 3: Interviews & Networking" },
    4: { ar: "الأسبوع 4: التقييم الختامي وخطة الاستمرار", en: "Week 4: Final Evaluation & Horizon" },
  };

  return (
    <div className="space-y-6">
      {/* Internal Tabs Switcher */}
      <div className="flex border-b border-neutral-200 gap-2 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => switchTab("nodes")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
            activeTab === "nodes"
              ? "border-neutral-900 text-neutral-950 dark:border-white dark:text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          }`}
        >
          <Compass className="h-4 w-4" />
          <span>{isAr ? "خريطة محطات الرحلة (25 محطة)" : "Journey Pipeline Nodes (25 Nodes)"}</span>
          <span className="rounded-full bg-neutral-200/80 px-2 py-0.5 text-xs font-mono text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
            {number(nodes.length)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("guidance")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
            activeTab === "guidance"
              ? "border-neutral-900 text-neutral-950 dark:border-white dark:text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>{isAr ? "إرشادات الحبكة والموجهات الذكية (9 إرشادات)" : "Plot Guidance & Smart Prompts (9 Insights)"}</span>
          <span className="rounded-full bg-neutral-200/80 px-2 py-0.5 text-xs font-mono text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
            {number(guidanceItems.length || 9)}
          </span>
        </button>
      </div>

      {/* TAB 1: JOURNEY PIPELINE NODES MAP */}
      {activeTab === "nodes" && (
        <div className="space-y-6">
          {/* Phase Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-surface p-4 shadow-xs dark:border-neutral-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 me-1">
                {isAr ? "عرض أسبوع محدد:" : "Filter Week:"}
              </span>
              {[
                { val: "ALL", labelAr: "كل الأسابيع (25 محطة)", labelEn: "All Weeks (25)" },
                { val: "0", labelAr: "الأسبوع 0", labelEn: "Week 0" },
                { val: "1", labelAr: "الأسبوع 1", labelEn: "Week 1" },
                { val: "2", labelAr: "الأسبوع 2", labelEn: "Week 2" },
                { val: "3", labelAr: "الأسبوع 3", labelEn: "Week 3" },
                { val: "4", labelAr: "الأسبوع 4", labelEn: "Week 4" },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setPhaseFilter(p.val)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    phaseFilter === p.val
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  }`}
                >
                  {isAr ? p.labelAr : p.labelEn}
                </button>
              ))}
            </div>

            <span className="text-xs text-neutral-500 font-medium">
              {nodes.length} {isAr ? "محطة إجمالية في محرك الرحلة" : "total nodes configured"}
            </span>
          </div>

          {nodesLoading ? (
            <LoadingState label={isAr ? "جارٍ تحميل محطات الرحلة..." : "Loading journey nodes..."} />
          ) : nodesError ? (
            <ErrorState onRetry={loadNodes} />
          ) : (
            <div className="space-y-8">
              {[0, 1, 2, 3, 4]
                .filter((w) => phaseFilter === "ALL" || phaseFilter === String(w))
                .map((w) => {
                  const weekNodes = groupedNodes[w] || [];
                  const totalDays = weekNodes.reduce((acc, n) => acc + (n.durationDays || 0), 0);
                  const totalApps = weekNodes.reduce((acc, n) => acc + (n.requiredAppsCount || 0), 0);
                  const activeInWeek = membersByWeek[w] || 0;

                  return (
                    <div key={w} className="space-y-3">
                      {/* Weekly Summary Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-100/90 border border-neutral-200/80 px-4 py-3 dark:bg-neutral-800/80 dark:border-neutral-700">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white text-xs font-black dark:bg-white dark:text-neutral-900">
                            W{w}
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-neutral-950 dark:text-neutral-100">
                              {isAr ? weekLabels[w]?.ar : weekLabels[w]?.en}
                            </h3>
                            <p className="text-[11px] text-neutral-500">
                              {weekNodes.length} {isAr ? "محطات فرعية" : "sub-nodes"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span className="rounded-lg bg-surface px-2.5 py-1 text-neutral-700 border border-neutral-200 font-semibold dark:border-neutral-700 dark:text-neutral-200">
                            ⏳ {totalDays} {isAr ? "أيام إجمالية" : "total days"}
                          </span>
                          <span className="rounded-lg bg-surface px-2.5 py-1 text-info-strong border border-neutral-200 font-semibold dark:border-neutral-700">
                            📨 {totalApps} {isAr ? "طلب تقديم مستهدف" : "target apps"}
                          </span>
                          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700 border border-emerald-200 font-bold dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                            👥 {activeInWeek} {isAr ? "عضو متواجد حالياً" : "members here"}
                          </span>
                        </div>
                      </div>

                      {/* Nodes in this week */}
                      <div className="grid gap-3">
                        {weekNodes.map((node) => {
                          const isDay7 = node.nodeType === "DAY_7_CHECKIN";
                          const isFinal = node.nodeType === "FINAL_ASSESSMENT";
                          const membersAtNode = membersByNode[node.code] || [];

                          return (
                            <div
                              key={node.code}
                              className={`rounded-2xl border p-4.5 transition-all shadow-xs ${
                                isDay7
                                  ? "border-amber-300 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20"
                                  : isFinal
                                  ? "border-purple-300 bg-purple-50/40 dark:border-purple-800 dark:bg-purple-950/20"
                                  : "border-neutral-200/80 bg-surface hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="space-y-1.5 flex-1 min-w-[280px]">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-md bg-neutral-100 font-mono text-xs font-bold text-neutral-900 px-2 py-0.5 border border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700">
                                      {node.code}
                                    </span>
                                    <span
                                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                        isDay7
                                          ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                                          : isFinal
                                          ? "bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800"
                                          : "bg-neutral-100 text-neutral-700 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
                                      }`}
                                    >
                                      {isDay7
                                        ? isAr ? "محطة تقييم اليوم السابع" : "Day 7 Check-in"
                                        : isFinal
                                        ? isAr ? "التقرير الختامي" : "Final Assessment"
                                        : isAr ? "محطة مسار رئيسية" : "Core Journey Node"}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
                                      <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                                      <span>{node.durationDays} {isAr ? "أيام" : "days"}</span>
                                    </span>

                                    {/* Members Count Badge */}
                                    {membersAtNode.length > 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedNodeForMembers(node.code)}
                                        className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold cursor-pointer hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1 transition-colors"
                                        title={isAr ? "اضغط لعرض قائمة الأعضاء في هذه المحطة" : "Click to view members"}
                                      >
                                        <Users className="h-3 w-3" />
                                        <span>{membersAtNode.length} {isAr ? "أعضاء هنا" : "members here"}</span>
                                      </button>
                                    ) : (
                                      <span className="rounded-full bg-neutral-100 text-neutral-500 border border-neutral-200 px-2 py-0.5 text-[10px] dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700">
                                        0 {isAr ? "عضو" : "members"}
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="text-sm font-bold text-neutral-950 dark:text-neutral-100">
                                    {isAr ? node.titleAr : node.titleEn || node.titleAr}
                                  </h4>

                                  <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-3xl">
                                    {isAr
                                      ? node.descriptionAr || "لا يوجد وصف مدخل لهذه المحطة بعد."
                                      : node.descriptionEn || node.descriptionAr}
                                  </p>
                                </div>

                                {/* Edit Node Button */}
                                <button
                                  type="button"
                                  onClick={() => openNodeEditor(node)}
                                  className="button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer shrink-0"
                                >
                                  <Edit className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
                                  <span>{isAr ? "تعديل الشروط" : "Edit Conditions"}</span>
                                </button>
                              </div>

                              {/* Requirements strip */}
                              <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[11px] font-bold text-neutral-500">
                                    {isAr ? "المتطلبات:" : "Requirements:"}
                                  </span>

                                  <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-800 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700">
                                    <Send className="h-3 w-3 text-info-strong" />
                                    <span>{isAr ? "تقديمات:" : "Apps:"}</span>
                                    <strong className="text-neutral-950 dark:text-white font-black">{node.requiredAppsCount}</strong>
                                  </span>

                                  {node.requiredTailoredCount > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                                      <FileText className="h-3 w-3 text-blue-600" />
                                      <span>{isAr ? "مخصصة:" : "Tailored:"}</span>
                                      <strong className="font-black">{node.requiredTailoredCount}</strong>
                                    </span>
                                  )}

                                  {node.requiredPostsCount > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                                      <Share2 className="h-3 w-3 text-purple-600" />
                                      <span>{isAr ? "LinkedIn:" : "Posts:"}</span>
                                      <strong className="font-black">{node.requiredPostsCount}</strong>
                                    </span>
                                  )}

                                  {node.requiredOutreachCount > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                      <Users className="h-3 w-3 text-emerald-600" />
                                      <span>{isAr ? "علاقات:" : "Outreach:"}</span>
                                      <strong className="font-black">{node.requiredOutreachCount}</strong>
                                    </span>
                                  )}
                                </div>

                                {/* Linked insight & next node */}
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  {node.nextNodeCode && (
                                    <span className="inline-flex items-center gap-1 text-neutral-500">
                                      <span>{isAr ? "المحطة التالية:" : "Next:"}</span>
                                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] text-neutral-800 font-semibold border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700">
                                        {node.nextNodeCode}
                                      </span>
                                    </span>
                                  )}

                                  {node.unlocksInsightCode && (
                                    <button
                                      type="button"
                                      onClick={() => switchTab("guidance")}
                                      className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 transition-colors cursor-pointer"
                                    >
                                      <Sparkles className="h-3 w-3" />
                                      <span>{isAr ? "يكشف إرشاد:" : "Unlocks:"}</span>
                                      <span>{TRIGGER_LABELS[node.unlocksInsightCode] || node.unlocksInsightCode}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PLOT GUIDANCE & SMART PROMPTS */}
      {activeTab === "guidance" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-neutral-950 dark:text-neutral-100">
                {isAr ? "إرشادات وتوجيهات الحبكة الـ 9 (Plot Guidance Engine)" : "9 Core Plot Guidance Milestones"}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                {isAr
                  ? "المحتوى التوجيهي السردي لبرنامج الـ 28 يوماً، قوالب البرومبتات الذكية، وإحصائيات فتح وقراءة كل إرشاد"
                  : "Curated narrative milestones unlocked dynamically across the 28-day journey"}
              </p>
            </div>
          </div>

          {guidanceLoading ? (
            <LoadingState label={isAr ? "جارٍ تحميل إرشادات الحبكة..." : "Loading plot guidance..."} />
          ) : guidanceError ? (
            <ErrorState onRetry={loadGuidance} />
          ) : !guidanceItems.length ? (
            <EmptyState>{isAr ? "لا توجد إرشادات حبكة مدخلة" : "No plot guidance items"}</EmptyState>
          ) : (
            <div className="grid gap-4">
              {guidanceItems.map((item, idx) => (
                <div
                  key={item.code}
                  className="rounded-2xl border border-neutral-200/80 bg-surface p-5 space-y-3.5 shadow-xs dark:border-neutral-800"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-[10px] font-bold dark:bg-white dark:text-neutral-900">
                          {idx + 1}
                        </span>
                        <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                          {TRIGGER_LABELS[item.unlockTriggerCode || item.code] || item.code}
                        </span>
                        <span className="rounded-md bg-neutral-100 border border-neutral-200 px-2 py-0.5 text-[11px] font-mono text-neutral-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300">
                          W{item.weekNumber}
                        </span>
                        {item.isCustomized && (
                          <span className="rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300">
                            {isAr ? "مُعدّل ومحفوظ" : "Customized"}
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-neutral-950 dark:text-neutral-100">
                        {isAr ? item.titleAr || item.title : item.titleEn || item.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openGuidanceEditor(item)}
                        className="button-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>{isAr ? "تعديل المحتوى والبرومبت" : "Edit Guidance"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary / Content */}
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                    {item.summaryAr || item.content.slice(0, 280)}
                    {item.content && item.content.length > 280 ? "..." : ""}
                  </p>

                  {/* Smart Prompt Box */}
                  {(item.promptTemplateAr || item.promptTemplate) && (
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3.5 space-y-2 dark:border-neutral-700 dark:bg-neutral-800/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 inline-flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-info-strong" />
                          <span>{isAr ? "قالب الموجه الذكي (AI Prompt):" : "Smart Prompt Template:"}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(item.promptTemplateAr || item.promptTemplate, isAr ? "البرومبت الذكي" : "Prompt")}
                          className="text-[11px] font-semibold text-info-strong hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                          <span>{isAr ? "نسخ البرومبت" : "Copy"}</span>
                        </button>
                      </div>
                      <p className="text-xs font-mono text-neutral-800 dark:text-neutral-200 leading-relaxed bg-surface p-2.5 rounded-lg border border-neutral-200/60 dark:border-neutral-700">
                        {item.promptTemplateAr || item.promptTemplate}
                      </p>
                    </div>
                  )}

                  <div className="border-t border-border pt-3 space-y-3" data-admin-guidance-metrics={item.code}>
                    <p className="text-xs text-text-secondary">{item.required
                      ? (isAr ? "محطة إلزامية: لا تُستكمل بالقراءة وحدها؛ يلزم تحديث السيرة." : "Required station: a read alone does not complete the CV update.")
                      : (isAr ? "إرشاد معرفي: الإتمام هو قراءة مسجّلة، والتطبيق العملي يُتابَع منفصلًا." : "Informational guide: completion is a recorded read; practical application is separate.")}</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {([
                        ["ALL", isAr ? "متاح لهم" : "Available to", item.unlockedCount],
                        ["READ", isAr ? "قراءة مسجّلة" : "Read recorded", item.readsCount],
                        ["COMPLETED", isAr ? "أكملوه" : "Completed", item.completedCount ?? 0],
                        ["PENDING", isAr ? "بانتظار الإتمام" : "Pending", item.pendingCount ?? 0],
                      ] as const).map(([filter, label, count]) => <button key={filter} type="button" onClick={() => setGuidanceAudience({ item, filter })} className="rounded-xl border border-border bg-surface p-3 text-start hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent">
                        <span className="block text-xs text-text-secondary">{label}</span><strong className="mt-1 block text-xl text-text-primary">{number(count)}</strong><span className="text-[11px] text-info-strong">{isAr ? "عرض الأسماء" : "View names"}</span>
                      </button>)}
                    </div>
                    {item.required && <button type="button" className="text-sm font-semibold text-info-strong underline" onClick={() => setGuidanceAudience({ item, filter: "BLOCKING" })}>{number(item.blockingCount ?? 0)} {isAr ? "متوقفون عند هذه المحطة · اعرضهم" : "blocked at this station · view members"}</button>}
                    <p className="text-[11px] text-text-secondary">{isAr ? "من إجمالي" : "Out of"} {number(item.totalMembers ?? 0)} {isAr ? "حساب مستخدم؛ الأدمن وحساب الاختبار مستبعدان. الإتاحة لا تعني أنه فتح الإرشاد." : "member accounts; administrators and the test account are excluded. Availability does not mean the guide was opened."}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Node Modal */}
      {editingNode && (
        <Modal
          isOpen={Boolean(editingNode)}
          onClose={() => setEditingNode(null)}
          title={isAr ? `تعديل شروط المحطة: ${editingNode.code}` : `Edit Node: ${editingNode.code}`}
        >
          <form onSubmit={handleSaveNode} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isAr ? "العنوان بالعربية *" : "Title (Arabic) *"}
                </label>
                <input
                  type="text"
                  required
                  value={nodeTitleAr}
                  onChange={(e) => setNodeTitleAr(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isAr ? "العنوان بالإنجليزية *" : "Title (English) *"}
                </label>
                <input
                  type="text"
                  required
                  value={nodeTitleEn}
                  onChange={(e) => setNodeTitleEn(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isAr ? "الوصف بالعربية" : "Description (Arabic)"}
              </label>
              <textarea
                rows={2}
                value={nodeDescAr}
                onChange={(e) => setNodeDescAr(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-xs text-neutral-900 resize-none dark:border-neutral-700 dark:text-neutral-100"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isAr ? "المدة (أيام) *" : "Duration Days *"}
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={nodeDuration}
                  onChange={(e) => setNodeDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isAr ? "طلبات عامة *" : "Req. Apps *"}
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={reqApps}
                  onChange={(e) => setReqApps(Number(e.target.value))}
                  className="w-full rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isAr ? "طلبات مخصصة" : "Tailored Apps"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={reqTailored}
                  onChange={(e) => setReqTailored(Number(e.target.value))}
                  className="w-full rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isAr ? "منشورات LinkedIn" : "LinkedIn Posts"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={reqPosts}
                  onChange={(e) => setReqPosts(Number(e.target.value))}
                  className="w-full rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isAr ? "المحطة التالية (Next Node Code)" : "Next Node Code"}
                </label>
                <input
                  type="text"
                  value={nextNode}
                  onChange={(e) => setNextNode(e.target.value)}
                  placeholder="e.g. W1_M2"
                  className="w-full rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-xs text-neutral-900 font-mono dark:border-neutral-700 dark:text-neutral-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isAr ? "كود إرشاد الحبكة المربوط" : "Unlocks Insight Code"}
                </label>
                <select
                  value={unlocksInsight}
                  onChange={(e) => setUnlocksInsight(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
                >
                  <option value="">{isAr ? "بدون إرشاد مربوط" : "None"}</option>
                  {Object.entries(TRIGGER_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {k} ({label})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setEditingNode(null)}
                className="button-secondary px-3 py-1.5 text-xs cursor-pointer"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={savingNode}
                className="button-primary px-4 py-1.5 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                {savingNode ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ التعديلات" : "Save Changes")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {guidanceAudience && <GuidanceMembersModal key={`${guidanceAudience.item.code}:${guidanceAudience.filter}`} title={isAr ? guidanceAudience.item.titleAr || guidanceAudience.item.title : guidanceAudience.item.titleEn || guidanceAudience.item.title} members={guidanceAudience.item.members ?? []} required={guidanceAudience.item.required} ar={isAr} initialFilter={guidanceAudience.filter} onClose={() => setGuidanceAudience(null)} />}

      {/* Edit Plot Guidance Modal */}
      {editingGuidance && (
        <Modal
          isOpen={Boolean(editingGuidance)}
          onClose={() => setEditingGuidance(null)}
          title={isAr ? `تعديل إرشاد الحبكة: ${editingGuidance.code}` : `Edit Plot Guidance: ${editingGuidance.code}`}
        >
          <form onSubmit={handleSaveGuidance} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isAr ? "العنوان بالعربية *" : "Title (Arabic) *"}
                </label>
                <input
                  type="text"
                  required
                  value={guidanceTitleAr}
                  onChange={(e) => setGuidanceTitleAr(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isAr ? "العنوان بالإنجليزية" : "Title (English)"}
                </label>
                <input
                  type="text"
                  value={guidanceTitleEn}
                  onChange={(e) => setGuidanceTitleEn(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isAr ? "الملخص السريع بالعربية" : "Summary (Arabic)"}
              </label>
              <input
                type="text"
                value={guidanceSummaryAr}
                onChange={(e) => setGuidanceSummaryAr(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-xs text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isAr ? "قالب الموجه الذكي (AI Prompt Box)" : "Smart Prompt Template"}
              </label>
              <textarea
                rows={3}
                value={guidancePrompt}
                onChange={(e) => setGuidancePrompt(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-xs font-mono text-neutral-900 resize-none dark:border-neutral-700 dark:text-neutral-100"
                placeholder="اكتب البرومبت التوجيهي الذكي الذي ينسخه العضو للاستعانة به..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {isAr ? "المحتوى التوجيهي التفصيلي" : "Detailed Content"}
              </label>
              <textarea
                rows={4}
                value={guidanceContent}
                onChange={(e) => setGuidanceContent(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-surface px-3 py-2 text-xs text-neutral-900 resize-none dark:border-neutral-700 dark:text-neutral-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setEditingGuidance(null)}
                className="button-secondary px-3.5 py-2 text-xs cursor-pointer"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={savingGuidance}
                className="button-primary px-4 py-2 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                {savingGuidance ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات" : "Save Changes")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Members At Node Modal */}
      {selectedNodeForMembers && (
        <Modal
          isOpen={Boolean(selectedNodeForMembers)}
          onClose={() => setSelectedNodeForMembers(null)}
          title={isAr ? `الأعضاء المتواجدون في المحطة: ${selectedNodeForMembers}` : `Members at node: ${selectedNodeForMembers}`}
        >
          <div className="space-y-3">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {isAr
                ? `قائمة الأعضاء الذين يعملون حالياً على إنجاز متطلبات المحطة (${selectedNodeForMembers}):`
                : `Members currently progressing through ${selectedNodeForMembers}:`}
            </p>

            <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
              {(membersByNode[selectedNodeForMembers] || []).map((m) => (
                <div key={m.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-neutral-950 dark:text-neutral-100">{m.name}</p>
                    <p className="text-[11px] text-neutral-500">{m.group?.name || t("common.unassigned")}</p>
                  </div>
                  <div className="text-end">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      {m.counts.apps} / {nodes.find(node => node.code === m.currentCode)?.requiredAppsCount ?? 0} {isAr ? "طلب" : "apps"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setSelectedNodeForMembers(null)}
                className="button-primary px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
