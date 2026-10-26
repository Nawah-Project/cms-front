import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  APPLICATION_METHODS,
  formatApplicationMethod,
  type Application,
  type CreateApplicationInput,
} from "../../../types";
import { getTodayDateString } from "../../../utils/date";
import { SparklesIcon, SpinnerIcon } from "../../../components/Icons";
import { Compass } from "lucide-react";
import { useI18n } from "../../../i18n";
import { Modal } from "../../../components/ui/Modal";
import { JobMarketCompass } from "./JobMarketCompass";
import { useJourneyState } from "../../journey/api/journeyApi";
import { canAddTailoredApplication } from "../../journey/lib/journey-policies";
import { useAuth } from "../../auth/store/authStore";
import { useTour } from "./FirstApplicationGuidedTour";
import { FeatureTour, markFeatureTourSeen } from "../../../components/FeatureTour";
import { EXPLORER_INTRO_TOUR, EXPLORER_TOUR } from "../../journey/lib/week-one-tours";
import { sanitizeJobUrl } from "../../../utils/urlSanitizer";

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateApplicationInput) => Promise<Application | void>;
  initialValues?: Partial<CreateApplicationInput> | null;
  journeyQueryEnabled?: boolean;
}

export function AddApplicationModal({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
  journeyQueryEnabled = true,
}: AddApplicationModalProps) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { isTourActive, step, setStep } = useTour();
  const [postTourEntry, setPostTourEntry] = useState(false);
  const priorEntryOpen = React.useRef(false);
  useEffect(() => {
    if (isOpen && !priorEntryOpen.current) {
      try { setPostTourEntry(!isTourActive && Boolean(user?.id && localStorage.getItem(`nawah_v2_guided_tour_done_${user.id}`) === "true")); } catch { setPostTourEntry(false); }
    }
    if (!isOpen) setPostTourEntry(false);
    priorEntryOpen.current = isOpen;
  }, [isOpen, user?.id]);
  const { data: journeyData } = useJourneyState({
    enabled: Boolean(user) && journeyQueryEnabled,
  });
  const showTailoredOption = canAddTailoredApplication(journeyData, user);

  const canShare = Boolean(journeyData?.features.groups);
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [applicationDate, setApplicationDate] = useState(getTodayDateString());
  const [location, setLocation] = useState("");
  const [applicationMethod, setApplicationMethod] =
    useState<string>("COMPANY_WEBSITE");
  const [jobUrl, setJobUrl] = useState("");
  const [isTailored, setIsTailored] = useState(false);
  const [sharedWithGroup, setSharedWithGroup] = useState(false);
  const sharingTouched = React.useRef(false);
  useLayoutEffect(()=>{if(isOpen && !sharingTouched.current)setSharedWithGroup(canShare);if(!isOpen)sharingTouched.current=false;},[isOpen,canShare]);

  const [errors, setErrors] = useState<{
    companyName?: string;
    jobTitle?: string;
    jobUrl?: string;
    submit?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExplorerModal, setShowExplorerModal] = useState(false);
  const [companyPasteHint, setCompanyPasteHint] = useState(false);
  const [showHint, setShowHint] = useState(() => {
    try {
      return (
        localStorage.getItem("nawah_add_modal_explorer_hint_seen") !== "true"
      );
    } catch {
      return false;
    }
  });

  const dismissHint = () => {
    try {
      localStorage.setItem("nawah_add_modal_explorer_hint_seen", "true");
    } catch {
      // ignore
    }
    setShowHint(false);
  };

  const prevIsOpenRef = React.useRef(false);
  const prevInitialValuesRef = React.useRef(initialValues);

  useLayoutEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isNewInitialValues = isOpen && initialValues !== prevInitialValuesRef.current;

    if (isOpening || isNewInitialValues) {
      setSharedWithGroup(canShare);
      if (initialValues) {
        if (initialValues.companyName !== undefined) {
          setCompanyName(initialValues.companyName);
        }
        if (initialValues.jobTitle !== undefined) {
          setJobTitle(initialValues.jobTitle);
        } else if (user?.targetJobTitle) {
          setJobTitle(user.targetJobTitle);
        }
        if (initialValues.location !== undefined) {
          setLocation(initialValues.location);
        }
        if (initialValues.applicationMethod !== undefined) {
          setApplicationMethod(initialValues.applicationMethod);
        }
        if (initialValues.jobUrl !== undefined) {
          setJobUrl(initialValues.jobUrl);
        }
        if (initialValues.isTailored !== undefined) {
          setIsTailored(Boolean(initialValues.isTailored));
        }
        if (initialValues.sharedWithGroup !== undefined) {
          sharingTouched.current=true;
          setSharedWithGroup(canShare && Boolean(initialValues.sharedWithGroup));
        }
      } else if (user?.targetJobTitle) {
        setJobTitle(user.targetJobTitle);
      }
    }
    prevIsOpenRef.current = isOpen;
    prevInitialValuesRef.current = initialValues;
  }, [isOpen, initialValues, user?.targetJobTitle]);

  const handleCompanyInputOrPaste = (value: string) => {
    const trimmed = value.trim();
    if (/^(https?:\/\/|www\.)/i.test(trimmed)) {
      const formattedUrl = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed;
      if (!jobUrl.trim()) {
        setJobUrl(formattedUrl);
        if (errors.jobUrl) {
          setErrors((prev) => ({ ...prev, jobUrl: undefined }));
        }
      }
      setCompanyName("");
      setCompanyPasteHint(true);
      if (errors.companyName) {
        setErrors((prev) => ({ ...prev, companyName: undefined }));
      }
      return;
    }
    setCompanyPasteHint(false);
    setCompanyName(value);
    if (errors.companyName) {
      setErrors((prev) => ({ ...prev, companyName: undefined }));
    }
  };

  const validate = () => {
    const errs: { companyName?: string; jobTitle?: string; jobUrl?: string } = {};
    if (!companyName.trim()) {
      errs.companyName = t("applications.validationCompany");
    } else if (/https?:\/\/|www\./i.test(companyName.trim())) {
      errs.companyName = locale === "ar"
        ? "يرجى كتابة اسم الشركة فقط وليس رابط الموقع"
        : "Please enter the company name only, not a URL";
    }
    if (!jobTitle.trim()) {
      errs.jobTitle = t("applications.validationJobTitle");
    }
    const trimmedUrl = jobUrl.trim();
    if (!trimmedUrl) {
      errs.jobUrl = locale === "ar"
        ? "🔗 رابط إعلان الوظيفة مطلوب — حفظ الرابط يسهّل عليك الرجوع لتفاصيل الوظيفة ومتابعتها في أي وقت، كما ستحتاجه في (تقييم اليوم السابع والتقرير الأسبوعي) لمراجعة طبيعة الوظائف التي قدمت عليها وتحليل أسباب استجابة الشركات."
        : "🔗 Job post URL is required — Saving the link allows you to review job details at any time and analyze company responses during weekly reviews.";
    } else if (!/^https?:\/\//i.test(trimmedUrl)) {
      errs.jobUrl = locale === "ar"
        ? "🔗 يرجى إدخال رابط صحيح يبدأ بـ http:// أو https://"
        : "🔗 Please enter a valid URL starting with http:// or https://";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setCompanyName("");
    setJobTitle("");
    setApplicationDate(getTodayDateString());
    setLocation("");
    setApplicationMethod("COMPANY_WEBSITE");
    setJobUrl("");
    setIsTailored(false);
    setSharedWithGroup(canShare);
    setCompanyPasteHint(false);
    setErrors({});
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      await onSubmit({
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        applicationDate,
        location: location.trim(),
        applicationMethod,
        jobUrl: sanitizeJobUrl(jobUrl),
        isTailored: showTailoredOption ? isTailored : false,
        sharedWithGroup: canShare && sharedWithGroup,
      });
      window.dispatchEvent(new CustomEvent("nawah_app_created"));
      resetForm();
      onClose();
    } catch {
      setErrors({
        submit: t("common.unexpectedError"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <FeatureTour feature="explorer-intro-week1-v1" enabled={isOpen && postTourEntry && !isTourActive} steps={EXPLORER_INTRO_TOUR} />
    <FeatureTour feature="explorer-filters-week1-v1" enabled={showExplorerModal && postTourEntry && !isTourActive} steps={EXPLORER_TOUR} />
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("applications.addTitle")}
      size="lg"
      disableClose={isSubmitting || isTourActive}
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting || isTourActive}
            className={`button-secondary text-sm ${isTourActive ? "hidden" : ""}`}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            data-tour-step="add-app-submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="button-primary inline-flex items-center gap-2 text-sm"
          >
            {isSubmitting && <SpinnerIcon className="h-4 w-4" />}
            <span>{t("applications.add")}</span>
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Job Explorer Shortcut in Form Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80 overflow-visible relative z-20">
          <span className="text-xs text-neutral-500 font-medium">
            {locale === "ar" ? "لم تجد وظيفة للتقديم بعد؟" : "Looking for a job to apply to?"}
          </span>
          <div className="relative" onMouseLeave={dismissHint}>
            <button
              type="button"
              data-tour-step="add-app-explorer-btn"
              onClick={() => {
                dismissHint();
                if (isTourActive && step === 3) {
                  setStep(4);
                }
                setShowExplorerModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors shadow-2xs"
            >
              <Compass className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
              <span>{locale === "ar" ? "🧭 مستكشف الوظائف" : "🧭 Job Explorer"}</span>
            </button>

            {/* Welcoming Floating Hint on First Visit */}
            {showHint && !isTourActive && (
              <div
                onClick={dismissHint}
                className="absolute top-full mt-2 end-0 z-[160] whitespace-nowrap rounded-xl bg-neutral-900 text-white px-3 py-2 text-xs font-semibold shadow-2xl ring-1 ring-white/10 animate-in fade-in slide-in-from-top-1 duration-200 after:content-[''] after:absolute after:bottom-full after:end-5 after:border-[6px] after:border-transparent after:border-b-neutral-900 cursor-pointer"
              >
                💡 {locale === "ar"
                  ? "ابحث عن وظيفة في السوق المناسب بضغطة واحدة من هنا"
                  : "Find jobs in your target market in 1 click here"}
              </div>
            )}
          </div>
        </div>

        {errors.submit && (
          <div className="rounded-xl border border-danger-border bg-danger-soft/40 p-3 text-xs text-danger-strong">
            {errors.submit}
          </div>
        )}

        <div>
          <label htmlFor="companyName" className="field-label">
            {t("applications.companyName")}{" "}
            <span className="text-danger-strong">*</span>
          </label>
          <input
            id="companyName"
            type="text"
            data-tour-step="add-app-company"
            required
            value={companyName}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text").trim();
              if (/^(https?:\/\/|www\.)/i.test(pasted)) {
                e.preventDefault();
                handleCompanyInputOrPaste(pasted);
              }
            }}
            onChange={(e) => handleCompanyInputOrPaste(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                isTourActive &&
                step === 5 &&
                companyName.trim().length >= 2
              ) {
                e.preventDefault();
                setStep(6);
              }
            }}
            placeholder={t("applications.companyPlaceholder")}
            className={`field-control ${errors.companyName ? "field-control-error" : ""}`}
          />
          {companyPasteHint && (
            <p className="mt-1.5 rounded-xl border border-amber-300/80 bg-amber-50/80 p-2.5 text-xs text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-200 animate-in fade-in duration-150">
              {locale === "ar"
                ? "✨ لاحظنا أنك لصقت رابط الوظيفة هنا، فقمنا بنقله تلقائياً إلى خانة (رابط الوظيفة) بالأسفل! يرجى كتابة اسم الشركة فقط في هذه الخانة."
                : "✨ We noticed you pasted the job link here, so we moved it automatically to the Job URL field below! Please enter only the company name here."}
            </p>
          )}
          {errors.companyName && (
            <p className="mt-1 text-xs text-danger-strong">
              {errors.companyName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="jobTitle" className="field-label">
            {t("applications.jobTitle")}{" "}
            <span className="text-danger-strong">*</span>
          </label>
          <input
            id="jobTitle"
            type="text"
            required
            value={jobTitle}
            onChange={(e) => {
              setJobTitle(e.target.value);
              if (errors.jobTitle)
                setErrors((prev) => ({ ...prev, jobTitle: undefined }));
            }}
            placeholder={t("applications.jobPlaceholder")}
            className={`field-control ${errors.jobTitle ? "field-control-error" : ""}`}
          />
          {errors.jobTitle && (
            <p className="mt-1 text-xs text-danger-strong">
              {errors.jobTitle}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="applicationDate" className="field-label">
              {t("applications.applicationDate")}
            </label>
            <input
              id="applicationDate"
              type="date"
              value={applicationDate}
              onChange={(e) => setApplicationDate(e.target.value)}
              className="field-control"
            />
          </div>

          <div>
            <label htmlFor="location" className="field-label">
              {t("applications.location")}
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("applications.locationPlaceholder")}
              className="field-control"
            />
          </div>
        </div>

        <div>
          <label htmlFor="applicationMethod" className="field-label">
            {t("applications.method")}
          </label>
          <select
            id="applicationMethod"
            value={applicationMethod}
            onChange={(e) => setApplicationMethod(e.target.value)}
            className="field-control"
          >
            {APPLICATION_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {formatApplicationMethod(method.value, t)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="jobUrl" className="field-label">
            {t("applications.jobUrl")}{" "}
            <span className="text-danger-strong">*</span>
          </label>
          <input
            id="jobUrl"
            type="url"
            data-tour-step="add-app-url"
            required
            value={jobUrl}
            onBlur={() => setJobUrl((prev) => sanitizeJobUrl(prev))}
            onChange={(e) => {
              setJobUrl(e.target.value);
              if (errors.jobUrl) setErrors((prev) => ({ ...prev, jobUrl: undefined }));
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                isTourActive &&
                step === 6 &&
                jobUrl.trim().length >= 8 &&
                /^https?:\/\//i.test(jobUrl.trim())
              ) {
                e.preventDefault();
                setStep(7);
              }
            }}
            placeholder="https://..."
            className={`field-control ${errors.jobUrl ? "field-control-error" : ""}`}
          />
          {errors.jobUrl && (
            <p className="mt-1.5 rounded-lg border border-danger-border bg-danger-soft/40 p-2.5 text-xs leading-relaxed text-danger-strong">
              {errors.jobUrl}
            </p>
          )}
        </div>

        {/* V2 Strategic Options: Tailored Application & Group Sharing */}
        {(showTailoredOption || canShare) && <div data-application-options className="space-y-3 rounded-xl border border-border bg-surface p-3.5">
          {showTailoredOption && (
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={isTailored}
                onChange={(e) => setIsTailored(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
              />
              <span className="text-xs leading-5 text-text-primary">
                <span className="inline-flex items-center gap-1 font-semibold">
                  <SparklesIcon className="h-3.5 w-3.5 text-amber-600" />
                  <span>{t("applications.isTailoredLabel")}</span>
                </span>
                <span className="block text-[11px] text-text-secondary">
                  {t("applications.isTailoredHint")}
                </span>
              </span>
            </label>
          )}

          {canShare && <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={sharedWithGroup}
              onChange={(e) => {sharingTouched.current=true;setSharedWithGroup(e.target.checked);}}
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
            />
            <span className="text-xs leading-5 text-text-primary">
              <span className="font-semibold block">
                {t("applications.sharedWithGroupLabel")}
              </span>
              <span className="block text-[11px] text-text-secondary">
                {t("applications.sharedWithGroupHint")}
              </span>
            </span>
          </label>}
        </div>}
      </form>
    </Modal>

    {showExplorerModal && (
      <Modal
        isOpen={true}
        zIndex={110}
        onClose={() => {
          if (!isTourActive) { setShowExplorerModal(false); if(postTourEntry) markFeatureTourSeen(user?.id,"explorer-filters-week1-v1"); }
        }}
        disableClose={isTourActive}
        title={locale === "ar" ? "مستكشف الوظائف" : "Job Explorer"}
        size="2xl"
      >
        <div className="max-h-[75vh] overflow-y-auto -m-4 p-4 sm:-m-6 sm:p-6">
          <JobMarketCompass
            collapsible={false}
            guided={isTourActive && step === 4}
            onLaunchDraft={(draft) => {
              setShowExplorerModal(false);
              if (isTourActive && step === 4) {
                setStep(5);
              }
              if (draft.companyName) setCompanyName(draft.companyName);
              if (draft.applicationMethod) setApplicationMethod(draft.applicationMethod);
              if (draft.location) setLocation(draft.location);
              if (draft.jobTitle) setJobTitle(draft.jobTitle);
              setJobUrl("");
            }}
          />
        </div>
      </Modal>
    )}
  </>
  );
}

