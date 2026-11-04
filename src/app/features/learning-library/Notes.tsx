import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Download, StickyNote, Pencil, ArrowUpRight } from "lucide-react";
import { useLibrary } from "./LibraryContext";
import type { Note } from "./domain/types";
import { uid } from "./domain/model.mjs";
import { csv, Dialog, download, Empty, readerUrl, useWords } from "./ui";
export function NoteEditor({
  initial,
  onClose,
  inline = false,
}: {
  initial: Partial<Note> & { bookId: string };
  onClose(): void;
  inline?: boolean;
}) {
  const { commit, setDraft, draft, document } = useLibrary(),
    t = useWords(),
    [saving, setSaving] = useState(false),
    [body, setBody] = useState(initial.body || "");
  const book = document.books.find((x) => x.id === initial.bookId),
    edition = document.editions.find((x) => x.id === initial.editionId);
  const close = () => {
    if (
      !draft ||
      window.confirm(t("تجاهل مسودة الملاحظة؟", "Discard note draft?"))
    ) {
      setDraft(false);
      onClose();
    }
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const note: Note = {
      id: initial.id || uid(),
      bookId: initial.bookId,
      editionId: initial.editionId,
      page: initial.page,
      chapterId: initial.chapterId,
      scope: initial.scope || "book",
      quote: initial.quote || "",
      rectangles: initial.rectangles || [],
      printedLabel: initial.printedLabel,
      body,
      tags: csv(String(form.get("tags"))),
      updatedAt: new Date().toISOString(),
    };
    if (await commit("note", { note })) {
      setDraft(false);
      onClose();
    }
    setSaving(false);
  }
  const content = (
    <>
      <p className="ll-callout">
        {book?.title}
        {initial.page ? " · " + t("صفحة PDF ", "PDF page ") + initial.page : ""}
        {edition ? " · " + edition.label : ""}
      </p>
      {initial.quote && (
        <blockquote className="ll-quote">{initial.quote}</blockquote>
      )}
      <form
        onSubmit={submit}
        className="ll-form"
        onChange={() => setDraft(true)}
      >
        <label>
          {t(
            "ما الفكرة؟ ولماذا تهمني؟",
            "What is the idea, and why does it matter?",
          )}
          <textarea
            name="body"
            required
            autoFocus
            rows={8}
            value={body}
            maxLength={30000}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <label>
          {t("وسوم — افصل بفاصلة", "Tags — comma separated")}
          <input name="tags" defaultValue={initial.tags?.join(", ") || ""} />
        </label>
        <div className="ll-actions">
          <button className="ll-button primary" disabled={saving}>
            {t("حفظ الملاحظة", "Save note")}
          </button>
          <button
            className="ll-button"
            type="button"
            onClick={() =>
              download("note-draft.md", body, "text/markdown;charset=utf-8")
            }
          >
            <Download size={16} />
            {t("تصدير المسودة", "Export draft")}
          </button>
        </div>
      </form>
    </>
  );
  return inline ? (
    <section className="ll-inline-note">
      <header>
        <h3>{t("ملاحظة مرتبطة بمرجعها", "A note with its source")}</h3>
        <button className="ll-button" onClick={close}>
          {t("إغلاق", "Close")}
        </button>
      </header>
      {content}
    </section>
  ) : (
    <Dialog
      title={t("ملاحظة مرتبطة بمرجعها", "A note with its source")}
      onClose={close}
    >
      {content}
    </Dialog>
  );
}
export function NoteCard({
  note,
  onEdit,
}: {
  note: Note;
  onEdit(note: Note): void;
}) {
  const { document } = useLibrary(),
    t = useWords(),
    book = document.books.find((x) => x.id === note.bookId);
  return (
    <article className="ll-note-card">
      <header>
        <span>
          <StickyNote size={16} />
          {book?.title}
        </span>
        <button
          className="ll-icon"
          aria-label={t("تعديل الملاحظة", "Edit note")}
          onClick={() => onEdit(note)}
        >
          <Pencil size={15} />
        </button>
      </header>
      {note.quote && <blockquote>{note.quote}</blockquote>}
      <p className="ll-note-body">{note.body}</p>
      <footer>
        <span>{note.tags.join(" · ")}</span>
        <Link to={readerUrl(note.bookId, note.editionId, note.page)}>
          <ArrowUpRight size={14} />
          {note.page ? t("صفحة ", "Page ") + note.page : t("الكتاب", "Book")}
        </Link>
      </footer>
    </article>
  );
}
export function NotesView() {
  const { document } = useLibrary(),
    t = useWords(),
    [query, setQuery] = useState(""),
    [bookId, setBook] = useState(""),
    [edit, setEdit] = useState<(Partial<Note> & { bookId: string }) | null>(
      null,
    );
  const notes = document.notes.filter(
    (x) =>
      (!bookId || x.bookId === bookId) &&
      [
        x.body,
        x.quote,
        ...x.tags,
        document.books.find((b) => b.id === x.bookId)?.title,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function exportNotes(format: "json" | "md") {
    if (format === "json")
      download(
        "learning-notes.json",
        JSON.stringify(
          {
            formatVersion: 1,
            books: document.books.map(({ id, title, author }) => ({
              id,
              title,
              author,
            })),
            editions: document.editions.map(
              ({ id, bookId, fingerprint, label, pageCount }) => ({
                id,
                bookId,
                fingerprint,
                label,
                pageCount,
              }),
            ),
            notes,
          },
          null,
          2,
        ),
      );
    else
      download(
        "learning-notes.md",
        notes
          .map(
            (n) =>
              "## " +
              (document.books.find((b) => b.id === n.bookId)?.title || "") +
              (n.page ? " · PDF " + n.page : "") +
              "\n\n" +
              n.body +
              (n.quote ? "\n\n> " + n.quote : "") +
              "\n\n" +
              n.tags.join(", "),
          )
          .join("\n\n---\n\n"),
        "text/markdown;charset=utf-8",
      );
  }
  return (
    <>
      <div className="ll-toolbar">
        <p>
          {t(
            "أفكارك تبقى متاحة حتى عندما يغيب ملف الكتاب.",
            "Your ideas remain available even when the book file is missing.",
          )}
        </p>
        <div className="ll-actions">
          <button className="ll-button" onClick={() => exportNotes("md")}>
            Markdown
          </button>
          <button className="ll-button" onClick={() => exportNotes("json")}>
            JSON
          </button>
        </div>
      </div>
      <div className="ll-filters">
        <label>
          {t(
            "ابحث في الفكرة والاقتباس والوسوم",
            "Search ideas, quotes and tags",
          )}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          {t("الكتاب", "Book")}
          <select value={bookId} onChange={(e) => setBook(e.target.value)}>
            <option value="">{t("كل الكتب", "All books")}</option>
            {document.books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </label>
        <button
          className="ll-button"
          disabled={!document.books.length}
          onClick={() => setEdit({ bookId: bookId || document.books[0]?.id })}
        >
          {t("ملاحظة عامة عن كتاب", "General book note")}
        </button>
      </div>
      {notes.length ? (
        <div className="ll-notes-grid">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onEdit={setEdit} />
          ))}
        </div>
      ) : (
        <Empty
          title={t("احتفظ بالفكرة وبمكانها", "Keep the idea and its place")}
        >
          {t(
            "اكتب ملاحظة عامة، أو حدد نصًا أو موضعًا داخل القارئ.",
            "Write a general note, or select text or a position inside the reader.",
          )}
        </Empty>
      )}
      {edit && <NoteEditor initial={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
