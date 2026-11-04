import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useI18n } from "../../i18n";
import { useLibrary } from "./LibraryContext";
export function useWords() {
  const { locale } = useI18n();
  return (ar: string, en: string) => (locale === "ar" ? ar : en);
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose(): void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    { error, externalChange, reload } = useLibrary(),
    t = useWords();
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="ll-dialog"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          type="button"
          className="ll-icon"
          aria-label="إغلاق / Close"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </header>
      <div className="ll-dialog-body">
        {(error || externalChange) && (
          <div className="ll-save-alert" role="alert">
            <p>
              {error === "REVISION_CONFLICT"
                ? t(
                    "يوجد تعديل أحدث من نافذة أخرى. مسودتك باقية؛ حمّل التحديثات ثم أعد الحفظ.",
                    "A newer change exists in another tab. Your draft remains; load updates, then retry.",
                  )
                : error === "REVIEW_REQUIRED"
                  ? t(
                      "الخلاصة والتطبيق والمراجعة مطلوبة قبل إكمال الهدف.",
                      "Synthesis, application and review are required to complete a goal.",
                    )
                  : error
                    ? t(
                        "لم يكتمل الحفظ. راجع البيانات أو حمّل التحديثات؛ مسودتك باقية.",
                        "Save failed. Check the values or load updates; your draft remains.",
                      )
                    : t(
                        "هناك تحديث من نافذة أخرى.",
                        "Another tab has updated this library.",
                      )}
            </p>
            <button
              type="button"
              className="ll-button"
              onClick={() => void reload()}
            >
              {t(
                "تحميل التحديثات مع إبقاء المسودة",
                "Load updates; keep draft",
              )}
            </button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="ll-empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type })),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const readerUrl = (bookId: string, editionId?: string, page?: number) =>
  "/admin/learning/read/" +
  bookId +
  (editionId ? "?edition=" + editionId + (page ? "&page=" + page : "") : "");
export function localDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export const csv = (value: string) => [
  ...new Set(
    value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  ),
];
