import React, { useEffect, useState } from "react";
import {
  APPLICATION_METHODS,
  formatApplicationMethod,
  type Application,
  type CreateApplicationInput,
} from "../../../types";
import { getTodayDateString } from "../../../utils/date";
import { SparklesIcon, SpinnerIcon } from "../../../components/Icons";
import { useI18n } from "../../../i18n";
import { Modal } from "../../../components/ui/Modal";
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
  const { t } = useI18n();
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

  useEffect(() => {
    if (isOpen && initialValues) {
      if (initialValues.companyName !== undefined) {
        setCompanyName(initialValues.companyName);
      }
      if (initialValues.jobTitle !== undefined) {
        setJobTitle(initialValues.jobTitle);
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
    }
  }, [isOpen, initialValues]);

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
  );
}

