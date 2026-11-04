import { useEffect, useRef } from "react";
import { useBlocker, useLocation, Link } from "react-router";
import { LibraryProvider, useLibrary } from "./LibraryContext";
import { LibraryView } from "./BookLibrary";
import { NotesView } from "./Notes";
import { MapsView } from "./KnowledgeMaps";
import { GoalsView } from "./Goals";
import { TodayView, ProgressView } from "./TodayProgress";
import { Reader } from "./reader/Reader";
import { useWords } from "./ui";
import "./learning.css";
export default function LearningLibraryPage() {
  return (
    <div className="ll">
      <LibraryProvider>
        <LibraryContent />
      </LibraryProvider>
    </div>
  );
}
function LibraryContent() {
  const {
      document,
      error,
      externalChange,
      reload,
      clearError,
      draft,
      setDraft,
    } = useLibrary(),
    t = useWords(),
    location = useLocation(),
    confirm = useRef<HTMLDialogElement>(null);
  const preview =
    import.meta.env.DEV && import.meta.env.VITE_LEARNING_PREVIEW === "true";
  const parts = location.pathname.split("/").slice(3),
    view = parts[0] || "today";
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      draft &&
      (currentLocation.pathname !== nextLocation.pathname ||
        new URLSearchParams(currentLocation.search).get("edition") !==
          new URLSearchParams(nextLocation.search).get("edition")),
  );
  useEffect(() => {
    if (blocker.state === "blocked") confirm.current?.showModal();
    else confirm.current?.close();
  }, [blocker.state]);
  useEffect(() => {
    const listener = (event: BeforeUnloadEvent) => {
      if (draft) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [draft]);
  const titles: Record<string, [string, string]> = {
    today: ["قراءتي اليوم", "Reading today"],
    library: ["المكتبة", "Library"],
    notes: ["الملاحظات والأفكار", "Notes & ideas"],
    maps: ["خرائط المعرفة", "Knowledge maps"],
    practice: ["التطبيق والمراجعة", "Application & review"],
    progress: ["التقدم والحصيلة", "Progress & outcomes"],
    read: ["مساحة القراءة", "Reading workspace"],
  };
  const errors: Record<string, [string, string]> = {
    PERMISSION_DENIED: [
      "صلاحيتك قراءة فقط؛ لم يُحفظ تعديل.",
      "Your access is read only; no change was saved.",
    ],
    REVIEW_REQUIRED: [
      "الخلاصة والتطبيق والمراجعة مطلوبة قبل إكمال الهدف.",
      "Synthesis, application and review are required to complete a goal.",
    ],
    REVISION_CONFLICT: [
      "يوجد تعديل أحدث من نافذة أخرى. مسودتك باقية؛ حمّل التحديثات ثم أعد الحفظ.",
      "A newer change exists in another tab. Your draft remains; load updates, then retry.",
    ],
    DIFFERENT_EDITION: [
      "هذا ملف مختلف. لم نربطه بملاحظات النسخة السابقة.",
      "This is a different file. Existing edition notes were not reassigned.",
    ],
    PAGE_RANGE: [
      "راجع بداية نطاق الصفحات ونهايته وحدود الكتاب.",
      "Check page range start, end and book limits.",
    ],
    GOAL: ["الهدف والسؤال مطلوبان.", "A goal title and question are required."],
    LINK: [
      "استخدم رابطًا داخليًا لمساحة المؤسس.",
      "Use an internal Founder workspace link.",
    ],
    SAVE_BUSY: [
      "هناك حفظ جارٍ. انتظر لحظة ثم أعد المحاولة؛ المسودة باقية.",
      "A save is in progress. Wait, then retry; your draft remains.",
    ],
    FILE_SIZE: [
      "حد الكتاب 500MiB، ويجب ألا يكون فارغًا.",
      "A book must be nonempty and at most 500MiB.",
    ],
    INVALID_PDF: [
      "الملف لا يبدو PDF صالحًا.",
      "The file does not appear to be a valid PDF.",
    ],
    REQUEST_CONFLICT: [
      "طلب الحفظ مختلف عن المحاولة السابقة.",
      "This save request conflicts with an earlier attempt.",
    ],
  };
  return (
    <>
      <header className="ll-header">
        <div>
          <span className="ll-eyebrow">
            {t("مكتبة التعلّم", "Learning library")}
          </span>
          <h1>{t(...(titles[view] || titles.today))}</h1>
        </div>
        <span className="ll-badge">
          {preview
            ? t("معاينة للمراجعة", "Review preview")
            : t("مكتبتي الخاصة", "My private library")}
        </span>
      </header>
      {preview && (
        <div className="ll-preview-notice">
          <p>
            {t(
              "معاينة خاصة: بيانات هذه المكتبة محفوظة في هذا المتصفح فقط. ملفات PDF تبقى محلية. حفظ الحساب والرفع والاستيراد من السيرفر يأتيان بعد مراجعة التجربة.",
              "Private review preview: this library is saved in this browser only. PDF files stay local. Account storage, uploads and server import follow experience review.",
            )}
          </p>
          <a href="https://nawah-project.com/admin">
            {t("العودة للإدارة المنشورة", "Open production administration")}
          </a>
        </div>
      )}
      {(error || externalChange) && (
        <div className="ll-save-alert" role="alert">
          <p>
            {error
              ? t(
                  ...(errors[error] || [
                    "لم يكتمل الحفظ. مسودتك باقية، أعد المحاولة أو صدّرها.",
                    "The save did not complete. Your draft remains; retry or export it.",
                  ]),
                )
              : t(
                  "هناك تحديث من نافذة أخرى.",
                  "Another tab has updated this library.",
                )}
          </p>
          <div className="ll-actions">
            <button className="ll-button" onClick={() => void reload()}>
              {t(
                "تحميل التحديثات مع إبقاء المسودة",
                "Load updates; keep draft",
              )}
            </button>
            <button className="ll-button" onClick={clearError}>
              {t("إخفاء الرسالة", "Dismiss")}
            </button>
          </div>
        </div>
      )}
      {view === "library" ? (
        <LibraryView />
      ) : view === "notes" ? (
        <NotesView />
      ) : view === "maps" ? (
        <MapsView />
      ) : view === "practice" ? (
        <GoalsView />
      ) : view === "progress" ? (
        <ProgressView />
      ) : view === "read" ? (
        <Reader bookId={parts[1] || ""} />
      ) : (
        <TodayView />
      )}
      <footer className="ll-footer">
        <span>
          {document.books.length +
            " " +
            t("كتابًا", "books") +
            " · " +
            document.notes.length +
            " " +
            t("ملاحظة", "notes")}
        </span>
        <span>
          {t(
            "القراءة دليل على نشاطك، والمراجعة دليل على ما تغيّر.",
            "Reading records activity; review examines what changed.",
          )}
        </span>
      </footer>
      <dialog
        ref={confirm}
        className="ll-dialog"
        aria-label={t("عندك مسودة غير محفوظة", "You have an unsaved draft")}
        onCancel={(e) => {
          e.preventDefault();
          if (blocker.state === "blocked") blocker.reset();
        }}
      >
        <div className="ll-dialog-body">
          <h2>{t("عندك مسودة غير محفوظة", "You have an unsaved draft")}</h2>
          <p>
            {t(
              "ارجع لحفظها أو تصديرها. المغادرة تتجاهل تعديل هذه المسودة فقط.",
              "Stay to save or export it. Leaving discards only this draft.",
            )}
          </p>
          <div className="ll-actions">
            <button
              className="ll-button primary"
              onClick={() => {
                if (blocker.state === "blocked") blocker.reset();
              }}
            >
              {t("ابقَ مع المسودة", "Stay with draft")}
            </button>
            <button
              className="ll-button"
              onClick={() => {
                setDraft(false);
                if (blocker.state === "blocked") blocker.proceed();
              }}
            >
              {t("تجاهل وغادر", "Discard and leave")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
