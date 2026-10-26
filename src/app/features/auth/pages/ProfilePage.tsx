import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, ExternalLink, FileUp, Sparkles, AlertCircle, Eye, ShieldCheck, Mail, History } from "lucide-react";
import { useAuth } from "../store/authStore";
import { useI18n } from "../../../i18n";
import { profileApi, isPdf, MAX_CV_BYTES, MAX_CV_SIZE_MB, type ProfessionalProfile } from "../../profile/profileApi";
import { CvViewer } from "../../profile/CvViewer";
import { SpecializationCombobox } from "../../profile/components/SpecializationCombobox";
import { useToast } from "../../../components/ui/ToastProvider";
import { DocumentPdfIcon, SpinnerIcon } from "../../../components/Icons";

function formatSize(bytes: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024));
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { t, locale } = useI18n();
  const isRtl = locale === "ar";
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewCv, setViewCv] = useState(false);
  const [viewHistoryCv, setViewHistoryCv] = useState<{ id: string; version: number; name: string } | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [targetJobTitle, setTargetJobTitle] = useState("");

  // Validation & status
  const [nameError, setNameError] = useState("");
  const [portfolioError, setPortfolioError] = useState("");
  const [specializationError, setSpecializationError] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  // CV Upload state
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    void profileApi
      .get()
      .then((res) => {
        setProfile(res);
        setName(res.name || "");
        setPortfolio(res.portfolioUrl || "");
        setTargetJobTitle(res.targetJobTitle || "");
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const validateDetails = () => {
    let isValid = true;
    if (!name.trim()) {
      setNameError(t("profile.nameRequired"));
      isValid = false;
    } else {
      setNameError("");
    }

    // Target Job Title English-only check
    const englishRegex = /^[a-zA-Z0-9\s\/\-\.\+\#\&\(\)]+$/;
    if (!targetJobTitle.trim()) {
      setSpecializationError(
        isRtl
          ? "يرجى تحديد تخصصك الوظيفي للمتابعة"
          : "Please specify your target specialization",
      );
      isValid = false;
    } else if (!englishRegex.test(targetJobTitle.trim())) {
      setSpecializationError(
        isRtl
          ? "يرجى كتابة المسمى الوظيفي بالأحرف الإنجليزية فقط"
          : "Specialization must contain English characters only",
      );
      isValid = false;
    } else {
      setSpecializationError("");
    }

    // Portfolio URL check
    const pVal = portfolio.trim();
    if (!pVal) {
      setPortfolioError(t("profile.portfolioRequired"));
      isValid = false;
    } else {
      try {
        const url = new URL(pVal);
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
        setPortfolioError("");
      } catch {
        setPortfolioError(t("profile.invalidUrl"));
        isValid = false;
      }
    }

    return isValid;
  };

  const handleSaveDetails = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateDetails()) return;

    setSavingDetails(true);
    try {
      const updated = await profileApi.update(
        name.trim(),
        portfolio.trim(),
        targetJobTitle.trim(),
      );
      setProfile((prev) => (prev ? { ...prev, ...updated } : updated));
      if (user) {
        setUser({
          ...user,
          name: updated.name,
          targetJobTitle: updated.targetJobTitle,
        });
      }
      toast.success(t("profile.savedSuccess"));
    } catch {
      toast.error(t("profile.saveError"));
    } finally {
      setSavingDetails(false);
    }
  };

  const handleUploadCv = async (candidate?: File) => {
    setUploadError("");
    if (!candidate) return;
    if (!isPdf(candidate)) {
      setUploadError(t("profile.pdfOnly"));
      toast.error(t("profile.pdfOnly"));
      return;
    }
    if (candidate.size > MAX_CV_BYTES) {
      const msg = t("profile.fileTooLarge", { size: MAX_CV_SIZE_MB });
      setUploadError(msg);
      toast.error(msg);
      return;
    }

    setUploadState("uploading");
    try {
      const cvMetadata = await profileApi.uploadCv(candidate);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              cv: cvMetadata,
              hasCv: true,
              cvVersionNumber: (prev.cvVersionNumber || 1) + 1,
            }
          : null,
      );
      setUploadState("success");
      toast.success(
        isRtl
          ? "تم تحديث وحفظ نسختك الجديدة من السيرة الذاتية بنجاح!"
          : "New CV version uploaded successfully!",
      );
    } catch {
      setUploadState("error");
      setUploadError(t("profile.saveError"));
      toast.error(t("profile.saveError"));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (viewHistoryCv) {
    return (
      <CvViewer
        historyId={viewHistoryCv.id}
        title={`CV ${Math.max(0, viewHistoryCv.version - 1)} - ${viewHistoryCv.name}`}
        onClose={() => setViewHistoryCv(null)}
      />
    );
  }

  if (viewCv && user) {
    return <CvViewer userId={user.id} onClose={() => setViewCv(false)} />;
  }

  // Generate initials for avatar
  const initials = (name || user?.name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="space-y-7 animate-in fade-in duration-150 max-w-5xl">
      {/* 1. Profile Identity Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface to-neutral-50/80 dark:from-neutral-900 dark:to-neutral-950 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 shrink-0 rounded-2xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 font-bold text-xl flex items-center justify-center shadow-md">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
                  {name || user?.name}
                </h1>
                {user?.emailVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>{isRtl ? "موثق" : "Verified"}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    <Mail className="h-3.5 w-3.5" />
                    <span dir="ltr">{user?.email}</span>
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  dir="ltr"
                  className="rounded-lg border border-border bg-surface px-2.5 py-1 font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-2xs"
                >
                  {targetJobTitle || user?.targetJobTitle || "Specialization"}
                </span>
                <span className="rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300 shadow-2xs">
                  {`CV ${Math.max(0, (profile?.cvVersionNumber || 1) - 1)}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Loading & Error States */}
      {loading ? (
        <div className="flex min-h-60 items-center justify-center rounded-2xl border border-border bg-surface p-8 text-sm text-neutral-500">
          <SpinnerIcon className="h-5 w-5 animate-spin me-2" />
          <span>{t("profile.loadingProfile")}</span>
        </div>
      ) : error || !profile ? (
        <div
          role="alert"
          className="rounded-2xl border border-danger-border bg-danger-soft/30 p-6 text-sm text-danger-strong flex items-center justify-between"
        >
          <span>{t("profile.loadError")}</span>
          <button type="button" onClick={load} className="button-secondary text-xs">
            {t("common.retry")}
          </button>
        </div>
      ) : (
        /* 2. Modern Two-Column Bento Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Right Column: Professional Data & Links (lg:col-span-7) */}
          <section className="lg:col-span-7 rounded-3xl border border-border bg-surface p-6 sm:p-7 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {isRtl ? "البيانات المهنية والروابط" : "Professional Details & Links"}
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                {isRtl
                  ? "تأكد من دقة المسمى الوظيفي ورابط معرض الأعمال لمزامنتها مع مستكشف الوظائف"
                  : "Ensure specialization and portfolio accuracy for automated job matching"}
              </p>
            </div>

            <form onSubmit={handleSaveDetails} className="space-y-5" noValidate>
              {/* Name Field */}
              <div>
                <label htmlFor="bento-name" className="field-label text-xs font-semibold">
                  {t("profile.name")}
                </label>
                <input
                  id="bento-name"
                  type="text"
                  maxLength={100}
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError("");
                  }}
                  className={`field-control ${nameError ? "field-control-error" : ""}`}
                />
                {nameError && (
                  <p className="mt-1 text-xs text-danger-strong">{nameError}</p>
                )}
              </div>

              {/* Specialization Combobox */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="field-label text-xs font-semibold mb-0">
                    {isRtl ? "التخصص الوظيفي المستهدف" : "Target Job Specialization"}
                  </label>
                  <span className="text-[11px] font-mono text-neutral-400">
                    English Only
                  </span>
                </div>
                <SpecializationCombobox
                  value={targetJobTitle}
                  onChange={(val) => {
                    setTargetJobTitle(val);
                    setSpecializationError("");
                  }}
                  error={specializationError}
                  onClearError={() => setSpecializationError("")}
                />
              </div>

              {/* Portfolio Link Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="bento-portfolio" className="field-label text-xs font-semibold mb-0">
                    {t("profile.portfolio")}
                  </label>
                  {portfolio.trim() && !portfolioError && (
                    <a
                      href={portfolio.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-info-strong hover:underline"
                    >
                      <span>{isRtl ? "معاينة الرابط" : "Preview"}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <input
                  id="bento-portfolio"
                  type="url"
                  dir="ltr"
                  value={portfolio}
                  onChange={(e) => {
                    setPortfolio(e.target.value);
                    setPortfolioError("");
                  }}
                  placeholder={t("profile.portfolioPlaceholder")}
                  className={`field-control font-mono text-xs ${portfolioError ? "field-control-error" : ""}`}
                />
                <p className={`mt-1 text-xs ${portfolioError ? "text-danger-strong" : "text-neutral-500"}`}>
                  {portfolioError || t("profile.portfolioHelp")}
                </p>
              </div>

              {/* Save Details Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingDetails}
                  className="button-primary w-full py-2.5 text-xs font-semibold shadow-xs flex items-center justify-center gap-2"
                >
                  {savingDetails && <SpinnerIcon className="h-4 w-4 animate-spin" />}
                  <span>{savingDetails ? t("profile.saving") : t("profile.save")}</span>
                </button>
              </div>
            </form>
          </section>

          {/* Left Column: CV Management (lg:col-span-5) */}
          <section className="lg:col-span-5 rounded-3xl border border-border bg-surface p-6 sm:p-7 shadow-xs space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {isRtl ? "إدارة السيرة الذاتية (CV)" : "Resume / CV Management"}
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {isRtl
                    ? "النسخة المعتمدة للتقديم وتتبع الأثر في محطات المراجعة"
                    : "The active resume used for job matching and conversion tracking"}
                </p>
              </div>

              {/* CV File Card */}
              <div className="rounded-2xl border border-border bg-neutral-50/70 dark:bg-neutral-900/40 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white dark:bg-neutral-800 text-info-strong shadow-xs border border-border">
                    <DocumentPdfIcon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {profile.cv?.originalName ?? (isRtl ? "لم يتم رفع ملف بعد" : "No CV file uploaded")}
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-500">
                      {profile.cv
                        ? `${formatSize(profile.cv.size, locale)} MB · ${new Date(profile.cv.uploadedAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium" })}`
                        : t("profile.pdfLimit", { size: MAX_CV_SIZE_MB })}
                    </p>
                  </div>
                </div>

                {uploadError && (
                  <p role="alert" className="text-xs text-danger-strong font-medium">
                    {uploadError}
                  </p>
                )}
              </div>

              {/* CV History Section */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-neutral-500" />
                    <span>{isRtl ? "سجل السير الذاتية (CV History)" : "CV History"}</span>
                  </h4>
                  <span className="text-[10px] text-neutral-400 font-medium">
                    {profile.cvHistory && profile.cvHistory.length > 0 ? profile.cvHistory.length : profile.cv ? 1 : 0} {isRtl ? "نسخة" : "versions"}
                  </span>
                </div>

                <div className="max-h-44 overflow-y-auto divide-y divide-border/60 rounded-xl border border-border/80 bg-neutral-50/50 dark:bg-neutral-900/40 px-3 py-1.5">
                  {profile.cvHistory && profile.cvHistory.length > 0 ? (
                    profile.cvHistory.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 text-xs">
                        <div className="min-w-0 flex-1 pe-2">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex shrink-0 items-center rounded-full bg-neutral-200 dark:bg-neutral-700 px-2 py-0.5 text-[10px] font-bold text-neutral-800 dark:text-neutral-200">
                              CV {Math.max(0, item.versionNumber - 1)}
                              {item.versionNumber === 1 && (
                                <span className="ms-1 font-normal opacity-75">
                                  {isRtl ? "(التأسيسية)" : "(Baseline)"}
                                </span>
                              )}
                            </span>
                            <span className="truncate text-neutral-700 dark:text-neutral-300 font-medium max-w-[130px]">
                              {item.originalName}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-neutral-400">
                            {new Date(item.uploadedAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium" })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewHistoryCv({ id: item.id, version: item.versionNumber, name: item.originalName })}
                          className="p-1 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors shrink-0"
                          title={isRtl ? "معاينة النسخة" : "View version"}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  ) : profile.cv ? (
                    <div className="py-2.5 text-xs text-start">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex shrink-0 items-center rounded-full bg-neutral-200 dark:bg-neutral-700 px-2 py-0.5 text-[10px] font-bold text-neutral-800 dark:text-neutral-200">
                          CV {Math.max(0, (profile.cvVersionNumber || 1) - 1)} {isRtl ? "(النسخة التأسيسية)" : "(Baseline)"}
                        </span>
                        <span className="truncate text-neutral-700 dark:text-neutral-300 font-medium text-xs max-w-[130px]">
                          {profile.cv.originalName}
                        </span>
                      </div>
                      <p className="mt-2 text-[10px] text-neutral-400 leading-relaxed">
                        {isRtl
                          ? "ستُحفظ هنا جميع النسخ السابقة تلقائياً عند كل تحديث لسيرتك الذاتية."
                          : "All previous versions will be automatically preserved here each time you update your CV."}
                      </p>
                    </div>
                  ) : (
                    <p className="py-3 text-center text-[11px] text-neutral-400">
                      {isRtl ? "لا توجد نسخ سابقة" : "No CV history"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions for CV */}
            <div className="space-y-2.5 pt-4 border-t border-border/80">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(e) => handleUploadCv(e.currentTarget.files?.[0])}
              />

              {profile.hasCv && (
                <button
                  type="button"
                  onClick={() => setViewCv(true)}
                  className="button-primary w-full py-2.5 text-xs font-semibold shadow-xs flex items-center justify-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>{t("profile.viewCv")}</span>
                </button>
              )}

              <button
                type="button"
                disabled={uploadState === "uploading"}
                onClick={() => fileInputRef.current?.click()}
                className="button-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
              >
                {uploadState === "uploading" ? (
                  <>
                    <SpinnerIcon className="h-4 w-4 animate-spin" />
                    <span>{t("profile.uploading")}</span>
                  </>
                ) : (
                  <>
                    <FileUp className="h-4 w-4" />
                    <span>
                      {profile.hasCv ? t("profile.replaceCv") : t("profile.chooseFile")}
                    </span>
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
