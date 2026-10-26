import React, { useEffect, useState } from "react";
import {
  APPLICATION_METHODS,
  formatApplicationMethod,
  STAGES,
  type Application,
  type Outcome,
  type Stage,
  type UpdateApplicationInput,
} from "../../../types";
import { SparklesIcon, SpinnerIcon } from "../../../components/Icons";
import { useI18n } from "../../../i18n";
import { Modal } from "../../../components/ui/Modal";
import { useJourneyState } from "../../journey/api/journeyApi";
import { canAddTailoredApplication } from "../../journey/lib/journey-policies";
import { useAuth } from "../../auth/store/authStore";
import { sanitizeJobUrl } from "../../../utils/urlSanitizer";

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
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { data: journeyData } = useJourneyState({ enabled: Boolean(user) });
  const canShare=Boolean(journeyData?.features.groups);
  const showTailoredOption =
    canAddTailoredApplication(journeyData, user) ||
    Boolean(application?.isTailored);

  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [applicationDate, setApplicationDate] = useState("");
  const [location, setLocation] = useState("");
  const [applicationMethod, setApplicationMethod] = useState("COMPANY_WEBSITE");
  const [jobUrl, setJobUrl] = useState("");
  const [stage, setStage] = useState<Stage>("APPLIED");
  const [outcome, setOutcome] = useState<Outcome>("NONE");
  const [isTailored, setIsTailored] = useState(false);
  const [sharedWithGroup, setSharedWithGroup] = useState(false);
  const [hasAssignment, setHasAssignment] = useState(false);

  const [errors, setErrors] = useState<{
    companyName?: string;
    jobTitle?: string;
    jobUrl?: string;
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
      setIsTailored(Boolean(application.isTailored));
      setSharedWithGroup(Boolean(application.sharedWithGroup));
      setHasAssignment(Boolean(application.hasAssignment));
      setErrors({});
    }
  }, [application]);

  if (!isOpen || !application) return null;

  const handleStageChange = (newStage: Stage) => {
    setStage(newStage);
    if (newStage === "CLOSED") {
      if (outcome === "NONE") {
        setOutcome("ACCEPTED");
      }
    } else {
      setOutcome("NONE");
    }
  };

  const validate = () => {
    const errs: { companyName?: string; jobTitle?: string; jobUrl?: string } = {};
    if (!companyName.trim()) {
      errs.companyName = t("applications.validationCompany");
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

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
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
        jobUrl: sanitizeJobUrl(jobUrl),
        stage,
        outcome:
          stage !== "CLOSED"
            ? "NONE"
            : outcome === "NO_RESPONSE" && application.outcome === "NO_RESPONSE"
              ? undefined
              : outcome,
        isTailored: showTailoredOption ? isTailored : application.isTailored,
        sharedWithGroup:canShare && sharedWithGroup,
        hasAssignment,
      });
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
      title={t("applications.editTitle")}
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
            <span>{t("applications.saveChanges")}</span>
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
          <label htmlFor="editCompanyName" className="field-label">
            {t("applications.companyName")}{" "}
            <span className="text-danger-strong">*</span>
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
            className={`field-control ${errors.companyName ? "field-control-error" : ""}`}
          />
          {errors.companyName && (
            <p className="mt-1 text-xs text-danger-strong">
              {errors.companyName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="editJobTitle" className="field-label">
            {t("applications.jobTitle")}{" "}
            <span className="text-danger-strong">*</span>
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
            <label htmlFor="editApplicationDate" className="field-label">
              {t("applications.applicationDate")}
            </label>
            <input
              id="editApplicationDate"
              type="date"
              value={applicationDate}
              onChange={(e) => setApplicationDate(e.target.value)}
              className="field-control"
            />
          </div>

          <div>
            <label htmlFor="editLocation" className="field-label">
              {t("applications.location")}
            </label>
            <input
              id="editLocation"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="field-control"
            />
          </div>
        </div>

        <div>
          <label htmlFor="editApplicationMethod" className="field-label">
            {t("applications.method")}
          </label>
          <select
            id="editApplicationMethod"
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
          <label htmlFor="editJobUrl" className="field-label">
            {t("applications.jobUrl")}{" "}
            <span className="text-danger-strong">*</span>
          </label>
          <input
            id="editJobUrl"
            type="url"
            required
            value={jobUrl}
            onBlur={() => setJobUrl((prev) => sanitizeJobUrl(prev))}
            onChange={(e) => {
              setJobUrl(e.target.value);
              if (errors.jobUrl) setErrors((prev) => ({ ...prev, jobUrl: undefined }));
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

        {/* V2 Strategic Options */}
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
              </span>
            </label>
          )}

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={hasAssignment}
              onChange={(e) => setHasAssignment(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
            />
            <span className="text-xs font-semibold leading-5 text-text-primary">
              {t("applications.hasAssignmentLabel")}
            </span>
          </label>

          {canShare && <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={sharedWithGroup}
              onChange={(e) => setSharedWithGroup(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
            />
            <span className="text-xs font-semibold leading-5 text-text-primary">
              {t("applications.sharedWithGroupLabel")}
            </span>
          </label>}
        </div>

        <div className="pt-2 border-t border-border">
          <label className="field-label mb-2">
            {t("applications.stage")}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {STAGES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => handleStageChange(s.key)}
                className={`px-2.5 py-2 text-xs font-medium rounded-xl border transition-all ${
                  stage === s.key
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-xs dark:bg-white dark:text-neutral-900 dark:border-white"
                    : "bg-surface text-text-secondary border-border hover:bg-surface-hover"
                }`}
              >
                {t(
                  `applications.${s.key === "APPLIED" ? "submitted" : s.key.toLowerCase()}`,
                )}
              </button>
            ))}
          </div>
        </div>

        {stage === "CLOSED" && (
          <div className="p-3.5 bg-neutral-50/70 rounded-xl border border-border">
            <label className="field-label mb-2">
              {t("applications.closedOutcome")}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                  className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all ${
                    outcome === opt
                      ? "bg-neutral-900 text-white border-neutral-900"
                      : "bg-surface text-text-secondary border-border hover:bg-surface-hover"
                  } ${opt === "NO_RESPONSE" ? "cursor-not-allowed opacity-70" : ""}`}
                >
                  {t(`applications.${opt.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}

