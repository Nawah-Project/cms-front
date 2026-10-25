import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useI18n } from "../../i18n";
import {
  adminApi,
  type JourneyNodeItem,
} from "./api/adminApi";
import { GuidanceFormDialog } from "../professional-development/components/GuidanceFormDialog";
import type { FeedbackPost } from "../professional-development/types";
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
  Edit,
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

  // --- Tab 1: Nodes State ---
  const [nodes, setNodes] = useState<JourneyNodeItem[]>([]);
  const [nodesLoading, setNodesLoading] = useState(true);
  const [nodesError, setNodesError] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState<string>("ALL");
  const [editingNode, setEditingNode] = useState<JourneyNodeItem | null>(null);
  const [savingNode, setSavingNode] = useState(false);

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
  const [guidancePosts, setGuidancePosts] = useState<FeedbackPost[]>([]);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [guidanceError, setGuidanceError] = useState(false);
  const [editingGuidance, setEditingGuidance] = useState<FeedbackPost | null>(null);
  const [guidanceFormOpen, setGuidanceFormOpen] = useState(false);

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

  // Load Plot Guidance Posts
  const loadGuidance = () => {
    setGuidanceLoading(true);
    setGuidanceError(false);
    adminApi
      .feedbackPosts(1, 50, false, "guidance")
      .then((res) => {
        // Sort in logical sequence (TASK_0 -> W1 -> W2 -> W3 -> W4 -> ADVANCED)
        const sorted = res.items.slice().sort((a, b) => {
          const order = [
            "INSIGHT_TASK_0_CV_BASE",
            "INSIGHT_W1_INTERVIEW_BASIC",
            "INSIGHT_W1_TAILORED_CV",
            "INSIGHT_W2_CUSTOM_PREP",
            "INSIGHT_W2_CONTENT_BUILDING",
            "INSIGHT_W3_TIME_MGMT",
            "INSIGHT_W3_NETWORKING",
            "INSIGHT_W4_SELF_CAREER_PLAN",
            "INSIGHT_INTERVIEW_ADVANCED",
          ];
          const idxA = order.indexOf(a.unlockTriggerCode || "");
          const idxB = order.indexOf(b.unlockTriggerCode || "");
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });
        setGuidancePosts(sorted);
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

  const filteredNodes = nodes.filter((n) => {
    if (phaseFilter === "ALL") return true;
    return String(n.weekNumber) === phaseFilter;
  });

  return (
    <div className="space-y-6">
      {/* Internal Tabs Switcher */}
      <div className="flex border-b border-border/80 gap-2">
        <button
          type="button"
          onClick={() => switchTab("nodes")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "nodes"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Compass className="h-4 w-4" />
          <span>{isAr ? "خريطة المحطات والمهام الفرعية والمواعيد" : "Journey Pipeline & Nodes Map"}</span>
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-mono text-neutral-300">
            {number(nodes.length)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("guidance")}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "guidance"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>{isAr ? "إرشادات الحبكة والموجهات الذكية" : "Plot Guidance & Smart Prompts"}</span>
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-mono text-neutral-300">
            {number(guidancePosts.length)}
          </span>
        </button>
      </div>

      {/* TAB 1: JOURNEY PIPELINE NODES MAP */}
      {activeTab === "nodes" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-neutral-400 me-1">
                {isAr ? "تصفية حسب المرحلة:" : "Filter Phase:"}
              </span>
              {[
                { val: "ALL", labelAr: "كل المراحل", labelEn: "All Phases" },
                { val: "0", labelAr: "التهيئة: الأسبوع 0", labelEn: "Week 0 (Onboarding)" },
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
                      ? "bg-emerald-500 text-neutral-950 font-bold"
                      : "bg-neutral-800/70 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                  }`}
                >
                  {isAr ? p.labelAr : p.labelEn}
                </button>
              ))}
            </div>

            <span className="text-xs text-neutral-500">
              {filteredNodes.length} {isAr ? "محطة معروضة" : "nodes displayed"}
            </span>
          </div>

          {/* Connected Pipeline Nodes */}
          {nodesLoading ? (
            <LoadingState label={isAr ? "جارٍ تحميل محطات الرحلة..." : "Loading journey nodes..."} />
          ) : nodesError ? (
            <ErrorState onRetry={loadNodes} />
          ) : !filteredNodes.length ? (
            <EmptyState>{isAr ? "لا توجد محطات مطابقة" : "No matching nodes"}</EmptyState>
          ) : (
            <div className="space-y-4">
              {filteredNodes.map((node, index) => {
                const isDay7 = node.nodeType === "DAY_7_CHECKIN";
                const isFinal = node.nodeType === "FINAL_ASSESSMENT";

                return (
                  <div
                    key={node.code}
                    className={`rounded-2xl border p-5 transition-all shadow-xs relative ${
                      isDay7
                        ? "border-amber-500/40 bg-amber-950/10"
                        : isFinal
                        ? "border-purple-500/40 bg-purple-950/10"
                        : "border-border bg-surface hover:border-emerald-500/30"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      {/* Node Header & Title */}
                      <div className="space-y-1.5 flex-1 min-w-[280px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-neutral-800 font-mono text-xs font-bold text-neutral-200 px-2 py-0.5 border border-neutral-700">
                            {node.code}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isDay7
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : isFinal
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {isDay7
                              ? isAr ? "محطة تقييم اليوم السابع" : "Day 7 Check-in"
                              : isFinal
                              ? isAr ? "التقرير النهائي وختام الرحلة" : "Final Journey Assessment"
                              : isAr ? "مهمة أساسية في المسار" : "Core Journey Task"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
                            <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                            <span>{node.durationDays} {isAr ? "أيام مدة مقترحة" : "days duration"}</span>
                          </span>
                          <span className="text-xs text-neutral-500">
                            · {isAr ? `الأسبوع ${node.weekNumber}` : `Week ${node.weekNumber}`}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-neutral-100">
                          {isAr ? node.titleAr : node.titleEn || node.titleAr}
                        </h4>

                        <p className="text-xs text-neutral-400 leading-relaxed max-w-3xl">
                          {isAr
                            ? node.descriptionAr || "لا يوجد وصف مدخل لهذه المحطة بعد."
                            : node.descriptionEn || node.descriptionAr}
                        </p>
                      </div>

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={() => openNodeEditor(node)}
                        className="button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer shrink-0"
                      >
                        <Edit className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{isAr ? "تعديل شروط ومواعيد المحطة" : "Edit Node Requirements"}</span>
                      </button>
                    </div>

                    {/* Digital Requirements & Side Tasks */}
                    <div className="mt-4 pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                          {isAr ? "المتطلبات الرقمية:" : "Requirements:"}
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-800/90 px-2.5 py-1 text-xs font-medium text-neutral-200 border border-neutral-700/60">
                          <Send className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{isAr ? "طلبات التقديم:" : "Applications:"}</span>
                          <strong className="text-emerald-400 font-bold">{node.requiredAppsCount}</strong>
                        </span>

                        {node.requiredTailoredCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-800/90 px-2.5 py-1 text-xs font-medium text-neutral-200 border border-neutral-700/60">
                            <FileText className="h-3.5 w-3.5 text-blue-400" />
                            <span>{isAr ? "تقديمات مخصصة (Tailored):" : "Tailored CVs:"}</span>
                            <strong className="text-blue-400 font-bold">{node.requiredTailoredCount}</strong>
                          </span>
                        )}

                        {node.requiredPostsCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-800/90 px-2.5 py-1 text-xs font-medium text-neutral-200 border border-neutral-700/60">
                            <Share2 className="h-3.5 w-3.5 text-blue-400" />
                            <span>{isAr ? "منشورات LinkedIn:" : "LinkedIn Posts:"}</span>
                            <strong className="text-blue-400 font-bold">{node.requiredPostsCount}</strong>
                          </span>
                        )}

                        {node.requiredOutreachCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-800/90 px-2.5 py-1 text-xs font-medium text-neutral-200 border border-neutral-700/60">
                            <Users className="h-3.5 w-3.5 text-purple-400" />
                            <span>{isAr ? "بناء علاقات (Outreach):" : "Networking Outreach:"}</span>
                            <strong className="text-purple-400 font-bold">{node.requiredOutreachCount}</strong>
                          </span>
                        )}
                      </div>

                      {/* Progression Pipeline Link */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {node.nextNodeCode && (
                          <span className="inline-flex items-center gap-1 text-neutral-400">
                            <span>{isAr ? "المحطة التالية:" : "Next Node:"}</span>
                            <span className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300 font-semibold">
                              {node.nextNodeCode}
                            </span>
                          </span>
                        )}

                        {node.unlocksInsightCode && (
                          <span className="inline-flex items-center gap-1 text-neutral-400">
                            <span>{isAr ? "يكشف إرشاد:" : "Unlocks:"}</span>
                            <span
                              onClick={() => switchTab("guidance")}
                              className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[11px] text-amber-300 font-medium cursor-pointer hover:underline"
                              title={TRIGGER_LABELS[node.unlocksInsightCode] || node.unlocksInsightCode}
                            >
                              {TRIGGER_LABELS[node.unlocksInsightCode] || node.unlocksInsightCode}
                            </span>
                          </span>
                        )}
                      </div>
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
              <h3 className="text-base font-bold text-neutral-100">
                {isAr ? "إرشادات الحبكة والموجهات الذكية (Plot Guidance)" : "Plot Guidance & Smart Prompts"}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isAr
                  ? "المحتوى التوجيهي التفاعلي الذي ينفتح تلقائياً عند إتمام محطات معينة في الرحلة، مع البرومبتات الذكية وروابط الموارد"
                  : "Story-driven coaching insights unlocked upon reaching specific journey milestones"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingGuidance(null);
                setGuidanceFormOpen(true);
              }}
              className="button-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{isAr ? "+ إضافة إرشاد حبكة جديد" : "+ Add Plot Insight"}</span>
            </button>
          </div>

          {guidanceLoading ? (
            <LoadingState label={isAr ? "جارٍ تحميل إرشادات الحبكة..." : "Loading plot guidance..."} />
          ) : guidanceError ? (
            <ErrorState onRetry={loadGuidance} />
          ) : !guidancePosts.length ? (
            <EmptyState>{isAr ? "لا توجد إرشادات حبكة مدخلة" : "No plot guidance items"}</EmptyState>
          ) : (
            <div className="grid gap-4">
              {guidancePosts.map((post, idx) => (
                <div
                  key={post.id}
                  className="rounded-2xl border border-border bg-surface p-5 space-y-3 shadow-xs hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                          {idx + 1}
                        </span>
                        <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-semibold text-amber-300">
                          {TRIGGER_LABELS[post.unlockTriggerCode || ""] || post.unlockTriggerCode}
                        </span>
                        {post.promptTemplate && (
                          <span className="rounded-md bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-xs font-semibold text-blue-300 inline-flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            <span>{isAr ? "برومبت ذكي مدمج" : "Prompt Template"}</span>
                          </span>
                        )}
                        <span className="text-xs text-neutral-500">
                          {isAr
                            ? `قرأه ${(post as any)._count?.reads ?? 0} عضو`
                            : `Read by ${(post as any)._count?.reads ?? 0} members`}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-neutral-100">{post.title}</h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingGuidance(post);
                        setGuidanceFormOpen(true);
                      }}
                      className="button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{isAr ? "تعديل المحتوى والبرومبت" : "Edit Guidance"}</span>
                    </button>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-line line-clamp-3">
                    {post.content.replace(/<[^>]*>?/gm, "")}
                  </p>

                  {post.promptTemplate && (
                    <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3 text-[11px] font-mono text-neutral-300">
                      <p className="text-[10px] text-neutral-500 font-bold mb-1">
                        {isAr ? "صندوق الموجه الذكي (AI Prompt Box):" : "Smart Prompt Preview:"}
                      </p>
                      <p className="line-clamp-2 text-emerald-400/90">{post.promptTemplate}</p>
                    </div>
                  )}

                  {Boolean(post.resources?.length) && (
                    <div className="pt-2 flex flex-wrap gap-2 border-t border-border-subtle">
                      {post.resources?.map((r, i) => (
                        <a
                          key={i}
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-800/80 px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:bg-neutral-800 hover:underline"
                        >
                          <Video className="h-3 w-3" />
                          <span>{r.title}</span>
                        </a>
                      ))}
                    </div>
                  )}
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
                <label className="text-xs font-semibold text-neutral-200">
                  {isAr ? "العنوان بالعربية *" : "Title (Arabic) *"}
                </label>
                <input
                  type="text"
                  required
                  value={nodeTitleAr}
                  onChange={(e) => setNodeTitleAr(e.target.value)}
                  className="field-control w-full text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-200">
                  {isAr ? "العنوان بالإنجليزية *" : "Title (English) *"}
                </label>
                <input
                  type="text"
                  required
                  value={nodeTitleEn}
                  onChange={(e) => setNodeTitleEn(e.target.value)}
                  className="field-control w-full text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-200">
                {isAr ? "الوصف بالعربية" : "Description (Arabic)"}
              </label>
              <textarea
                rows={2}
                value={nodeDescAr}
                onChange={(e) => setNodeDescAr(e.target.value)}
                className="field-control w-full text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-200">
                  {isAr ? "المدة (أيام) *" : "Duration Days *"}
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={nodeDuration}
                  onChange={(e) => setNodeDuration(Number(e.target.value))}
                  className="field-control w-full text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-200">
                  {isAr ? "طلبات عامة *" : "Req. Apps *"}
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={reqApps}
                  onChange={(e) => setReqApps(Number(e.target.value))}
                  className="field-control w-full text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-200">
                  {isAr ? "طلبات مخصصة" : "Tailored Apps"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={reqTailored}
                  onChange={(e) => setReqTailored(Number(e.target.value))}
                  className="field-control w-full text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-200">
                  {isAr ? "منشورات LinkedIn" : "LinkedIn Posts"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={reqPosts}
                  onChange={(e) => setReqPosts(Number(e.target.value))}
                  className="field-control w-full text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-200">
                  {isAr ? "المحطة التالية (Next Node Code)" : "Next Node Code"}
                </label>
                <input
                  type="text"
                  value={nextNode}
                  onChange={(e) => setNextNode(e.target.value)}
                  placeholder="e.g. W1_M2"
                  className="field-control w-full text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-200">
                  {isAr ? "كود إرشاد الحبكة المربوط" : "Unlocks Insight Code"}
                </label>
                <select
                  value={unlocksInsight}
                  onChange={(e) => setUnlocksInsight(e.target.value)}
                  className="field-control w-full text-xs"
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

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingNode(null)}
                className="button-secondary px-3 py-1.5 text-xs"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={savingNode}
                className="button-primary px-4 py-1.5 text-xs font-bold disabled:opacity-40"
              >
                {savingNode ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ التعديلات" : "Save Changes")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Plot Guidance Form Dialog */}
      {guidanceFormOpen && (
        <GuidanceFormDialog
          post={editingGuidance}
          onClose={() => {
            setGuidanceFormOpen(false);
            setEditingGuidance(null);
          }}
          onSaved={(msg) => {
            setGuidanceFormOpen(false);
            setEditingGuidance(null);
            toast.success(t(`professionalDevelopment.${msg}`));
            loadGuidance();
          }}
        />
      )}
    </div>
  );
}

