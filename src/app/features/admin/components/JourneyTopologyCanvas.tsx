import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  type AdminGroup,
  type AdminMember,
  type JourneyNodeItem,
  type PlotGuidanceItem,
} from "../api/adminApi";
import { useI18n } from "../../../i18n";
import {
  Compass,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  FlaskConical,
  Flag,
  User,
  Users,
  Layers,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  X,
  ChevronRight,
  Filter,
  Lock,
  Unlock,
  Copy,
  Check,
} from "lucide-react";

export interface JourneyTopologyCanvasProps {
  nodes: JourneyNodeItem[];
  plotGuidances: PlotGuidanceItem[];
  members: AdminMember[];
  groups: AdminGroup[];
  highlightNodeCode?: string | null;
  onInspectMember: (memberId: string) => void;
  onSendFeedback: (member: AdminMember) => void;
}

interface CanvasNode {
  code: string;
  type: "GATE" | "CORE_QUEST" | "REVIEW_STATION" | "SATELLITE_GUIDANCE";
  week: number;
  order: number;
  titleAr: string;
  titleEn: string;
  x: number;
  y: number;
  width: number;
  height: number;
  durationDays: number;
  requiredApps: number;
  requiredTailored?: number;
  requiredPosts?: number;
  requiredOutreach?: number;
  unlocksInsightCode?: string | null;
  parentCode?: string;
  guidanceReadsCount?: number;
  guidanceUnlockedCount?: number;
  guidancePromptTemplate?: string;
  guidanceContent?: string;
}

// Symmetrical 4-column coordinate layout for the 30-day journey
// Width fits within ~1440px preventing runaway horizontal overflow
const NODE_COORDINATES: Record<string, { x: number; y: number; week: number }> = {
  // Row 1: Week 0 & Early Week 1
  ONBOARDING: { x: 80, y: 160, week: 0 },
  TASK_0: { x: 420, y: 160, week: 0 },
  W1_M1: { x: 760, y: 160, week: 1 },
  W1_M2: { x: 1100, y: 160, week: 1 },

  // Row 2: Late Week 1 & Review Station
  W1_M3: { x: 80, y: 440, week: 1 },
  W1_M4: { x: 420, y: 440, week: 1 },
  W1_M5: { x: 760, y: 440, week: 1 },
  W1_REVIEW: { x: 1100, y: 440, week: 1 },

  // Row 3: Week 2 Customization
  W2_M1: { x: 80, y: 720, week: 2 },
  W2_M2: { x: 420, y: 720, week: 2 },
  W2_M3: { x: 760, y: 720, week: 2 },
  W2_M4: { x: 1100, y: 720, week: 2 },

  // Row 4: Late Week 2 & Early Week 3
  W2_M5: { x: 80, y: 1000, week: 2 },
  W2_REVIEW: { x: 420, y: 1000, week: 2 },
  W3_M1: { x: 760, y: 1000, week: 3 },
  W3_M2: { x: 1100, y: 1000, week: 3 },

  // Row 5: Week 3 Time Management & Networking
  W3_M3: { x: 80, y: 1280, week: 3 },
  W3_M4: { x: 420, y: 1280, week: 3 },
  W3_M5: { x: 760, y: 1280, week: 3 },
  W3_REVIEW: { x: 1100, y: 1280, week: 3 },

  // Row 6: Week 4 Career Planning & Outreach
  W4_M1: { x: 80, y: 1560, week: 4 },
  W4_M2: { x: 420, y: 1560, week: 4 },
  W4_M3: { x: 760, y: 1560, week: 4 },
  W4_M4: { x: 1100, y: 1560, week: 4 },

  // Row 7: Graduation & Final Report
  W4_M5: { x: 420, y: 1840, week: 4 },
  FINAL_REPORT: { x: 760, y: 1840, week: 4 },
};

export function JourneyTopologyCanvas({
  nodes,
  plotGuidances,
  members,
  groups,
  highlightNodeCode,
  onInspectMember,
  onSendFeedback,
}: JourneyTopologyCanvasProps) {
  const { locale, number } = useI18n();
  const isAr = locale === "ar";

  // Filter Bar state
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string>("ALL");
  const [tracedMemberId, setTracedMemberId] = useState<string>("");
  const [searchMemberQuery, setSearchMemberQuery] = useState("");
  const [isMemberSearchOpen, setIsMemberSearchOpen] = useState(false);

  // SVG Pan & Zoom state (tuned for balanced 4-column overview)
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [zoom, setZoom] = useState(0.82);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Canvas Zoom Lock & Scroll Hijacking Prevention
  const [isZoomLocked, setIsZoomLocked] = useState(false);
  const [zoomHint, setZoomHint] = useState<string | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Selected Node Drawer & Satellite Drawer
  const [selectedNodeCode, setSelectedNodeCode] = useState<string | null>(null);
  const [selectedGuidance, setSelectedGuidance] = useState<CanvasNode | null>(null);
  const [hasCopiedPrompt, setHasCopiedPrompt] = useState(false);

  // Sync external highlight
  useEffect(() => {
    if (highlightNodeCode) {
      setSelectedNodeCode(highlightNodeCode);
      const coord = NODE_COORDINATES[highlightNodeCode];
      if (coord) {
        setPan({
          x: Math.round(-coord.x * zoom + 500),
          y: Math.round(-coord.y * zoom + 300),
        });
      }
    }
  }, [highlightNodeCode, zoom]);

  // Filtered members according to scope
  const scopedMembers = useMemo(() => {
    return members.filter((m) => {
      if (selectedGroupIds.length > 0 && (!m.group?.id || !selectedGroupIds.includes(m.group.id))) {
        return false;
      }
      if (selectedVariant !== "ALL" && m.uxVariant !== selectedVariant) {
        return false;
      }
      return true;
    });
  }, [members, selectedGroupIds, selectedVariant]);

  // Traced member object
  const tracedMember = useMemo(() => {
    if (!tracedMemberId) return null;
    return members.find((m) => m.id === tracedMemberId) || null;
  }, [members, tracedMemberId]);

  // Member location aggregation across nodes
  const memberLocations = useMemo(() => {
    const map: Record<string, AdminMember[]> = {};
    for (const m of scopedMembers) {
      let nodeCode = "TASK_0";
      if (!m.profileComplete) {
        nodeCode = "ONBOARDING";
      } else if (m.journey?.nodeCode) {
        nodeCode = m.journey.nodeCode;
      }
      if (!map[nodeCode]) map[nodeCode] = [];
      map[nodeCode].push(m);
    }
    return map;
  }, [scopedMembers]);

  // Detect bottleneck node
  const bottleneckCode = useMemo(() => {
    let maxCount = -1;
    let bCode = "TASK_0";
    for (const [code, stationedMembers] of Object.entries(memberLocations)) {
      if (stationedMembers.length > maxCount) {
        maxCount = stationedMembers.length;
        bCode = code;
      }
    }
    return bCode;
  }, [memberLocations]);

  // Build full canvas node list with exact geometry
  const canvasNodes = useMemo<CanvasNode[]>(() => {
    const list: CanvasNode[] = [];

    // 1. Onboarding Gate Node
    list.push({
      code: "ONBOARDING",
      type: "GATE",
      week: 0,
      order: 0,
      titleAr: "بوابة التهيئة الأولى ورفع السيرة الذاتية",
      titleEn: "Onboarding Gate & Base CV",
      x: NODE_COORDINATES.ONBOARDING.x,
      y: NODE_COORDINATES.ONBOARDING.y,
      width: 270,
      height: 136,
      durationDays: 1,
      requiredApps: 0,
    });

    // 2. Journey Nodes from DB
    for (const n of nodes) {
      const coord = NODE_COORDINATES[n.code];
      const isReview = n.code.includes("REVIEW") || n.nodeType === "REVIEW_STATION";

      list.push({
        code: n.code,
        type: isReview ? "REVIEW_STATION" : "CORE_QUEST",
        week: n.weekNumber,
        order: n.orderIndex,
        titleAr: n.titleAr,
        titleEn: n.titleEn,
        x: coord ? coord.x : 350 + (n.orderIndex % 7) * 280,
        y: coord ? coord.y : 220 + Math.floor(n.orderIndex / 7) * 340,
        width: 270,
        height: 136,
        durationDays: n.durationDays || 1,
        requiredApps: n.requiredAppsCount || 0,
        requiredTailored: n.requiredTailoredCount || 0,
        requiredPosts: n.requiredPostsCount || 0,
        requiredOutreach: n.requiredOutreachCount || 0,
        unlocksInsightCode: n.unlocksInsightCode,
      });
    }

    // Default TASK_0 if not returned by API
    if (!list.some((n) => n.code === "TASK_0")) {
      list.push({
        code: "TASK_0",
        type: "CORE_QUEST",
        week: 0,
        order: 1,
        titleAr: "المهمة صفر: انطلاقة التقديم الفعلي",
        titleEn: "Task 0: Kickstart Real Applications",
        x: NODE_COORDINATES.TASK_0.x,
        y: NODE_COORDINATES.TASK_0.y,
        width: 270,
        height: 136,
        durationDays: 1,
        requiredApps: 5,
        unlocksInsightCode: "INSIGHT_TASK_0_CV_BASE",
      });
    }

    // 3. Plot Guidance Satellite Nodes - Connected cleanly via trigger code
    for (const pg of plotGuidances) {
      const trigger = pg.unlockTriggerCode;
      const parent = list.find(
        (n) =>
          n.unlocksInsightCode === trigger ||
          n.code === trigger ||
          (n.code === "TASK_0" && trigger?.includes("TASK_0")) ||
          (n.code === "W1_REVIEW" && trigger?.includes("W1_TAILORED")) ||
          (n.code === "W1_M2" && trigger?.includes("W1_INTERVIEW")) ||
          (n.code === "W2_M2" && trigger?.includes("W2_CUSTOM")) ||
          (n.code === "W2_REVIEW" && trigger?.includes("W2_CONTENT")) ||
          (n.code === "W3_M2" && trigger?.includes("W3_TIME")) ||
          (n.code === "W3_REVIEW" && trigger?.includes("W3_NETWORKING")) ||
          (n.code === "W4_M2" && trigger?.includes("W4_SELF"))
      );

      if (parent) {
        list.push({
          code: `GUIDANCE_${pg.code || pg.id}`,
          type: "SATELLITE_GUIDANCE",
          week: parent.week,
          order: 99,
          titleAr: pg.titleAr || pg.title,
          titleEn: pg.titleEn || pg.title,
          x: parent.x - 25,
          y: parent.y - 70,
          width: 320,
          height: 54,
          durationDays: 0,
          requiredApps: 0,
          parentCode: parent.code,
          guidanceReadsCount: pg.readsCount || 0,
          guidanceUnlockedCount: pg.unlockedCount || 0,
          guidancePromptTemplate: pg.promptTemplateAr || pg.promptTemplate || "",
          guidanceContent: pg.content || pg.summaryAr || "",
        });
      }
    }

    return list;
  }, [nodes, plotGuidances]);

  // Edges connecting sequential core journey nodes
  const journeyEdges = useMemo(() => {
    const edges: Array<{ from: CanvasNode; to: CanvasNode; isLoop?: boolean }> = [];
    const coreNodes = canvasNodes
      .filter((n) => n.type !== "SATELLITE_GUIDANCE")
      .sort((a, b) => {
        if (a.week !== b.week) return a.week - b.week;
        return a.order - b.order;
      });

    for (let i = 0; i < coreNodes.length - 1; i++) {
      const from = coreNodes[i];
      const to = coreNodes[i + 1];
      const isLoop = from.week !== to.week;
      edges.push({ from, to, isLoop });
    }
    return edges;
  }, [canvasNodes]);

  // Pan & Zoom Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".prevent-canvas-drag")) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel zoom with Scroll Hijacking Fix
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || isZoomLocked) {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom((prev) => Math.min(1.8, Math.max(0.35, prev + zoomDelta)));
    } else {
      // Do not preventDefault, allow page to scroll naturally!
      setZoomHint(
        isAr
          ? "💡 اضغط Ctrl + عجلة الماوس للتكبير، أو فعّل قفل الزووم 🔒"
          : "💡 Hold Ctrl + scroll to zoom, or toggle Zoom Lock 🔒"
      );
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = setTimeout(() => setZoomHint(null), 2500);
    }
  };

  const fitToScreen = () => {
    setPan({ x: 40, y: 30 });
    setZoom(0.64);
  };

  const resetView = () => {
    setPan({ x: 30, y: 20 });
    setZoom(0.72);
  };

  // Copy prompt action
  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopiedPrompt(true);
    setTimeout(() => setHasCopiedPrompt(false), 2000);
  };

  const activeDrawerNode = useMemo(() => {
    if (!selectedNodeCode) return null;
    return canvasNodes.find((n) => n.code === selectedNodeCode) || null;
  }, [selectedNodeCode, canvasNodes]);

  const activeDrawerMembers = useMemo(() => {
    if (!selectedNodeCode) return [];
    return memberLocations[selectedNodeCode] || [];
  }, [selectedNodeCode, memberLocations]);

  return (
    <div className="relative flex flex-col space-y-3">
      {/* 1. MULTI-SCOPE FILTER & TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface p-3 shadow-sm dark:bg-surface-elevated">
        <div className="flex flex-wrap items-center gap-2">
          {/* All Members Scope */}
          <button
            type="button"
            onClick={() => {
              setSelectedGroupIds([]);
              setSelectedVariant("ALL");
              setTracedMemberId("");
            }}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-xs ${
              selectedGroupIds.length === 0 && selectedVariant === "ALL" && !tracedMemberId
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "border border-border-subtle bg-surface text-neutral-700 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-300"
            }`}
          >
            {isAr ? "جميع الباحثين" : "All Members"} ({members.length})
          </button>

          {/* Group Cohort Pills */}
          {groups.map((group) => {
            const isSelected = selectedGroupIds.includes(group.id);
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => {
                  setSelectedGroupIds(
                    isSelected
                      ? selectedGroupIds.filter((id) => id !== group.id)
                      : [...selectedGroupIds, group.id]
                  );
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-xs ${
                  isSelected
                    ? "bg-brand-primary text-white"
                    : "border border-border-subtle bg-surface text-neutral-700 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-300"
                }`}
              >
                {group.name} ({group.memberCount})
              </button>
            );
          })}

          {/* Variant Selector */}
          <div className="flex items-center gap-1.5 border-s border-border-subtle ps-2">
            <span className="text-xs font-semibold text-neutral-500">{isAr ? "النسخة:" : "Var:"}</span>
            <select
              value={selectedVariant}
              onChange={(e) => setSelectedVariant(e.target.value)}
              className="rounded-xl border border-border-subtle bg-surface px-2.5 py-1 text-xs font-bold text-neutral-900 shadow-xs dark:bg-surface-elevated dark:text-neutral-100"
            >
              <option value="ALL">{isAr ? "الكل (A/B/C)" : "All (A/B/C)"}</option>
              <option value="A">نسخة A</option>
              <option value="B">نسخة B</option>
              <option value="C">نسخة C</option>
            </select>
          </div>

          {/* Single-User Path Tracer */}
          <div className="relative border-s border-border-subtle ps-2">
            <button
              type="button"
              onClick={() => setIsMemberSearchOpen(!isMemberSearchOpen)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-xs ${
                tracedMemberId
                  ? "border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                  : "border-border-subtle bg-surface text-neutral-700 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-300"
              }`}
            >
              <User className="h-3.5 w-3.5 text-sky-500" />
              <span>
                {tracedMember
                  ? isAr ? `تتبع: ${tracedMember.name}` : `Tracing: ${tracedMember.name}`
                  : isAr ? "تتبع مسار عضو محدد 👤" : "Trace Member 👤"}
              </span>
            </button>

            {isMemberSearchOpen && (
              <div className="absolute top-10 right-0 z-50 w-72 rounded-2xl border border-border-subtle bg-surface p-2 shadow-xl dark:bg-surface-elevated">
                <div className="relative">
                  <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    value={searchMemberQuery}
                    onChange={(e) => setSearchMemberQuery(e.target.value)}
                    placeholder={isAr ? "ابحث باسم العضو..." : "Search member..."}
                    className="w-full rounded-xl border border-border-subtle bg-surface py-1.5 pr-8 pl-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none dark:bg-surface-elevated dark:text-neutral-100"
                    autoFocus
                  />
                </div>

                <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                  {members
                    .filter((m) =>
                      m.name.toLowerCase().includes(searchMemberQuery.toLowerCase())
                    )
                    .slice(0, 10)
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setTracedMemberId(m.id);
                          setIsMemberSearchOpen(false);
                          const nodeCode = !m.profileComplete ? "ONBOARDING" : (m.journey?.nodeCode || "TASK_0");
                          const coord = NODE_COORDINATES[nodeCode];
                          if (coord) {
                            setPan({
                              x: Math.round(-coord.x * zoom + 500),
                              y: Math.round(-coord.y * zoom + 300),
                            });
                          }
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-start text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <span className="font-bold text-neutral-900 dark:text-neutral-100">{m.name}</span>
                        <span className="text-[10px] text-neutral-400">
                          {m.journey?.nodeCode || "TASK_0"}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Canvas Controls: Zoom Lock Toggle + Fit to screen + Zoom In/Out */}
        <div className="flex items-center gap-1.5">
          {/* Zoom Lock Button */}
          <button
            type="button"
            onClick={() => setIsZoomLocked(!isZoomLocked)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all shadow-xs ${
              isZoomLocked
                ? "border-amber-400 bg-amber-500 text-white shadow-sm"
                : "border-border-subtle bg-surface text-neutral-700 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-300"
            }`}
            title={
              isAr
                ? "قفل الزووم: يتيح التكبير والتصغير المباشر بعجلة الماوس دون الضغط على Ctrl"
                : "Zoom Lock: Toggle direct wheel zooming without holding Ctrl"
            }
          >
            {isZoomLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            <span>{isZoomLocked ? (isAr ? "قفل الزووم: مفعّل 🔒" : "Zoom Lock: ON") : (isAr ? "قفل الزووم: معطّل 🔓" : "Zoom Lock: OFF")}</span>
          </button>

          <button
            type="button"
            onClick={fitToScreen}
            className="flex items-center gap-1 rounded-xl border border-border-subtle bg-surface px-2.5 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-300 shadow-xs"
            title={isAr ? "احتواء كامل الخريطة في الشاشة" : "Fit to Screen"}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isAr ? "احتواء" : "Fit"}</span>
          </button>

          <button
            type="button"
            onClick={() => setZoom((prev) => Math.min(1.8, prev + 0.1))}
            className="rounded-xl border border-border-subtle bg-surface p-1.5 text-neutral-700 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-300 shadow-xs"
            title="Zoom In (+)"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(0.35, prev - 0.1))}
            className="rounded-xl border border-border-subtle bg-surface p-1.5 text-neutral-700 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-300 shadow-xs"
            title="Zoom Out (-)"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={resetView}
            className="rounded-xl border border-border-subtle bg-surface p-1.5 text-neutral-700 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-300 shadow-xs"
            title="Reset Pan & Zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. MAIN OBSERVE SECTION: TOPOLOGY CANVAS (8-9 cols) + LIVE INSPECTOR PANEL (3-4 cols) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* CANVAS VIEWPORT CONTAINER */}
        <div className="lg:col-span-8 2xl:col-span-9">
          <div
            dir="ltr"
            className="relative h-[720px] w-full overflow-hidden rounded-2xl border border-neutral-800 bg-[#090d16] shadow-inner select-none cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setIsDragging(false)}
            onWheel={handleWheel}
          >
            {/* Floating Zoom Hint Toast */}
            {zoomHint && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 rounded-full border border-neutral-700 bg-neutral-900/90 px-4 py-2 text-xs font-bold text-neutral-100 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 pointer-events-none">
                {zoomHint}
              </div>
            )}

            {/* Background Grid Pattern */}
            <svg className="absolute inset-0 h-full w-full pointer-events-none">
              <defs>
                <pattern id="topology-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                  <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                  <circle cx="24" cy="24" r="1" fill="rgba(255,255,255,0.08)" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#topology-grid)" />
            </svg>

            {/* Main Canvas World */}
            <svg
              className="absolute inset-0 h-full w-full"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
                transition: isDragging ? "none" : "transform 0.1s ease-out",
              }}
            >
              {/* Week Track Labels */}
              <g opacity="0.6">
                <text x="80" y="80" fill="#94a3b8" fontSize="18" fontWeight="bold">
                  {isAr ? "الأسبوع 0 والأسبوع 1: التهيئة وبناء زخم التقديم الأساسي" : "Week 0 & 1: Onboarding & Momentum"}
                </text>
                <text x="80" y="660" fill="#94a3b8" fontSize="18" fontWeight="bold">
                  {isAr ? "الأسبوع 2: بداية التقديم المخصص وتعديل السيرة الذاتية" : "Week 2: Tailored Submissions"}
                </text>
                <text x="80" y="1220" fill="#94a3b8" fontSize="18" fontWeight="bold">
                  {isAr ? "الأسبوع 3: الحضور الرقمي والمحتوى المهني المستمر" : "Week 3: Digital Presence & Visibility"}
                </text>
                <text x="80" y="1500" fill="#94a3b8" fontSize="18" fontWeight="bold">
                  {isAr ? "الأسبوع 4: التوسع وشبكة العلاقات والتقرير النهائي" : "Week 4: Outreach & Graduation"}
                </text>
              </g>

          {/* EDGES: Cubic Bezier Curves between sequential nodes */}
          {journeyEdges.map(({ from, to, isLoop }, idx) => {
            const startX = from.x + from.width;
            const startY = from.y + from.height / 2;
            const endX = to.x;
            const endY = to.y + to.height / 2;

            let pathD = "";
            if (isLoop) {
              // Smooth S-Curve wrap around to the next track
              const controlX1 = startX + 140;
              const controlY1 = startY + 60;
              const controlX2 = endX - 140;
              const controlY2 = endY - 60;
              pathD = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;
            } else {
              const dx = endX - startX;
              pathD = `M ${startX} ${startY} C ${startX + dx * 0.45} ${startY}, ${endX - dx * 0.45} ${endY}, ${endX} ${endY}`;
            }

            return (
              <g key={`edge-${idx}`}>
                {/* Background Shadow edge */}
                <path d={pathD} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round" />
                {/* Core edge */}
                <path d={pathD} fill="none" stroke="rgba(56,189,248,0.3)" strokeWidth="2.5" strokeLinecap="round" />
                {/* Animated active dash flow */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                  className="active-flow-path"
                />
              </g>
            );
          })}

          {/* SATELLITE CONNECTORS: Arched Golden Dashed Line connecting parent to guidance */}
          {canvasNodes
            .filter((n) => n.type === "SATELLITE_GUIDANCE" && n.parentCode)
            .map((sat) => {
              const parent = canvasNodes.find((p) => p.code === sat.parentCode);
              if (!parent) return null;
              const startX = parent.x + parent.width / 2;
              const startY = parent.y;
              const endX = sat.x + sat.width / 2;
              const endY = sat.y + sat.height;
              const pathD = `M ${startX} ${startY} C ${startX} ${startY - 20}, ${endX} ${endY + 20}, ${endX} ${endY}`;

              return (
                <g key={`sat-link-${sat.code}`}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className="opacity-80"
                  />
                  <circle cx={startX} cy={startY} r="3" fill="#f59e0b" />
                  <circle cx={endX} cy={endY} r="3" fill="#f59e0b" />
                </g>
              );
            })}

          {/* NODES: Rendered using foreignObject HTML Cards for full Arabic text wrapping */}
          {canvasNodes.map((node) => {
            const stationedMembers = memberLocations[node.code] || [];
            const count = stationedMembers.length;
            const isBottleneck = node.code === bottleneckCode;
            const isSelected = selectedNodeCode === node.code;
            const isTracedUserHere =
              tracedMember &&
              ((!tracedMember.profileComplete && node.code === "ONBOARDING") ||
                (tracedMember.profileComplete && tracedMember.journey?.nodeCode === node.code));

            // SATELLITE GUIDANCE NODE
            if (node.type === "SATELLITE_GUIDANCE") {
              return (
                <foreignObject
                  key={node.code}
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  className="overflow-visible prevent-canvas-drag"
                >
                  <div
                    dir="rtl"
                    onClick={() => {
                      setSelectedGuidance(node);
                      setSelectedNodeCode(null);
                    }}
                    className="group relative flex h-full w-full items-center justify-between rounded-xl border border-amber-500/80 bg-neutral-900/95 px-3 py-1.5 text-amber-200 shadow-xl backdrop-blur-md cursor-pointer transition-all hover:scale-102 hover:border-amber-300 hover:shadow-amber-500/25"
                    title={isAr ? "انقر لعرض تفاصيل الإرشاد ومن قرأه" : "View guidance details"}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm shrink-0">✨</span>
                      <span className="text-[11px] font-bold text-amber-100 leading-snug line-clamp-2">
                        {isAr ? node.titleAr : node.titleEn}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-amber-300 shrink-0 ml-1.5 bg-amber-950/70 border border-amber-700/50 px-2 py-0.5 rounded-full">
                      {isAr
                        ? `${node.guidanceUnlockedCount ?? 0} فُتح · ${node.guidanceReadsCount ?? 0} قرأ`
                        : `${node.guidanceUnlockedCount ?? 0} unlocked · ${node.guidanceReadsCount ?? 0} read`}
                    </span>
                  </div>
                </foreignObject>
              );
            }

            // CORE & GATE & REVIEW NODES (Full Cards with Text Wrapping)
            return (
              <foreignObject
                key={node.code}
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                className="overflow-visible prevent-canvas-drag"
              >
                <div
                  dir="rtl"
                  onClick={() => setSelectedNodeCode(node.code)}
                  className={`group relative h-full w-full rounded-2xl border p-3 cursor-pointer select-none transition-all duration-200 shadow-md ${
                    isBottleneck
                      ? "border-rose-400 bg-linear-to-b from-rose-950/80 to-[#121624] ring-2 ring-rose-500/60 shadow-rose-950/60"
                      : isSelected
                      ? "border-sky-400 bg-linear-to-b from-sky-950/70 to-[#121624] ring-2 ring-sky-400/60 shadow-sky-950/60"
                      : isTracedUserHere
                      ? "border-emerald-400 bg-linear-to-b from-emerald-950/70 to-[#121624] ring-2 ring-emerald-400/60 shadow-emerald-950/60"
                      : node.type === "REVIEW_STATION"
                      ? "border-indigo-500/60 bg-linear-to-b from-indigo-950/40 to-[#121624] hover:border-indigo-400"
                      : "border-neutral-700/80 bg-[#151b2b] hover:border-neutral-500 hover:bg-[#1a2236]"
                  }`}
                >
                  {/* Card Header: Node Code + Week + Bottleneck Badge */}
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono font-bold text-neutral-200">
                        {node.code}
                      </span>
                      {node.week > 0 && (
                        <span className="text-[10px] text-neutral-400 font-medium">
                          {isAr ? `أسبوع ${node.week}` : `W${node.week}`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {isBottleneck && (
                        <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.2 text-[9px] font-bold text-rose-300 animate-pulse">
                          ⚠️ {isAr ? "نقطة توقف" : "Bottleneck"}
                        </span>
                      )}
                      <span className="rounded bg-neutral-800 px-1.5 py-0.2 text-[9px] text-neutral-400">
                        {isAr ? `مدة: ${node.durationDays || 1} يوم` : `${node.durationDays || 1}d`}
                      </span>
                    </div>
                  </div>

                  {/* Title with Complete 2-Line Wrap - NO TRUNCATION! */}
                  <div className="mt-1.5 min-h-[34px] text-xs font-bold text-neutral-100 leading-snug line-clamp-2">
                    {isAr ? node.titleAr : node.titleEn}
                  </div>

                  {/* Requirements Badges */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {node.requiredApps > 0 && (
                      <span className="rounded bg-sky-950/80 border border-sky-800/60 px-1.5 py-0.2 text-[10px] font-semibold text-sky-300">
                        {node.requiredApps} {isAr ? "تقديمات" : "apps"}
                      </span>
                    )}
                    {(node.requiredTailored ?? 0) > 0 && (
                      <span className="rounded bg-purple-950/80 border border-purple-800/60 px-1.5 py-0.2 text-[10px] font-semibold text-purple-300">
                        {node.requiredTailored} {isAr ? "مخصصة" : "tailored"}
                      </span>
                    )}
                    {(node.requiredPosts ?? 0) > 0 && (
                      <span className="rounded bg-indigo-950/80 border border-indigo-800/60 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-300">
                        {node.requiredPosts} {isAr ? "منشور" : "post"}
                      </span>
                    )}
                    {(node.requiredOutreach ?? 0) > 0 && (
                      <span className="rounded bg-amber-950/80 border border-amber-800/60 px-1.5 py-0.2 text-[10px] font-semibold text-amber-300">
                        {node.requiredOutreach} {isAr ? "تواصل" : "outreach"}
                      </span>
                    )}
                  </div>

                  {/* Footer: Stationed Members Count */}
                  <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1 font-semibold">
                      {count > 0 ? (
                        <span className={isBottleneck ? "text-rose-400 font-bold" : "text-sky-300"}>
                          🛑 {count} {isAr ? "باحث هنا" : "stationed"}
                        </span>
                      ) : (
                        <span className="text-neutral-500 font-normal">
                          ✓ {isAr ? "لا يوجد باحثون" : "None here"}
                        </span>
                      )}
                    </div>

                    {isTracedUserHere && (
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300">
                        📍 {isAr ? "موقع العضو" : "User here"}
                      </span>
                    )}
                  </div>
                </div>
              </foreignObject>
            );
          })}
        </svg>
      </div>
    </div>

    {/* LIVE INSPECTOR PANEL (لوحة الفحص الجانبية) */}
    <div className="lg:col-span-4 2xl:col-span-3">
      <div className="flex h-[720px] flex-col rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm dark:bg-surface-elevated overflow-y-auto">
        <div className="border-b border-border-subtle pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <h3 className="text-xs font-bold text-neutral-950 dark:text-neutral-50">
              {isAr ? "لوحة الفحص اللحظية (Live Readout)" : "Live Inspector Readout"}
            </h3>
          </div>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {selectedNodeCode
              ? isAr ? "محطة مختارة" : "Node Selected"
              : selectedGuidance
              ? isAr ? "إرشاد مختار" : "Guidance Selected"
              : tracedMember
              ? isAr ? "باحث متتبع" : "User Traced"
              : isAr ? "مرصد عام" : "Global Rest Pose"}
          </span>
        </div>

        {/* Dynamic Content based on Selection */}
        <div className="mt-3 flex-1 space-y-4">
          {/* CASE 1: Node Selected */}
          {activeDrawerNode ? (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-neutral-200 px-2 py-0.5 font-mono text-xs font-bold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                  {activeDrawerNode.code}
                </span>
                {activeDrawerNode.code === bottleneckCode && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
                    ⚠️ {isAr ? "نقطة توقف حرجة" : "Bottleneck"}
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-neutral-950 dark:text-neutral-50 leading-snug">
                  {isAr ? activeDrawerNode.titleAr : activeDrawerNode.titleEn}
                </h4>
                <p className="mt-1 text-xs text-neutral-500">
                  {isAr ? `الأسبوع ${activeDrawerNode.week} • مدة المحطة المقدرة: ${activeDrawerNode.durationDays || 1} يوم` : `Week ${activeDrawerNode.week}`}
                </p>
              </div>

              {/* Station Requirements */}
              <div className="rounded-xl border border-border-subtle bg-neutral-50/70 p-3 dark:bg-neutral-900/50 space-y-1.5">
                <div className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                  {isAr ? "متطلبات اجتياز المحطة:" : "Station Requirements:"}
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="rounded-lg bg-surface p-1.5 border border-border-subtle dark:bg-surface-elevated">
                    <span className="text-neutral-500">{isAr ? "تقديمات:" : "Apps:"} </span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{activeDrawerNode.requiredApps}</span>
                  </div>
                  <div className="rounded-lg bg-surface p-1.5 border border-border-subtle dark:bg-surface-elevated">
                    <span className="text-neutral-500">{isAr ? "مخصصة:" : "Tailored:"} </span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{activeDrawerNode.requiredTailored ?? 0}</span>
                  </div>
                  <div className="rounded-lg bg-surface p-1.5 border border-border-subtle dark:bg-surface-elevated">
                    <span className="text-neutral-500">{isAr ? "منشورات:" : "Posts:"} </span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{activeDrawerNode.requiredPosts ?? 0}</span>
                  </div>
                  <div className="rounded-lg bg-surface p-1.5 border border-border-subtle dark:bg-surface-elevated">
                    <span className="text-neutral-500">{isAr ? "تواصل:" : "Outreach:"} </span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{activeDrawerNode.requiredOutreach ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Stationed Members List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  <span>{isAr ? "الباحثون المتواجدون بالمحطة:" : "Stationed Members:"}</span>
                  <span className="rounded-full bg-neutral-200 px-1.5 py-0.2 text-[10px] dark:bg-neutral-800">
                    {activeDrawerMembers.length}
                  </span>
                </div>

                {activeDrawerMembers.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border-subtle p-3 text-center text-xs text-neutral-500">
                    {isAr ? "لا يوجد باحثون متوقفون هنا حالياً." : "No members stationed here."}
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {activeDrawerMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface p-2 shadow-2xs dark:bg-surface-elevated"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                            {m.name}
                          </div>
                          <div className="text-[10px] text-neutral-500">
                            {m.applicationsCount || 0} {isAr ? "تقديمات" : "apps"}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onInspectMember(m.id)}
                            className="rounded-lg bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-300"
                          >
                            360°
                          </button>
                          <button
                            type="button"
                            onClick={() => onSendFeedback(m)}
                            className="rounded-lg bg-neutral-900 px-2 py-1 text-[10px] font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
                          >
                            {isAr ? "توجيه" : "Guide"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : selectedGuidance ? (
            /* CASE 2: Guidance Selected */
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>{isAr ? "كبسولة إرشاد حبكة ذكية" : "Plot Guidance Insight"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedGuidance(null)}
                  className="text-xs text-neutral-400 hover:text-neutral-600"
                >
                  ✕
                </button>
              </div>

              <div>
                <h4 className="text-sm font-bold text-neutral-950 dark:text-neutral-50 leading-snug">
                  {isAr ? selectedGuidance.titleAr : selectedGuidance.titleEn}
                </h4>
                <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                  <span>{isAr ? `فُتح لـ: ${selectedGuidance.guidanceUnlockedCount ?? 0}` : `Unlocked: ${selectedGuidance.guidanceUnlockedCount ?? 0}`}</span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {isAr ? `قرأه: ${selectedGuidance.guidanceReadsCount ?? 0}` : `Read: ${selectedGuidance.guidanceReadsCount ?? 0}`}
                  </span>
                </div>
              </div>

              {selectedGuidance.guidancePromptTemplate && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300">
                      {isAr ? "قالب البرومبت المقترح:" : "Suggested Prompt:"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(selectedGuidance.guidancePromptTemplate!)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:underline"
                    >
                      {hasCopiedPrompt ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{hasCopiedPrompt ? (isAr ? "تم النسخ" : "Copied") : (isAr ? "نسخ" : "Copy")}</span>
                    </button>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 font-mono text-[11px] text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200 max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {selectedGuidance.guidancePromptTemplate}
                  </div>
                </div>
              )}
            </div>
          ) : tracedMember ? (
            /* CASE 3: Traced Member */
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Compass className="h-3.5 w-3.5" />
                  <span>{isAr ? "تتبع باحث على المسار" : "Traced Member"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setTracedMemberId("")}
                  className="text-xs text-neutral-400 hover:text-neutral-600"
                >
                  ✕
                </button>
              </div>

              <div className="rounded-xl border border-border-subtle bg-neutral-50/50 p-3 dark:bg-neutral-900/40">
                <div className="text-sm font-bold text-neutral-950 dark:text-neutral-50">
                  {tracedMember.name}
                </div>
                <div className="text-xs text-neutral-500">{tracedMember.email}</div>
                <div className="mt-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  {isAr ? "المحطة الحالية: " : "Current Station: "}
                  <span className="font-bold text-brand-primary">
                    {tracedMember.journey?.nodeTitleAr || tracedMember.journey?.nodeCode || "TASK_0"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onInspectMember(tracedMember.id)}
                  className="flex-1 rounded-xl bg-sky-600 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-sky-700"
                >
                  {isAr ? "ملف 360°" : "360° Profile"}
                </button>
                <button
                  type="button"
                  onClick={() => onSendFeedback(tracedMember)}
                  className="flex-1 rounded-xl bg-neutral-900 py-1.5 text-xs font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
                >
                  {isAr ? "إرسال توجيه" : "Send Guidance"}
                </button>
              </div>
            </div>
          ) : (
            /* CASE 4: Resting State (Hairline Rule 05 & 10) */
            <div className="space-y-4 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
                <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{isAr ? "أكبر عنق زجاجة حالي على الخريطة" : "Primary Map Bottleneck"}</span>
                </div>
                <p className="mt-1 text-xs text-rose-950 dark:text-rose-100 font-bold">
                  {NODE_COORDINATES[bottleneckCode] ? (isAr ? "المهمة 0: صياغة الـ CV الأساسي (TASK_0)" : "Task 0: Base CV") : bottleneckCode}
                </p>
                <p className="mt-0.5 text-[11px] text-rose-700 dark:text-rose-400">
                  {isAr
                    ? `${memberLocations[bottleneckCode]?.length || 0} باحثين متوقفون عند هذه المحطة حالياً.`
                    : `${memberLocations[bottleneckCode]?.length || 0} members stalled here.`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNodeCode(bottleneckCode);
                    const coord = NODE_COORDINATES[bottleneckCode];
                    if (coord) {
                      setPan({
                        x: Math.round(-coord.x * zoom + 350),
                        y: Math.round(-coord.y * zoom + 260),
                      });
                    }
                  }}
                  className="mt-2.5 w-full rounded-lg bg-rose-600 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
                >
                  {isAr ? "🎯 تركيز الكاميرا على عنق الزجاجة" : "Focus Bottleneck 🎯"}
                </button>
              </div>

              <div className="space-y-2 border-t border-border-subtle pt-3">
                <div className="font-bold text-neutral-800 dark:text-neutral-200">
                  {isAr ? "دليل فحص مرصد الرحلة:" : "Map Navigation Guide:"}
                </div>
                <ul className="space-y-1.5 text-[11px] list-disc list-inside text-neutral-500">
                  <li>{isAr ? "انقر على أي محطة لفحص الباحثين ومتطلبات الإنجاز." : "Click any node to view stationed members."}</li>
                  <li>{isAr ? "انقر على كبسولات ✨ المعلقة لقراءة البرومبت الذكي." : "Click ✨ satellites to inspect prompts."}</li>
                  <li>{isAr ? "استخدم السحب بالماوس للتنقل بحرية عبر الأسابيع الأربعة." : "Drag canvas to navigate across 4 weeks."}</li>
                  <li>{isAr ? "التقريب يتطلب مفتاح Ctrl أو تفعيل زر قفل الماوس 🔒." : "Zoom requires Ctrl or Zoom Lock toggle."}</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>

      {/* 3. NODE DETAILS SLIDE-OVER DRAWER */}
      {activeDrawerNode && (
        <div className="fixed inset-y-0 end-0 z-50 w-full max-w-md border-s border-border-subtle bg-surface p-6 shadow-2xl dark:bg-surface-elevated animate-in slide-in-from-end duration-200 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-neutral-500">
                {activeDrawerNode.code}
              </span>
              {activeDrawerNode.code === bottleneckCode && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
                  ⚠️ {isAr ? "نقطة توقف حرجة" : "Primary Friction Node"}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedNodeCode(null)}
              className="rounded-lg p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-base font-bold text-neutral-950 dark:text-neutral-50">
                {isAr ? activeDrawerNode.titleAr : activeDrawerNode.titleEn}
              </h3>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                {isAr ? `الأسبوع ${activeDrawerNode.week} • مدة المحطة: ${activeDrawerNode.durationDays || 1} يوم` : `Week ${activeDrawerNode.week}`}
              </p>
            </div>

            {/* Stationed Members List */}
            <div className="rounded-xl border border-border-subtle bg-neutral-50/50 p-4 dark:bg-neutral-900/50">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {isAr ? "الباحثون المتواجدون في هذه المحطة:" : "Members at this Station:"}
                </span>
                <span className="text-xs font-semibold text-neutral-500">
                  {activeDrawerMembers.length} {isAr ? "باحث" : "users"}
                </span>
              </div>

              {activeDrawerMembers.length === 0 ? (
                <p className="py-4 text-center text-xs text-neutral-500">
                  {isAr ? "لا يوجد باحثون متوقفون عند هذه المحطة حالياً." : "No members stalled here."}
                </p>
              ) : (
                <div className="mt-3 divide-y divide-border-subtle">
                  {activeDrawerMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {m.name}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {m.group?.name ? `${m.group.name} • ` : ""}
                          {m.applicationsCount || 0} {isAr ? "تقديمات مسجلة" : "apps"}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setTracedMemberId(m.id);
                            setSelectedNodeCode(null);
                          }}
                          className="rounded-lg border border-border-subtle bg-surface px-2 py-1 text-[11px] font-bold text-neutral-700 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-neutral-200"
                        >
                          {isAr ? "تتبع 👤" : "Trace 👤"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onInspectMember(m.id)}
                          className="rounded-lg border border-border-subtle bg-surface px-2 py-1 text-[11px] font-bold text-sky-600 hover:bg-neutral-100 dark:bg-surface-elevated dark:text-sky-400"
                        >
                          {isAr ? "360°" : "360°"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onSendFeedback(m)}
                          className="rounded-lg bg-neutral-900 px-2 py-1 text-[11px] font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
                        >
                          {isAr ? "توجيه 💬" : "Guide 💬"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. PLOT GUIDANCE DETAIL SLIDE-OVER DRAWER */}
      {selectedGuidance && (
        <div className="fixed inset-y-0 end-0 z-50 w-full max-w-lg border-s border-border-subtle bg-surface p-6 shadow-2xl dark:bg-surface-elevated animate-in slide-in-from-end duration-200 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {isAr ? "إرشاد حبكة وبرومبت ذكي" : "Plot Guidance Insight"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedGuidance(null)}
              className="rounded-lg p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-base font-bold text-neutral-950 dark:text-neutral-50">
                {isAr ? selectedGuidance.titleAr : selectedGuidance.titleEn}
              </h3>
              <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                <span>{isAr ? `فُتح لـ: ${selectedGuidance.guidanceUnlockedCount ?? 0} باحث` : `Unlocked: ${selectedGuidance.guidanceUnlockedCount ?? 0}`}</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {isAr ? `قرأه وتفاعل معه: ${selectedGuidance.guidanceReadsCount ?? 0} باحث` : `Read: ${selectedGuidance.guidanceReadsCount ?? 0}`}
                </span>
              </div>
            </div>

            {/* Prompt Template Box with Copy Button */}
            {selectedGuidance.guidancePromptTemplate && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    {isAr ? "قالب البرومبت الذكي المقترح للباحث:" : "Smart Prompt Template:"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyPrompt(selectedGuidance.guidancePromptTemplate!)}
                    className="flex items-center gap-1 text-[11px] font-bold text-brand-primary hover:underline"
                  >
                    {hasCopiedPrompt ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{hasCopiedPrompt ? (isAr ? "تم النسخ!" : "Copied!") : (isAr ? "نسخ البرومبت" : "Copy")}</span>
                  </button>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs font-mono leading-relaxed text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200 max-h-56 overflow-y-auto whitespace-pre-wrap">
                  {selectedGuidance.guidancePromptTemplate}
                </div>
              </div>
            )}

            {/* Content Preview */}
            {selectedGuidance.guidanceContent && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  {isAr ? "ملخص الإرشاد المهني:" : "Guidance Summary:"}
                </span>
                <div
                  className="prose prose-sm dark:prose-invert rounded-xl border border-border-subtle bg-neutral-50 p-3 text-xs leading-relaxed dark:bg-neutral-900/60"
                  dangerouslySetInnerHTML={{ __html: selectedGuidance.guidanceContent }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
