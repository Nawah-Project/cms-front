import React, { useState } from "react";
import {
  APPLICATION_METHODS,
  type Application,
  type CreateApplicationInput,
} from "../types";
import { getTodayDateString } from "../utils/date";
import { CloseIcon, SpinnerIcon } from "./Icons";

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

  if (!isOpen) return null;

  const validate = () => {
    const errs: { companyName?: string; jobTitle?: string } = {};
    if (!companyName.trim()) {
      errs.companyName = "Company name is required";
    }
    if (!jobTitle.trim()) {
      errs.jobTitle = "Job title is required";
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
        submit: err.message || "Failed to add application. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-application-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2
            id="add-application-title"
            className="text-base font-semibold text-neutral-900 dark:text-neutral-100"
          >
            Add Application
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-md transition-colors"
            aria-label="Close modal"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              Company Name <span className="text-red-500">*</span>
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
              placeholder="e.g. Vodafone"
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
              Job Title <span className="text-red-500">*</span>
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
              placeholder="e.g. UX Designer"
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
                Application Date
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
                Location
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Cairo, Remote"
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="applicationMethod"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              How did you apply?
            </label>
            <select
              id="applicationMethod"
              value={applicationMethod}
              onChange={(e) => setApplicationMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
            >
              {APPLICATION_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="jobUrl"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Job URL
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="button-primary inline-flex items-center gap-2 text-xs disabled:opacity-50 shadow-xs dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {isSubmitting && <SpinnerIcon className="w-3.5 h-3.5" />}
              <span>Add Application</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
