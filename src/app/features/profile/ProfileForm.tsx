import { useRef, useState, type FormEvent } from "react";
import { useI18n } from "../../i18n";
import type { ProfessionalProfile } from "./profileApi";
import { isPdf, MAX_CV_BYTES, MAX_CV_SIZE_MB, profileApi } from "./profileApi";

function formatSize(bytes: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024));
}

export function ProfileForm({
  initial,
  onSaved,
  onboarding = false,
}: {
  initial: ProfessionalProfile;
  onSaved: (profile: ProfessionalProfile) => void;
  onboarding?: boolean;
}) {
  const { t, locale } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial.name);
  const [portfolio, setPortfolio] = useState(initial.portfolioUrl ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "selected" | "uploading" | "uploaded" | "error">("idle");
  const [portfolioError, setPortfolioError] = useState("");
  const [nameError, setNameError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const chooseFile = (candidate?: File) => {
    setError("");
    if (!candidate) return;
    if (!isPdf(candidate)) {
      setUploadState("error");
      setError(t("profile.pdfOnly"));
      return;
    }
    if (candidate.size > MAX_CV_BYTES) {
      setUploadState("error");
      setError(t("profile.fileTooLarge", { size: MAX_CV_SIZE_MB }));
      return;
    }
    setFile(candidate);
    setUploadState("selected");
  };

  const validatePortfolio = () => {
    const value = portfolio.trim();
    if (!value) {
      setPortfolioError(t("profile.portfolioRequired"));
      return false;
    }
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    } catch {
      setPortfolioError(t("profile.invalidUrl"));
      return false;
    }
    setPortfolioError("");
    return true;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setNameError(t("profile.nameRequired"));
      return;
    }
    setNameError("");
    if (!validatePortfolio()) return;
    if (!file && !initial.hasCv) {
      setError(t("profile.cvRequired"));
      return;
    }
    setSaving(true);
    try {
      let next = await profileApi.update(name.trim(), portfolio.trim());
      if (file) {
        setUploadState("uploading");
        const cv = await profileApi.uploadCv(file);
        next = { ...next, cv, hasCv: true, profileComplete: Boolean(next.portfolioUrl) };
        setUploadState("uploaded");
      }
      if (!next.profileComplete) throw new Error("Profile is incomplete");
      onSaved(next);
    } catch {
      setUploadState(file ? "error" : uploadState);
      setError(t("profile.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="profile-name" className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200">{t("profile.name")}</label>
        <input
          id="profile-name"
          type="text"
          autoComplete="name"
          maxLength={100}
          required
          value={name}
          onChange={(event) => { setName(event.target.value); setNameError(""); }}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? "profile-name-error" : undefined}
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-info-strong focus:ring-2 focus:ring-info-soft dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
        {!nameError && <p className="mt-1.5 text-xs text-neutral-500">{t("profile.nameHelp")}</p>}
        {nameError && <p id="profile-name-error" className="mt-1.5 text-xs text-danger-strong">{nameError}</p>}
      </div>

      <div>
        <label htmlFor="portfolio-url" className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200">{t("profile.portfolio")}</label>
        <input
          id="portfolio-url"
          type="url"
          dir="ltr"
          value={portfolio}
          onChange={(event) => { setPortfolio(event.target.value); setPortfolioError(""); }}
          onBlur={validatePortfolio}
          placeholder={t("profile.portfolioPlaceholder")}
          aria-invalid={Boolean(portfolioError)}
          aria-describedby={portfolioError ? "portfolio-error" : "portfolio-help"}
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-info-strong focus:ring-2 focus:ring-info-soft dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
        />
        <p id={portfolioError ? "portfolio-error" : "portfolio-help"} className={`mt-1.5 text-xs ${portfolioError ? "text-danger-strong" : "text-neutral-500"}`}>
          {portfolioError || t("profile.portfolioHelp")}
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">{t("profile.cv")}</p>
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50/70 p-4 dark:border-neutral-700 dark:bg-neutral-950/50">
          <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => chooseFile(event.currentTarget.files?.[0])} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-info-strong shadow-sm dark:bg-neutral-800">▤</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">{file?.name ?? initial.cv?.originalName ?? t("profile.uploadCv")}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {file ? `${formatSize(file.size, locale)} MB · ${t(({ idle: "profile.uploadIdle", selected: "profile.uploadSelected", uploading: "profile.uploadInProgress", uploaded: "profile.uploadComplete", error: "profile.uploadFailed" })[uploadState])}` : initial.hasCv ? t("profile.currentCv") : t("profile.pdfLimit")}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => fileInput.current?.click()} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-info-strong dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800">
              {file || initial.hasCv ? t("profile.replaceCv") : t("profile.chooseFile")}
            </button>
          </div>
          {file && <button type="button" onClick={() => { setFile(null); setUploadState("idle"); if (fileInput.current) fileInput.current.value = ""; }} className="mt-3 text-xs font-medium text-neutral-500 underline underline-offset-2 hover:text-neutral-900 dark:hover:text-white">{t("profile.removeSelectedFile")}</button>}
        </div>
        <p className="mt-1.5 text-xs text-neutral-500">{t("profile.pdfLimit", { size: MAX_CV_SIZE_MB })}</p>
      </div>

      {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-strong">{error}</p>}
      <button type="submit" disabled={saving} className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
        {saving ? t(file ? "profile.uploading" : "profile.saving") : onboarding ? t("profile.continue") : t("profile.save")}
      </button>
    </form>
  );
}
