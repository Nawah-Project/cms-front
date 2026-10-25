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
  requiredApps: number;
  triggerCode?: string;
  parentCode?: string;
  guidanceReadsCount?: number;
  guidanceUnlockedCount?: number;
}

// Fixed coordinate layout for 30-day journey
const NODE_COORDINATES: Record<string, { x: number; y: number; week: number }> = {
  ONBOARDING: { x: 100, y: 220, week: 0 },
  TASK_0: { x: 380, y: 220, week: 0 },
  W1_M1: { x: 670, y: 220, week: 1 },
  W1_M2: { x: 950, y: 220, week: 1 },
  W1_M3: { x: 1230, y: 220, week: 1 },
  W1_M4: { x: 1510, y: 220, week: 1 },
  W1_M5: { x: 1790, y: 220, week: 1 },
  W1_REVIEW: { x: 2070, y: 220, week: 1 },

  W2_M1: { x: 380, y: 560, week: 2 },
  W2_M2: { x: 670, y: 560, week: 2 },
  W2_M3: { x: 950, y: 560, week: 2 },
  W2_M4: { x: 1230, y: 560, week: 2 },
  W2_M5: { x: 1510, y: 560, week: 2 },
  W2_REVIEW: { x: 1800, y: 560, week: 2 },

  W3_M1: { x: 380, y: 900, week: 3 },
  W3_M2: { x: 670, y: 900, week: 3 },
  W3_M3: { x: 950, y: 900, week: 3 },
  W3_M4: { x: 1230, y: 900, week: 3 },
  W3_M5: { x: 1510, y: 900, week: 3 },
  W3_REVIEW: { x: 1800, y: 900, week: 3 },

  W4_M1: { x: 380, y: 1240, week: 4 },
  W4_M2: { x: 670, y: 1240, week: 4 },
  W4_M3: { x: 950, y: 1240, week: 4 },
  W4_M4: { x: 1230, y: 1240, week: 4 },
  W4_M5: { x: 1510, y: 1240, week: 4 },
  FINAL_REPORT: { x: 1800, y: 1240, week: 4 },
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

  // SVG Pan & Zoom state
  const [pan, setPan] = useState({ x: 30, y: 20 });
  const [zoom, setZoom] = useState(0.72);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Selected Node Drawer
  const [selectedNodeCode, setSelectedNodeCode] = useState<string | null>(null);

  // Auto-focus highlighted node if passed as prop
  useEffect(() => {
    if (highlightNodeCode) {
      setSelectedNodeCode(highlightNodeCode);
      const coords = NODE_COORDINATES[highlightNodeCode];
      if (coords) {
        setPan({
          x: Math.max(-1000, 400 - coords.x * zoom),
          y: Math.max(-800, 250 - coords.y * zoom),
        });
      }
    }
  }, [highlightNodeCode, zoom]);

  // Traced member object
  const tracedMember = useMemo(() => {
    if (!tracedMemberId) return null;
    return members.find((m) => m.id === tracedMemberId) || null;
  }, [tracedMemberId, members]);

  // Filtered members list based on current scope
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // 1. Group filter
      if (selectedGroupIds.length > 0) {
        const userGroupId = m.group?.id || "UNASSIGNED";
        if (!selectedGroupIds.includes(userGroupId)) return false;
      }
      // 2. Variant filter
      if (selectedVariant !== "ALL") {
        const uVariant = m.uxVariant || "B";
        if (uVariant !== selectedVariant) return false;
      }
      return true;
    });
  }, [members, selectedGroupIds, selectedVariant]);

  // Member search dropdown options
  const memberSearchMatches = useMemo(() => {
    if (!searchMemberQuery.trim()) return members.slice(0, 10);
    const q = searchMemberQuery.toLowerCase();
    return members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q),
      )
      .slice(0, 15);
  }, [members, searchMemberQuery]);

  // Map members to node locations
  const memberLocations = useMemo(() => {
    const map: Record<string, AdminMember[]> = {};
    for (const m of filteredMembers) {
      const code =
        m.journey?.nodeCode || (!m.profileComplete ? "ONBOARDING" : "TASK_0");
      if (!map[code]) map[code] = [];
      map[code].push(m);
    }
    return map;
  }, [filteredMembers]);

  // Build complete list of canvas nodes
  const canvasNodes = useMemo<CanvasNode[]>(() => {
    const list: CanvasNode[] = [];

    // 1. Onboarding Gate Node
    list.push({
      code: "ONBOARDING",
      type: "GATE",
      week: 0,
      order: -1,
      titleAr: "بوابة التهيئة والملف الشخصي",
      titleEn: "Onboarding & Profile Gate",
      x: NODE_COORDINATES.ONBOARDING.x,
      y: NODE_COORDINATES.ONBOARDING.y,
      width: 220,
      height: 94,
      requiredApps: 0,
    });

    // 2. Journey Nodes from DB
    for (const n of nodes) {
      const coords = NODE_COORDINATES[n.code];
      if (!coords) continue;
      const isReview =
        n.nodeType === "DAY_7_CHECKIN" ||
        n.nodeType === "FINAL_ASSESSMENT" ||
        n.code.includes("REVIEW") ||
        n.code.includes("FINAL");
      list.push({
        code: n.code,
        type: isReview ? "REVIEW_STATION" : "CORE_QUEST",
        week: coords.week,
        order: n.orderIndex,
        titleAr: n.titleAr,
        titleEn: n.titleEn,
        x: coords.x,
        y: coords.y,
        width: isReview ? 210 : 220,
        height: 96,
        requiredApps: n.requiredAppsCount,
      });
    }

    // Fallback Task 0 if missing from API
    if (!list.some((n) => n.code === "TASK_0")) {
      list.push({
        code: "TASK_0",
        type: "CORE_QUEST",
        week: 0,
        order: 0,
        titleAr: "المهمة صفر: انطلاقة التقديم الفعلي",
        titleEn: "Task 0: Initial Applications",
        x: NODE_COORDINATES.TASK_0.x,
        y: NODE_COORDINATES.TASK_0.y,
        width: 220,
        height: 96,
        requiredApps: 5,
      });
    }

    // 3. Plot Guidance Satellite Nodes
    for (const pg of plotGuidances) {
      const parent = list.find((n) => n.code === pg.unlockTriggerCode);
      if (parent) {
        list.push({
          code: `GUIDANCE_${pg.code}`,
          type: "SATELLITE_GUIDANCE",
          week: parent.week,
          order: 99,
          titleAr: pg.titleAr || pg.title,
          titleEn: pg.titleEn || pg.title,
          x: parent.x + 10,
          y: parent.y - 88,
          width: 200,
          height: 48,
          requiredApps: 0,
          parentCode: parent.code,
          guidanceReadsCount: pg.readsCount,
          guidanceUnlockedCount: pg.unlockedCount,
        });
      }
    }

    return list;
  }, [nodes, plotGuidances]);

  // Determine Primary Bottleneck for Heatmap Halo
  const bottleneckCode = useMemo(() => {
    let max = 0;
    let bCode = "";
    for (const [code, userList] of Object.entries(memberLocations)) {
      if (userList.length > max) {
        max = userList.length;
        bCode = code;
      }
    }
    return max >= 2 ? bCode : "";
  }, [memberLocations]);

  // Traced user progress check
  const isNodeCompletedByTracedUser = (nodeCode: string, nodeWeek: number, nodeOrder: number) => {
    if (!tracedMember) return false;
    if (nodeCode === "ONBOARDING") return Boolean(tracedMember.profileComplete);
    const userWeek = tracedMember.journey?.week ?? 0;
    const userCode = tracedMember.journey?.nodeCode;
    if (userCode === nodeCode) return false; // currently active
    if (userWeek > nodeWeek) return true;
    return false;
  };

  const isNodeActiveForTracedUser = (nodeCode: string) => {
    if (!tracedMember) return false;
    const userCode =
      tracedMember.journey?.nodeCode ||
      (!tracedMember.profileComplete ? "ONBOARDING" : "TASK_0");
    return userCode === nodeCode;
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest(".interactive-node")) {
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

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.min(1.8, Math.max(0.35, prev + zoomDelta)));
  };

  const fitToScreen = () => {
    setPan({ x: 40, y: 20 });
    setZoom(0.68);
  };

  const resetView = () => {
    setPan({ x: 30, y: 20 });
    setZoom(0.72);
  };

  // Currently selected node object
  const activeDrawerNode = useMemo(() => {
    if (!selectedNodeCode) return null;
    return canvasNodes.find((n) => n.code === selectedNodeCode) || null;
  }, [selectedNodeCode, canvasNodes]);

  const activeDrawerMembers = useMemo(() => {
    if (!selectedNodeCode) return [];
    return memberLocations[selectedNodeCode] || [];
  }, [selectedNodeCode, memberLocations]);

  // Edges connecting core journey nodes
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

  return (
    <div className="space-y-4">
      {/* 1. MULTI-SCOPE FILTER BAR */}
      <div className="rounded-2xl border border-neutral-200 bg-surface p-4 shadow-xs dark:border-neutral-800 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs">
              <Compass className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-neutral-950 dark:text-neutral-100">
                {isAr ? "مرصد تدفق الرحلة التفاعلي" : "Interactive Journey Topology Canvas"}
              </h3>
              <p className="text-xs text-neutral-500">
                {isAr
                  ? `مراقبة انتشار ${number(filteredMembers.length)} عضو عبر 25 محطة هندسية`
                  : `Observing ${number(filteredMembers.length)} members across 25 milestone nodes`}
              </p>
            </div>
          </div>

          {/* Quick Zoom & Reset Controls */}
          <div className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50/80 p-1 dark:border-neutral-700 dark:bg-neutral-800/80">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.8, z + 0.1))}
              className="rounded-lg p-1.5 text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
              title={isAr ? "تكبير (+)" : "Zoom In (+)"}
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.35, z - 0.1))}
              className="rounded-lg p-1.5 text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
              title={isAr ? "تصغير (-)" : "Zoom Out (-)"}
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-[11px] font-mono font-semibold px-1 text-neutral-600 dark:text-neutral-400">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={fitToScreen}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors flex items-center gap-1"
              title={isAr ? "احتواء في الشاشة" : "Fit to Screen"}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isAr ? "احتواء" : "Fit"}</span>
            </button>
            <button
              type="button"
              onClick={resetView}
              className="rounded-lg p-1.5 text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
              title={isAr ? "إعادة تعيين اللوحة" : "Reset Canvas"}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          {/* Cohort Multi-select Pills */}
          <div className="lg:col-span-5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 flex items-center gap-1 me-1">
              <Users className="h-3.5 w-3.5" />
              {isAr ? "المجموعات:" : "Cohorts:"}
            </span>
            <button
              type="button"
              onClick={() => setSelectedGroupIds([])}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                selectedGroupIds.length === 0
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                  : "border border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {isAr ? "كل الأعضاء" : "All Members"}
            </button>
            {groups.map((g) => {
              const active = selectedGroupIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setSelectedGroupIds((prev) =>
                      prev.includes(g.id)
                        ? prev.filter((id) => id !== g.id)
                        : [...prev, g.id],
                    );
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    active
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                      : "border border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setSelectedGroupIds((prev) =>
                  prev.includes("UNASSIGNED")
                    ? prev.filter((id) => id !== "UNASSIGNED")
                    : [...prev, "UNASSIGNED"],
                );
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                selectedGroupIds.includes("UNASSIGNED")
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                  : "border border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {isAr ? "غير المعينين" : "Unassigned"}
            </button>
          </div>

          {/* Variant Filter */}
          <div className="lg:col-span-3 flex items-center gap-1.5">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 flex items-center gap-1 me-1 shrink-0">
              <FlaskConical className="h-3.5 w-3.5" />
              {isAr ? "النسخة:" : "Variant:"}
            </span>
            <div className="flex rounded-lg border border-neutral-200 bg-neutral-100 p-0.5 dark:border-neutral-700 dark:bg-neutral-800">
              {[
                { id: "ALL", label: isAr ? "الكل" : "All" },
                { id: "A", label: "A" },
                { id: "B", label: "B" },
                { id: "C", label: "C" },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVariant(v.id)}
                  className={`rounded-md px-2 py-0.5 text-xs font-bold transition-colors ${
                    selectedVariant === v.id
                      ? "bg-white text-neutral-950 shadow-2xs dark:bg-neutral-900 dark:text-white"
                      : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Single-User Path Tracer */}
          <div className="lg:col-span-4 relative">
            <div className="relative">
              <User className="absolute top-2.5 start-3 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={
                  tracedMember
                    ? `${tracedMember.name} (${tracedMember.email || ""})`
                    : searchMemberQuery
                }
                onChange={(e) => {
                  setSearchMemberQuery(e.target.value);
                  if (tracedMemberId) setTracedMemberId("");
                  setIsMemberSearchOpen(true);
                }}
                onFocus={() => setIsMemberSearchOpen(true)}
                placeholder={isAr ? "تتبع مسار عضو محدد 👤..." : "Trace specific user path 👤..."}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 ps-9 pe-8 py-1.5 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              {tracedMemberId && (
                <button
                  type="button"
                  onClick={() => {
                    setTracedMemberId("");
                    setSearchMemberQuery("");
                  }}
                  className="absolute top-2 end-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Traced Member Dropdown */}
            {isMemberSearchOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsMemberSearchOpen(false)}
                />
                <div className="absolute top-full mt-1.5 start-0 end-0 z-40 max-h-56 overflow-y-auto rounded-xl border border-neutral-200 bg-surface p-1.5 shadow-xl dark:border-neutral-700">
                  {memberSearchMatches.length === 0 ? (
                    <div className="p-3 text-center text-xs text-neutral-400">
                      {isAr ? "لا يوجد أعضاء مطابقين" : "No matching members"}
                    </div>
                  ) : (
                    memberSearchMatches.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setTracedMemberId(m.id);
                          setIsMemberSearchOpen(false);
                          // Auto pan to user's active node
                          const uCode =
                            m.journey?.nodeCode ||
                            (!m.profileComplete ? "ONBOARDING" : "TASK_0");
                          const coords = NODE_COORDINATES[uCode];
                          if (coords) {
                            setPan({
                              x: Math.max(-1000, 450 - coords.x * zoom),
                              y: Math.max(-800, 280 - coords.y * zoom),
                            });
                          }
                        }}
                        className="w-full text-start flex items-center justify-between rounded-lg px-3 py-2 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-neutral-900 dark:text-neutral-100 truncate">
                            {m.name}
                          </p>
                          <p className="text-[10px] text-neutral-500 truncate">
                            {m.group?.name || (isAr ? "غير معين" : "Unassigned")} ·{" "}
                            {m.journey?.titleAr || (isAr ? "المهمة صفر" : "Task 0")}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {isAr ? "تتبع" : "Trace"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Traced User Active Mode Alert Pill */}
        {tracedMember && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50/80 p-2.5 text-xs dark:border-emerald-800 dark:bg-emerald-950/40 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white font-bold shrink-0">
                📍
              </span>
              <p className="text-neutral-900 dark:text-neutral-100 truncate">
                <span className="font-extrabold">{tracedMember.name}</span> —{" "}
                {isAr ? "يقف حالياً عند:" : "Currently stationed at:"}{" "}
                <span className="font-bold text-emerald-800 dark:text-emerald-300">
                  {tracedMember.journey?.titleAr ||
                    (!tracedMember.profileComplete
                      ? "بوابة التهيئة والـ CV"
                      : "المهمة صفر")}
                </span>{" "}
                ({isAr ? `منذ ${tracedMember.journey?.daysInNode ?? 0} يوم` : `${tracedMember.journey?.daysInNode ?? 0}d`})
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onInspectMember(tracedMember.id)}
                className="text-xs font-bold text-info-strong hover:underline"
              >
                {isAr ? "الملف 360°" : "360° Profile"}
              </button>
              <button
                type="button"
                onClick={() => setTracedMemberId("")}
                className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* VISUAL LEGEND */}
        <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-neutral-600 dark:text-neutral-400">
          <span className="font-bold text-neutral-800 dark:text-neutral-200">
            {isAr ? "دليل المجسمات:" : "Shape Legend:"}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 bg-neutral-900 dark:bg-neutral-100 rounded-sm rotate-45" />
            <span>{isAr ? "بوابة التهيئة (سداسية)" : "Onboarding Gate (Hexagon)"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-3 bg-neutral-200 dark:bg-neutral-700 border border-neutral-400 rounded-xs" />
            <span>{isAr ? "مهمة أساسية (بطاقة تقنية)" : "Core Task Node"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 border-2 border-indigo-600 dark:border-indigo-400 rounded-sm rotate-45" />
            <span>{isAr ? "محطة تقييم اليوم السابع (مثمن ماسي)" : "Day 7 Checkpoint"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 bg-amber-400 rounded-full" />
            <span>{isAr ? "إرشاد وبرومبت (كبسولة فرعية)" : "Plot Guidance Satellite"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-danger-strong font-semibold">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>{isAr ? "نقطة توقف (عنق زجاجة)" : "Bottleneck"}</span>
          </div>
        </div>
      </div>

      {/* 2. SVG TOPOLOGY CANVAS CONTAINER */}
      <div
        className="relative h-[680px] w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900 shadow-inner select-none cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Background Grid Pattern */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grid-pattern"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="20" cy="20" r="1" fill="rgba(255,255,255,0.12)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>

        {/* Active Flow Graph Layer */}
        <svg
          className="h-full w-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            transition: isDragging ? "none" : "transform 0.08s ease-out",
          }}
        >
          <defs>
            {/* Flow line animated dash */}
            <style>{`
              @keyframes dashFlow {
                to {
                  stroke-dashoffset: -32;
                }
              }
              .active-flow-path {
                animation: dashFlow 1.8s linear infinite;
              }
            `}</style>

            {/* Marker arrow definition */}
            <marker
              id="arrow-head"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon points="0 1, 7 4, 0 7" fill="#64748b" />
            </marker>
            <marker
              id="arrow-head-active"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
            >
              <polygon points="0 1, 7 4, 0 7" fill="#10b981" />
            </marker>
          </defs>

          {/* Track Labels in SVG */}
          <g opacity="0.45">
            <text x="80" y="140" fill="#94a3b8" fontSize="18" fontWeight="bold">
              {isAr ? "الأسبوع 0 والأسبوع 1: التهيئة وبناء الزخم الأساسي" : "Week 0 & 1: Onboarding & Momentum"}
            </text>
            <text x="80" y="480" fill="#94a3b8" fontSize="18" fontWeight="bold">
              {isAr ? "الأسبوع 2: بداية التقديم المخصص وتعديل السيرة الذاتية" : "Week 2: Tailored Submissions"}
            </text>
            <text x="80" y="820" fill="#94a3b8" fontSize="18" fontWeight="bold">
              {isAr ? "الأسبوع 3: الحضور الرقمي والمحتوى المهني المستمر" : "Week 3: Digital Presence & Visibility"}
            </text>
            <text x="80" y="1160" fill="#94a3b8" fontSize="18" fontWeight="bold">
              {isAr ? "الأسبوع 4: التوسع وشبكة العلاقات والتقرير النهائي" : "Week 4: Outreach & Graduation"}
            </text>
          </g>

          {/* EDGES: Cubic Bezier Curves between sequential nodes */}
          {journeyEdges.map((edge, idx) => {
            const startX = edge.from.x + edge.from.width;
            const startY = edge.from.y + edge.from.height / 2;
            const endX = edge.to.x;
            const endY = edge.to.y + edge.to.height / 2;

            let pathD = "";
            if (edge.isLoop) {
              // Smooth S-Curve bridging across rows
              const midX = startX + 70;
              pathD = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
            } else {
              // Standard horizontal bezier
              const dx = (endX - startX) / 2;
              pathD = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;
            }

            const isTracedActive =
              tracedMember &&
              isNodeCompletedByTracedUser(edge.from.code, edge.from.week, edge.from.order) &&
              (isNodeCompletedByTracedUser(edge.to.code, edge.to.week, edge.to.order) ||
                isNodeActiveForTracedUser(edge.to.code));

            return (
              <g key={`edge-${idx}`}>
                {/* Base curve */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={isTracedActive ? "#10b981" : "rgba(255,255,255,0.18)"}
                  strokeWidth={isTracedActive ? "3" : "2"}
                  markerEnd={isTracedActive ? "url(#arrow-head-active)" : "url(#arrow-head)"}
                />
                {/* Animated active flow on valid active paths */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={isTracedActive ? "#34d399" : "rgba(16,185,129,0.35)"}
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                  className="active-flow-path"
                />
              </g>
            );
          })}

          {/* SATELLITE CONNECTORS: Dashed bezier connecting core task to guidance node */}
          {canvasNodes
            .filter((n) => n.type === "SATELLITE_GUIDANCE" && n.parentCode)
            .map((sat) => {
              const parent = canvasNodes.find((p) => p.code === sat.parentCode);
              if (!parent) return null;
              const startX = parent.x + parent.width / 2;
              const startY = parent.y;
              const endX = sat.x + sat.width / 2;
              const endY = sat.y + sat.height;
              const pathD = `M ${startX} ${startY} C ${startX} ${startY - 25}, ${endX} ${endY + 25}, ${endX} ${endY}`;

              return (
                <path
                  key={`sat-conn-${sat.code}`}
                  d={pathD}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.8"
                  strokeDasharray="4 4"
                  opacity="0.8"
                />
              );
            })}

          {/* RENDER NODES */}
          {canvasNodes.map((node) => {
            const stationedMembers = memberLocations[node.code] || [];
            const count = stationedMembers.length;
            const isBottleneck = node.code === bottleneckCode && count >= 2;
            const isSelected = node.code === selectedNodeCode;

            // Single user tracer state
            const isTracedUserCompleted = isNodeCompletedByTracedUser(
              node.code,
              node.week,
              node.order,
            );
            const isTracedUserActive = isNodeActiveForTracedUser(node.code);

            return (
              <g
                key={node.code}
                className="interactive-node cursor-pointer group"
                onClick={() => setSelectedNodeCode(node.code)}
              >
                {/* Heatmap Bottleneck Halo */}
                {isBottleneck && (
                  <rect
                    x={node.x - 8}
                    y={node.y - 8}
                    width={node.width + 16}
                    height={node.height + 16}
                    rx="22"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    className="animate-pulse"
                    opacity="0.85"
                  />
                )}

                {/* Traced User Active Station Halo */}
                {isTracedUserActive && (
                  <rect
                    x={node.x - 7}
                    y={node.y - 7}
                    width={node.width + 14}
                    height={node.height + 14}
                    rx="20"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    className="animate-pulse"
                  />
                )}

                {/* Selected Node Ring */}
                {isSelected && (
                  <rect
                    x={node.x - 5}
                    y={node.y - 5}
                    width={node.width + 10}
                    height={node.height + 10}
                    rx="18"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                  />
                )}

                {/* 1. ONBOARDING GATE SHAPE (Hexagonal Gate) */}
                {node.type === "GATE" && (
                  <g>
                    <polygon
                      points={`${node.x},${node.y + 47} ${node.x + 24},${node.y} ${node.x + node.width - 24},${node.y} ${node.x + node.width},${node.y + 47} ${node.x + node.width - 24},${node.y + node.height} ${node.x + 24},${node.y + node.height}`}
                      fill="#0f172a"
                      stroke={
                        isTracedUserCompleted
                          ? "#10b981"
                          : isSelected
                            ? "#38bdf8"
                            : "rgba(255,255,255,0.25)"
                      }
                      strokeWidth={isTracedUserCompleted ? 2.5 : 1.5}
                      className="transition-colors group-hover:stroke-white"
                    />
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + 36}
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      🚪 {isAr ? "بوابة التهيئة" : "Onboarding Gate"}
                    </text>
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + 58}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="10"
                    >
                      {isAr ? "إكمال الملف والـ CV" : "Profile & CV Upload"}
                    </text>
                  </g>
                )}

                {/* 2. CORE TASK NODE (Rounded Tech Node) */}
                {node.type === "CORE_QUEST" && (
                  <g>
                    <rect
                      x={node.x}
                      y={node.y}
                      width={node.width}
                      height={node.height}
                      rx="14"
                      fill="#1e293b"
                      stroke={
                        isTracedUserCompleted
                          ? "#10b981"
                          : isSelected
                            ? "#38bdf8"
                            : "rgba(255,255,255,0.2)"
                      }
                      strokeWidth={isTracedUserCompleted ? 2.5 : 1.5}
                      className="transition-colors group-hover:stroke-white"
                    />

                    {/* Task Code & Requirements Pill */}
                    <rect
                      x={node.x + 12}
                      y={node.y + 10}
                      width="58"
                      height="18"
                      rx="4"
                      fill="rgba(255,255,255,0.1)"
                    />
                    <text
                      x={node.x + 41}
                      y={node.y + 23}
                      textAnchor="middle"
                      fill="#cbd5e1"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {node.code}
                    </text>

                    {/* Requirements badge */}
                    {node.requiredApps > 0 && (
                      <text
                        x={node.x + node.width - 14}
                        y={node.y + 23}
                        textAnchor="end"
                        fill="#38bdf8"
                        fontSize="9"
                        fontWeight="600"
                      >
                        {node.requiredApps} {isAr ? "طلبات" : "apps"}
                      </text>
                    )}

                    {/* Task Title */}
                    <text
                      x={node.x + 12}
                      y={node.y + 49}
                      fill="#f8fafc"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      {isAr ? node.titleAr.slice(0, 26) : node.titleEn.slice(0, 26)}
                    </text>

                    {/* Bottom Progress Bar Decoration */}
                    <rect
                      x={node.x + 12}
                      y={node.y + node.height - 18}
                      width={node.width - 24}
                      height="4"
                      rx="2"
                      fill="rgba(255,255,255,0.12)"
                    />
                    <rect
                      x={node.x + 12}
                      y={node.y + node.height - 18}
                      width={Math.min(
                        node.width - 24,
                        Math.max(8, (count / (members.length || 1)) * (node.width - 24)),
                      )}
                      height="4"
                      rx="2"
                      fill={isTracedUserCompleted ? "#10b981" : "#0284c7"}
                    />
                  </g>
                )}

                {/* 3. 7TH-DAY REVIEW STATION (Diamond / Octagon Checkpoint Node) */}
                {node.type === "REVIEW_STATION" && (
                  <g>
                    <polygon
                      points={`${node.x},${node.y + 48} ${node.x + 36},${node.y} ${node.x + node.width - 36},${node.y} ${node.x + node.width},${node.y + 48} ${node.x + node.width - 36},${node.y + node.height} ${node.x + 36},${node.y + node.height}`}
                      fill="#1e1b4b"
                      stroke={
                        isTracedUserCompleted
                          ? "#10b981"
                          : isSelected
                            ? "#38bdf8"
                            : "#6366f1"
                      }
                      strokeWidth={isTracedUserCompleted ? 2.5 : 2}
                      className="transition-colors group-hover:stroke-indigo-300"
                    />
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + 32}
                      textAnchor="middle"
                      fill="#c7d2fe"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      🔬 {isAr ? "محطة تقييم الأسبوع" : "Weekly Checkpoint"}
                    </text>
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + 52}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="extrabold"
                    >
                      {isAr ? node.titleAr.slice(0, 24) : node.titleEn.slice(0, 24)}
                    </text>
                    <text
                      x={node.x + node.width / 2}
                      y={node.y + 72}
                      textAnchor="middle"
                      fill="#a5b4fc"
                      fontSize="9"
                    >
                      {isAr ? "تحديث السيرة والمراجعة" : "CV Review & Analysis"}
                    </text>
                  </g>
                )}

                {/* 4. PLOT GUIDANCE SATELLITE (Sparkle Pill Satellite Node) */}
                {node.type === "SATELLITE_GUIDANCE" && (
                  <g>
                    <rect
                      x={node.x}
                      y={node.y}
                      width={node.width}
                      height={node.height}
                      rx="24"
                      fill="#451a03"
                      stroke={
                        isSelected ? "#38bdf8" : "#f59e0b"
                      }
                      strokeWidth="1.5"
                      className="transition-colors group-hover:stroke-amber-300"
                    />
                    <text
                      x={node.x + 22}
                      y={node.y + 24}
                      fill="#fde68a"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      ✨ {isAr ? node.titleAr.slice(0, 18) : node.titleEn.slice(0, 18)}
                    </text>
                    <text
                      x={node.x + 22}
                      y={node.y + 38}
                      fill="#fbbf24"
                      fontSize="9"
                    >
                      {isAr
                        ? `(قرأه ${node.guidanceReadsCount ?? 0} من ${node.guidanceUnlockedCount ?? 0})`
                        : `(Read ${node.guidanceReadsCount ?? 0} / ${node.guidanceUnlockedCount ?? 0})`}
                    </text>
                  </g>
                )}

                {/* STANDING MEMBERS COUNT BADGE */}
                {node.type !== "SATELLITE_GUIDANCE" && count > 0 && (
                  <g transform={`translate(${node.x + node.width - 26}, ${node.y - 10})`}>
                    <circle
                      cx="14"
                      cy="14"
                      r="14"
                      fill={isBottleneck ? "#ef4444" : "#0284c7"}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <text
                      x="14"
                      y="18"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {count}
                    </text>
                  </g>
                )}

                {/* Heatmap Bottleneck Badge Label */}
                {isBottleneck && (
                  <g transform={`translate(${node.x + 12}, ${node.y - 12})`}>
                    <rect
                      x="0"
                      y="0"
                      width="130"
                      height="20"
                      rx="6"
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                    <text
                      x="65"
                      y="14"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      ⚠️ {isAr ? `نقطة توقف (${count} عضو)` : `Bottleneck (${count})`}
                    </text>
                  </g>
                )}

                {/* Traced User Active Node Floating Card */}
                {isTracedUserActive && (
                  <g transform={`translate(${node.x - 20}, ${node.y - 48})`}>
                    <rect
                      x="0"
                      y="0"
                      width="260"
                      height="36"
                      rx="10"
                      fill="#064e3b"
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                    <text
                      x="130"
                      y="16"
                      textAnchor="middle"
                      fill="#34d399"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      📍 {tracedMember?.name}
                    </text>
                    <text
                      x="130"
                      y="29"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                    >
                      {isAr
                        ? `يقف هنا منذ ${tracedMember?.journey?.daysInNode ?? 0} يوم · التقدم: ${tracedMember?.journey?.nodeApps ?? 0}/${tracedMember?.journey?.requiredApps ?? 5}`
                        : `Stalled ${tracedMember?.journey?.daysInNode ?? 0}d · Apps: ${tracedMember?.journey?.nodeApps ?? 0}/${tracedMember?.journey?.requiredApps ?? 5}`}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Mini Navigator in bottom corner */}
        <div className="absolute bottom-3 end-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-md">
          <span>{isAr ? "اسحب للتحريك · عجلات الماوس للتكبير" : "Drag to pan · Scroll to zoom"}</span>
        </div>
      </div>

      {/* 3. NODE DETAILS SLIDE-OVER DRAWER (Node Click Panel) */}
      {activeDrawerNode && (
        <div className="rounded-2xl border border-neutral-200 bg-surface p-5 shadow-lg dark:border-neutral-800 animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-xs font-bold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                  {activeDrawerNode.code}
                </span>
                <span className="text-xs text-neutral-500">
                  {activeDrawerNode.type === "GATE"
                    ? isAr ? "بوابة تهيئة" : "Onboarding Gate"
                    : activeDrawerNode.type === "REVIEW_STATION"
                      ? isAr ? "محطة تقييم اليوم السابع" : "Day 7 Review Station"
                      : activeDrawerNode.type === "SATELLITE_GUIDANCE"
                        ? isAr ? "إرشاد حبكة وبرومبت" : "Plot Guidance"
                        : isAr ? `الأسبوع ${activeDrawerNode.week}` : `Week ${activeDrawerNode.week}`}
                </span>
                {activeDrawerNode.code === bottleneckCode && (
                  <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800 dark:bg-red-950/40 dark:text-red-300">
                    ⚠️ {isAr ? "أكبر نقطة توقف حالياً" : "Primary Friction Bottleneck"}
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-neutral-950 dark:text-neutral-100">
                {isAr ? activeDrawerNode.titleAr : activeDrawerNode.titleEn}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => setSelectedNodeCode(null)}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Node Stats Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-850">
              <span className="text-[11px] text-neutral-500 block">
                {isAr ? "الواقفون في المحطة" : "Stationed Members"}
              </span>
              <span className="text-xl font-bold font-mono text-neutral-950 dark:text-neutral-100">
                {activeDrawerMembers.length}
              </span>
            </div>
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-850">
              <span className="text-[11px] text-neutral-500 block">
                {isAr ? "نسبة التمركز من العينة" : "Sample Share"}
              </span>
              <span className="text-xl font-bold font-mono text-neutral-950 dark:text-neutral-100">
                {Math.round((activeDrawerMembers.length / (filteredMembers.length || 1)) * 100)}%
              </span>
            </div>
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-850">
              <span className="text-[11px] text-neutral-500 block">
                {isAr ? "الطلبات المطلوبة" : "Required Apps"}
              </span>
              <span className="text-xl font-bold font-mono text-neutral-950 dark:text-neutral-100">
                {activeDrawerNode.requiredApps || (isAr ? "مراجعة" : "Review")}
              </span>
            </div>
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-850">
              <span className="text-[11px] text-neutral-500 block">
                {isAr ? "متوسط أيام الانتظار" : "Avg Days Stalled"}
              </span>
              <span className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400">
                {activeDrawerMembers.length > 0
                  ? Math.round(
                      activeDrawerMembers.reduce((acc, m) => acc + (m.journey?.daysInNode ?? m.inactivityDays ?? 0), 0) /
                        activeDrawerMembers.length,
                    )
                  : 0}{" "}
                <span className="text-xs text-neutral-500">{isAr ? "يوم" : "d"}</span>
              </span>
            </div>
          </div>

          {/* Members Stationed List */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              {isAr
                ? `قائمة الأعضاء المتواجدين في هذه المحطة (${activeDrawerMembers.length}):`
                : `Stationed Members (${activeDrawerMembers.length}):`}
            </h5>

            {activeDrawerMembers.length === 0 ? (
              <p className="text-xs text-neutral-400 py-2">
                {isAr ? "لا يوجد أعضاء متوقفين عند هذه المحطة حالياً." : "No members currently stationed here."}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pe-1">
                {activeDrawerMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-surface p-3 text-xs dark:border-neutral-700 hover:border-neutral-400 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-neutral-900 dark:text-neutral-100 truncate">
                        {m.name}
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {m.group?.name || (isAr ? "غير معين" : "Unassigned")} ·{" "}
                        {isAr
                          ? `منذ ${m.journey?.daysInNode ?? m.inactivityDays ?? 0} يوم`
                          : `${m.journey?.daysInNode ?? m.inactivityDays ?? 0}d`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setTracedMemberId(m.id);
                          setSelectedNodeCode(null);
                        }}
                        className="rounded-lg border border-neutral-200 bg-neutral-100 px-2 py-1 text-[11px] font-bold text-neutral-800 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 transition-colors"
                        title={isAr ? "تتبع مسار هذا العضو على الخريطة" : "Trace this member"}
                      >
                        {isAr ? "تتبع 👤" : "Trace 👤"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onInspectMember(m.id)}
                        className="rounded-lg border border-neutral-200 bg-neutral-100 px-2 py-1 text-[11px] font-bold text-info-strong hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 transition-colors"
                      >
                        {isAr ? "360°" : "360°"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSendFeedback(m)}
                        className="rounded-lg bg-neutral-900 px-2 py-1 text-[11px] font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 transition-colors"
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
      )}
    </div>
  );
}

