import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Note, Rect } from "../domain/types";
import { useWords } from "../ui";
export function PdfPage({
  pdf,
  page,
  zoom,
  mode,
  contrast,
  positionMode,
  notes,
  onSelection,
  onNote,
}: {
  pdf: PDFDocumentProxy;
  page: number;
  zoom: number;
  mode: string;
  contrast: number;
  positionMode: boolean;
  notes: Note[];
  onSelection(value: { quote: string; rectangles: Rect[] }): void;
  onNote(note: Note): void;
}) {
  const parent = useRef<HTMLDivElement>(null),
    paper = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    text = useRef<HTMLDivElement>(null),
    start = useRef<{ x: number; y: number } | null>(null);
  const [width, setWidth] = useState(700),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    t = useWords();
  useEffect(() => {
    if (!parent.current) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(200, entries[0].contentRect.width - 32)),
    );
    observer.observe(parent.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let closed = false,
      render: { cancel(): void } | undefined,
      layer: { cancel(): void } | undefined;
    setError("");
    setLoading(true);
    void (async () => {
      const pdfjs = await import("pdfjs-dist"),
        source = await pdf.getPage(page);
      if (closed) return;
      const base = source.getViewport({ scale: 1 }),
        viewport = source.getViewport({ scale: (width / base.width) * zoom }),
        output = Math.min(
          window.devicePixelRatio || 1,
          2,
          Math.sqrt(12000000 / (viewport.width * viewport.height)),
        );
      const surface = canvas.current!,
        container = text.current!;
      surface.width = Math.ceil(viewport.width * output);
      surface.height = Math.ceil(viewport.height * output);
      surface.style.width = viewport.width + "px";
      surface.style.height = viewport.height + "px";
      paper.current!.style.width = viewport.width + "px";
      paper.current!.style.height = viewport.height + "px";
      container.replaceChildren();
      container.style.setProperty(
        "--total-scale-factor",
        String(viewport.scale),
      );
      container.style.setProperty("--scale-factor", String(viewport.scale));
      const pageColors =
        mode === "night"
          ? { background: "#181c1a", foreground: "#deded6" }
          : mode === "paper"
            ? { background: "#f2e6ce", foreground: "#332d24" }
            : undefined;
      const task = source.render({
        canvas: surface,
        viewport,
        transform: output === 1 ? undefined : [output, 0, 0, output, 0, 0],
        pageColors,
      });
      render = task;
      await task.promise;
      if (closed) return;
      // A dark cover inverted by high-contrast mapping must not become a bright page.
      if (mode === "night") {
        const context = surface.getContext("2d")!,
          samples: number[] = [];
        for (let y = 1; y < 8; y++)
          for (let x = 1; x < 8; x++) {
            const c = context.getImageData(
              Math.floor((surface.width * x) / 8),
              Math.floor((surface.height * y) / 8),
              1,
              1,
            ).data;
            samples.push((c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722) / 255);
          }
        samples.sort((a, b) => a - b);
        if (samples[Math.floor(samples.length / 2)] > 0.5) {
          const original = source.render({
            canvas: surface,
            viewport,
            transform: output === 1 ? undefined : [output, 0, 0, output, 0, 0],
          });
          render = original;
          await original.promise;
          if (closed) return;
        }
      }
      const content = await source.getTextContent();
      if (closed) return;
      const textLayer = new pdfjs.TextLayer({
        textContentSource: content,
        container,
        viewport,
      });
      layer = textLayer;
      await textLayer.render();
      if (!closed) setLoading(false);
    })().catch((e) => {
      if (!closed && e?.name !== "RenderingCancelledException") {
        setError("RENDER_FAILED");
        setLoading(false);
      }
    });
    return () => {
      closed = true;
      render?.cancel();
      layer?.cancel();
    };
  }, [pdf, page, zoom, mode, width]);
  function point(event: React.PointerEvent) {
    const rect = paper.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  }
  function selectText() {
    if (positionMode) return;
    const selection = window.getSelection();
    if (
      !selection ||
      selection.isCollapsed ||
      !paper.current?.contains(selection.anchorNode)
    )
      return;
    const bounds = paper.current.getBoundingClientRect(),
      rects = Array.from(selection.getRangeAt(0).getClientRects())
        .map((r) => {
          const left = Math.max(bounds.left, r.left),
            top = Math.max(bounds.top, r.top),
            right = Math.min(bounds.right, r.right),
            bottom = Math.min(bounds.bottom, r.bottom);
          return {
            x: (left - bounds.left) / bounds.width,
            y: (top - bounds.top) / bounds.height,
            width: (right - left) / bounds.width,
            height: (bottom - top) / bounds.height,
          };
        })
        .filter((r) => r.width > 0 && r.height > 0);
    if (rects.length)
      onSelection({
        quote: selection.toString().slice(0, 5000),
        rectangles: rects,
      });
  }
  return (
    <div ref={parent} className="ll-page-scroll" aria-busy={loading}>
      {loading && (
        <span role="status" className="ll-page-status">
          {t("رسم الصفحة…", "Rendering page…")}
        </span>
      )}
      {error && (
        <p role="alert">
          {t(
            "تعذر رسم الصفحة. جرّب عرض الأصل أو إعادة فتح الملف.",
            "Could not render this page. Try original colors or reopen the file.",
          )}
        </p>
      )}
      <div
        ref={paper}
        className={"ll-pdf-paper " + (positionMode ? "is-positioning" : "")}
        data-pdf-page={page}
        onMouseUp={() => requestAnimationFrame(selectText)}
        onPointerDown={(event) => {
          if (positionMode) {
            start.current = point(event);
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerUp={(event) => {
          if (positionMode && start.current) {
            const end = point(event),
              x = Math.min(start.current.x, end.x),
              y = Math.min(start.current.y, end.y);
            onSelection({
              quote: "",
              rectangles: [
                {
                  x: Math.min(x, 0.97),
                  y: Math.min(y, 0.97),
                  width: Math.min(
                    1 - x,
                    Math.max(0.025, Math.abs(end.x - start.current.x)),
                  ),
                  height: Math.min(
                    1 - y,
                    Math.max(0.025, Math.abs(end.y - start.current.y)),
                  ),
                },
              ],
            });
            start.current = null;
          }
        }}
      >
        <canvas
          ref={canvas}
          style={{
            filter: "contrast(" + contrast + "%)",
            visibility: loading ? "hidden" : "visible",
          }}
          aria-label={t("صفحة الكتاب ", "Book page ") + page}
        />
        <div
          ref={text}
          className="textLayer"
          style={{ visibility: loading ? "hidden" : "visible" }}
        />
        <div className="ll-highlight-layer">
          {notes.flatMap((note) =>
            note.rectangles.map((r, i) => (
              <button
                key={note.id + "-" + i}
                title={note.body}
                aria-label={t("ملاحظة: ", "Note: ") + note.body.slice(0, 100)}
                onClick={(event) => {
                  event.stopPropagation();
                  onNote(note);
                }}
                style={{
                  left: r.x * 100 + "%",
                  top: r.y * 100 + "%",
                  width: r.width * 100 + "%",
                  height: r.height * 100 + "%",
                }}
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
}
