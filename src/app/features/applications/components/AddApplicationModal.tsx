import React, { useEffect, useState } from "react";
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

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateApplicationInput) => Promise<Application | void>;
  initialValues?: Partial<CreateApplicationInput> | null;
}

export function AddApplicationModal({
  isOpen,
  onClose,
  onSubmit,
  initialValues,
}: AddApplicationModalProps) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { data: journeyData } = useJourneyState({ enabled: Boolean(user) });
  const showTailoredOption = canAddTailoredApplication(journeyData, user);

  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [applicationDate, setApplicationDate] = useState(getTodayDateString());
  const [location, setLocation] = useState("");
  const [applicationMethod, setApplicationMethod] =
    useState<string>("COMPANY_WEBSITE");
  const [jobUrl, setJobUrl] = useState("");
  const [isTailored, setIsTailored] = useState(false);
  const [sharedWithGroup, setSharedWithGroup] = useState(false);

  const [errors, setErrors] = useState<{
    companyName?: string;
    jobTitle?: string;
    submit?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExplorerModal, setShowExplorerModal] = useState(false);
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

  useEffect(() => {
    if (isOpen) {
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
          setSharedWithGroup(Boolean(initialValues.sharedWithGroup));
        }
      } else if (user?.targetJobTitle) {
        setJobTitle(user.targetJobTitle);
      }
    }
  }, [isOpen, initialValues, user?.targetJobTitle]);

  const validate = () => {
    const errs: { companyName?: string; jobTitle?: string } = {};
    if (!companyName.trim()) {
      errs.companyName = t("applications.validationCompany");
    }
    if (!jobTitle.trim()) {
      errs.jobTitle = t("applications.validationJobTitle");
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
    setSharedWithGroup(false);
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
        jobUrl: jobUrl.trim(),
        isTailored: showTailoredOption ? isTailored : false,
        sharedWithGroup,
      });
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
      <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("applications.addTitle")}
      size="lg"
      disableClose={isSubmitting}
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="button-secondary text-sm"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
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
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <span className="text-xs text-neutral-500 font-medium">
            {locale === "ar" ? "لم تجد وظيفة للتقديم بعد؟" : "Looking for a job to apply to?"}
          </span>
          <div className="relative" onMouseLeave={dismissHint}>
            <button
              type="button"
              onClick={() => {
                dismissHint();
                setShowExplorerModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 px-3 py-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors shadow-2xs"
            >
              <Compass className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
              <span>{locale === "ar" ? "🧭 مستكشف الوظائف" : "🧭 Job Explorer"}</span>
            </button>

            {/* Welcoming Floating Hint on First Visit */}
            {showHint && (
              <div
                onClick={dismissHint}
                className="absolute -top-10 end-0 z-30 whitespace-nowrap rounded-lg bg-neutral-900 text-white px-2.5 py-1 text-[11px] font-semibold shadow-lg animate-in fade-in zoom-in-95 duration-200 after:content-[''] after:absolute after:top-full after:end-4 after:border-[4px] after:border-transparent after:border-t-neutral-900 cursor-pointer"
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
            required
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              if (errors.companyName)
                setErrors((prev) => ({ ...prev, companyName: undefined }));
            }}
            placeholder={t("applications.companyPlaceholder")}
            className={`field-control ${errors.companyName ? "field-control-error" : ""}`}
          />
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
            {t("applications.jobUrl")}
          </label>
          <input
            id="jobUrl"
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://..."
            className="field-control"
          />
        </div>

        {/* V2 Strategic Options: Tailored Application & Group Sharing */}
        <div className="space-y-3 rounded-xl border border-border bg-neutral-50/70 p-3.5 dark:bg-neutral-900/50">
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

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={sharedWithGroup}
              onChange={(e) => setSharedWithGroup(e.target.checked)}
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
          </label>
        </div>
      </form>
    </Modal>

    {showExplorerModal && (
      <Modal
        isOpen={true}
        onClose={() => setShowExplorerModal(false)}
        title={locale === "ar" ? "مستكشف الوظائف" : "Job Explorer"}
        size="2xl"
      >
        <div className="max-h-[75vh] overflow-y-auto -m-4 p-4 sm:-m-6 sm:p-6">
          <JobMarketCompass
            collapsible={false}
            onLaunchDraft={(draft) => {
              setShowExplorerModal(false);
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

