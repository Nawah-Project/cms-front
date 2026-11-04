import { useRef, useState } from "react";
import { useLibrary } from "./LibraryContext";
import { Dialog, download, useWords } from "./ui";
import { useAuth } from "../auth/store/authStore";
import { canAdminAccess } from "../../platform/access/adminAccess";
export function LibraryBackup() {
  const { document, commit } = useLibrary(),
    { user } = useAuth(),
    t = useWords(),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState<any>(null),
    input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button className="ll-button" onClick={() => setOpen(true)}>
        {t("تصدير واستعادة مكتبتي", "Export & restore library")}
      </button>
      {open && (
        <Dialog
          title={t(
            "سجلات مكتبتي وروابطها",
            "My library records and references",
          )}
          onClose={() => {
            setOpen(false);
            setPending(null);
          }}
        >
          <p>
            {t(
              "التصدير يشمل السجلات والملاحظات والخرائط والتقدم والأهداف؛ ملفات PDF لا تدخل الملف. الاستعادة تدمج المعرفات نفسها وتحافظ على السجلات الأخرى؛ الملف المختلف لا يستبدل طبعة قديمة.",
              "Export includes records, notes, maps, progress and goals, without PDF files. Restore merges matching identities and keeps other records; a different file cannot replace an existing edition.",
            )}
          </p>
          <button
            className="ll-button primary"
            onClick={() =>
              download(
                "nawah-learning-library.json",
                JSON.stringify({ ...document, commands: [] }, null, 2),
              )
            }
          >
            {t("تصدير JSON خاص بي", "Export my JSON")}
          </button>
          <button
            className="ll-button"
            disabled={!canAdminAccess(user, "LEARNING_LIBRARY", "WRITE")}
            onClick={() => input.current?.click()}
          >
            {t("اختيار ملف استعادة", "Choose restore file")}
          </button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            className="ll-hidden"
            onChange={async (e) => {
              setError("");
              try {
                const file = e.target.files?.[0];
                if (!file || file.size > 32 * 1024 ** 2) throw Error();
                const parsed = JSON.parse(await file.text());
                if (parsed.formatVersion !== 1 || !Array.isArray(parsed.books))
                  throw Error();
                setPending(parsed);
              } catch {
                setError(
                  t(
                    "ملف الاستعادة غير صالح أو يتجاوز 32MiB.",
                    "Invalid restore file or larger than 32MiB.",
                  ),
                );
              }
            }}
          />
          {pending && (
            <div className="ll-callout">
              <p>
                {pending.books.length +
                  " " +
                  t(
                    "كتابًا في الملف؛ لن تُرفع أي ملفات PDF.",
                    "books in the file; no PDFs will be uploaded.",
                  )}
              </p>
              <button
                className="ll-button"
                onClick={async () => {
                  if (await commit("restore", { document: pending })) {
                    setPending(null);
                    setOpen(false);
                  }
                }}
              >
                {t("تأكيد دمج سجلاتي", "Confirm merging my records")}
              </button>
            </div>
          )}
          {error && <p role="alert">{error}</p>}
        </Dialog>
      )}
    </>
  );
}
