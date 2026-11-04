import { useRef, useState, type FormEvent, type PointerEvent } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Network,
  Save,
  RotateCcw,
  BookOpen,
  Maximize2,
} from "lucide-react";
import { useLibrary } from "./LibraryContext";
import type { KnowledgeMap, MapNode, MapEdge } from "./domain/types";
import { arrangeGraph, uid, visibleGraph } from "./domain/model.mjs";
import { csv, Dialog, Empty, readerUrl, useWords } from "./ui";
export function MapsView() {
  const { document, commit, setDraft, draft } = useLibrary(),
    t = useWords(),
    navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null),
    [working, setWorking] = useState<KnowledgeMap | null>(null),
    [newMap, setNewMap] = useState(false),
    [add, setAdd] = useState(false),
    [edge, setEdge] = useState(false),
    [topic, setTopic] = useState(false),
    [scale, setScale] = useState(0.75);
  const map =
      working ||
      (selected ? document.maps.find((x) => x.id === selected) : undefined),
    svg = useRef<SVGSVGElement>(null),
    drag = useRef<{
      id: string;
      x: number;
      y: number;
      startX: number;
      startY: number;
    } | null>(null);
  const names = {
    prepares: t("يمهّد له", "Prepares for"),
    deepens: t("يتعمق فيه", "Deepens"),
    applies: t("يطبّقه", "Applies"),
    contrasts: t("منظور مختلف", "Different perspective"),
  };
  const frame = useRef({ x: 0, y: 0, width: 800, height: 600 });
  if (map && !drag.current) {
    const minX = Math.min(...map.nodes.map((n) => n.x)) - 120,
      minY = Math.min(...map.nodes.map((n) => n.y)) - 120;
    frame.current = {
      x: minX,
      y: minY,
      width: Math.max(
        800,
        Math.max(...map.nodes.map((n) => n.x + 170)) - minX + 120,
      ),
      height: Math.max(
        600,
        Math.max(...map.nodes.map((n) => n.y + 150)) - minY + 120,
      ),
    };
  }
  const bounds = frame.current;
  function title(node: MapNode) {
    if (node.kind === "book")
      return (
        document.books.find((b) => b.id === node.refId)?.title || node.title
      );
    if (node.kind === "note")
      return (
        document.notes.find((n) => n.id === node.refId)?.body.slice(0, 100) ||
        node.title
      );
    if (node.kind === "chapter")
      return (
        document.editions
          .flatMap((e) => e.chapters)
          .find((c) => c.id === node.refId)?.title || node.title
      );
    return node.title;
  }
  function change(next: KnowledgeMap) {
    setWorking(next);
    setDraft(true);
  }
  function leave() {
    if (
      !draft ||
      window.confirm(t("تجاهل تعديلات الخريطة؟", "Discard map changes?"))
    ) {
      setWorking(null);
      setSelected(null);
      setDraft(false);
    }
  }
  function openNode(node: MapNode) {
    if (node.kind === "book") navigate(readerUrl(node.refId));
    if (node.kind === "note") {
      const n = document.notes.find((x) => x.id === node.refId);
      if (n) navigate(readerUrl(n.bookId, n.editionId, n.page));
    }
    if (node.kind === "chapter") {
      const e = document.editions.find((x) =>
          x.chapters.some((c) => c.id === node.refId),
        ),
        c = e?.chapters.find((x) => x.id === node.refId);
      if (e && c) navigate(readerUrl(e.bookId, e.id, c.start));
    }
  }
  function point(event: PointerEvent) {
    const matrix = svg.current?.getScreenCTM();
    return matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(
          matrix.inverse(),
        )
      : { x: 0, y: 0 };
  }
  function move(event: PointerEvent) {
    if (!drag.current || !map) return;
    const p = point(event),
      d = drag.current;
    change({
      ...map,
      nodes: map.nodes.map((n) =>
        n.id === d.id
          ? { ...n, x: d.x + p.x - d.startX, y: d.y + p.y - d.startY }
          : n,
      ),
    });
  }
  return (
    <>
      {!map ? (
        <>
          <div className="ll-toolbar">
            <p>
              {t(
                "كل خريطة تجيب عن سؤال؛ الروابط تحتفظ بأسبابها.",
                "Each map answers a question. Connections keep their reasons.",
              )}
            </p>
            <button
              className="ll-button primary"
              onClick={() => setNewMap(true)}
            >
              <Plus size={16} />
              {t("خريطة جديدة", "New map")}
            </button>
          </div>
          {document.maps.length ? (
            <div className="ll-notes-grid">
              {document.maps.map((m) => (
                <button
                  key={m.id}
                  className="ll-map-card"
                  onClick={() => setSelected(m.id)}
                >
                  <Network size={30} />
                  <h3>{m.title}</h3>
                  <p>{m.topics.join(" · ")}</p>
                  <small>
                    {m.nodes.length +
                      " " +
                      t("عقدة", "nodes") +
                      " · " +
                      m.edges.length +
                      " " +
                      t("رابطًا بسبب موثق", "connections with reasons")}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title={t(
                "ابدأ بكتاب أو موضوع، لا بلوحة مزدحمة",
                "Start with a book or topic, not a crowded board",
              )}
            >
              {t(
                "أضف الكتب والأفكار المناسبة للسؤال الحالي فقط. يمكنك ربط موضوع ثانٍ عندما تقرر ذلك.",
                "Add only books and ideas relevant to your current question. Bring in another topic explicitly when needed.",
              )}
            </Empty>
          )}
        </>
      ) : (
        <>
          <div className="ll-toolbar">
            <div>
              <button className="ll-back" onClick={leave}>
                {t("كل الخرائط", "All maps")}
              </button>
              <h2>{map.title}</h2>
              <p>{map.topics.join(" · ")}</p>
            </div>
            <div className="ll-actions">
              <button className="ll-button" onClick={() => setAdd(true)}>
                <Plus size={16} />
                {t("أضف عقدة", "Add node")}
              </button>
              <button
                className="ll-button"
                disabled={map.nodes.length < 2}
                onClick={() => setEdge(true)}
              >
                {t("أضف رابطًا وسببه", "Add connection & reason")}
              </button>
              <button className="ll-button" onClick={() => setTopic(true)}>
                {t("ربط موضوع آخر", "Link another topic")}
              </button>
              <button
                className="ll-button"
                onClick={() => change({ ...map, nodes: arrangeGraph(map) })}
              >
                <RotateCcw size={15} />
                {t("ترتيب عند الطلب", "Arrange on request")}
              </button>
              <button
                className="ll-button primary"
                disabled={!working}
                onClick={async () => {
                  if (await commit("map", { map })) {
                    setWorking(null);
                    setDraft(false);
                  }
                }}
              >
                <Save size={16} />
                {t("حفظ الخريطة", "Save map")}
              </button>
            </div>
          </div>
          <div className="ll-map-meta">
            <span>
              {working
                ? t("تغييرات غير محفوظة", "Unsaved changes")
                : t("الخريطة محفوظة", "Map saved")}
            </span>
            <label>
              {t("التكبير", "Zoom")}
              <input
                type="range"
                min={35}
                max={120}
                value={scale * 100}
                onChange={(e) => setScale(Number(e.target.value) / 100)}
              />
            </label>
            <span>
              {t(
                "اسحب العقدة، أو حرّكها بأسهم الكيبورد. الطي يخفي فروعها فقط.",
                "Drag a node, or move it with arrow keys. Folding hides its branches only.",
              )}
            </span>
          </div>
          <div
            className="ll-map-scroll"
            tabIndex={0}
            aria-label={t(
              "لوحة خريطة المعرفة، قابلة للتمرير",
              "Scrollable knowledge map canvas",
            )}
          >
            <svg
              ref={svg}
              className="ll-graph"
              style={{
                width: bounds.width * scale,
                height: bounds.height * scale,
                minWidth: "100%",
                minHeight: "100%",
              }}
              viewBox={[bounds.x, bounds.y, bounds.width, bounds.height].join(
                " ",
              )}
              onPointerMove={move}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            >
              <defs>
                <marker
                  id="ll-arrow"
                  markerWidth="8"
                  markerHeight="8"
                  refX="7"
                  refY="4"
                  orient="auto"
                >
                  <path d="M0,0 L8,4 L0,8Z" />
                </marker>
                <pattern
                  id="ll-dots"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="2" cy="2" r="1" />
                </pattern>
              </defs>
              <rect
                x={bounds.x}
                y={bounds.y}
                width={bounds.width}
                height={bounds.height}
                fill="url(#ll-dots)"
              />
              {visibleGraph(map).edges.map((e) => {
                const a = map.nodes.find((n) => n.id === e.source)!,
                  b = map.nodes.find((n) => n.id === e.target)!;
                return (
                  <g key={e.id} className={"ll-graph-edge " + e.kind}>
                    <line
                      x1={a.x + 85}
                      y1={a.y + 70}
                      x2={b.x + 85}
                      y2={b.y + 70}
                      markerEnd="url(#ll-arrow)"
                    />
                    <text
                      x={(a.x + b.x) / 2 + 85}
                      y={(a.y + b.y) / 2 + 60}
                      textAnchor="middle"
                    >
                      {names[e.kind]}
                    </text>
                    <title>{e.reason}</title>
                  </g>
                );
              })}
              {visibleGraph(map).nodes.map((node) => {
                const book =
                  node.kind === "book"
                    ? document.books.find((x) => x.id === node.refId)
                    : null;
                return (
                  <g
                    key={node.id}
                    transform={"translate(" + node.x + " " + node.y + ")"}
                    className={
                      "ll-graph-node " +
                      (node.id === map.rootId ? "is-root" : "")
                    }
                    tabIndex={0}
                    role="group"
                    aria-label={title(node)}
                    onPointerDown={(event) => {
                      if ((event.target as Element).closest("button,a")) return;
                      const p = point(event);
                      drag.current = {
                        id: node.id,
                        x: node.x,
                        y: node.y,
                        startX: p.x,
                        startY: p.y,
                      };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onKeyDown={(event) => {
                      const direction = {
                        ArrowLeft: [-10, 0],
                        ArrowRight: [10, 0],
                        ArrowUp: [0, -10],
                        ArrowDown: [0, 10],
                      }[event.key];
                      if (direction) {
                        event.preventDefault();
                        change({
                          ...map,
                          nodes: map.nodes.map((n) =>
                            n.id === node.id
                              ? {
                                  ...n,
                                  x: n.x + direction[0],
                                  y: n.y + direction[1],
                                }
                              : n,
                          ),
                        });
                      }
                    }}
                  >
                    <rect width="170" height="150" rx="14" />
                    <foreignObject width="170" height="150">
                      <div className="ll-node-content">
                        {book?.cover ? (
                          <img src={book.cover} alt="" draggable={false} />
                        ) : (
                          <BookOpen size={20} />
                        )}
                        <strong>{title(node)}</strong>
                        <div>
                          <button
                            type="button"
                            onClick={() => openNode(node)}
                            disabled={node.kind === "idea"}
                          >
                            {t("افتح المرجع", "Open source")}
                          </button>
                          <button
                            type="button"
                            aria-pressed={node.collapsed}
                            onClick={() =>
                              change({
                                ...map,
                                nodes: map.nodes.map((n) =>
                                  n.id === node.id
                                    ? { ...n, collapsed: !n.collapsed }
                                    : n,
                                ),
                              })
                            }
                          >
                            {node.collapsed
                              ? t("افتح الفرع", "Unfold")
                              : t("اطوِ الفرع", "Fold")}
                          </button>
                        </div>
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </svg>
          </div>
          <details className="ll-connections">
            <summary>
              {t("أسباب الروابط — عرض نصي", "Connection reasons — text view")}
            </summary>
            {map.edges.map((e) => (
              <article key={e.id}>
                <strong>
                  {title(map.nodes.find((n) => n.id === e.source)!) +
                    " → " +
                    title(map.nodes.find((n) => n.id === e.target)!)}
                </strong>
                <small>{names[e.kind]}</small>
                <p>{e.reason}</p>
              </article>
            ))}
          </details>
        </>
      )}
      {newMap && (
        <Dialog
          title={t("خريطة تبدأ بسؤال", "A map that starts with a question")}
          onClose={() => setNewMap(false)}
        >
          <form
            className="ll-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget),
                book = document.books.find((x) => x.id === data.get("book")),
                rootId = uid(),
                title = String(data.get("title"));
              const m: KnowledgeMap = {
                id: uid(),
                title,
                topics: csv(String(data.get("topics"))),
                rootId,
                nodes: [
                  {
                    id: rootId,
                    kind: book ? "book" : "idea",
                    refId: book?.id || "",
                    title: book?.title || title,
                    x: 570,
                    y: 380,
                    collapsed: false,
                  },
                ],
                edges: [],
              };
              if (await commit("map", { map: m })) {
                setSelected(m.id);
                setNewMap(false);
              }
            }}
          >
            <label>
              {t("موضوع الخريطة أو سؤالها", "Map topic or question")}
              <input required name="title" />
            </label>
            <label>
              {t("ابدأ بكتاب — اختياري", "Start with a book — optional")}
              <select name="book">
                <option value="">
                  {t("موضوع أو فكرة مركزية", "Central topic or idea")}
                </option>
                {document.books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t(
                "الموضوعات الظاهرة — افصل بفاصلة",
                "Visible topics — comma separated",
              )}
              <input name="topics" />
            </label>
            <button className="ll-button primary">
              {t("إنشاء الخريطة", "Create map")}
            </button>
          </form>
        </Dialog>
      )}
      {map && add && (
        <NodeDialog
          map={map}
          onClose={() => setAdd(false)}
          onAdd={(node) => {
            change({ ...map, nodes: [...map.nodes, node] });
            setAdd(false);
          }}
        />
      )}
      {map && edge && (
        <Dialog
          title={t("الرابط ومعناه", "Connection and its meaning")}
          onClose={() => setEdge(false)}
        >
          <form
            className="ll-form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const connection: MapEdge = {
                id: uid(),
                source: String(data.get("source")),
                target: String(data.get("target")),
                kind: String(data.get("kind")) as MapEdge["kind"],
                reason: String(data.get("reason")),
              };
              if (connection.source === connection.target) return;
              change({ ...map, edges: [...map.edges, connection] });
              setEdge(false);
            }}
          >
            {(["source", "target"] as const).map((key, i) => (
              <label key={key}>
                {i ? t("إلى", "To") : t("من", "From")}
                <select name={key} defaultValue={map.nodes[i]?.id}>
                  {map.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {title(n)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              {t("نوع العلاقة", "Connection type")}
              <select name="kind">
                {Object.entries(names).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("لماذا ربطتهما؟", "Why did you connect them?")}
              <textarea name="reason" required maxLength={6000} />
            </label>
            <button className="ll-button primary">
              {t("أضف الرابط", "Add connection")}
            </button>
          </form>
        </Dialog>
      )}
      {map && topic && (
        <Dialog
          title={t("الموضوعات المعروضة", "Visible topics")}
          onClose={() => setTopic(false)}
        >
          <form
            className="ll-form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              change({ ...map, topics: csv(String(data.get("topics"))) });
              setTopic(false);
            }}
          >
            <p>
              {t(
                "هذا يوسع سياق الخريطة باختيارك؛ لا يضيف كل كتب المكتبة تلقائيًا.",
                "This expands the map context explicitly; it does not automatically add every library book.",
              )}
            </p>
            <label>
              {t("الموضوعات — افصل بفاصلة", "Topics — comma separated")}
              <input name="topics" defaultValue={map.topics.join(", ")} />
            </label>
            <button className="ll-button primary">
              {t("اعتماد الموضوعات", "Apply topics")}
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
function NodeDialog({
  map,
  onClose,
  onAdd,
}: {
  map: KnowledgeMap;
  onClose(): void;
  onAdd(node: MapNode): void;
}) {
  const { document } = useLibrary(),
    t = useWords(),
    [kind, setKind] = useState<MapNode["kind"]>("book");
  const choices =
    kind === "book"
      ? document.books.map((b) => ({ id: b.id, title: b.title }))
      : kind === "note"
        ? document.notes.map((n) => ({ id: n.id, title: n.body.slice(0, 100) }))
        : kind === "chapter"
          ? document.editions.flatMap((e) =>
              e.chapters.map((c) => ({ id: c.id, title: c.title })),
            )
          : [];
  return (
    <Dialog
      title={t("أضف ما يخدم موضوع الخريطة", "Add what serves this map")}
      onClose={onClose}
    >
      <form
        className="ll-form"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget),
            ref = choices.find((x) => x.id === form.get("refId"));
          onAdd({
            id: uid(),
            kind,
            refId: ref?.id || "",
            title: ref?.title || String(form.get("title")),
            x: 570 + ((map.nodes.length % 3) - 1) * 260,
            y: 150 + Math.floor(map.nodes.length / 3) * 190,
            collapsed: false,
          });
        }}
      >
        <label>
          {t("نوع العقدة", "Node type")}
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as MapNode["kind"])}
          >
            <option value="book">{t("كتاب", "Book")}</option>
            <option value="chapter">{t("فصل", "Chapter")}</option>
            <option value="note">{t("ملاحظة", "Note")}</option>
            <option value="idea">{t("فكرة", "Idea")}</option>
          </select>
        </label>
        {kind === "idea" ? (
          <label>
            {t("الفكرة", "Idea")}
            <input required name="title" />
          </label>
        ) : (
          <label>
            {t("اختر المرجع", "Choose source")}
            <select name="refId" required>
              {choices.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          className="ll-button primary"
          disabled={kind !== "idea" && !choices.length}
        >
          {t("أضف العقدة", "Add node")}
        </button>
      </form>
    </Dialog>
  );
}
