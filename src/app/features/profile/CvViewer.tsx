import { useEffect, useState } from "react";
import { useI18n } from "../../i18n";
import { profileApi } from "./profileApi";
import { FocusDialog } from "./FocusDialog";

export function CvViewer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { t } = useI18n();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    void profileApi.getCv(userId)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => { if (active) setError(true); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId]);

  return (
    <FocusDialog labelledBy="cv-viewer-title" onClose={onClose} className="flex h-[90vh] max-w-5xl flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-700">
        <h2 id="cv-viewer-title" className="text-base font-semibold">{t("profile.cvTitle")}</h2>
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
          {t("common.close")}
        </button>
      </header>
      {url ? (
        <iframe title={t("profile.cvTitle")} src={url} className="min-h-0 flex-1 bg-neutral-100" />
      ) : error ? (
        <div role="alert" className="flex flex-1 items-center justify-center p-8 text-sm text-danger-strong">{t("profile.cvUnavailable")}</div>
      ) : (
        <div role="status" className="flex flex-1 items-center justify-center p-8 text-sm text-neutral-500">{t("profile.loadingCv")}</div>
      )}
    </FocusDialog>
  );
}
