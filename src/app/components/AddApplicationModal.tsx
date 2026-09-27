import React, { useEffect, useRef, useState } from "react";
import {
  APPLICATION_METHODS,
  formatApplicationMethod,
  type Application,
  type CreateApplicationInput,
} from "../types";
import { getTodayDateString } from "../utils/date";
import { CloseIcon, SpinnerIcon } from "./Icons";
import { useI18n } from "../i18n";

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      if (dialog?.open) dialog.close();
      previousFocus.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

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
      // Reset form and close
      setCompanyName("");
      setJobTitle("");
      setApplicationDate(getTodayDateString());
      setLocation("");
      setApplicationMethod("COMPANY_WEBSITE");
      setJobUrl("");
      onClose();
    } catch (err: any) {
      setErrors({
        submit: t("common.unexpectedError"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (!isSubmitting) onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === dialogRef.current && !isSubmitting) onClose();
      }}
      aria-labelledby="add-application-title"
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 text-start shadow-xl backdrop:bg-neutral-950/40 backdrop:backdrop-blur-xs dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2
            id="add-application-title"
            className="text-base font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {t("applications.addTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            ref={closeRef}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-md transition-colors"
            aria-label={t("common.close")}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(92dvh-4rem)] space-y-4 overflow-y-auto p-6">
          {errors.submit && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-md border border-red-200 dark:border-red-900">
              {errors.submit}
            </div>
          )}

          <div>
            <label
              htmlFor="companyName"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              {t("applications.companyName")} <span className="text-red-500">*</span>
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
              className={`w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/60 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 transition-colors ${
                errors.companyName
                  ? "border-red-500 focus:ring-red-500"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
              }`}
            />
            {errors.companyName && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.companyName}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="jobTitle"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              {t("applications.jobTitle")} <span className="text-red-500">*</span>
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
              className={`w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/60 border rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 transition-colors ${
                errors.jobTitle
                  ? "border-red-500 focus:ring-red-500"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
              }`}
            />
            {errors.jobTitle && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.jobTitle}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="applicationDate"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t("applications.applicationDate")}
              </label>
              <input
                id="applicationDate"
                type="date"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              />
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                {t("applications.location")}
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("applications.locationPlaceholder")}
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="applicationMethod"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              {t("applications.method")}
            </label>
            <select
              id="applicationMethod"
              value={applicationMethod}
              onChange={(e) => setApplicationMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
            >
              {APPLICATION_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {formatApplicationMethod(method.value, t)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="jobUrl"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              {t("applications.jobUrl")}
            </label>
            <input
              id="jobUrl"
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="button-ghost text-xs disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="button-primary inline-flex items-center gap-2 text-xs disabled:opacity-50 shadow-xs dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {isSubmitting && <SpinnerIcon className="w-3.5 h-3.5" />}
              <span>{t("applications.add")}</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
