import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  FileSearch,
  Maximize2,
  Minimize2,
  StickyNote,
  MousePointer2,
  ZoomIn,
  ZoomOut,
  List,
  Link2,
  X,
} from "lucide-react";
import { useLibrary } from "../LibraryContext";
import { coverage, uid } from "../domain/model.mjs";
import type { Book, Chapter, Edition, Note } from "../domain/types";
import { Dialog, Empty, readerUrl, useWords } from "../ui";
import { BookTools } from "../BookLibrary";
import { NoteCard, NoteEditor } from "../Notes";
import { openPdf, type PdfHandle } from "./pdf";
import { PdfPage } from "./PdfPage";
type Mode = "night" | "paper" | "original";
export function Reader({ bookId }: { bookId: string }) {
  const library = useLibrary(),
    { document, files, commit, attach, forget } = library,
    t = useWords(),
    navigate = useNavigate(),
    [params] = useSearchParams();
  const book = document.books.find((x) => x.id === bookId),
    edition = document.editions.find(
      (x) =>
        x.id === (params.get("edition") || book?.currentEditionId) &&
        x.bookId === bookId,
    );
  if (!book || !edition)
    return (
      <Empty
        title={t("لم نجد الكتاب أو هذه النسخة", "Book or edition not found")}
      >
        <Link to="/admin/learning/library">
          {t("العودة للمكتبة", "Back to library")}
        </Link>
      </Empty>
    );
  return <ReaderEdition key={edition.id} book={book} edition={edition} />;
}
function ReaderEdition({ book, edition }: { book: Book; edition: Edition }) {
  const {
      document,
      files,
      commit,
      attach,
      forget,
      register,
      busy,
      error,
      reload,
    } = useLibrary(),
    t = useWords(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams(),
    file = files.get(edition.id),
    input = useRef<HTMLInputElement>(null);
  const initial =
    Number(params.get("page")) || document.positions[edition.id]?.page || 1;
  const [page, setPage] = useState(
      Math.max(1, Math.min(edition.pageCount, initial)),
    ),
    [handle, setHandle] = useState<PdfHandle | null>(null),
    [opening, setOpening] = useState(false),
    [fileError, setFileError] = useState(""),
    [differentFile, setDifferent] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>("night"),
    [contrast, setContrast] = useState(100),
    [peek, setPeek] = useState(false),
    [zoom, setZoom] = useState(1),
    [focus, setFocus] = useState(false),
    [side, setSide] = useState(
      () => typeof window !== "undefined" && window.innerWidth > 760,
    ),
    [tab, setTab] = useState<"notes" | "contents" | "search">("notes"),
    [positionMode, setPosition] = useState(false);
  const [selection, setSelection] = useState<{
      quote: string;
      rectangles: Note["rectangles"];
    } | null>(null),
    [edit, setEdit] = useState<(Partial<Note> & { bookId: string }) | null>(
      null,
    ),
    [confirm, setConfirm] = useState<{ start: number; end: number } | null>(
      null,
    ),
    [chapters, setChapters] = useState(false);
  const [query, setQuery] = useState(""),
    [hits, setHits] = useState<{ page: number; text: string }[]>([]),
    [searching, setSearching] = useState(0),
    [searched, setSearched] = useState(false),
    searchRun = useRef(0);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("nawah.learning.reader.appearance.v1") || "null",
      );
      if (["night", "paper", "original"].includes(saved?.mode))
        setMode(saved.mode);
      if (saved?.contrast >= 80 && saved.contrast <= 130)
        setContrast(saved.contrast);
    } catch {}
  }, []);
  function appearance(next: Mode, value = contrast) {
    setMode(next);
    setContrast(value);
    try {
      localStorage.setItem(
        "nawah.learning.reader.appearance.v1",
        JSON.stringify({ mode: next, contrast: value }),
      );
    } catch {}
  }
  useEffect(() => {
    let gone = false,
      opened: PdfHandle | undefined;
    setHandle(null);
    setFileError("");
    if (!file) return;
    setOpening(true);
    void openPdf(file, async (retry) =>
      window.prompt(
        retry
          ? t("كلمة المرور غير صحيحة", "Incorrect password")
          : t("كلمة مرور PDF", "PDF password"),
      ),
    )
      .then((value) => {
        opened = value;
        if (gone) void value.close();
        else {
          setHandle(value);
          setOpening(false);
        }
      })
      .catch(() => {
        if (!gone) {
          setFileError("PDF_OPEN");
          setOpening(false);
        }
      });
    return () => {
      gone = true;
      searchRun.current++;
      void opened?.close();
    };
  }, [file, edition.id]);
  useEffect(() => {
    if (!handle) return;
    const timer = setTimeout(() => {
      void commit("position", {
        editionId: edition.id,
        page,
        recordVisit: true,
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [handle, page, edition.id]);
  useEffect(() => {
    setPeek(false);
    setSelection(null);
  }, [page]);
  useEffect(() => {
    if (!focus) return;
    const sidebar =
      window.document.querySelector<HTMLElement>(".workspace-sidebar");
    const previous = sidebar?.inert;
    window.document.body.dataset.learningFocus = "true";
    if (sidebar) sidebar.inert = true;
    const key = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !window.document.querySelector("dialog[open]")
      )
        setFocus(false);
    };
    window.addEventListener("keydown", key);
    return () => {
      delete window.document.body.dataset.learningFocus;
      if (sidebar) sidebar.inert = !!previous;
      window.removeEventListener("keydown", key);
    };
  }, [focus]);
  function go(value: number) {
    const next = Math.max(1, Math.min(edition.pageCount, value));
    if (!Number.isInteger(next)) return;
    setPage(next);
    setParams({ edition: edition.id, page: String(next) }, { replace: true });
  }
  function newNote(scope: Note["scope"] = "page") {
    if (edit) return;
    setEdit({
      bookId: book.id,
      editionId: scope === "book" ? undefined : edition.id,
      page: scope === "book" ? undefined : page,
      printedLabel: edition.pageLabels[page - 1] || undefined,
      scope,
      quote: scope === "selection" ? selection?.quote || "" : "",
      rectangles: scope === "selection" ? selection?.rectangles || [] : [],
    });
    setSide(true);
    setTab("notes");
    setPosition(false);
  }
  async function bind(file: File) {
    if (await attach(file, edition.id)) setDifferent(null);
    else setDifferent(file);
  }
  async function search(event: FormEvent) {
    event.preventDefault();
    if (!handle || !query.trim()) return;
    const run = ++searchRun.current,
      result: typeof hits = [];
    setSearched(false);
    setHits([]);
    try {
      for (let i = 1; i <= edition.pageCount && result.length < 100; i++) {
        if (searchRun.current !== run) return;
        setSearching(i);
        const data = await (await handle.document.getPage(i)).getTextContent();
        const text = data.items.map((x) => ("str" in x ? x.str : "")).join(" "),
          index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
        if (index >= 0)
          result.push({
            page: i,
            text: text.slice(
              Math.max(0, index - 60),
              index + query.length + 100,
            ),
          });
      }
      if (searchRun.current === run) {
        setHits(result);
        setSearched(true);
      }
    } finally {
      if (searchRun.current === run) setSearching(0);
    }
  }
  const stats = coverage(document, edition.id),
    notes = document.notes.filter(
      (x) =>
        x.bookId === book.id &&
        (!x.editionId ||
          (x.editionId === edition.id &&
            (!x.page ||
              x.page === page ||
              (x.scope === "chapter" &&
                edition.chapters.some(
                  (c) =>
                    c.id === x.chapterId && page >= c.start && page <= c.end,
                ))))),
    );
  return (
    <section
      className={"ll-reader " + (focus ? "is-focus" : "")}
      aria-label={t("قارئ الكتاب", "Book reader")}
    >
      <header className="ll-reader-head">
        <div>
          <Link to="/admin/learning/library" className="ll-back">
            <ArrowRight size={16} />
            {t("المكتبة", "Library")}
          </Link>
          <h2>{book.title}</h2>
          <p>
            {edition.label +
              " · " +
              edition.pageCount +
              " " +
              t("صفحة", "pages")}{" "}
            · {stats.percent}% {t("قراءة مؤكدة", "confirmed")}
          </p>
        </div>
        <div className="ll-actions">
          <select
            aria-label={t("الطبعة", "Edition")}
            value={edition.id}
            onChange={(e) => navigate(readerUrl(book.id, e.target.value))}
          >
            {document.editions
              .filter((x) => x.bookId === book.id)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label + " · " + e.filename}
                </option>
              ))}
          </select>
          <button
            className="ll-icon"
            aria-label={
              focus
                ? t("إنهاء التركيز", "Exit focus")
                : t("وضع التركيز", "Focus mode")
            }
            onClick={() => setFocus(!focus)}
          >
            {focus ? <Minimize2 /> : <Maximize2 />}
          </button>
        </div>
      </header>
      {focus && error && (
        <div className="ll-save-alert" role="alert">
          <p>
            {t(
              "تعذر الحفظ؛ مسودتك باقية. حمّل التحديثات ثم أعد المحاولة.",
              "Save failed; your draft remains. Load updates and retry.",
            )}
          </p>
          <button className="ll-button" onClick={() => void reload()}>
            {t("تحميل التحديثات مع إبقاء المسودة", "Load updates; keep draft")}
          </button>
        </div>
      )}
      <div className="ll-reader-controls">
        <div className="ll-actions">
          <button
            className="ll-icon"
            aria-label={t("الصفحة السابقة", "Previous page")}
            disabled={page === 1}
            onClick={() => go(page - 1)}
          >
            <ArrowRight size={18} />
          </button>
          <label className="ll-page-number">
            {t("صفحة", "Page")}
            <input
              type="number"
              min={1}
              max={edition.pageCount}
              value={page}
              onChange={(e) => go(Number(e.target.value))}
            />
            <span>/ {edition.pageCount}</span>
          </label>
          <button
            className="ll-icon"
            aria-label={t("الصفحة التالية", "Next page")}
            disabled={page === edition.pageCount}
            onClick={() => go(page + 1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            className="ll-icon"
            aria-label={t("تصغير", "Zoom out")}
            onClick={() => setZoom((x) => Math.max(0.5, x - 0.25))}
          >
            <ZoomOut size={17} />
          </button>
          <button className="ll-button" onClick={() => setZoom(1)}>
            {Math.round(zoom * 100)}%
          </button>
          <button
            className="ll-icon"
            aria-label={t("تكبير", "Zoom in")}
            onClick={() => setZoom((x) => Math.min(3, x + 0.25))}
          >
            <ZoomIn size={17} />
          </button>
        </div>
        <div className="ll-actions">
          <select
            aria-label={t("ألوان صفحات الكتاب", "Book page colors")}
            value={mode}
            onChange={(e) => appearance(e.target.value as Mode)}
          >
            <option value="night">{t("ليلي هادئ", "Quiet night")}</option>
            <option value="paper">{t("ورقي دافئ", "Warm paper")}</option>
            <option value="original">
              {t("ألوان الأصل", "Original colors")}
            </option>
          </select>
          <button
            className="ll-button"
            aria-pressed={peek}
            onClick={() => setPeek(!peek)}
          >
            {peek
              ? t("العودة للقراءة", "Return to reading")
              : t("عرض الأصل", "Show original")}
          </button>
          <button
            className="ll-button"
            aria-pressed={side}
            onClick={() => setSide(!side)}
          >
            <StickyNote size={16} />
            {t("الملاحظات والفهرس", "Notes & contents")}
          </button>
        </div>
      </div>
      <div className="ll-reader-subtools">
        <label>
          {t("التباين", "Contrast")}
          <input
            type="range"
            min={80}
            max={130}
            value={contrast}
            onChange={(e) => appearance(mode, Number(e.target.value))}
          />
        </label>
        <div className="ll-actions">
          <button
            className="ll-button"
            disabled={!handle}
            onClick={() => {
              setSide(true);
              setTab("notes");
              newNote();
            }}
          >
            <StickyNote size={15} />
            {t("ملاحظة على الصفحة", "Page note")}
          </button>
          <button
            className="ll-button"
            aria-pressed={positionMode}
            disabled={!handle}
            onClick={() => setPosition(!positionMode)}
          >
            <MousePointer2 size={15} />
            {t("حدد موضعًا", "Mark a position")}
          </button>
          {selection && (
            <button
              className="ll-button primary"
              onClick={() => newNote("selection")}
            >
              {t("ملاحظة على التحديد", "Note on selection")}
            </button>
          )}
          <button
            className="ll-button primary"
            onClick={() => setConfirm({ start: page, end: page })}
          >
            <Check size={16} />
            {t("تأكيد ما قرأته", "Confirm pages read")}
          </button>
        </div>
      </div>
      <div className={"ll-reader-body " + (side ? "has-notes" : "")}>
        <div className="ll-reader-main">
          {!file ? (
            <div className="ll-file-missing">
              <BookOpen size={44} />
              <h3>
                {t(
                  "اختر ملف هذه النسخة لمواصلة القراءة",
                  "Choose this edition’s file to continue",
                )}
              </h3>
              <p>
                {t(
                  "ملاحظاتك وتقدمك محفوظان. اسم الملف لا يهم؛ نطابق بصمة محتواه.",
                  "Your notes and progress remain saved. We match file contents, not the filename.",
                )}
              </p>
              <button
                className="ll-button primary"
                disabled={busy}
                onClick={() => input.current?.click()}
              >
                <Link2 size={17} />
                {busy
                  ? t("جارٍ التحقق…", "Verifying…")
                  : t("اختيار PDF محلي", "Choose local PDF")}
              </button>
              {differentFile && (
                <button
                  className="ll-button"
                  disabled={busy}
                  onClick={async () => {
                    const id = await register(differentFile, book.id);
                    if (id) navigate(readerUrl(id));
                  }}
                >
                  {t(
                    "الملف مختلف؟ أضفه كطبعة أخرى صراحةً",
                    "Different file? Explicitly add another edition",
                  )}
                </button>
              )}
            </div>
          ) : opening ? (
            <p className="ll-message" role="status">
              {t("فتح صفحات الكتاب…", "Opening book pages…")}
            </p>
          ) : fileError ? (
            <div className="ll-message" role="alert">
              <p>
                {t(
                  "تعذر فتح PDF؛ الملاحظات لم تتغير.",
                  "Could not open PDF; notes are unchanged.",
                )}
              </p>
              <button className="ll-button" onClick={() => forget(edition.id)}>
                {t("إعادة اختيار الملف", "Choose file again")}
              </button>
            </div>
          ) : handle ? (
            <PdfPage
              pdf={handle.document}
              page={page}
              zoom={zoom}
              contrast={contrast}
              mode={peek ? "original" : mode}
              positionMode={positionMode}
              notes={notes.filter((x) => x.page === page)}
              onSelection={setSelection}
              onNote={(note) => {
                setEdit(note);
                setSide(true);
                setTab("notes");
              }}
            />
          ) : null}
        </div>
        <aside className={"ll-reader-notes " + (side ? "is-open" : "")}>
          <header>
            <div className="ll-actions">
              <button
                className="ll-button"
                aria-pressed={tab === "notes"}
                onClick={() => setTab("notes")}
              >
                <StickyNote size={15} />
                {t("ملاحظات", "Notes")}
              </button>
              <button
                className="ll-button"
                aria-pressed={tab === "contents"}
                onClick={() => setTab("contents")}
              >
                <List size={15} />
                {t("فهرس", "Contents")}
              </button>
              <button
                className="ll-button"
                aria-pressed={tab === "search"}
                onClick={() => setTab("search")}
              >
                <FileSearch size={15} />
                {t("بحث", "Find")}
              </button>
            </div>
            <button
              className="ll-icon"
              aria-label={t("طي لوحة الملاحظات", "Fold notes panel")}
              onClick={() => setSide(false)}
            >
              <X size={16} />
            </button>
          </header>
          <div hidden={tab !== "notes"}>
            {edit ? (
              <NoteEditor
                key={edit.id || "new"}
                initial={edit}
                inline
                onClose={() => {
                  setEdit(null);
                  setSelection(null);
                }}
              />
            ) : (
              <>
                <button className="ll-button" onClick={() => newNote("book")}>
                  {t(
                    "لماذا أقرأ هذا الكتاب؟ / ملاحظة عامة",
                    "Why this book? / General note",
                  )}
                </button>
                {notes.map((note) => (
                  <NoteCard key={note.id} note={note} onEdit={setEdit} />
                ))}
                {!notes.length && (
                  <p className="ll-muted">
                    {t(
                      "اكتب فكرتك مع موضعها، أو ملاحظة عامة عن الكتاب.",
                      "Save an idea with its location, or a general note about the book.",
                    )}
                  </p>
                )}
              </>
            )}
          </div>
          <div hidden={tab !== "contents"}>
            <button className="ll-button" onClick={() => setChapters(true)}>
              {t("إضافة وتعديل الفصول", "Add or edit chapters")}
            </button>
            {edition.chapters.map((chapter) => (
              <article className="ll-chapter" key={chapter.id}>
                <button onClick={() => go(chapter.start)}>
                  <strong>{chapter.title}</strong>
                  <span>{chapter.start + "–" + chapter.end}</span>
                </button>
                <small>
                  {coverage(document, edition.id, [chapter]).percent}%
                </small>
                <button
                  className="ll-button"
                  onClick={() =>
                    setConfirm({ start: chapter.start, end: chapter.end })
                  }
                >
                  {t("قرأت الفصل", "I read this chapter")}
                </button>
                <button
                  className="ll-button"
                  onClick={() => {
                    if (!edit) {
                      setEdit({
                        bookId: book.id,
                        editionId: edition.id,
                        scope: "chapter",
                        chapterId: chapter.id,
                        page: chapter.start,
                        printedLabel: edition.pageLabels[chapter.start - 1],
                        rectangles: [],
                        quote: "",
                      });
                      setTab("notes");
                    }
                  }}
                >
                  {t("ملاحظة على الفصل", "Chapter note")}
                </button>
              </article>
            ))}
            {!edition.chapters.length && (
              <p className="ll-muted">
                {t(
                  "لا فهرس مضمّنًا. أضف نطاقات الفصول يدويًا.",
                  "No embedded outline. Add chapter page ranges manually.",
                )}
              </p>
            )}
          </div>
          <div hidden={tab !== "search"}>
            <form className="ll-form" onSubmit={search}>
              <label>
                {t("ابحث داخل نص الكتاب", "Find in book text")}
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <button className="ll-button" disabled={!handle || !!searching}>
                {searching
                  ? t("بحث في الصفحة ", "Searching page ") + searching
                  : t("ابحث", "Find")}
              </button>
              {searching > 0 && (
                <button
                  className="ll-button"
                  type="button"
                  onClick={() => {
                    searchRun.current++;
                    setSearching(0);
                  }}
                >
                  {t("إيقاف البحث", "Stop search")}
                </button>
              )}
            </form>
            {hits.map((hit) => (
              <button
                className="ll-search-result"
                key={hit.page}
                onClick={() => go(hit.page)}
              >
                <b>{t("صفحة ", "Page ") + hit.page}</b>
                <span>{hit.text}</span>
              </button>
            ))}
            {searched && !hits.length && (
              <p>
                {t(
                  "لم نجد نصًا مطابقًا. الصفحات المصورة تحتاج OCR للبحث؛ تظل الملاحظات الموضعية متاحة.",
                  "No matching text. Scanned pages require OCR for text search; position notes remain available.",
                )}
              </p>
            )}
          </div>
        </aside>
      </div>
      <input
        ref={input}
        type="file"
        className="ll-hidden"
        accept="application/pdf,.pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void bind(f);
          e.target.value = "";
        }}
      />
      <footer className="ll-reader-footer">
        <BookTools book={book} />
        <button
          className="ll-button"
          disabled={!file}
          onClick={() => forget(edition.id)}
        >
          {t(
            "إلغاء اتصال الملف المحلي مع إبقاء الملاحظات",
            "Disconnect local file; keep notes",
          )}
        </button>
      </footer>
      {confirm && (
        <ConfirmRange
          edition={edition}
          range={confirm}
          onClose={() => setConfirm(null)}
        />
      )}{" "}
      {chapters && (
        <ChapterEditor
          edition={edition}
          page={page}
          onClose={() => setChapters(false)}
        />
      )}
    </section>
  );
}
function ConfirmRange({
  edition,
  range,
  onClose,
}: {
  edition: Edition;
  range: { start: number; end: number };
  onClose(): void;
}) {
  const { commit } = useLibrary(),
    t = useWords(),
    [saving, setSaving] = useState(false);
  return (
    <Dialog
      title={t(
        "ما الصفحات التي قرأتها فعلًا؟",
        "Which pages did you actually read?",
      )}
      onClose={onClose}
    >
      <p className="ll-muted">
        {t(
          "زيارة الصفحة لا تُحسب قراءة. التداخل يُحسب مرة واحدة؛ إعادة القراءة تظهر منفصلة في الحصيلة.",
          "Visiting is not confirmed reading. Overlap counts once; rereading is reported separately.",
        )}
      </p>
      <form
        className="ll-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          setSaving(true);
          if (
            await commit("confirm", {
              editionId: edition.id,
              start: Number(form.get("start")),
              end: Number(form.get("end")),
            })
          )
            onClose();
          setSaving(false);
        }}
      >
        <div className="ll-two">
          <label>
            {t("من صفحة PDF", "From PDF page")}
            <input
              name="start"
              type="number"
              required
              min={1}
              max={edition.pageCount}
              defaultValue={range.start}
            />
          </label>
          <label>
            {t("إلى صفحة PDF", "To PDF page")}
            <input
              name="end"
              type="number"
              required
              min={1}
              max={edition.pageCount}
              defaultValue={range.end}
            />
          </label>
        </div>
        <button className="ll-button primary" disabled={saving}>
          {t("تأكيد القراءة", "Confirm reading")}
        </button>
      </form>
    </Dialog>
  );
}
function ChapterEditor({
  edition,
  page,
  onClose,
}: {
  edition: Edition;
  page: number;
  onClose(): void;
}) {
  const { commit, setDraft, draft } = useLibrary(),
    t = useWords(),
    [rows, setRows] = useState<Chapter[]>(edition.chapters);
  return (
    <Dialog
      title={t("فصول هذه النسخة", "Chapters in this edition")}
      onClose={() => {
        if (
          !draft ||
          window.confirm(t("تجاهل تعديل الفصول؟", "Discard chapter changes?"))
        ) {
          setDraft(false);
          onClose();
        }
      }}
    >
      <form
        className="ll-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await commit("chapters", { id: edition.id, chapters: rows })) {
            setDraft(false);
            onClose();
          }
        }}
      >
        {rows.map((row, i) => (
          <div className="ll-chapter-form" key={row.id}>
            <label>
              {t("الفصل", "Chapter")}
              <input
                required
                value={row.title}
                onChange={(e) => {
                  setRows((x) =>
                    x.map((r, j) =>
                      j === i ? { ...r, title: e.target.value } : r,
                    ),
                  );
                  setDraft(true);
                }}
              />
            </label>
            {(["start", "end"] as const).map((key) => (
              <label key={key}>
                {key === "start" ? t("من", "From") : t("إلى", "To")}
                <input
                  type="number"
                  required
                  min={1}
                  max={edition.pageCount}
                  value={row[key]}
                  onChange={(e) => {
                    setRows((x) =>
                      x.map((r, j) =>
                        j === i ? { ...r, [key]: Number(e.target.value) } : r,
                      ),
                    );
                    setDraft(true);
                  }}
                />
              </label>
            ))}
          </div>
        ))}
        <button
          type="button"
          className="ll-button"
          onClick={() => {
            setRows((x) => [
              ...x,
              { id: uid(), title: "", start: page, end: page },
            ]);
            setDraft(true);
          }}
        >
          {t("أضف فصلًا", "Add chapter")}
        </button>
        <button className="ll-button primary">
          {t("حفظ الفصول", "Save chapters")}
        </button>
      </form>
    </Dialog>
  );
}
