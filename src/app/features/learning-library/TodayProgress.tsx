import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  BookOpen,
  Network,
  Target,
  CheckCircle2,
  StickyNote,
  Download,
} from "lucide-react";
import { useLibrary } from "./LibraryContext";
import { coverage, weekStats } from "./domain/model.mjs";
import { BookCard, ImportBooks } from "./BookLibrary";
import { download, Empty, localDate, readerUrl, useWords } from "./ui";
function addDays(day: string, offset: number) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
function dates(offset = 0) {
  const end = addDays(localDate(), offset);
  return { from: addDays(end, -6), until: addDays(end, 1) };
}
export function TodayView() {
  const { document, register, busy } = useLibrary(),
    t = useWords(),
    navigate = useNavigate(),
    [sampleBusy, setSample] = useState(""),
    [sampleError, setSampleError] = useState(false);
  const last = Object.entries(document.positions).sort((a, b) =>
      b[1].updatedAt.localeCompare(a[1].updatedAt),
    )[0],
    edition = document.editions.find((x) => x.id === last?.[0]),
    book = document.books.find((x) => x.id === edition?.bookId);
  const range = dates(),
    week = weekStats(document, range.from, range.until),
    due = document.goals.filter(
      (x) => x.stage !== "done" && x.reviewAt && x.reviewAt <= localDate(),
    );
  async function sample(key: string) {
    setSample(key);
    setSampleError(false);
    try {
      const response = await fetch("/preview-api/samples/" + key + ".pdf");
      if (!response.ok) throw Error("Sample unavailable");
      const id = await register(
        new File([await response.blob()], "NAWAH-" + key + "-sample.pdf", {
          type: "application/pdf",
        }),
      );
      if (id) navigate(readerUrl(id));
    } catch {
      setSampleError(true);
    } finally {
      setSample("");
    }
  }
  return (
    <>
      <section className="ll-hero">
        <div>
          <span className="ll-eyebrow">
            {t(
              "اقرأ بسؤال. احتفظ بالفكرة. اختبرها.",
              "Read with a question. Keep the idea. Test it.",
            )}
          </span>
          <h2>
            {t(
              "معرفة ترجع لها، وتبني بها.",
              "Knowledge to return to, and build with.",
            )}
          </h2>
          <p>
            {t(
              "من آخر صفحة إلى الخطوة القادمة: كتبك وملاحظاتك وعلاقات أفكارك في مساحة واحدة.",
              "From the last page to the next step: your books, notes and connections in one place.",
            )}
          </p>
          <div className="ll-actions">
            <ImportBooks compact />
            {book && edition && (
              <Link
                className="ll-button gold"
                to={readerUrl(book.id, edition.id, last[1].page)}
              >
                <BookOpen size={17} />
                {t("تابع من حيث توقفت", "Continue reading")}
              </Link>
            )}
          </div>
        </div>
        <div className="ll-hero-art" aria-hidden="true">
          <BookOpen size={110} strokeWidth={0.8} />
          <i />
          <i />
        </div>
      </section>
      <div className="ll-stat-grid">
        <article>
          <BookOpen />
          <span>{t("كتب في مكتبتك", "Books in your library")}</span>
          <b>{document.books.filter((x) => !x.archived).length}</b>
        </article>
        <article>
          <CheckCircle2 />
          <span>{t("صفحات جديدة هذا الأسبوع", "New pages this week")}</span>
          <b>{week.newPages}</b>
        </article>
        <article>
          <StickyNote />
          <span>{t("ملاحظات وأفكار محفوظة", "Saved notes and ideas")}</span>
          <b>{document.notes.length}</b>
        </article>
        <article>
          <Target />
          <span>{t("مراجعات تنتظرني", "Reviews waiting for me")}</span>
          <b>{due.length}</b>
        </article>
      </div>
      {book && (
        <section>
          <div className="ll-section-heading">
            <h2>{t("آخر كتاب فتحته", "Last opened book")}</h2>
            <Link to="/admin/learning/library">
              {t("كل الكتب", "All books")}
            </Link>
          </div>
          <div className="ll-continue">
            <BookCard book={book} />
            <div className="ll-panel">
              <small>{t("سؤال القراءة", "Reading purpose")}</small>
              <h3>
                {book.purpose ||
                  t(
                    "لماذا أقرأ هذا الكتاب الآن؟",
                    "Why am I reading this book now?",
                  )}
              </h3>
              <p>
                {t(
                  "يمكنك تعديل سبب القراءة من بيانات الكتاب، أو ربط القراءة بهدف وتطبيق محدد.",
                  "Edit the reading purpose in book details, or connect reading to a specific goal and application.",
                )}
              </p>
              <Link className="ll-button" to="/admin/learning/practice">
                {t("الأهداف والتطبيقات", "Goals & applications")}
              </Link>
            </div>
          </div>
        </section>
      )}
      <div className="ll-two">
        <section className="ll-panel">
          <Target size={23} />
          <h3>{t("ما الذي يستحق المراجعة؟", "What needs review?")}</h3>
          {due.length ? (
            due.map((goal) => (
              <Link
                className="ll-review-due"
                key={goal.id}
                to="/admin/learning/practice"
              >
                <strong>{goal.title}</strong>
                <span>{goal.reviewAt}</span>
                <small>{goal.question}</small>
              </Link>
            ))
          ) : (
            <p>
              {t(
                "لا مراجعات مستحقة الآن. أضف هدفًا وموعدًا مناسبًا لمراجعة التطبيق.",
                "No reviews are due. Set a goal and a suitable date to review its application.",
              )}
            </p>
          )}
        </section>
        <section className="ll-panel">
          <Network size={23} />
          <h3>{t("العلاقة لها سبب", "Connections have reasons")}</h3>
          <p>
            {t(
              "ابدأ بخريطة حول كتاب أو موضوع. اكتب لماذا يصل كتاب بآخر، وارجع إلى السبب بعد شهور.",
              "Start a map around a book or topic. Record why a book connects to another, and revisit that reason months later.",
            )}
          </p>
          <Link className="ll-button" to="/admin/learning/maps">
            {t("افتح خرائط المعرفة", "Open knowledge maps")}
          </Link>
        </section>
      </div>
      <section className="ll-sample-panel">
        {sampleError && (
          <p role="alert">
            {t(
              "تعذر فتح المثال. جرّب مجددًا أو اختر PDF من جهازك.",
              "Could not open the sample. Retry or choose a local PDF.",
            )}
          </p>
        )}
        <span className="ll-eyebrow">
          {t(
            "أمثلة مصطنعة لمراجعة القارئ",
            "Synthetic samples for reader review",
          )}
        </span>
        <h3>
          {t(
            "جرّب النص والصورة والعربية قبل اختيار كتبك",
            "Try text, scans and Arabic before choosing your books",
          )}
        </h3>
        <p>
          {t(
            "هذه ملفات اختبار وليست كتبك أو سجلات مشاركين. اختيار مثال يضيفه لمكتبة المعاينة فقط.",
            "These are test documents, not your books or participant records. Choosing a sample adds it only to the preview library.",
          )}
        </p>
        <div className="ll-actions">
          {[
            ["text", "PDF نصي", "Text PDF"],
            ["scan", "صفحات مصوّرة", "Scanned pages"],
            ["mixed", "عربي ورسوم", "Arabic & diagrams"],
          ].map(([key, ar, en]) => (
            <button
              className="ll-button"
              key={key}
              disabled={busy || !!sampleBusy}
              onClick={() => void sample(key)}
            >
              {sampleBusy === key ? t("تجهيز…", "Preparing…") : t(ar, en)}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
export function ProgressView() {
  const { document } = useLibrary(),
    t = useWords(),
    [end, setEnd] = useState(localDate()),
    until = addDays(end, 1),
    from = addDays(end, -6),
    stats = weekStats(document, from, until);
  const blocks = Array.from({ length: 8 }, (_, i) => {
      const range = dates(-(7 - i) * 7);
      return {
        date: range.from.slice(5, 10),
        ...weekStats(document, range.from, range.until),
      };
    }),
    maximum = Math.max(1, ...blocks.map((x) => x.newPages + x.rereadPages));
  return (
    <>
      <div className="ll-toolbar">
        <div>
          <h2>{t("ما الذي قرأته فعلًا؟", "What did I actually read?")}</h2>
          <p>
            {t(
              "الحصيلة تفرق بين الزيارة والقراءة المؤكدة وإعادة القراءة. لا تعني درجة تمكن.",
              "The report separates visits, confirmed reading and rereading. It is not a mastery score.",
            )}
          </p>
        </div>
        <label>
          {t("الأسبوع المنتهي في", "Week ending")}
          <input
            type="date"
            value={end}
            onChange={(e) => {
              if (e.target.value) setEnd(e.target.value);
            }}
          />
        </label>
      </div>
      <div className="ll-stat-grid">
        <article>
          <span>{t("صفحات جديدة", "New pages")}</span>
          <b>{stats.newPages}</b>
        </article>
        <article>
          <span>{t("صفحات أعيدت قراءتها", "Reread pages")}</span>
          <b>{stats.rereadPages}</b>
        </article>
        <article>
          <span>{t("كتب قرأتها", "Books read")}</span>
          <b>{stats.books}</b>
        </article>
        <article>
          <span>{t("صفحات زرتها", "Pages visited")}</span>
          <b>{stats.visitedPages}</b>
        </article>
      </div>
      <section className="ll-panel">
        <h3>{t("القراءة عبر الأسابيع", "Reading across weeks")}</h3>
        <div
          className="ll-week-chart"
          role="img"
          aria-label={t(
            "رسم الصفحات الجديدة وإعادة القراءة خلال ثمانية أسابيع",
            "New pages and rereading over eight weeks",
          )}
        >
          {blocks.map((row) => (
            <div key={row.date}>
              <div className="ll-week-bar">
                <i style={{ height: (row.newPages / maximum) * 160 + "px" }} />
                <i
                  className="reread"
                  style={{ height: (row.rereadPages / maximum) * 160 + "px" }}
                />
              </div>
              <strong>{row.newPages + row.rereadPages}</strong>
              <small>{row.date}</small>
            </div>
          ))}
        </div>
        <p className="ll-chart-key">
          <span>{t("أخضر: صفحات جديدة", "Green: new pages")}</span>
          <span>{t("ذهبي: إعادة قراءة", "Gold: rereading")}</span>
        </p>
      </section>
      <section className="ll-panel">
        <div className="ll-section-heading">
          <h3>{t("تغطية الكتب والفصول", "Book and chapter coverage")}</h3>
          <button
            className="ll-button"
            onClick={() =>
              download(
                "reading-report.json",
                JSON.stringify(
                  { from, until, stats, reading: document.reading },
                  null,
                  2,
                ),
              )
            }
          >
            <Download size={15} />
            {t("تصدير التقرير", "Export report")}
          </button>
        </div>
        {document.editions.length ? (
          <div className="ll-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("الكتاب والنسخة", "Book and edition")}</th>
                  <th>{t("قراءة مؤكدة", "Confirmed reading")}</th>
                  <th>{t("آخر صفحة فُتحت", "Last opened page")}</th>
                </tr>
              </thead>
              <tbody>
                {document.editions.map((edition) => {
                  const c = coverage(document, edition.id);
                  return (
                    <tr key={edition.id}>
                      <td>
                        <Link to={readerUrl(edition.bookId, edition.id)}>
                          {
                            document.books.find((b) => b.id === edition.bookId)
                              ?.title
                          }
                        </Link>
                        <small>{edition.label}</small>
                      </td>
                      <td>
                        <div className="ll-progress">
                          <i style={{ width: c.percent + "%" }} />
                        </div>
                        {c.completed +
                          " / " +
                          c.total +
                          " · " +
                          c.percent +
                          "%"}
                      </td>
                      <td>{document.positions[edition.id]?.page || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={t(
              "تظهر الحصيلة مع أول قراءة مؤكدة",
              "Your report starts with confirmed reading",
            )}
          />
        )}
      </section>
    </>
  );
}
