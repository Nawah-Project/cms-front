import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { EditApplicationModal } from "../components/EditApplicationModal";
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  EditIcon,
  ExternalLinkIcon,
  MapPinIcon,
  SpinnerIcon,
  TrashIcon,
} from "../components/Icons";
import { PipelineTimeline } from "../components/PipelineTimeline";
import { StatusBadge } from "../components/StatusBadge";
import { api } from "../services/api";
import {
  STAGES,
  formatApplicationMethod,
  type Application,
  type Outcome,
  type Stage,
  type UpdateApplicationInput,
} from "../types";
import { formatDisplayDate } from "../utils/date";
import { useI18n } from "../i18n";

export function meta({ data }: { data?: { application?: Application } }) {
  if (data?.application) {
    return [
      {
        title: `${data.application.jobTitle} at ${data.application.companyName} | Nawah Project`,
      },
      {
        name: "description",
        content: `Application details for ${data.application.jobTitle}`,
      },
    ];
  }
  return [{ title: "Application Details | Nawah Project" }];
}

export default function ApplicationDetailsPage() {
  const { t, locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // State for closing application outcome selection modal
  const [isPromptingClosedOutcome, setIsPromptingClosedOutcome] =
    useState(false);
  const [selectedOutcomeForClose, setSelectedOutcomeForClose] =
    useState<Outcome>("ACCEPTED");

  const loadApplication = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getApplication(id);
      setApplication(data);
    } catch (err: any) {
      setError(t("common.loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApplication();
  }, [id]);

  const handleStageSelect = async (newStage: Stage) => {
    if (!application) return;
    if (newStage === application.stage) return;

    if (newStage === "CLOSED") {
      // When stage becomes CLOSED, prompt for outcome
      setIsPromptingClosedOutcome(true);
      return;
    }

    // Active stage: set stage and outcome to NONE (do not ask for outcome)
    try {
      const updated = await api.updateApplication(application.id, {
        stage: newStage,
        outcome: "NONE",
      });
      setApplication(updated);
    } catch (err: any) {
      alert(t("common.unexpectedError"));
    }
  };

  const handleConfirmClosedOutcome = async () => {
    if (!application) return;
    try {
      const updated = await api.updateApplication(application.id, {
        stage: "CLOSED",
        outcome: selectedOutcomeForClose,
      });
      setApplication(updated);
      setIsPromptingClosedOutcome(false);
    } catch (err: any) {
      alert(t("common.unexpectedError"));
    }
  };

  const handleSaveEdit = async (
    appId: string,
    updates: UpdateApplicationInput,
  ) => {
    const updated = await api.updateApplication(appId, updates);
    setApplication(updated);
    return updated;
  };

  const handleDelete = async () => {
    if (!application) return;
    await api.deleteApplication(application.id);
    navigate("/applications");
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <SpinnerIcon className="w-6 h-6 text-neutral-500 mb-3" />
        <p className="text-xs text-neutral-500">
          {t("applications.loadingDetails")}
        </p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="py-16 max-w-md mx-auto text-center">
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
          <p className="font-semibold mb-1">{t("applications.notFound")}</p>
          <p>{error || t("common.pageNotFound")}</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              to="/applications"
              className="px-3 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-md font-medium text-xs hover:bg-neutral-800 transition-colors"
            >
              {t("applications.backToApplications")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Back Link and Actions Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/applications"
          className="inline-flex items-center gap-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 rtl:rotate-180" />
          <span>{t("applications.backToApplications")}</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-2xs"
          >
            <EditIcon className="w-3.5 h-3.5" />
            <span>{t("common.edit")}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-900 transition-colors shadow-2xs"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            <span>{t("common.delete")}</span>
          </button>
        </div>
      </div>

      {/* Main Title Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {application.jobTitle}
            </h1>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mt-1 flex items-center gap-2">
              <BuildingIcon className="w-4 h-4 text-neutral-400" />
              <span>{application.companyName}</span>
            </p>
          </div>

          {/* Job posting link button if jobUrl exists */}
          {application.jobUrl && (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors shrink-0"
            >
              <span>{t("applications.viewPosting")}</span>
              <ExternalLinkIcon className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Visual Pipeline Timeline */}
        <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800">
          <div className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
            {t("applications.pipelineProgress")}
          </div>
          <PipelineTimeline
            currentStage={application.stage}
            outcome={application.outcome}
            onStageSelect={handleStageSelect}
          />
        </div>
      </div>

      {/* Quick Stage Controls */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {t("applications.updateStage")}
          </span>
          <span className="text-xs text-neutral-400">
            {t("applications.stageHelp")}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STAGES.map((s) => {
            const isCurrent = application.stage === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => handleStageSelect(s.key)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  isCurrent
                    ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white shadow-xs font-semibold"
                    : "bg-neutral-50 dark:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
              >
                {t(`applications.${s.key === "APPLIED" ? "submitted" : s.key.toLowerCase()}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Application Metadata Details */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800">
        <div className="p-4 bg-neutral-50/60 dark:bg-neutral-800/30">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {t("applications.details")}
          </h2>
        </div>

        {/* Applied Date */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
            <CalendarIcon className="w-3.5 h-3.5 text-neutral-400" />
            {t("applications.appliedLabel")}
          </span>
          <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
            {formatDisplayDate(application.applicationDate, locale)}
          </span>
        </div>

        {/* Location */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
            <MapPinIcon className="w-3.5 h-3.5 text-neutral-400" />
            {t("applications.locationLabel")}
          </span>
          <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
            {application.location || t("common.notSpecified")}
          </span>
        </div>

        {/* Application Method */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
            <BriefcaseIcon className="w-3.5 h-3.5 text-neutral-400" />
            {t("applications.method")}
          </span>
          <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
            {formatApplicationMethod(application.applicationMethod, t)}
          </span>
        </div>

        {/* Status */}
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {t("applications.stage")}
          </span>
          <div className="flex items-center gap-2">
            <StatusBadge kind="stage" value={application.stage} />
            {application.stage === "CLOSED" &&
              application.outcome !== "NONE" && (
                <StatusBadge kind="outcome" value={application.outcome} />
              )}
          </div>
        </div>

        {/* Job URL if present */}
        {application.jobUrl && (
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {t("applications.jobUrl")}
            </span>
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-sm flex items-center gap-1"
            >
              <span className="truncate">{application.jobUrl}</span>
              <ExternalLinkIcon className="w-3 h-3 shrink-0" />
            </a>
          </div>
        )}
      </div>

      {/* Modal Prompt for Outcome when Stage is changed to CLOSED */}
      {isPromptingClosedOutcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-xs">
          <div
            className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-6"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {t("applications.closeApplication")}
            </h3>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              {t("applications.selectOutcome")}
            </p>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {(["ACCEPTED", "REJECTED", "WITHDRAWN"] as Outcome[]).map(
                (opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSelectedOutcomeForClose(opt)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                      selectedOutcomeForClose === opt
                        ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
                        : "bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    {t(`applications.${opt.toLowerCase()}`)}
                  </button>
                ),
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setIsPromptingClosedOutcome(false)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmClosedOutcome}
                className="px-4 py-1.5 text-xs font-medium bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-xs"
              >
                {t("applications.confirmClose")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditApplicationModal
        isOpen={isEditModalOpen}
        application={application}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        companyName={application.companyName}
        jobTitle={application.jobTitle}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
