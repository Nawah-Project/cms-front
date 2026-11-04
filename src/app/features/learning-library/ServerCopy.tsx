import { useEffect, useRef, useState } from "react";
import type { Book, Edition } from "./domain/types";
import { useLibrary } from "./LibraryContext";
import { apiClient, API_BASE_URL } from "../../lib/api-client";
import { canAdminAccess } from "../../platform/access/adminAccess";
import { useAuth } from "../auth/store/authStore";
import { Dialog, useWords } from "./ui";
const path = "/admin/learning-library";
type Transfer = {
  id: string;
  editionId: string;
  status: string;
  bytes: number;
  offset: number;
};
export function ServerCopy({ book }: { book: Book }) {
  const { document, files, reload } = useLibrary(),
    { user } = useAuth(),
    t = useWords(),
    edition = document.editions.find((e) => e.id === book.currentEditionId)!,
    file = files.get(edition.id),
    canWrite = canAdminAccess(user, "LEARNING_LIBRARY", "WRITE");
  const [open, setOpen] = useState(false),
    [items, setItems] = useState<Transfer[]>([]),
    [quota, setQuota] = useState({ usedBytes: 0, quotaBytes: 0 }),
    [progress, setProgress] = useState<number | null>(null),
    [error, setError] = useState(""),
    [inbox, setInbox] = useState<{ name: string; bytes: number }[]>([]),
    stop = useRef<AbortController | null>(null);
  const preview =
    import.meta.env.DEV && import.meta.env.VITE_LEARNING_PREVIEW === "true";
  useEffect(() => () => stop.current?.abort(), []);
  async function refresh() {
    const result = await apiClient.get<typeof quota & { items: Transfer[] }>(
      path + "/transfers",
    );
    setItems(result.items);
    setQuota(result);
    await reload();
  }
  async function run() {
    setError("");
    const abort = new AbortController();
    stop.current = abort;
    try {
      const state = await apiClient.post<Transfer>(path + "/transfers", {
        editionId: edition.id,
      });
      if (state.status === "READY") {
        await refresh();
        return;
      }
      if (!file)
        throw Error(
          t(
            "اختر ملف النسخة المحلية أولًا.",
            "Choose the local edition file first.",
          ),
        );
      let offset = state.offset;
      setProgress((offset / file.size) * 100);
      while (offset < file.size) {
        if (abort.signal.aborted) break;
        const chunk = await file
            .slice(offset, offset + 1024 ** 2)
            .arrayBuffer(),
          sha = Array.from(
            new Uint8Array(await crypto.subtle.digest("SHA-256", chunk)),
            (x) => x.toString(16).padStart(2, "0"),
          ).join("");
        const response = await fetch(
          API_BASE_URL +
            path +
            "/transfers/" +
            state.id +
            "/chunks?offset=" +
            offset +
            "&sha256=" +
            sha,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/octet-stream" },
            body: chunk,
            signal: abort.signal,
          },
        );
        if (!response.ok)
          throw Error(
            t(
              "توقف الرفع. يمكنك استكماله؛ راجع تسجيل الدخول والحصة.",
              "Upload stopped. Resume is available; check session and quota.",
            ),
          );
        offset = (await response.json()).offset;
        setProgress((offset / file.size) * 100);
      }
      if (!abort.signal.aborted && offset === file.size)
        await apiClient.post(path + "/transfers/" + state.id + "/finish");
      await refresh();
    } catch (e) {
      if (!abort.signal.aborted)
        setError(
          e instanceof Error ? e.message : t("تعذر الرفع.", "Upload failed."),
        );
      await refresh().catch(() => undefined);
    } finally {
      setProgress(null);
      stop.current = null;
    }
  }
  if (preview) return null;
  const current = items.find((x) => x.editionId === edition.id);
  return (
    <>
      <button
        className="ll-button"
        onClick={() => {
          setOpen(true);
          void refresh().catch(() =>
            setError(
              t("تعذر قراءة حالة التخزين.", "Storage status unavailable."),
            ),
          );
        }}
      >
        {t("نسخة السيرفر والتخزين", "Server copy & storage")}
      </button>
      {open && (
        <Dialog
          title={t("نسخة اختيارية عبر الحساب", "Optional account copy")}
          onClose={() => {
            if (progress !== null) {
              stop.current?.abort();
            }
            setOpen(false);
          }}
        >
          <p>
            {t(
              "الملف المحلي هو الافتراضي. الرفع هنا باختيارك، في مساحة خاصة مستقلة عن ملفات CV. الحد 500MiB للكتاب، والتنزيل والرفع 1MiB/s.",
              "Local files are the default. Upload only by your choice to private storage separate from CVs. 500MiB per book; transfers limited to 1MiB/s.",
            )}
          </p>
          <p>
            {Math.round(quota.usedBytes / 1024 ** 2) +
              " / " +
              Math.round(quota.quotaBytes / 1024 ** 2) +
              " MiB"}
          </p>
          <p>
            {current?.status === "READY"
              ? t("نسخة متاحة عبر الحساب", "Account copy available")
              : current
                ? t(
                    "رفع غير مكتمل، يمكنك استكماله",
                    "Incomplete upload; resume available",
                  )
                : t("لا نسخة على السيرفر", "No server copy")}
          </p>
          {error && <p role="alert">{error}</p>}
          {progress !== null ? (
            <>
              <progress max={100} value={progress} />
              <p>{Math.floor(progress)}%</p>
              <button
                className="ll-button"
                onClick={() => stop.current?.abort()}
              >
                {t("إيقاف مؤقت", "Pause")}
              </button>
            </>
          ) : (
            <div className="ll-actions">
              <button
                className="ll-button primary"
                disabled={!file || !canWrite || current?.status === "READY"}
                onClick={() => void run()}
              >
                {current
                  ? t("استكمال الرفع", "Resume upload")
                  : t("رفع نسخة باختياري", "Upload a copy")}
              </button>
              {current && (
                <button
                  className="ll-button"
                  disabled={!canWrite}
                  onClick={async () => {
                    if (
                      window.confirm(
                        t(
                          "إزالة نسخة السيرفر فقط؟ الملاحظات والتقدم باقيان.",
                          "Remove only the server file? Notes and progress remain.",
                        ),
                      )
                    ) {
                      await apiClient.delete(path + "/transfers/" + current.id);
                      await refresh();
                    }
                  }}
                >
                  {t("إزالة نسخة السيرفر", "Remove server copy")}
                </button>
              )}
            </div>
          )}
          <details>
            <summary>
              {t("استيراد خاص من مجلد SSH/SFTP", "Private SSH/SFTP inbox")}
            </summary>
            <p>
              {t(
                "انقل PDF إلى مجلد inbox الخاص بحسابك على السيرفر، وأضف سجله محليًا أولًا. اختيار الملف هنا يعتمد نسخة لهذا الكتاب بعد التحقق من البصمة.",
                "Transfer a PDF into your account inbox on the server, and register it locally first. Choosing it here adopts a copy only after hash verification.",
              )}
            </p>
            <button
              className="ll-button"
              onClick={async () => {
                try {
                  setInbox(
                    (
                      await apiClient.get<{ items: typeof inbox }>(
                        path + "/inbox",
                      )
                    ).items,
                  );
                } catch {
                  setError(t("تعذر فتح المجلد.", "Inbox unavailable."));
                }
              }}
            >
              {t("عرض الملفات المرشحة", "List candidate files")}
            </button>
            {inbox
              .filter((x) => x.bytes === edition.bytes)
              .map((candidate) => (
                <button
                  key={candidate.name}
                  className="ll-button"
                  disabled={!canWrite || progress !== null}
                  onClick={async () => {
                    setError("");
                    setProgress(0);
                    try {
                      const state = await apiClient.post<Transfer>(
                        path + "/transfers",
                        { editionId: edition.id },
                      );
                      await apiClient.post(
                        path + "/transfers/" + state.id + "/import",
                        { name: candidate.name },
                      );
                      await refresh();
                    } catch {
                      setError(
                        t(
                          "لم يكتمل الاستيراد؛ تحقق من تطابق الملف أو استكمله.",
                          "Import did not finish; verify the file or resume.",
                        ),
                      );
                    } finally {
                      setProgress(null);
                    }
                  }}
                >
                  {candidate.name}
                </button>
              ))}
          </details>
        </Dialog>
      )}
    </>
  );
}
