import { useEffect, useState } from "react";
import { Trash2, RefreshCw } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { useI18n } from "../../../i18n";
import { adminApi, type AccountDeletionPreview } from "../api/adminApi";
export function DeleteMemberDialog({
  userId,
  onClose,
  onDeleted,
}: {
  userId: string;
  onClose: () => void;
  onDeleted: (pendingFiles: number) => void;
}) {
  const { locale } = useI18n(),
    ar = locale === "ar",
    text = (a: string, e: string) => (ar ? a : e);
  const [preview, setPreview] = useState<AccountDeletionPreview | null>(null),
    [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setPreview(null);
    setEmail("");
    adminApi
      .deletionPreview(userId)
      .then((p) => {
        if (active) setPreview(p);
      })
      .catch(() => {
        if (active)
          setError(
            text(
              "تعذر تحميل تفاصيل الحساب. قد يكون حُذف أو لم تعد لديك صلاحية حذفه.",
              "Could not load this account. It may have been removed, or deletion is not permitted.",
            ),
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, retry]);
  const ready =
    !!preview &&
    email.trim().toLowerCase() === preview.email.toLowerCase() &&
    !busy &&
    !loading;
  return (
    <Modal
      isOpen
      onClose={onClose}
      disableClose={busy}
      size="xl"
      title={text("حذف الحساب نهائيًا", "Permanently delete account")}
      subtitle={text(
        "هذا الإجراء لا يمكن التراجع عنه",
        "This action cannot be undone",
      )}
    >
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!ready || !preview) return;
          setBusy(true);
          setError("");
          try {
            const result = await adminApi.deleteAccount(userId, email.trim());
            onDeleted(result.cvFilesPending);
          } catch {
            setError(
              text(
                "تعذر إتمام الحذف. حدّث تفاصيل الحساب وتأكد من البريد قبل إعادة المحاولة.",
                "Could not complete deletion. Refresh the account details and check the email before retrying.",
              ),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {loading && (
          <p role="status" className="text-sm text-text-secondary">
            {text("تحميل ما سيُحذف…", "Loading deletion details…")}
          </p>
        )}
        {preview && (
          <>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-950">
              <strong className="block">{preview.name}</strong>
              <span className="block break-all" dir="ltr">
                {preview.email}
              </span>
              <p className="mt-2">
                {text(
                  "سيُحذف الحساب وطلبات التقديم والسيرة الحالية وكل نسخها، والمهام وتقدم الرحلة والجولات والإشعارات وارتباط تسجيل الدخول بـGoogle. إذا سجل بنفس البريد لاحقًا سيبدأ بحساب جديد.",
                  "This removes the account, applications, current CV and every version, tasks, journey and guide progress, notifications and Google sign-in link. Registering with the same email later creates a fresh account.",
                )}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                [
                  text("طلبات تقديم", "Applications"),
                  preview.counts.applications,
                ],
                [text("ملفات CV", "CV files"), preview.counts.cvVersions],
                [text("مهام", "Tasks"), preview.counts.assignedTasks],
                [
                  text("جولات محفوظة", "Saved guides"),
                  preview.counts.experienceProgress,
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <dt>{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <label className="block space-y-2 text-sm font-semibold">
              <span>
                {text(
                  "للتأكيد اكتب البريد الإلكتروني للحساب",
                  "Type the account email to confirm",
                )}
              </span>
              <input
                className="field-control w-full"
                dir="ltr"
                type="email"
                required
                autoComplete="off"
                spellCheck={false}
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </>
        )}
        {error && (
          <div role="alert" className="space-y-2 text-sm text-rose-700">
            <p>{error}</p>
            <button
              type="button"
              disabled={busy}
              className="button-secondary inline-flex items-center gap-2 px-3 py-2"
              onClick={() => setRetry((x) => x + 1)}
            >
              <RefreshCw size={14} />
              {text("تحديث التفاصيل", "Refresh details")}
            </button>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            className="button-secondary px-4 py-2 text-sm"
            disabled={busy}
            onClick={onClose}
          >
            {text("إلغاء", "Cancel")}
          </button>
          <button
            type="submit"
            disabled={!ready}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={16} />
            {busy
              ? text("جارٍ الحذف…", "Deleting…")
              : text(
                  "حذف الحساب وملفاته نهائيًا",
                  "Delete account and files permanently",
                )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
