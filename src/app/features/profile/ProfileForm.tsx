import { useRef, useState, type FormEvent } from "react";
import { useI18n } from "../../i18n";
import { DocumentPdfIcon, SparklesIcon } from "../../components/Icons";
import { useToast } from "../../components/ui/ToastProvider";
import type { ProfessionalProfile } from "./profileApi";
import { isPdf, MAX_CV_BYTES, MAX_CV_SIZE_MB, profileApi } from "./profileApi";
import { STANDARDIZED_SPECIALIZATIONS } from "../../constants/specializations";

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
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial.name);
  const [portfolio, setPortfolio] = useState(initial.portfolioUrl ?? "");
  const [targetJobTitle, setTargetJobTitle] = useState(initial.targetJobTitle ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "selected" | "uploading" | "uploaded" | "error">("idle");
  const [portfolioError, setPortfolioError] = useState("");
  const [specializationError, setSpecializationError] = useState("");
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

    if (!targetJobTitle.trim()) {
      setSpecializationError("يرجى اختيار تخصصك الوظيفي الأساسي للمتابعة");
      return;
    }
    setSpecializationError("");

    if (!validatePortfolio()) return;
    if (!file && !initial.hasCv) {
      setError(t("profile.cvRequired"));
      return;
    }
    setSaving(true);
    try {
      let next = await profileApi.update(
        name.trim(),
        portfolio.trim(),
        targetJobTitle.trim(),
      );
      if (file) {
        setUploadState("uploading");
        const cv = await profileApi.uploadCv(file);
        next = {
          ...next,
          cv,
          hasCv: true,
          profileComplete: Boolean(
            next.portfolioUrl && next.targetJobTitle,
          ),
        };
        setUploadState("uploaded");
      }
      if (!next.profileComplete) throw new Error("Profile is incomplete");
      if (!onboarding) toast.success(t("profile.savedSuccess"));
      onSaved(next);
    } catch {
      setUploadState(file ? "error" : uploadState);
      setError(t("profile.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 sm:space-y-6" noValidate>
      {/* 1. Specialization Selection */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label htmlFor="profile-specialization" className="field-label text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-0">
            اختر تخصصك الوظيفي الأساسي
          </label>
          <span className="text-xs text-neutral-400 font-mono">Specialization</span>
        </div>
        <p className="text-xs text-neutral-500 leading-relaxed">
          سيُستخدم هذا التخصص لتوجيهك تلقائياً إلى الوظائف المطابقة لمجالك في مستكشف الوظائف.
        </p>

        <select
          id="profile-specialization"
          aria-label={locale === "ar" ? "التخصص الوظيفي الأساسي" : "Primary specialization"}
          aria-invalid={Boolean(specializationError)}
          aria-describedby="profile-specialization-help"
          value={targetJobTitle}
          onChange={event => { setTargetJobTitle(event.target.value); setSpecializationError(""); }}
          className="field-control min-h-12 w-full text-sm"
          required
        >
          <option value="" disabled>{locale === "ar" ? "اختار تخصصك" : "Choose your specialization"}</option>
          {targetJobTitle && !STANDARDIZED_SPECIALIZATIONS.some(spec => spec.value === targetJobTitle) && <option value={targetJobTitle}>{targetJobTitle}</option>}
          {STANDARDIZED_SPECIALIZATIONS.map(spec => <option key={spec.value} value={spec.value}>{locale === "ar" ? `${spec.titleAr} — ${spec.titleEn}` : spec.titleEn}</option>)}
        </select>
        <p id="profile-specialization-help" className="text-xs leading-5 text-text-secondary">{STANDARDIZED_SPECIALIZATIONS.find(spec => spec.value === targetJobTitle)?.descriptionAr ?? (locale === "ar" ? "اختيار واحد يكفي، وتقدر تعدّله لاحقًا من ملفك الشخصي." : "Choose one specialization. You can change it later in your profile.")}</p>
        {specializationError && (
          <p role="alert" className="text-xs text-danger-strong font-medium">
            {specializationError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="profile-name" className="field-label">{t("profile.name")}</label>
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
          className={`field-control ${nameError ? "field-control-error" : ""}`}
        />
        {!nameError && <p className="mt-1.5 text-xs text-neutral-500">{t("profile.nameHelp")}</p>}
        {nameError && <p id="profile-name-error" className="mt-1.5 text-xs text-danger-strong">{nameError}</p>}
      </div>

      <div>
        <label htmlFor="portfolio-url" className="field-label">{t("profile.portfolio")}</label>
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
          className={`field-control ${portfolioError ? "field-control-error" : ""}`}
        />
        <p id={portfolioError ? "portfolio-error" : "portfolio-help"} className={`mt-1.5 text-xs ${portfolioError ? "text-danger-strong" : "text-neutral-500"}`}>
          {portfolioError || t("profile.portfolioHelp")}
        </p>
      </div>

      <div>
        <p className="field-label">{t("profile.cv")}</p>
        <div className="rounded-xl border border-dashed border-border bg-neutral-50/70 p-4">
          <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => chooseFile(event.currentTarget.files?.[0])} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-info-strong shadow-sm border border-border">
                <DocumentPdfIcon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">{file?.name ?? initial.cv?.originalName ?? t("profile.uploadCv")}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {file ? `${formatSize(file.size, locale)} MB · ${t(({ idle: "profile.uploadIdle", selected: "profile.uploadSelected", uploading: "profile.uploadInProgress", uploaded: "profile.uploadComplete", error: "profile.uploadFailed" })[uploadState])}` : initial.hasCv ? t("profile.currentCv") : t("profile.pdfLimit", { size: MAX_CV_SIZE_MB })}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => fileInput.current?.click()} className="button-secondary text-xs">
              {file || initial.hasCv ? t("profile.replaceCv") : t("profile.chooseFile")}
            </button>
          </div>
          {file && <button type="button" onClick={() => { setFile(null); setUploadState("idle"); if (fileInput.current) fileInput.current.value = ""; }} className="mt-3 text-xs font-medium text-neutral-500 underline underline-offset-2 hover:text-neutral-900">{t("profile.removeSelectedFile")}</button>}
        </div>
        <p className="mt-1.5 text-xs text-neutral-500">{t("profile.pdfLimit", { size: MAX_CV_SIZE_MB })}</p>
      </div>

      {error && <p role="alert" className="rounded-xl bg-danger-soft/40 border border-danger-border px-3.5 py-2.5 text-sm text-danger-strong">{error}</p>}
      <button type="submit" disabled={saving} className="button-primary w-full py-3">
        {saving ? t(file ? "profile.uploading" : "profile.saving") : onboarding ? t("profile.continue") : t("profile.save")}
      </button>
    </form>
  );
}
