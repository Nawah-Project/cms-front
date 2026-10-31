import { useEffect, useId, useRef, useState, type RefObject } from "react";
import type { HomePreview } from "./home-preview-api";
type Edge = { d: string; kind: string };
/** Only the connecting trail is SVG. The responsive cards remain in document flow. */
export function JourneyConnections({
  root,
  data,
  rtl,
}: {
  root: RefObject<HTMLDivElement | null>;
  data: HomePreview;
  rtl: boolean;
}) {
  const id = useId().replace(/:/g, ""),
    frame = useRef(0);
  const [paths, setPaths] = useState<{
    width: number;
    height: number;
    edges: Edge[];
  }>({ width: 1, height: 1, edges: [] });
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let active = true;
    const measure = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        if (!active) return;
        const box = el.getBoundingClientRect(),
          mobile = el.dataset.trailColumns === "1",
          edges: Edge[] = [];
        const rect = (key: string) => {
          const target = el.querySelector<HTMLElement>(
              `[data-home-anchor="${CSS.escape(key)}"]`,
            ),
            r = target?.getBoundingClientRect();
          return target && r
            ? {
                x: r.left - box.left,
                y: r.top - box.top,
                w: r.width,
                h: r.height,
                row: Number(
                  target.closest<HTMLElement>("[data-trail-row]")?.dataset
                    .trailRow ?? 0,
                ),
              }
            : null;
        };
        const all = data.weeks.flatMap((w) => w.nodes),
          order = ["ONBOARDING", ...all.map((n) => n.code)];
        order.forEach((key, index) => {
          const a = rect(key),
            b = order[index + 1] ? rect(order[index + 1]) : null;
          if (!a || !b) return;
          const node = all.find((n) => n.code === key),
            kind = `main ${node?.status === "LOCKED" ? "future" : node?.status === "COMPLETED" || key === "ONBOARDING" ? "completed" : "current"}`;
          const sy = a.y + a.h * 0.48,
            ey = b.y + b.h * 0.48;
          if (!mobile && a.row === b.row) {
            const rightward = b.x > a.x,
              sx = rightward ? a.x + a.w : a.x,
              ex = rightward ? b.x : b.x + b.w,
              mid = (sx + ex) / 2;
            edges.push({
              kind,
              d: `M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${ey}, ${ex} ${ey}`,
            });
          } else {
            const left = mobile ? !rtl : a.x + a.w / 2 < box.width / 2;
            const sx = left ? a.x : a.x + a.w,
              ex = left ? b.x : b.x + b.w;
            const gx = left
              ? Math.max(9, Math.min(a.x, b.x) - 22)
              : Math.min(box.width - 9, Math.max(a.x + a.w, b.x + b.w) + 22);
            const bend = Math.min(22, (ey - sy) / 3);
            edges.push({
              kind,
              d: `M ${sx} ${sy} C ${gx} ${sy}, ${gx} ${sy + bend}, ${gx} ${sy + bend} L ${gx} ${ey - bend} C ${gx} ${ey}, ${gx} ${ey}, ${ex} ${ey}`,
            });
          }
        });
        all.forEach((n) => {
          const a = rect(n.code);
          if (!a) return;
          n.branches.forEach((branch) => {
            const b = rect(branch.id);
            if (!b) return;
            const x = a.x + a.w / 2,
              bx = b.x + b.w / 2,
              start = a.y + a.h,
              mid = b.y - 8;
            edges.push({
              kind: "branch",
              d: `M ${x} ${start} V ${mid - 5} Q ${x} ${mid} ${(x + bx) / 2} ${mid} H ${bx} V ${b.y}`,
            });
          });
        });
        setPaths({ width: box.width, height: box.height, edges });
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.querySelectorAll("[data-home-anchor]").forEach((n) =>
      observer.observe(n),
    );
    document.fonts.ready.then(measure);
    measure();
    return () => {
      active = false;
      observer.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, [data, rtl, root]);
  return (
    <svg
      className="home-connections"
      width={paths.width}
      height={paths.height}
      aria-hidden="true"
    >
      <defs>
        <marker
          id={`trail-direction-${id}`}
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="m0 0 8 4-8 4Z" fill="#527e67" />
        </marker>
      </defs>
      {paths.edges.map((p, i) => (
        <path
          key={i}
          d={p.d}
          className={p.kind}
          markerEnd={`url(#trail-direction-${id})`}
        />
      ))}
    </svg>
  );
}
