import type { PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PdfInspection, OutlineItem } from "../domain/types";
export type PdfHandle = { document: PDFDocumentProxy; close(): Promise<void> };
export function fingerprint(
  file: File,
  progress?: (value: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./fingerprint.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (event) => {
      if (event.data.fingerprint) {
        worker.terminate();
        resolve(event.data.fingerprint);
      } else if (event.data.error) {
        worker.terminate();
        reject(Error("HASH_FAILED"));
      } else progress?.(event.data.progress);
    };
    worker.onerror = () => {
      worker.terminate();
      reject(Error("HASH_FAILED"));
    };
    worker.postMessage({ file });
  });
}
export async function openPdf(
  file: File,
  password?: (retry: boolean) => Promise<string | null>,
): Promise<PdfHandle> {
  if (file.size > 500 * 1024 ** 2 || file.size === 0) throw Error("FILE_SIZE");
  const head = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
  if (!new TextDecoder("latin1").decode(head.slice(0, 1024)).includes("%PDF-"))
    throw Error("INVALID_PDF");
  const pdf = await import("pdfjs-dist");
  pdf.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  let cancelled = false;
  class LocalRanges extends pdf.PDFDataRangeTransport {
    requestDataRange(begin: number, end: number) {
      void file
        .slice(begin, end)
        .arrayBuffer()
        .then((data) => {
          if (!cancelled) this.onDataRange(begin, new Uint8Array(data));
        });
    }
    abort() {
      cancelled = true;
    }
  }
  const range = new LocalRanges(file.size, head, true, file.name);
  const task = pdf.getDocument({
    range,
    disableAutoFetch: true,
    disableStream: true,
    rangeChunkSize: 65536,
    useSystemFonts: true,
    cMapUrl: "/learning-pdf-assets/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "/learning-pdf-assets/standard_fonts/",
    wasmUrl: "/learning-pdf-assets/wasm/",
  });
  task.onPassword = (update: (password: string) => void, reason: number) => {
    void (
      password?.(reason === pdf.PasswordResponses.INCORRECT_PASSWORD) ??
      Promise.resolve(null)
    ).then((value) => {
      if (value === null) void task.destroy();
      else update(value);
    });
  };
  try {
    const document = await task.promise;
    return {
      document,
      close: async () => {
        cancelled = true;
        await task.destroy();
      },
    };
  } catch (error) {
    await task.destroy();
    throw error;
  }
}
export async function inspectPdf(handle: PdfHandle): Promise<PdfInspection> {
  const doc = handle.document,
    first = await doc.getPage(1),
    view = first.getViewport({ scale: 1 }),
    canvas = document.createElement("canvas");
  const viewport = first.getViewport({ scale: Math.min(1, 240 / view.width) });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await first.render({ canvas, viewport }).promise;
  const cover = canvas.toDataURL("image/jpeg", 0.65);
  canvas.width = canvas.height = 0;
  const metadata = await doc.getMetadata().catch(() => null),
    info = metadata?.info as { Title?: string; Author?: string } | undefined;
  const outline: OutlineItem[] = [];
  async function walk(
    items: Awaited<ReturnType<PDFDocumentProxy["getOutline"]>> | null,
    level = 0,
  ): Promise<void> {
    for (const item of items || []) {
      if (outline.length >= 200) return;
      try {
        const dest =
          typeof item.dest === "string"
            ? await doc.getDestination(item.dest)
            : item.dest;
        if (dest?.[0] != null) {
          const index =
            typeof dest[0] === "number"
              ? dest[0]
              : await doc.getPageIndex(dest[0]);
          outline.push({ title: item.title, page: index + 1, level });
        }
      } catch {
        /* A broken bookmark must not prevent reading. */
      }
      await walk(item.items, level + 1);
    }
  }
  await walk(await doc.getOutline().catch(() => null));
  return {
    pageCount: doc.numPages,
    title: info?.Title || "",
    author: info?.Author || "",
    cover,
    outline,
    pageLabels: (await doc.getPageLabels().catch(() => null)) || [],
  };
}
