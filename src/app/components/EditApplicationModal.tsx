import React, { useEffect, useRef, useState } from "react";
import {
  APPLICATION_METHODS,
  formatApplicationMethod,
  STAGES,
  type Application,
  type Outcome,
  type Stage,
  type UpdateApplicationInput,
} from "../types";
import { CloseIcon, SpinnerIcon } from "./Icons";
import { useI18n } from "../i18n";

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
  const { t } = useI18n();
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || !application) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      if (dialog?.open) dialog.close();
      previousFocus.current?.focus();
    };
  }, [isOpen, application]);

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
      await onSave(application.id, {
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        applicationDate,
        location: location.trim(),
        applicationMethod,
        jobUrl: jobUrl.trim(),
        stage,
        outcome:
          stage !== "CLOSED"
            ? "NONE"
            : outcome === "NO_RESPONSE" && application.outcome === "NO_RESPONSE"
              ? undefined
              : outcome,
      });
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
      aria-labelledby="edit-application-title"
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 text-start shadow-xl backdrop:bg-neutral-950/40 backdrop:backdrop-blur-xs dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2
            id="edit-application-title"
            className="text-base font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {t("applications.editTitle")}
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

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(92dvh-4rem)] space-y-4 overflow-y-auto p-6"
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
              {t("applications.companyName")}{" "}
              <span className="text-red-500">*</span>
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
              {t("applications.jobTitle")}{" "}
              <span className="text-red-500">*</span>
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
                {t("applications.applicationDate")}
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
                {t("applications.location")}
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
              {t("applications.method")}
            </label>
            <select
              id="editApplicationMethod"
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
              htmlFor="editJobUrl"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              {t("applications.jobUrl")}
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
              {t("applications.stage")}
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
                  {t(
                    `applications.${s.key === "APPLIED" ? "submitted" : s.key.toLowerCase()}`,
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Outcome selection only appears when stage is CLOSED */}
          {stage === "CLOSED" && (
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <label className="block text-xs font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                {t("applications.closedOutcome")}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {(
                  [
                    "ACCEPTED",
                    "REJECTED",
                    "WITHDRAWN",
                    ...(application.outcome === "NO_RESPONSE"
                      ? ["NO_RESPONSE"]
                      : []),
                  ] as Outcome[]
                ).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={opt === "NO_RESPONSE"}
                    onClick={() => setOutcome(opt)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      outcome === opt
                        ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
                        : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50"
                    } ${opt === "NO_RESPONSE" ? "cursor-not-allowed opacity-80" : ""}`}
                  >
                    {t(`applications.${opt.toLowerCase()}`)}
                  </button>
                ))}
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
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="button-primary inline-flex items-center gap-2 text-xs disabled:opacity-50 shadow-xs dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {isSubmitting && <SpinnerIcon className="w-3.5 h-3.5" />}
              <span>{t("applications.saveChanges")}</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
