import React, { useState } from "react";
import {
  APPLICATION_METHODS,
  formatApplicationMethod,
  type Application,
  type CreateApplicationInput,
} from "../types";
import { getTodayDateString } from "../utils/date";
import { SpinnerIcon } from "./Icons";
import { useI18n } from "../i18n";
import { Modal } from "./ui/Modal";

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateApplicationInput) => Promise<Application | void>;
}

export function AddApplicationModal({
  isOpen,
  onClose,
  onSubmit,
}: AddApplicationModalProps) {
  const { t } = useI18n();
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [applicationDate, setApplicationDate] = useState(getTodayDateString());
  const [location, setLocation] = useState("");
  const [applicationMethod, setApplicationMethod] =
    useState<string>("COMPANY_WEBSITE");
  const [jobUrl, setJobUrl] = useState("");

  const [errors, setErrors] = useState<{
    companyName?: string;
    jobTitle?: string;
    submit?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            {t("applications.companyName")} <span className="text-danger-strong">*</span>
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
            {t("applications.jobTitle")} <span className="text-danger-strong">*</span>
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
      </form>
    </Modal>
  );
}
