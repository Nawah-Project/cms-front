import { useEffect, useMemo, useRef, useState } from "react";
import {
  Compass,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MousePointer2,
  Move,
  Users,
  FileText,
  Copy,
  X,
} from "lucide-react";
import { useI18n } from "../../../i18n";
import { Modal } from "../../../components/ui/Modal";
import type {
  AdminGroup,
  AdminMember,
  JourneyNodeItem,
  PlotGuidanceItem,
} from "../api/adminApi";
export interface JourneyTopologyCanvasProps {
  nodes: JourneyNodeItem[];
  plotGuidances: PlotGuidanceItem[];
  members: AdminMember[];
  groups: AdminGroup[];
  highlightNodeCode?: string | null;
  onInspectMember: (id: string) => void;
  onSendFeedback: (m: AdminMember) => void;
}
const locationOf = (m: AdminMember) =>
  !m.profileComplete ? "ONBOARDING" : (m.journey?.nodeCode ?? "TASK_0");
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
  const ar = locale === "ar";
  const text = (a: string, e: string) => (ar ? a : e);
  const [group, setGroup] = useState("");
  const [traced, setTraced] = useState("");
  const [week, setWeek] = useState("ALL");
  const [selected, setSelected] = useState("TASK_0");
  const [search, setSearch] = useState("");
  const [guidance, setGuidance] = useState<PlotGuidanceItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [view, setView] = useState({ x: 35, y: 35, z: 0.85 });
  const [interactive, setInteractive] = useState(true);
  const [dragging, setDragging] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const current = useRef(view);
  current.current = view;
  const drag = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);
  const scoped = useMemo(
    () => members.filter((m) => !group || m.group?.id === group),
    [members, group],
  );
  const mapNodes = useMemo(() => {
    const all: JourneyNodeItem[] = [
      {
        code: "ONBOARDING",
        weekNumber: 0,
        orderIndex: -1,
        nodeType: "MAIN",
        titleAr: "الاستقبال والملف المهني",
        titleEn: "Welcome & professional profile",
        descriptionAr: "إكمال البيانات المهنية ورفع السيرة الذاتية الأساسية.",
        descriptionEn:
          "Complete the professional profile and upload a base CV.",
        durationDays: 0,
        requiredAppsCount: 0,
        requiredTailoredCount: 0,
        requiredPostsCount: 0,
        requiredOutreachCount: 0,
        unlocksInsightCode: null,
        nextNodeCode: "TASK_0",
      },
      ...nodes,
    ];
    if (!all.some((n) => n.code === "TASK_0"))
      all.splice(1, 0, {
        ...all[0],
        code: "TASK_0",
        titleAr: "المهمة صفر: أول خمسة طلبات",
        titleEn: "Task 0: first five applications",
        orderIndex: 0,
        requiredAppsCount: 5,
      });
    return all
      .sort(
        (a, b) => a.weekNumber - b.weekNumber || a.orderIndex - b.orderIndex,
      )
      .filter((n) => week === "ALL" || String(n.weekNumber) === week)
      .map((n, i) => ({
        ...n,
        x: (Math.floor(i / 2) % 2 === 0 ? i % 2 : 1 - (i % 2)) * 390 + 25,
        y: Math.floor(i / 2) * 235 + 30,
      }));
  }, [nodes, week]);
  const positions = useMemo(
    () =>
      Object.fromEntries(
        mapNodes.map((n) => [
          n.code,
          scoped.filter((m) => locationOf(m) === n.code),
        ]),
      ),
    [scoped, mapNodes],
  );
  const active = mapNodes.find((n) => n.code === selected);
  const stationed = positions[selected] ?? [];
  const width = 780,
    height = Math.max(250, Math.ceil(mapNodes.length / 2) * 235 + 20);
  const zoomAt = (z: number, x?: number, y?: number) => {
    const el = viewport.current;
    if (!el) return;
    setView((old) => {
      const next = Math.max(0.12, Math.min(1.8, z)),
        ax = x ?? el.clientWidth / 2,
        ay = y ?? el.clientHeight / 2;
      return {
        z: next,
        x: ax - ((ax - old.x) / old.z) * next,
        y: ay - ((ay - old.y) / old.z) * next,
      };
    });
  };
  const fit = (all = false) => {
    const el = viewport.current;
    if (!el) return;
    const z = Math.max(
      0.12,
      Math.min(
        1,
        (el.clientWidth - 40) / width,
        all ? (el.clientHeight - 40) / height : 1,
      ),
    );
    setView({ x: (el.clientWidth - width * z) / 2, y: 20, z });
  };
  useEffect(() => {
    fit();
  }, [week]);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const resize = new ResizeObserver(() => fit());
    resize.observe(el);
    return () => resize.disconnect();
  }, []);
  // Native non-passive listener is required. React's delegated wheel listener is
  // passive in Chromium and cannot reliably prevent the page's default scroll.
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!interactive && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      const r = el.getBoundingClientRect(),
        v = current.current;
      zoomAt(
        v.z * Math.exp(-Math.max(-120, Math.min(120, e.deltaY)) * 0.002),
        e.clientX - r.left,
        e.clientY - r.top,
      );
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [interactive]);
  const focus = (code: string) => {
    setSelected(code);
    const n = nodes.find((n) => n.code === code);
    if (week !== "ALL" && String(n?.weekNumber ?? 0) !== week)
      setWeek(String(n?.weekNumber ?? 0));
  };
  useEffect(() => {
    if (highlightNodeCode) focus(highlightNodeCode);
  }, [highlightNodeCode]);
  useEffect(() => {
    const n = mapNodes.find((n) => n.code === selected),
      el = viewport.current;
    if (!n || !el) return;
    setView((v) => ({
      ...v,
      x: el.clientWidth / 2 - (n.x + 175) * v.z,
      y: el.clientHeight / 2 - (n.y + 95) * v.z,
    }));
  }, [selected, mapNodes]);
  const selectTrace = (id: string) => {
    setTraced(id);
    const m = members.find((x) => x.id === id);
    if (m) focus(locationOf(m));
  };
  const nodeGuidances = (n: JourneyNodeItem) =>
    plotGuidances.filter(
      (p) =>
        p.unlockTriggerCode === n.unlocksInsightCode ||
        p.unlockTriggerCode === n.code ||
        (n.code === "TASK_0" && p.unlockTriggerCode?.includes("TASK_0")),
    );
  const waiting = scoped.filter(
    (m) => m.journey?.daysInNode != null && m.journey.daysInNode >= 3,
  );
  return (
    <section
      className="lab-map space-y-4"
      aria-label={text("خريطة الرحلة التفاعلية", "Interactive journey map")}
    >
      <div className="lab-card flex flex-wrap items-center gap-3 !p-4">
        <button
          className={!group && !traced ? "lab-primary" : "lab-button"}
          onClick={() => {
            setGroup("");
            setTraced("");
          }}
        >
          {text("الجميع", "Everyone")} · {number(members.length)}
        </button>
        <label className="lab-inline-label">
          {text("المجموعة", "Group")}
          <select
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              setTraced("");
            }}
          >
            <option value="">{text("كل المجموعات", "All groups")}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label className="lab-inline-label grow">
          {text("تتبّع باحث", "Trace a member")}
          <select value={traced} onChange={(e) => selectTrace(e.target.value)}>
            <option value="">{text("اختر باحثًا", "Choose a member")}</option>
            {scoped.map((m) => (
              <option value={m.id} key={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <span className="lab-muted text-xs">
          {text(
            "مواضع حالية · اضغط محطة لفحصها",
            "Current positions · select a station to inspect",
          )}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { n: scoped.length, a: "باحث في النطاق", e: "Members in scope" },
          {
            n: scoped.filter((m) => m.journey?.started).length,
            a: "بدأوا الرحلة",
            e: "Journey started",
          },
          {
            n: waiting.length,
            a: "في نفس المحطة منذ ٣ أيام أو أكثر",
            e: "At the same station for 3+ days",
          },
        ].map((x) => (
          <div key={x.e} className="lab-card !py-4">
            <strong className="text-2xl">{number(x.n)}</strong>
            <p className="lab-muted mt-1 text-xs">{text(x.a, x.e)}</p>
          </div>
        ))}
      </div>
      <div className="lab-card !p-0 overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 p-4">
          <div className="flex flex-wrap gap-1">
            {["ALL", "0", "1", "2", "3", "4"].map((w) => (
              <button
                className={w === week ? "lab-primary" : "lab-button"}
                key={w}
                onClick={() => setWeek(w)}
              >
                {w === "ALL"
                  ? text("الرحلة كاملة", "Full journey")
                  : w === "0"
                    ? text("البداية", "Start")
                    : text("أسبوع ", "Week ") + number(Number(w))}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              aria-label={text("تصغير", "Zoom out")}
              className="lab-icon"
              onClick={() => zoomAt(view.z / 1.2)}
            >
              <ZoomOut size={17} />
            </button>
            <output
              className="self-center px-2 text-xs tabular-nums"
              data-map-zoom
            >
              {number(Math.round(view.z * 100))}%
            </output>
            <button
              aria-label={text("تكبير", "Zoom in")}
              className="lab-icon"
              onClick={() => zoomAt(view.z * 1.2)}
            >
              <ZoomIn size={17} />
            </button>
            <button className="lab-button" onClick={() => fit(true)}>
              <Maximize2 size={15} />
              {text("احتواء", "Fit all")}
            </button>
            <button className="lab-button" onClick={() => fit()}>
              {text("عرض مقروء", "Readable view")}
            </button>
            <button
              className={interactive ? "lab-primary" : "lab-button"}
              aria-pressed={interactive}
              onClick={() => setInteractive((x) => !x)}
            >
              <Move size={15} />
              {text(
                interactive ? "تفاعل داخل الخريطة" : "تمرير الصفحة",
                interactive ? "Map interaction" : "Page scrolling",
              )}
            </button>
          </div>
        </header>
        <div className="grid xl:grid-cols-[minmax(0,1fr)_310px]">
          <div
            ref={viewport}
            data-journey-map
            tabIndex={0}
            role="region"
            aria-label={text(
              "مخطط الرحلة. استخدم أزرار التكبير أو اسحب للتنقل.",
              "Journey canvas. Use zoom controls or drag to pan.",
            )}
            className={`lab-map-viewport ${interactive ? "is-interactive" : ""}`}
            dir="ltr"
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              const moves: Record<string, [number, number]> = {
                ArrowUp: [0, 60],
                ArrowDown: [0, -60],
                ArrowLeft: [60, 0],
                ArrowRight: [-60, 0],
              };
              if (moves[e.key]) {
                e.preventDefault();
                const [x, y] = moves[e.key];
                setView((v) => ({ ...v, x: v.x + x, y: v.y + y }));
              } else if (e.key === "+" || e.key === "=") {
                e.preventDefault();
                zoomAt(view.z * 1.2);
              } else if (e.key === "-") {
                e.preventDefault();
                zoomAt(view.z / 1.2);
              } else if (e.key === "0") fit();
            }}
            onPointerDown={(e) => {
              if (
                !interactive ||
                e.button !== 0 ||
                (e.target as Element).closest("[data-map-node]")
              )
                return;
              const v = current.current;
              drag.current = {
                x: v.x,
                y: v.y,
                startX: e.clientX,
                startY: e.clientY,
              };
              setDragging(true);
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (drag.current) {
                const d = drag.current;
                setView((v) => ({
                  ...v,
                  x: d.x + e.clientX - d.startX,
                  y: d.y + e.clientY - d.startY,
                }));
              }
            }}
            onPointerUp={(e) => {
              drag.current = null;
              setDragging(false);
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerCancel={() => {
              drag.current = null;
              setDragging(false);
            }}
          >
            <svg
              className="h-full w-full"
              aria-label={text(
                "محطات الرحلة وروابطها",
                "Journey stations and connections",
              )}
            >
              <defs>
                <pattern
                  id="lab-dots"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1" cy="1" r="1" fill="#d1d5db" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#lab-dots)" />
              <g
                transform={`translate(${view.x} ${view.y}) scale(${view.z})`}
                style={{
                  transition: dragging ? "none" : "transform 100ms ease-out",
                }}
              >
                {mapNodes.slice(0, -1).map((n, i) => {
                  const to = mapNodes[i + 1],
                    same = n.y === to.y;
                  return (
                    <path
                      key={n.code}
                      d={
                        same
                          ? `M ${n.x + 175} ${n.y + 95} L ${to.x + 175} ${to.y + 95}`
                          : `M ${n.x + 175} ${n.y + 190} L ${to.x + 175} ${to.y}`
                      }
                      fill="none"
                      stroke="#527467"
                      strokeWidth="2"
                    />
                  );
                })}
                {mapNodes.map((n) => {
                  const here = positions[n.code] ?? [],
                    isTrace = !!traced && here.some((m) => m.id === traced),
                    sel = selected === n.code;
                  return (
                    <foreignObject
                      key={n.code}
                      x={n.x}
                      y={n.y}
                      width="350"
                      height="190"
                    >
                      <button
                        data-map-node={n.code}
                        dir={ar ? "rtl" : "ltr"}
                        className={`lab-node ${sel ? "selected" : ""} ${isTrace ? "traced" : ""}`}
                        onClick={() => setSelected(n.code)}
                        aria-pressed={sel}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <code>{n.code}</code>
                          <span className="lab-muted text-xs">
                            {n.weekNumber === 0
                              ? text("البداية", "Start")
                              : text("الأسبوع ", "Week ") + n.weekNumber}
                          </span>
                        </div>
                        <h3>{text(n.titleAr, n.titleEn)}</h3>
                        <div className="flex flex-wrap gap-3 text-xs text-neutral-600">
                          <span>
                            {number(n.requiredAppsCount)}{" "}
                            {text("طلبات", "applications")}
                          </span>
                          {n.durationDays > 0 && (
                            <span>
                              {number(n.durationDays)} {text("يوم", "days")}
                            </span>
                          )}
                          {nodeGuidances(n).length > 0 && (
                            <span>
                              {text("إرشاد مرتبط", "Linked guidance")}
                            </span>
                          )}
                        </div>
                        <div className="mt-auto flex items-center justify-between border-t border-neutral-200 pt-2 text-xs">
                          <strong className="inline-flex items-center gap-1">
                            <Users size={14} />
                            {number(here.length)} {text("هنا", "here")}
                          </strong>
                          {isTrace && (
                            <span className="font-semibold text-[#155546]">
                              {text("موقع الباحث", "Member location")}
                            </span>
                          )}
                        </div>
                      </button>
                    </foreignObject>
                  );
                })}
              </g>
            </svg>
          </div>
          <aside
            className="lab-map-inspector border-t border-neutral-200 p-5 xl:border-s xl:border-t-0"
            aria-live="polite"
          >
            {active ? (
              <>
                <p className="lab-eyebrow">
                  {text("فحص المحطة", "Station inspector")}
                </p>
                <h3 className="mt-2 text-lg font-bold leading-7">
                  {text(active.titleAr, active.titleEn)}
                </h3>
                <p className="lab-muted mt-2 text-xs leading-6">
                  {text(active.descriptionAr ?? "", active.descriptionEn ?? "")}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  {[
                    [
                      text("طلبات مطلوبة", "Applications"),
                      active.requiredAppsCount,
                    ],
                    [
                      text("مدة المحطة / يوم", "Duration / days"),
                      active.durationDays,
                    ],
                    [
                      text("طلبات مخصصة", "Tailored"),
                      active.requiredTailoredCount,
                    ],
                    [
                      text("منشورات / تواصل", "Posts / outreach"),
                      active.requiredPostsCount + active.requiredOutreachCount,
                    ],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-lg border border-neutral-200 p-3"
                    >
                      <dt className="lab-muted">{k}</dt>
                      <dd className="mt-1 text-lg font-bold">
                        {number(Number(v))}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="lab-muted mt-4 text-xs leading-6">
                  {text(
                    "المدة شرط زمني للمحطة. وجود باحث هنا لا يعني تعثّره؛ افحص مدة بقائه والعمل المطلوب قبل اتخاذ إجراء.",
                    "Station duration is a time gate. A member being here is not proof of friction; inspect elapsed time and required work first.",
                  )}
                </p>
                {nodeGuidances(active).map((g) => (
                  <button
                    key={g.id}
                    className="lab-button mt-3 w-full !justify-between"
                    onClick={() => {
                      setCopied(false);
                      setCopyFailed(false);
                      setGuidance(g);
                    }}
                  >
                    <FileText size={16} />
                    {text("فحص الإرشاد", "Inspect guidance")}
                    <span>
                      {g.readsCount}/{g.unlockedCount}
                    </span>
                  </button>
                ))}
                <h4 className="mt-5 border-t border-neutral-200 pt-4 text-sm font-bold">
                  {number(stationed.length)}{" "}
                  {text("باحث في هذه المحطة", "members at this station")}
                </h4>
                <input
                  className="mt-3 w-full"
                  placeholder={text("بحث بالاسم", "Search by name")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label={text("بحث داخل المحطة", "Search this station")}
                />
                <div className="mt-2 max-h-72 overflow-auto">
                  {stationed
                    .filter((m) =>
                      m.name.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((m) => (
                      <article
                        className="border-b border-neutral-200 py-3 text-xs"
                        key={m.id}
                      >
                        <button
                          className="font-bold underline-offset-4 hover:underline"
                          onClick={() => onInspectMember(m.id)}
                        >
                          {m.name}
                        </button>
                        <p className="lab-muted mt-1">
                          {m.group?.name ?? text("دون مجموعة", "No group")} ·{" "}
                          {m.journey?.daysInNode == null
                            ? "—"
                            : number(m.journey.daysInNode) +
                              " " +
                              text("يوم هنا", "days here")}
                        </p>
                        <p className="mt-2">
                          {text("العمل بالمحطة: ", "Station work: ")}
                          {number(m.journey?.nodeApps ?? 0)} /{" "}
                          {number(
                            m.journey?.requiredApps ?? active.requiredAppsCount,
                          )}
                        </p>
                        <div className="mt-2 flex gap-3">
                          <button
                            className="font-semibold text-[#155546] underline"
                            onClick={() => onInspectMember(m.id)}
                          >
                            {text("فحص الملف", "Inspect account")}
                          </button>
                          <button
                            className="underline"
                            onClick={() => onSendFeedback(m)}
                          >
                            {text("إعداد توجيه", "Draft guidance")}
                          </button>
                        </div>
                      </article>
                    ))}
                  {stationed.length === 0 && (
                    <p className="lab-muted py-5 text-xs">
                      {text(
                        "لا يوجد باحثون حاليًا في هذه المحطة.",
                        "No members currently at this station.",
                      )}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="py-8">
                <MousePointer2 size={28} />
                <h3 className="mt-3 font-bold">
                  {text(
                    "اختر محطة لفهم ما يحدث",
                    "Select a station to understand its activity",
                  )}
                </h3>
                <p className="lab-muted mt-2 text-sm leading-7">
                  {text(
                    "ستظهر متطلبات العبور، الإرشاد المرتبط والباحثون الموجودون هناك.",
                    "Inspect requirements, linked guidance and members at that point.",
                  )}
                </p>
              </div>
            )}
          </aside>
        </div>
        <footer className="flex flex-wrap justify-between gap-2 border-t border-neutral-200 p-3 text-xs text-neutral-600">
          <span>
            {text(
              "اسحب للتنقل · عجلة الماوس للتكبير داخل الخريطة",
              "Drag to pan · scroll to zoom within the canvas",
            )}
          </span>
          <span>
            {text(
              "أخضر: المحطة المحددة · حد إضافي: الباحث المتتبّع",
              "Green: selected station · extra border: tracked member",
            )}
          </span>
        </footer>
      </div>
      {guidance && (
        <Modal
          isOpen
          onClose={() => setGuidance(null)}
          title={text(
            guidance.titleAr || guidance.title,
            guidance.titleEn || guidance.title,
          )}
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-700">
              {text("فتح الإرشاد: ", "Unlocked: ")}
              {number(guidance.unlockedCount)} · {text("قرأه: ", "Read: ")}
              {number(guidance.readsCount)}
            </p>
            <p className="text-sm leading-7 text-neutral-700">
              {text(guidance.summaryAr, guidance.summaryEn)}
            </p>
            {guidance.promptTemplate && (
              <>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-neutral-300 bg-white p-4 text-xs leading-6 text-neutral-800">
                  {text(
                    guidance.promptTemplateAr || guidance.promptTemplate,
                    guidance.promptTemplateEn || guidance.promptTemplate,
                  )}
                </pre>
                <button
                  className="lab-primary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        text(
                          guidance.promptTemplateAr || guidance.promptTemplate,
                          guidance.promptTemplateEn || guidance.promptTemplate,
                        ),
                      );
                      setCopied(true);
                    } catch {
                      setCopyFailed(true);
                    }
                  }}
                >
                  <Copy size={16} />
                  {copied
                    ? text("تم النسخ", "Copied")
                    : text("نسخ القالب", "Copy template")}
                </button>
                {copyFailed && (
                  <p role="alert">
                    {text(
                      "تعذر النسخ. حدد النص وانسخه يدويًا.",
                      "Copy failed. Select and copy the text manually.",
                    )}
                  </p>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
