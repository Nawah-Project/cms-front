import { useEffect, useRef, useState, type RefObject } from "react";
import type { HomePreview } from "./home-preview-api";
type Edge = { d: string; kind: string };
/** SVG only draws connectors. Cards, layout and scrolling remain ordinary document flow. */
export function JourneyConnections({
  root,
  data,
  rtl,
}: {
  root: RefObject<HTMLDivElement | null>;
  data: HomePreview;
  rtl: boolean;
}) {
  const [paths, setPaths] = useState<{
    width: number;
    height: number;
    edges: Edge[];
  }>({ width: 1, height: 1, edges: [] });
  const frame = useRef(0);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const box = el.getBoundingClientRect(),
          mobile = el.clientWidth < 760,
          edges: Edge[] = [];
        const rect = (id: string) => {
          const r = el
            .querySelector<HTMLElement>(
              `[data-home-anchor="${CSS.escape(id)}"]`,
            )
            ?.getBoundingClientRect();
          return r
            ? {
                x: r.left - box.left,
                y: r.top - box.top,
                w: r.width,
                h: r.height,
              }
            : null;
        };
        const all = data.weeks.flatMap((w) => w.nodes);
        const start = rect("ONBOARDING"),
          first = rect(all[0]?.code ?? "");
        if (start && first) {
          if (mobile) {
            const x = start.x + start.w / 2;
            edges.push({
              kind: "main",
              d: `M ${x} ${start.y + start.h} V ${first.y}`,
            });
          } else {
            const sx = rtl ? start.x : start.x + start.w,
              ex = rtl ? first.x + first.w : first.x;
            const mid = (sx + ex) / 2;
            edges.push({
              kind: "main",
              d: `M ${sx} ${start.y + start.h / 2} H ${mid} V ${first.y + 51} H ${ex}`,
            });
          }
        }

        all.forEach((n, i) => {
          const a = rect(n.code),
            next = all[i + 1],
            b = next && rect(next.code);
          if (!a) return;
          if (b) {
            const cross = n.week !== next.week;
            if (mobile || cross) {
              const sx = mobile
                ? rtl
                  ? a.x + a.w - 18
                  : a.x + 18
                : a.x + a.w / 2;
              const ex = mobile
                ? rtl
                  ? b.x + b.w - 18
                  : b.x + 18
                : b.x + b.w / 2;
              const sy = a.y + a.h,
                ey = b.y;
              const gutter = rtl ? box.width - 8 : 8;
              edges.push({
                kind: cross ? "next-week" : "main",
                d: mobile
                  ? `M ${sx} ${sy} H ${gutter} V ${ey - 10} H ${ex} V ${ey}`
                  : `M ${sx} ${sy} V ${sy + 16} H ${gutter} V ${ey - 15} H ${ex} V ${ey}`,
              });
            } else {
              const sx = rtl ? a.x : a.x + a.w,
                ex = rtl ? b.x + b.w : b.x;
              edges.push({ kind: "main", d: `M ${sx} ${a.y + 51} H ${ex}` });
            }
          }
          n.branches.forEach((branch) => {
            const b = rect(branch.id);
            if (!b) return;
            const x = a.x + a.w / 2;
            edges.push({
              kind: "branch",
              d: `M ${x} ${a.y + a.h} V ${b.y - 7} H ${b.x + b.w / 2} V ${b.y}`,
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
          id="home-direction"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="m0 0 8 4-8 4Z" fill="#729385" />
        </marker>
      </defs>
      {paths.edges.map((p, i) => (
        <path
          key={i}
          d={p.d}
          className={p.kind}
          markerEnd="url(#home-direction)"
        />
      ))}
    </svg>
  );
}
