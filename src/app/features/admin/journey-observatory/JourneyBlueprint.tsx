import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  FilePenLine,
  Megaphone,
  Send,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flag,
  Focus,
  Grip,
  Layers3,
  ListTree,
  Maximize2,
  Minus,
  Mouse,
  Plus,
  RotateCcw,
  Sparkles,
  Users,
} from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { buildBlueprint } from "./blueprint-layout";
import { WEEK_TITLES, type JourneyMap, type Station } from "./api";
type View = { x: number; y: number; z: number };
export function JourneyBlueprint({
  data,
  ar,
  week,
  onWeek,
  selected,
  onSelect,
  onSelectGuidance,
  overlay,
  traceId,
  inspector,
  onCloseInspection,
}: {
  data: JourneyMap;
  ar: boolean;
  week: number | null;
  onWeek: (w: number | null) => void;
  selected: string | null;
  onSelect: (n: Station) => void;
  onSelectGuidance: (code: string) => void;
  overlay: "positions" | "review" | "completion";
  traceId?: string;
  inspector?: ReactNode;
  onCloseInspection: () => void;
}) {
  const text = (a: string, e: string) => (ar ? a : e);
  const [mode, setMode] = useState<"blueprint" | "overview">("blueprint");
  const [view, setView] = useState<View>({ x: 16, y: 16, z: 0.85 });
  useEffect(() => {
    if (window.matchMedia("(max-width: 760px)").matches) setMode("overview");
  }, []);
  const [rightHeld, setRightHeld] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [size, setSize] = useState({ w: 1200, h: 710 });
  const viewport = useRef<HTMLDivElement>(null),
    viewRef = useRef(view),
    right = useRef(false),
    auto = useRef(true),
    drag = useRef<{
      x: number;
      y: number;
      startX: number;
      startY: number;
    } | null>(null);
  viewRef.current = view;
  const layout = useMemo(
    () => buildBlueprint(data.nodes, data.guidance, week, ar),
    [data.nodes, data.guidance, week, ar],
  );
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const traced = data.members.find((m) => m.id === traceId),
    traceCodes = new Set([
      ...(traced?.completedCodes ?? []),
      ...(traced?.readCodes ?? []),
      traced?.guidanceCode ?? traced?.currentCode ?? "",
    ]);
  const zoomAt = (wanted: number, ax?: number, ay?: number) => {
    const el = viewport.current;
    if (!el) return;
    auto.current = false;
    setView((v) => {
      const z = Math.max(0.5, Math.min(1.65, wanted)),
        x = ax ?? el.clientWidth / 2,
        y = ay ?? el.clientHeight / 2;
      return { z, x: x - ((x - v.x) / v.z) * z, y: y - ((y - v.y) / v.z) * z };
    });
  };
  const fit = () => {
    const el = viewport.current;
    if (!el) return;
    const l = layoutRef.current;
    const z = Math.max(0.5, Math.min(1, (el.clientWidth - 36) / l.width));
    auto.current = true;
    setView({ z, x: (el.clientWidth - l.width * z) / 2, y: 18 });
  };
  const center = (code: string) => {
    const el = viewport.current,
      c = [...layoutRef.current.cards, ...layoutRef.current.cells].find((c) => c.id === code);
    if (!el || !c) return;
    auto.current = false;
    setView((v) => {
      const z = Math.max(v.z, 0.78),
        inset = 0;
      const x = ar
        ? (el.clientWidth + inset) / 2
        : (el.clientWidth - inset) / 2;
      return {
        z,
        x: x - (c.x + c.width / 2) * z,
        y: el.clientHeight / 2 - (c.y + c.height / 2) * z,
      };
    });
  };
  useEffect(() => {
    if (mode !== "blueprint") return;
    const el = viewport.current;
    if (!el) return;
    const resize = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
      if (auto.current) fit();
    });
    resize.observe(el);
    fit();
    return () => resize.disconnect();
  }, [mode, week]);
  useEffect(() => {
    const code = selected ?? (traceId ? traced?.guidanceCode ?? traced?.currentCode : null);
    if (code && mode === "blueprint") requestAnimationFrame(() => center(code));
  }, [selected, week, mode, traceId]);
  useEffect(() => {
    if (mode !== "blueprint") return;
    const el = viewport.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      if (!right.current && (event.buttons & 2) === 0) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = el.getBoundingClientRect();
      zoomAt(
        viewRef.current.z *
          Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * 0.0025),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    };
    const release = () => {
      right.current = false;
      setRightHeld(false);
    };
    const blur = () => {
      release();
      drag.current = null;
      setDragging(false);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("pointerup", release);
    window.addEventListener("blur", blur);
    return () => {
      el.removeEventListener("wheel", wheel);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("blur", blur);
      right.current = false;
    };
  }, [mode]);
  const select = (node: Station) => {
    if (mode === "overview") {
      onWeek(node.weekNumber);
      setMode("blueprint");
    }
    onSelect(node);
  };
  const color = (node: Station, kind: string) =>
    overlay === "review" && node.needsReview
      ? "attention"
      : overlay === "completion" && node.completed
        ? "completed"
        : node.current
          ? "occupied"
          : kind === "REVIEW"
            ? "review"
            : "";
  const thinCells = false;
  return (
    <section
      className="jro-board"
      aria-label={text(
        "مخطط الرحلة والاعتماديات",
        "Journey blueprint and dependencies",
      )}
    >
      <header className="jro-board-head">
        <div>
          <span className="jro-eyebrow inverse">
            <Layers3 size={14} />
            {text("المسار المعتمد", "Configured journey")}
          </span>
          <h2>
            {week === null
              ? text(
                  "المهمة صفر، أربعة أسابيع، ثم النتيجة",
                  "Task zero, four weeks, then the outcome",
                )
              : text(
                  week === 0
                    ? "المهمة صفر وبداية الرحلة"
                    : `الأسبوع ${week} · ${WEEK_TITLES[week][0]}`,
                  week === 0
                    ? "Task zero & getting started"
                    : `Week ${week} · ${WEEK_TITLES[week][1]}`,
                )}
          </h2>
        </div>
        <div className="jro-board-mode">
          <button
            aria-pressed={mode === "blueprint"}
            onClick={() => setMode("blueprint")}
          >
            <ListTree size={16} />
            {text("المخطط", "Blueprint")}
          </button>
          <button
            aria-pressed={mode === "overview"}
            onClick={() => setMode("overview")}
          >
            <Layers3 size={16} />
            {text("عرض الأسابيع", "Week overview")}
          </button>
        </div>
      </header>
      <div className="jro-board-toolbar">
        <div className="jro-week-switch">
          <button
            className={week === null ? "active" : ""}
            onClick={() => onWeek(null)}
          >
            {text("الرحلة كاملة", "Full journey")}
          </button>
          {[0, 1, 2, 3, 4].map((w) => (
            <button
              key={w}
              className={week === w ? "active" : ""}
              onClick={() => {
                onWeek(w);
                setMode("blueprint");
              }}
            >
              {w === 0
                ? text("المهمة صفر", "Task 0")
                : text("أسبوع ", "Week ") + w}
            </button>
          ))}
        </div>
        <div className="jro-camera-controls">
          <button
            className="jro-icon"
            aria-label={text("تصغير المخطط", "Zoom out")}
            disabled={mode === "overview" || view.z <= 0.5}
            onClick={() => zoomAt(view.z / 1.15)}
          >
            <Minus size={16} />
          </button>
          <output data-map-zoom>{Math.round(view.z * 100)}%</output>
          <button
            className="jro-icon"
            aria-label={text("تكبير المخطط", "Zoom in")}
            disabled={mode === "overview" || view.z >= 1.65}
            onClick={() => zoomAt(view.z * 1.15)}
          >
            <Plus size={16} />
          </button>
          <button
            className="jro-small"
            onClick={() => {
              setMode("blueprint");
              requestAnimationFrame(fit);
            }}
          >
            <Focus size={15} />
            {text("عرض مقروء", "Readable view")}
          </button>
        </div>
      </div>
      {mode === "overview" ? (
        <div className="jro-phase-overview">
          {data.weeks.map((w) => {
            const nodes = data.nodes.filter(
              (n) => n.weekNumber === w.week && n.code !== "ONBOARDING",
            );
            return (
              <article className="jro-phase-card" key={w.week}>
                <header>
                  <span className="jro-phase-number">
                    {w.week === 0 ? "00" : String(w.week).padStart(2, "0")}
                  </span>
                  <div>
                    <p>
                      {w.week === 0
                        ? text("قبل البداية", "Before week one")
                        : text("الأسبوع ", "Week ") + w.week}
                    </p>
                    <h3>
                      {text(...(WEEK_TITLES[w.week] as [string, string]))}
                    </h3>
                  </div>
                  <span className="jro-pill">
                    {w.current} {text("هنا", "here")}
                  </span>
                </header>
                <div className="jro-phase-steps">
                  {nodes.map((n, i) => (
                    <button
                      key={n.code}
                      onClick={() => select(n)}
                      className={n.current ? "occupied" : ""}
                    >
                      <span>
                        {/REVIEW|FINAL/.test(n.code)
                          ? text("المراجعة", "Review")
                          : w.week === 0
                            ? text("صفر", "Zero")
                            : String(i + 1).padStart(2, "0")}
                      </span>
                      <b>{n.requiredAppsCount || <Flag size={14} />}</b>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 py-2">
                  {data.guidance.filter(g => g.week === w.week).map(g => <button key={g.code} type="button" className="jro-text-button" data-overview-guidance={g.code} onClick={() => onSelectGuidance(g.code)}><Sparkles size={13} /> {text(g.titleAr, g.titleEn)} · {g.required ? g.current : g.pending} {text("بانتظار الإتمام", "pending")}</button>)}
                </div>
                <dl>
                  <div>
                    <dt>{text("وصلوا", "Reached")}</dt>
                    <dd>{w.entered}</dd>
                  </div>
                  <div>
                    <dt>{text("أكملوا الأسبوع", "Week completed")}</dt>
                    <dd>{w.completed}</dd>
                  </div>
                  <div>
                    <dt>{text("أولوية فحص", "Review queue")}</dt>
                    <dd>{w.needsReview}</dd>
                  </div>
                </dl>
                <button
                  className="jro-text-button"
                  onClick={() => {
                    onWeek(w.week);
                    setMode("blueprint");
                  }}
                >
                  {text("افتح المسار والطبقات", "Open steps & layers")}{" "}
                  <ChevronLeft size={15} />
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={`jro-camera-wrap ${week !== null ? "focused" : ""}`}>
          <div
            data-journey-map
            ref={viewport}
            className={`jro-camera ${rightHeld ? "zoom-armed" : ""} ${dragging ? "is-dragging" : ""}`}
            dir="ltr"
            tabIndex={0}
            role="region"
            aria-label={text(
              "اسحب بالزر الأيسر للتنقل. الزر الأيمن مع العجلة للتكبير. العجلة وحدها تمرر الصفحة.",
              "Drag with the left button to pan. Hold the right button and wheel to zoom. Wheel alone scrolls the page.",
            )}
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              if (e.button === 2) {
                e.preventDefault();
                right.current = true;
                setRightHeld(true);
                return;
              }
              if (
                e.button !== 0 ||
                (e.target as Element).closest("button,a,input,select,textarea")
              )
                return;
              auto.current = false;
              const v = viewRef.current;
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
              right.current = false;
              setRightHeld(false);
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                e.currentTarget.releasePointerCapture(e.pointerId);
            }}
            onPointerCancel={() => {
              drag.current = null;
              setDragging(false);
              right.current = false;
              setRightHeld(false);
            }}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              const shifts: Record<string, [number, number]> = {
                ArrowUp: [0, 70],
                ArrowDown: [0, -70],
                ArrowLeft: [70, 0],
                ArrowRight: [-70, 0],
              };
              if (shifts[e.key]) {
                e.preventDefault();
                auto.current = false;
                const [x, y] = shifts[e.key];
                setView((v) => ({ ...v, x: v.x + x, y: v.y + y }));
              } else if (["+", "="].includes(e.key)) {
                e.preventDefault();
                zoomAt(view.z * 1.15);
              } else if (e.key === "-") {
                e.preventDefault();
                zoomAt(view.z / 1.15);
              } else if (e.key === "0") {
                e.preventDefault();
                fit();
              }
            }}
          >
            <svg
              className="jro-canvas-svg"
              aria-label={text(
                "المهمة صفر والأسابيع ومهامها والإرشادات المرتبطة",
                "Task zero, weekly stages, tasks and linked guidance",
              )}
            >
              <defs>
                <pattern
                  id="jro-grid"
                  width="28"
                  height="28"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M28 0H0V28"
                    fill="none"
                    stroke="#cfdbd5"
                    strokeWidth=".6"
                  />
                </pattern>
                <marker
                  id="jro-arrow"
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3.5"
                  orient="auto"
                >
                  <path d="M0 0 7 3.5 0 7" fill="#47675c" />
                </marker>
                <marker
                  id="jro-guide-arrow"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0 0 6 3 0 6" fill="#9b7428" />
                </marker>
              </defs>
              <rect width="100%" height="100%" fill="url(#jro-grid)" />
              <g
                transform={`translate(${view.x} ${view.y}) scale(${view.z})`}
                style={{ "--jro-scale": view.z } as React.CSSProperties}
              >
                {layout.bands.map((b) => (
                  <g key={b.week}>
                    <rect
                      x="6"
                      y={b.y}
                      width={layout.width - 12}
                      height={b.height}
                      rx="14"
                      fill={b.week % 2 === 0 ? "#e1eae5" : "#edf2ef"}
                      stroke="#bfcec4"
                    />
                    <rect
                      x={b.labelX}
                      y={b.y + 10}
                      width="145"
                      height={b.height - 20}
                      rx="10"
                      fill="#184c3e"
                    />
                    <foreignObject
                      x={b.labelX + 9}
                      y={b.y + 22}
                      width="127"
                      height={b.height - 42}
                    >
                      <div className="jro-band-label" dir={ar ? "rtl" : "ltr"}>
                        <span>
                          {b.week === 0
                            ? "00"
                            : String(b.week).padStart(2, "0")}
                        </span>
                        <h3>
                          {b.week === 0
                            ? text("المهمة صفر", "Task zero")
                            : text("الأسبوع ", "Week ") + b.week}
                        </h3>
                        <p>
                          {text(...(WEEK_TITLES[b.week] as [string, string]))}
                        </p>
                        <b>
                          {data.weeks.find((w) => w.week === b.week)?.current ??
                            0}{" "}
                          {text("باحث هنا", "members here")}
                        </b>
                      </div>
                    </foreignObject>
                    {b.week > 0 &&
                      b.lanes.map((lane) => (
                        <g key={lane.kind}>
                          <line
                            x1="200"
                            x2="1315"
                            y1={lane.y - 9}
                            y2={lane.y - 9}
                            stroke="#bdcebf"
                            strokeDasharray="3 5"
                          />
                          <text
                            x={ar ? 190 : 1320}
                            y={lane.y + 25}
                            textAnchor={ar ? "end" : "start"}
                            fill="#385a40"
                            fontSize={Math.max(11, 10 / view.z)}
                          >
                            {lane.kind === "TAILORED"
                              ? text("طلبات مخصصة", "Tailored applications")
                              : lane.kind === "POSTS"
                                ? text("محتوى مهني", "Professional posts")
                                : lane.kind === "OUTREACH"
                                  ? text("تواصل مهني", "Outreach")
                                  : text(
                                      "إرشادات وتطبيق",
                                      "Guidance & application",
                                    )}
                          </text>
                        </g>
                      ))}
                  </g>
                ))}
                {layout.edges.map((edge) => {
                  const from = [...layout.cards, ...layout.cells].find((c) => c.id === edge.from)!,
                    to = [...layout.cards, ...layout.cells].find((c) => c.id === edge.to)!;
                  const highlighted =
                    traceCodes.has(from.id) && traceCodes.has(to.id);
                  const start = ar ? from.x : from.x + from.width,
                    end = ar ? to.x + to.width : to.x;
                  const y = from.y + from.height / 2;
                  const path =
                    edge.kind === "MAIN"
                      ? `M${start} ${y} H${end}`
                      : `M${from.x + from.width / 2} ${from.y + from.height} V${to.y - 22} H${to.x + to.width / 2} V${to.y}`;
                  return (
                    <path
                      key={edge.from + "-" + edge.to}
                      d={path}
                      fill="none"
                      stroke={highlighted ? "#126c50" : "#47675c"}
                      opacity={edge.kind === "NEXT_WEEK" ? 0.55 : 1}
                      strokeWidth={highlighted ? 3.5 : 1.7}
                      strokeDasharray={
                        edge.kind === "NEXT_WEEK" ? "5 4" : undefined
                      }
                      markerEnd="url(#jro-arrow)"
                    />
                  );
                })}
                {layout.cells.map((cell) => {
                  const parent = layout.cards.find(
                    (c) => c.id === cell.sourceCode,
                  );
                  if (!parent) return null;
                  const x = parent.x + parent.width / 2;
                  return (
                    <path
                      key={"edge-" + cell.id}
                      d={
                        cell.kind === "GUIDANCE" && cell.sourceCode === "TASK_0"
                          ? `M${parent.x} ${parent.y + parent.height / 2} H${cell.x + cell.width}`
                          : `M${x} ${parent.y + parent.height} V${cell.y}`
                      }
                      fill="none"
                      stroke={cell.kind === "GUIDANCE" ? "#9b7428" : "#a0b5a9"}
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      markerEnd={
                        cell.kind === "GUIDANCE"
                          ? "url(#jro-guide-arrow)"
                          : undefined
                      }
                    />
                  );
                })}
                {layout.cards.map((card) => {
                  const n = card.node,
                    sequence =
                      card.kind === "START"
                        ? n.code === "TASK_0"
                          ? "0"
                          : text("تهيئة", "Setup")
                        : card.kind === "REVIEW"
                          ? text(
                              n.code === "FINAL_REPORT"
                                ? "النتيجة"
                                : "المراجعة",
                              n.code === "FINAL_REPORT" ? "Outcome" : "Review",
                            )
                          : text("المهمة ", "Task ") +
                            (((n.orderIndex - 1) % 6) + 1);
                  return (
                    <foreignObject
                      key={card.id}
                      x={card.x}
                      y={card.y}
                      width={card.width}
                      height={card.height}
                    >
                      <button
                        data-blueprint-node={n.code}
                        aria-pressed={selected === n.code}
                        dir={ar ? "rtl" : "ltr"}
                        title={text(n.titleAr, n.titleEn)}
                        className={`jro-step ${card.kind.toLowerCase()} ${color(n, card.kind)} ${selected === n.code ? "selected" : ""} ${traceCodes.has(n.code) ? "traced" : ""}`}
                        onClick={() => select(n)}
                      >
                        <div className="jro-step-head">
                          <span>{sequence}</span>
                          {traced?.completedCodes.includes(n.code) ? (
                            <Check size={13} />
                          ) : n.current > 0 ? (
                            <span className="jro-step-count">
                              <Users size={11} />
                              {n.current}
                            </span>
                          ) : null}
                        </div>
                        <strong>
                          {card.kind === "REVIEW" ? (
                            <Flag size={21} />
                          ) : n.code === "ONBOARDING" ? (
                            <Compass size={21} />
                          ) : (
                            <>
                              {n.requiredAppsCount}
                              <small>{text("طلب", "apps")}</small>
                            </>
                          )}
                        </strong>
                        {!thinCells && (
                          <p>
                            {text(n.titleAr, n.titleEn)
                              .replace(/^الأسبوع \d\s*[-–]\s*المهمة \d:\s*/, "")
                              .replace(/^Week \d - Quest \d:\s*/, "")}
                          </p>
                        )}
                        <footer>
                          {overlay === "completion" ? (
                            <>
                              <span>
                                {text("أكمل", "done")} {n.completed}/{n.entered}
                              </span>
                              <b>
                                {n.completionRate === null
                                  ? "—"
                                  : n.completionRate + "%"}
                              </b>
                            </>
                          ) : overlay === "review" ? (
                            <>
                              <span>{text("للفحص", "review")}</span>
                              <b>{n.needsReview}</b>
                            </>
                          ) : (
                            <>
                              <span>
                                {n.durationDays
                                  ? text(
                                      `${n.durationDays} يوم`,
                                      `${n.durationDays} day`,
                                    )
                                  : text("بداية", "Start")}
                              </span>
                              <span>
                                {n.requiredTailoredCount ? (
                                  <>
                                    <FilePenLine size={10} />
                                    {n.requiredTailoredCount}
                                  </>
                                ) : (
                                  ""
                                )}
                                {n.requiredPostsCount ? (
                                  <>
                                    <Megaphone size={10} />
                                    {n.requiredPostsCount}
                                  </>
                                ) : (
                                  ""
                                )}
                                {n.requiredOutreachCount ? (
                                  <>
                                    <Send size={10} />
                                    {n.requiredOutreachCount}
                                  </>
                                ) : (
                                  ""
                                )}
                              </span>
                            </>
                          )}
                        </footer>
                      </button>
                    </foreignObject>
                  );
                })}
                {layout.cells.map((cell) => (
                  <foreignObject
                    key={cell.id}
                    x={cell.x}
                    y={cell.y}
                    width={cell.width}
                    height={cell.height}
                  >
                    {cell.kind === "GUIDANCE" ? (
                      <button
                        data-blueprint-guidance={cell.id}
                        dir={ar ? "rtl" : "ltr"}
                        className={`jro-guidance-cell ${cell.sourceCode === "TASK_0" ? "foundation" : ""} ${cell.guidance?.current ? "occupied" : ""}`}
                        title={
                          cell.guidance
                            ? text(cell.guidance.titleAr, cell.guidance.titleEn)
                            : ""
                        }
                        onClick={() => onSelectGuidance(cell.id)}
                      >
                        <Sparkles size={13} />
                        <span>
                          {cell.sourceCode === "TASK_0"
                            ? text(
                                "تأسيس السيرة الذاتية · تطبيق الإرشاد",
                                "Base CV · apply guidance",
                              )
                            : cell.guidance
                              ? text(
                                  cell.guidance.titleAr,
                                  cell.guidance.titleEn,
                                )
                              : text("إرشاد مرتبط", "Linked guidance")}
                        </span>
                        <div className="jro-guidance-counts">
                          <b><Users size={11} /> {cell.guidance?.required ? cell.guidance.current : cell.guidance?.pending ?? 0} {cell.guidance?.required ? text("هنا", "here") : text("بانتظار القراءة", "unread")}</b>
                          <small>{cell.guidance?.completed ?? 0} {text("مكتمل", "completed")} · {cell.guidance?.unlocked ?? 0} {text("متاح لهم", "available")}</small>
                        </div>
                      </button>
                    ) : (
                      <button
                        className={`jro-work-cell ${cell.kind.toLowerCase()}`}
                        onClick={() => {
                          const n = data.nodes.find(
                            (n) => n.code === cell.sourceCode,
                          );
                          if (n) onSelect(n);
                        }}
                        title={text(
                          "متطلب بالمحطة · افتح لفحص الإنجاز",
                          "Station requirement · inspect progress",
                        )}
                      >
                        <b>{cell.value}</b>
                        <span>
                          {cell.kind === "TAILORED"
                            ? text("طلب مخصص", "tailored")
                            : cell.kind === "POSTS"
                              ? text("منشور", "posts")
                              : text("تواصل", "outreach")}
                        </span>
                      </button>
                    )}
                  </foreignObject>
                ))}
              </g>
            </svg>
            <div className={`jro-mouse-hint ${rightHeld ? "armed" : ""}`}>
              <Mouse size={14} />
              {rightHeld
                ? text(
                    "الزووم جاهز · حرّك العجلة",
                    "Zoom armed · move the wheel",
                  )
                : text(
                    "زر أيمن + عجلة = زووم · اسحب للتنقل",
                    "Right button + wheel = zoom · drag to pan",
                  )}
            </div>
            <svg
              className="jro-minimap"
              data-minimap
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              role="img"
              aria-label={text(
                "خريطة مصغرة؛ اضغط للتنقل",
                "Minimap; click to navigate",
              )}
              onPointerDown={(e) => {
                e.stopPropagation();
                auto.current = false;
                const r = e.currentTarget.getBoundingClientRect(),
                  x = ((e.clientX - r.left) / r.width) * layout.width,
                  y = ((e.clientY - r.top) / r.height) * layout.height;
                setView((v) => ({
                  ...v,
                  x: size.w / 2 - x * v.z,
                  y: size.h / 2 - y * v.z,
                }));
              }}
            >
              <rect
                width={layout.width}
                height={layout.height}
                fill="#f0f4f1"
              />
              {layout.bands.map((b) => (
                <rect
                  key={b.week}
                  x="6"
                  y={b.y}
                  width={layout.width - 12}
                  height={b.height}
                  rx="20"
                  fill="#d3dfd6"
                />
              ))}
              {layout.cards.map((c) => (
                <rect
                  key={c.id}
                  x={c.x}
                  y={c.y}
                  width={c.width}
                  height={c.height}
                  fill={
                    c.node.current
                      ? "#155546"
                      : c.kind === "REVIEW"
                        ? "#47616a"
                        : "#fff"
                  }
                  stroke="#91a99b"
                />
              ))}
              <rect
                x={-view.x / view.z}
                y={-view.y / view.z}
                width={size.w / view.z}
                height={size.h / view.z}
                fill="#15554618"
                stroke="#155546"
                strokeWidth="10"
              />
            </svg>
          </div>
          {inspector && (
            <Modal
              isOpen
              onClose={onCloseInspection}
              size="2xl"
              title={text(
                data.nodes.find((n) => n.code === selected)?.titleAr ??
                  "فحص المحطة",
                data.nodes.find((n) => n.code === selected)?.titleEn ??
                  "Station inspection",
              )}
              subtitle={text(
                "متطلبات المحطة، الأعضاء، والأدلة المتاحة",
                "Station requirements, members and available evidence",
              )}
            >
              <div
                className="jro-shell jro-inspector-dialog"
                dir={ar ? "rtl" : "ltr"}
              >
                {inspector}
              </div>
            </Modal>
          )}
        </div>
      )}
      {data.guidance.some(
        (g) => !g.nodeCode && (week === null || g.week === week),
      ) && (
        <div className="jro-conditional-guidance">
          <span>
            <Sparkles size={14} />
            {text("توجيهات تفتح بشروط إضافية", "Condition-triggered guidance")}
          </span>
          {data.guidance
            .filter((g) => !g.nodeCode && (week === null || g.week === week))
            .map((g) => (
              <article key={g.code}>
                <strong>{text(g.titleAr, g.titleEn)}</strong>
                <small>
                  {g.code.includes("ADVANCED")
                    ? text(
                        "عند المقابلة أو الأسيمنت",
                        "On interview or assignment",
                      )
                    : text(
                        "بدون ارتباط ثابت بمحطة واحدة",
                        "Not tied to one fixed station",
                      )}
                </small>
                <b>
                  {g.read}/{g.unlocked}{" "}
                  {text("قراءة / إتاحة", "read / unlocked")}
                </b>
                <button type="button" className="jro-text-button" onClick={() => onSelectGuidance(g.code)}>{text("عرض الأعضاء", "View members")}</button>
              </article>
            ))}
        </div>
      )}
      <footer className="jro-board-legend">
        <div>
          <span>
            <i className="work" />
            {text("طلبات / مهمة", "Applications / task")}
          </span>
          <span>
            <i className="tailored" />
            {text("مخصص", "Tailored")}
          </span>
          <span>
            <i className="posts" />
            {text("محتوى", "Posts")}
          </span>
          <span>
            <i className="outreach" />
            {text("تواصل", "Outreach")}
          </span>
          <span>
            <i className="guidance" />
            {text("إرشاد", "Guidance")}
          </span>
          <span>
            <i className="review" />
            {text("تقييم / تقرير", "Review / report")}
          </span>
        </div>
        <p>
          {text(
            "الأرقام بالبطاقات متطلبات فعلية؛ الشارة تبين الباحثين الموجودين الآن.",
            "Card numbers are configured requirements; the badge shows members currently here.",
          )}
        </p>
      </footer>
    </section>
  );
}
