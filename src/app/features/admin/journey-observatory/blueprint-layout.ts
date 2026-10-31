import type { Guidance, Station } from "./api";
export type Placement = {
  id: string;
  node: Station;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "START" | "QUEST" | "REVIEW";
};
export type LaneCell = {
  id: string;
  sourceCode: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: "TAILORED" | "POSTS" | "OUTREACH" | "GUIDANCE";
  value?: number;
  guidance?: Guidance;
};
export function buildBlueprint(
  nodes: Station[],
  guidance: Guidance[],
  week: number | null,
  rtl: boolean,
) {
  const all = week === null;
  const phases = all ? [0, 1, 2, 3, 4] : [week];
  const width = 1500;
  let y = 18;
  const cards: Placement[] = [],
    cells: LaneCell[] = [],
    bands: {
      week: number;
      y: number;
      height: number;
      labelX: number;
      lanes: { kind: LaneCell["kind"]; y: number }[];
    }[] = [],
    edges: { from: string; to: string; kind: "MAIN" | "NEXT_WEEK" }[] = [];
  const xAt = (index: number) => (rtl ? 1130 - index * 184 : 200 + index * 184);
  for (const w of phases) {
    const list = nodes
      .filter((n) => n.weekNumber === w)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    if (!list.length) continue;
    const activityKinds = (
      [
        { kind: "TAILORED", field: "requiredTailoredCount" },
        { kind: "POSTS", field: "requiredPostsCount" },
        { kind: "OUTREACH", field: "requiredOutreachCount" },
      ] as const
    ).filter((k) => list.some((n) => n[k.field] > 0));
    const laneStart = y + 180,
      laneGap = all ? 52 : 60;
    const hasGuidance = guidance.some((g) =>
      list.some((n) => g.nodeCode === n.code),
    );
    const lanes: { kind: LaneCell["kind"]; y: number }[] = activityKinds.map(
      (k, i) => ({ kind: k.kind, y: laneStart + i * laneGap }),
    );
    if (hasGuidance && w > 0)
      lanes.push({
        kind: "GUIDANCE",
        y: laneStart + activityKinds.length * laneGap,
      });
    const guidanceRows = Math.max(
      1,
      ...list.map((n) => guidance.filter((g) => g.nodeCode === n.code).length),
    );
    const height =
      w === 0
        ? 165
        : 180 +
          activityKinds.length * laneGap +
          (hasGuidance ? 90 + (guidanceRows - 1) * 76 : 20);
    bands.push({ week: w, y, height, labelX: rtl ? 1335 : 15, lanes });
    if (w === 0) {
      for (const [i, n] of list.entries())
        cards.push({
          id: n.code,
          node: n,
          x: rtl ? xAt(i) : xAt(i),
          y: y + 27,
          width: 165,
          height: 120,
          kind: "START",
        });
      const foundation = guidance.find(
        (g) => g.code === "INSIGHT_TASK_0_CV_BASE",
      );
      if (foundation) {
        const task = cards.find((n) => n.id === "TASK_0");
        if (task)
          cells.push({
            id: foundation.code,
            sourceCode: "TASK_0",
            x: rtl ? task.x - 390 : task.x + 195,
            y: y + 44,
            width: 350,
            height: 78,
            kind: "GUIDANCE",
            guidance: foundation,
          });
      }
    } else {
      for (const [i, n] of list.entries()) {
        const review =
          /REVIEW|FINAL/.test(n.nodeType) || /REVIEW|FINAL/.test(n.code);
        cards.push({
          id: n.code,
          node: n,
          x: xAt(i),
          y: y + 38,
          width: 165,
          height: 120,
          kind: review ? "REVIEW" : "QUEST",
        });
        activityKinds.forEach(({ kind, field }) => {
          const value = n[field],
            lane = lanes.find((l) => l.kind === kind);
          if (value > 0 && lane)
            cells.push({
              id: kind + "-" + n.code,
              sourceCode: n.code,
              x: xAt(i) + 10,
              y: lane.y,
              width: 145,
              height: 42,
              kind,
              value,
            });
        });
        const gs = guidance.filter((g) => g.nodeCode === n.code);
        gs.forEach((g, j) =>
          cells.push({
            id: g.code,
            sourceCode: n.code,
            x: xAt(i) - 3,
            y:
              (lanes.find((l) => l.kind === "GUIDANCE")?.y ?? y + 155) + j * 76,
            width: 171,
            height: 74,
            kind: "GUIDANCE",
            guidance: g,
          }),
        );
      }
    }
    for (let i = 0; i < list.length - 1; i++)
      edges.push({ from: list[i].code, to: list[i + 1].code, kind: "MAIN" });
    y += height + 18;
  }
  if (all) {
    for (let w = 0; w < 4; w++) {
      const last = cards.filter((c) => c.node.weekNumber === w).at(-1),
        first = cards.find((c) => c.node.weekNumber === w + 1);
      if (last && first)
        edges.push({
          from:
            w === 0 && cells.some((c) => c.id === "INSIGHT_TASK_0_CV_BASE")
              ? "INSIGHT_TASK_0_CV_BASE"
              : last.id,
          to: first.id,
          kind: "NEXT_WEEK",
        });
    }
  }
  return { width, height: y + 20, bands, cards, cells, edges, all };
}
