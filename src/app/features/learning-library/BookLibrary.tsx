import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import {
  BookOpen,
  Upload,
  Plus,
  Pencil,
  Archive,
  FilePlus2,
} from "lucide-react";
import { useLibrary } from "./LibraryContext";
import type { Book } from "./domain/types";
import { coverage } from "./domain/model.mjs";
import { csv, Dialog, Empty, readerUrl, useWords } from "./ui";

export function ImportBooks({ compact = false }: { compact?: boolean }) {
  const { register, busy } = useLibrary(),
    input = useRef<HTMLInputElement>(null),
    navigate = useNavigate(),
    t = useWords();
  const [progress, setProgress] = useState("");
  async function load(files: File[]) {
    let last: string | undefined;
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(String(i + 1) + " / " + files.length);
        last = await register(files[i]);
      }
    } finally {
      setProgress("");
      if (input.current) input.current.value = "";
    }
    if (last) navigate(readerUrl(last));
  }
  return (
    <>
      <input
        ref={input}
        className="ll-hidden"
        type="file"
        multiple
        accept="application/pdf,.pdf"
        onChange={(e) => void load(Array.from(e.target.files || []))}
        aria-label={t("اختيار ملفات PDF محلية", "Choose local PDF files")}
      />
      <button
        className="ll-button primary"
        disabled={busy || !!progress}
        onClick={() => input.current?.click()}
      >
        <Plus size={17} />
        {busy || progress
          ? t("جارٍ تجهيز الكتاب… ", "Preparing book… ") + progress
          : t("أضف PDF من جهازك", "Add a local PDF")}
      </button>
      {!compact && (
        <span className="ll-muted">
          {t(
            "تُفتح الملفات محليًا. لا تُرفع ملفات الكتب في هذه المعاينة.",
            "Files open locally. Book files are not uploaded in this preview.",
          )}
        </span>
      )}
    </>
  );
}
export function BookCard({ book }: { book: Book }) {
  const { document } = useLibrary(),
    edition = document.editions.find((x) => x.id === book.currentEditionId)!,
    position = document.positions[edition.id]?.page || 1,
    stats = coverage(document, edition.id),
    t = useWords();
  return (
    <Link
      className="ll-book-card"
      to={readerUrl(book.id, edition.id, position)}
    >
      <div className="ll-cover">
        {book.cover ? (
          <img src={book.cover} alt="" loading="lazy" />
        ) : (
          <BookOpen size={42} />
        )}
        <span>{t("ملف محلي", "Local file")}</span>
      </div>
      <div className="ll-book-details">
        <small>
          {book.subjects.join(" · ") ||
            t("بدون تصنيف بعد", "Not categorized yet")}
        </small>
        <h3>{book.title}</h3>
        <p>
          {book.author ||
            t("أضف المؤلف في بيانات الكتاب", "Add the author in book details")}
        </p>
        <div className="ll-progress">
          <i style={{ width: stats.percent + "%" }} />
        </div>
        <div className="ll-book-foot">
          <b>{stats.percent}%</b>
          <span>
            {stats.completed +
              " / " +
              stats.total +
              " " +
              t("صفحة مؤكدة", "confirmed pages")}
          </span>
        </div>
      </div>
    </Link>
  );
}
export function BookEditor({ book, onClose }: { book: Book; onClose(): void }) {
  const { commit, setDraft, draft } = useLibrary(),
    t = useWords();
  const [cover, setCover] = useState(book.cover),
    [saving, setSaving] = useState(false);
  const close = () => {
    if (
      !draft ||
      window.confirm(t("تجاهل تعديل بيانات الكتاب؟", "Discard book changes?"))
    ) {
      setDraft(false);
      onClose();
    }
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    const changes = {
      title: String(form.get("title")),
      author: String(form.get("author")),
      purpose: String(form.get("purpose")),
      subjects: csv(String(form.get("subjects"))),
      sectors: csv(String(form.get("sectors"))),
      tags: csv(String(form.get("tags"))),
      status: String(form.get("status")),
      cover,
    };
    if (await commit("book", { id: book.id, changes })) {
      setDraft(false);
      onClose();
    }
    setSaving(false);
  }
  async function image(file?: File) {
    if (
      !file ||
      !/^image\/(png|jpeg|webp)$/.test(file.type) ||
      file.size > 10 * 1024 ** 2
    )
      return;
    const bitmap = await createImageBitmap(file),
      canvas = document.createElement("canvas");
    const ratio = Math.min(1, 280 / bitmap.width, 420 / bitmap.height);
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    setCover(canvas.toDataURL("image/jpeg", 0.7));
    bitmap.close();
    setDraft(true);
  }
  return (
    <Dialog title={t("بيانات الكتاب", "Book details")} onClose={close}>
      <form
        className="ll-form"
        onChange={() => setDraft(true)}
        onSubmit={submit}
      >
        <label>
          {t("اسم الكتاب", "Title")}
          <input
            name="title"
            required
            maxLength={300}
            defaultValue={book.title}
          />
        </label>
        <label>
          {t("المؤلف", "Author")}
          <input name="author" defaultValue={book.author} />
        </label>
        <label>
          {t(
            "لماذا أقرأه؟ وماذا أتوقع منه؟",
            "Why am I reading it? What do I expect?",
          )}
          <textarea name="purpose" defaultValue={book.purpose} />
        </label>
        <div className="ll-two">
          <label>
            {t("المجالات — افصل بفاصلة", "Subjects — comma separated")}
            <input name="subjects" defaultValue={book.subjects.join(", ")} />
          </label>
          <label>
            {t("القطاعات — افصل بفاصلة", "Sectors — comma separated")}
            <input name="sectors" defaultValue={book.sectors.join(", ")} />
          </label>
        </div>
        <label>
          {t("وسوم", "Tags")}
          <input name="tags" defaultValue={book.tags.join(", ")} />
        </label>
        <label>
          {t("حالة القراءة", "Reading status")}
          <select name="status" defaultValue={book.status}>
            <option value="planned">{t("أنوي قراءته", "Planned")}</option>
            <option value="reading">{t("أقرأه الآن", "Reading")}</option>
            <option value="paused">{t("متوقف مؤقتًا", "Paused")}</option>
            <option value="reference">{t("مرجع", "Reference")}</option>
            <option value="finished">
              {t("أنهيت المطلوب منه", "Finished my intended reading")}
            </option>
          </select>
        </label>
        <label>
          {t("استبدال الغلاف بصورة", "Replace cover image")}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => void image(e.target.files?.[0])}
          />
        </label>
        <button className="ll-button primary" disabled={saving}>
          {t("حفظ البيانات", "Save details")}
        </button>
      </form>
    </Dialog>
  );
}
export function BookTools({ book }: { book: Book }) {
  const { commit, register, busy } = useLibrary(),
    t = useWords(),
    [edit, setEdit] = useState(false),
    input = useRef<HTMLInputElement>(null),
    navigate = useNavigate();
  return (
    <>
      <div className="ll-actions">
        <button className="ll-button" onClick={() => setEdit(true)}>
          <Pencil size={15} />
          {t("بيانات الكتاب", "Book details")}
        </button>
        <button
          className="ll-button"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <FilePlus2 size={16} />
          {t("إضافة طبعة مختلفة", "Add another edition")}
        </button>
        <button
          className="ll-button"
          onClick={() =>
            void commit("book", {
              id: book.id,
              changes: { archived: !book.archived },
            })
          }
        >
          <Archive size={16} />
          {book.archived
            ? t("استعادة", "Restore")
            : t("أرشفة السجل", "Archive record")}
        </button>
      </div>
      <input
        ref={input}
        className="ll-hidden"
        type="file"
        accept="application/pdf,.pdf"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const id = await register(file, book.id);
            if (id) navigate(readerUrl(id));
          }
          e.target.value = "";
        }}
      />
      {edit && <BookEditor book={book} onClose={() => setEdit(false)} />}
    </>
  );
}
export function LibraryView() {
  const { document } = useLibrary(),
    t = useWords();
  const [query, setQuery] = useState(""),
    [subject, setSubject] = useState(""),
    [sector, setSector] = useState(""),
    [archived, setArchived] = useState(false);
  const subjects = [...new Set(document.books.flatMap((x) => x.subjects))],
    sectors = [...new Set(document.books.flatMap((x) => x.sectors))];
  const books = document.books.filter(
    (x) =>
      x.archived === archived &&
      (!subject || x.subjects.includes(subject)) &&
      (!sector || x.sectors.includes(sector)) &&
      [x.title, x.author, x.purpose, ...x.tags]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  return (
    <>
      <div className="ll-toolbar">
        <ImportBooks />
      </div>
      <div className="ll-filters">
        <label>
          {t(
            "ابحث بالاسم أو سبب القراءة أو الوسم",
            "Search title, purpose or tag",
          )}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
          />
        </label>
        <label>
          {t("المجال", "Subject")}
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">{t("كل المجالات", "All subjects")}</option>
            {subjects.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          {t("القطاع", "Sector")}
          <select value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">{t("كل القطاعات", "All sectors")}</option>
            {sectors.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label className="ll-check">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          {t("المؤرشفة", "Archived")}
        </label>
      </div>
      {books.length ? (
        <div className="ll-books-grid">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <Empty
          title={t(
            "مكان لكل كتاب، وسبب لقراءته",
            "A place for each book, and a reason to read it",
          )}
        >
          {t(
            "أضف ملفًا أو جرّب الأمثلة من «قراءتي اليوم». يمكنك تصنيف الكتاب في أكثر من مجال وقطاع.",
            "Add a file or try the examples in Today. A book can belong to several subjects and sectors.",
          )}
        </Empty>
      )}
    </>
  );
}
