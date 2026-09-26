import React, { useEffect, useState } from "react";
import {
  APPLICATION_METHODS,
  STAGES,
  type Application,
  type Outcome,
  type Stage,
  type UpdateApplicationInput,
} from "../types";
import { CloseIcon, SpinnerIcon } from "./Icons";

interface EditApplicationModalProps {
  isOpen: boolean;
  application: Application | null;
  onClose: () => void;
  onSave: (
    id: string,
    updates: UpdateApplicationInput,
  ) => Promise<Application | void>;
}

export function EditApplicationModal({
  isOpen,
  application,
  onClose,
  onSave,
}: EditApplicationModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [applicationDate, setApplicationDate] = useState("");
  const [location, setLocation] = useState("");
  const [applicationMethod, setApplicationMethod] = useState("COMPANY_WEBSITE");
  const [jobUrl, setJobUrl] = useState("");
  const [stage, setStage] = useState<Stage>("APPLIED");
  const [outcome, setOutcome] = useState<Outcome>("NONE");

  const [errors, setErrors] = useState<{
    companyName?: string;
    jobTitle?: string;
    submit?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (application) {
      setCompanyName(application.companyName);
      setJobTitle(application.jobTitle);
      setApplicationDate(application.applicationDate);
      setLocation(application.location || "");
      setApplicationMethod(application.applicationMethod || "COMPANY_WEBSITE");
      setJobUrl(application.jobUrl || "");
      setStage(application.stage);
      setOutcome(application.outcome);
      setErrors({});
    }
  }, [application]);

  if (!isOpen || !application) return null;

  const handleStageChange = (newStage: Stage) => {
    setStage(newStage);
    if (newStage === "CLOSED") {
      // When moving to closed, initialize outcome if currently NONE
      if (outcome === "NONE") {
        setOutcome("ACCEPTED");
      }
    } else {
      setOutcome("NONE");
    }
  };

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
      await onSave(application.id, {
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        applicationDate,
        location: location.trim(),
        applicationMethod,
        jobUrl: jobUrl.trim(),
        stage,
        outcome: stage === "CLOSED" ? outcome : "NONE",
      });
      onClose();
    } catch (err: any) {
      setErrors({
        submit:
          err.message || "Failed to update application. Please try again.",
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
        aria-labelledby="edit-application-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2
            id="edit-application-title"
            className="text-base font-semibold text-neutral-900 dark:text-neutral-100"
          >
            Edit Application
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

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
        >
          {errors.submit && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300 rounded-md border border-red-200 dark:border-red-900">
              {errors.submit}
            </div>
          )}

          <div>
            <label
              htmlFor="editCompanyName"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              id="editCompanyName"
              type="text"
              required
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                if (errors.companyName)
                  setErrors((prev) => ({ ...prev, companyName: undefined }));
              }}
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
            />
            {errors.companyName && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.companyName}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="editJobTitle"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              id="editJobTitle"
              type="text"
              required
              value={jobTitle}
              onChange={(e) => {
                setJobTitle(e.target.value);
                if (errors.jobTitle)
                  setErrors((prev) => ({ ...prev, jobTitle: undefined }));
              }}
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
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
                htmlFor="editApplicationDate"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Application Date
              </label>
              <input
                id="editApplicationDate"
                type="date"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              />
            </div>

            <div>
              <label
                htmlFor="editLocation"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Location
              </label>
              <input
                id="editLocation"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="editApplicationMethod"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Application Method
            </label>
            <select
              id="editApplicationMethod"
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
              htmlFor="editJobUrl"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Job URL
            </label>
            <input
              id="editJobUrl"
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
            />
          </div>

          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Pipeline Stage
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STAGES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleStageChange(s.key)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    stage === s.key
                      ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white shadow-xs"
                      : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Outcome selection only appears when stage is CLOSED */}
          {stage === "CLOSED" && (
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <label className="block text-xs font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                Outcome for Closed Application
              </label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {(["ACCEPTED", "REJECTED", "WITHDRAWN"] as Outcome[]).map(
                  (opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setOutcome(opt)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                        outcome === opt
                          ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
                          : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {opt.charAt(0) + opt.slice(1).toLowerCase()}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

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
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
