import React, { useState } from "react";
import { useNavigate } from "react-router";
import type { Application, Outcome, Stage } from "../../../types";
import { formatApplicationMethod } from "../../../types";
import { formatShortDate } from "../../../utils/date";
import {
  ExternalLinkIcon,
  GripVerticalIcon,
  SparklesIcon,
} from "../../../components/Icons";
import { StatusBadge } from "./StatusBadge";
import { useI18n } from "../../../i18n";
import { Modal } from "../../../components/ui/Modal";

interface KanbanViewProps {
  applications: Application[];
  onStageChange?: (
    appId: string,
    newStage: Stage,
    outcome?: Outcome,
  ) => Promise<void>;
}

const COLUMNS: {
  stage: Stage;
  label: string;
  description: string;
}[] = [
  {
    stage: "APPLIED",
    label: "submitted",
    description: "submittedApplications",
  },
  {
    stage: "ASSIGNMENT",
    label: "assignment",
    description: "assignmentProcess",
  },
  {
    stage: "INTERVIEW",
    label: "interview",
    description: "interviewProcess",
  },
  {
    stage: "DECISION",
    label: "decision",
    description: "awaitingDecision",
  },
  {
    stage: "CLOSED",
    label: "closed",
    description: "closedDescription",
  },
];

function getApplicationCardColor(app: Application) {
  if (app.stage === "CLOSED") {
    switch (app.outcome) {
      case "ACCEPTED":
        return "bg-surface border-border border-s-4 border-s-success-strong hover:border-border-hover";
      case "REJECTED":
        return "bg-surface border-border border-s-4 border-s-danger-strong hover:border-border-hover";
      case "WITHDRAWN":
        return "bg-surface border-border border-s-4 border-s-neutral-400 hover:border-border-hover";
      case "NO_RESPONSE":
        return "bg-surface border-border border-s-4 border-s-warning-strong hover:border-border-hover";
      default:
        return "bg-surface border-border border-s-4 border-s-neutral-400 hover:border-border-hover";
    }
  }

  switch (app.stage) {
    case "ASSIGNMENT":
      return "bg-surface border-border border-s-4 border-s-purple-500 hover:border-border-hover";
    case "INTERVIEW":
      return "bg-surface border-border border-s-4 border-s-info-strong hover:border-border-hover";
    case "DECISION":
      return "bg-surface border-border border-s-4 border-s-warning-strong hover:border-border-hover";
    default:
      return "bg-surface border-border border-s-4 border-s-neutral-400 hover:border-border-hover";
  }
}

function getColumnDotColor(stage: Stage) {
  switch (stage) {
    case "ASSIGNMENT":
      return "bg-purple-500";
    case "INTERVIEW":
      return "bg-info-strong";
    case "DECISION":
      return "bg-warning-strong";
    case "CLOSED":
      return "bg-neutral-600";
    default:
      return "bg-neutral-400";
  }
}

export function KanbanView({ applications, onStageChange }: KanbanViewProps) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();

  // Drag and drop state
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Stage | null>(null);
  const [isDraggingNow, setIsDraggingNow] = useState(false);

  // Outcome selection modal when dropping into CLOSED stage
  const [pendingClosedApp, setPendingClosedApp] = useState<Application | null>(
    null,
  );
  const [selectedClosedOutcome, setSelectedClosedOutcome] =
    useState<Outcome>("ACCEPTED");

  const draggedApp = draggedAppId
    ? applications.find((a) => a.id === draggedAppId) || null
    : null;

  const handleDragStart = (e: React.DragEvent, app: Application) => {
    setDraggedAppId(app.id);
    setIsDraggingNow(true);
    e.dataTransfer.setData("text/plain", app.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedAppId(null);
    setDragOverColumn(null);
    setTimeout(() => {
      setIsDraggingNow(false);
    }, 100);
  };

  const handleDragOver = (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== stage) {
      setDragOverColumn(stage);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stage: Stage) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (
      x <= rect.left ||
      x >= rect.right ||
      y <= rect.top ||
      y >= rect.bottom
    ) {
      if (dragOverColumn === stage) {
        setDragOverColumn(null);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStage: Stage) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggedAppId(null);
    setTimeout(() => setIsDraggingNow(false), 100);

    const appId = e.dataTransfer.getData("text/plain") || draggedAppId;
    if (!appId) return;

    const app = applications.find((a) => a.id === appId);
    if (!app) return;

    if (app.stage === targetStage) return;

    if (targetStage === "CLOSED") {
      setPendingClosedApp(app);
      setSelectedClosedOutcome(
        app.outcome !== "NONE" ? app.outcome : "ACCEPTED",
      );
      return;
    }

    if (onStageChange) {
      await onStageChange(app.id, targetStage, "NONE");
    }
  };

  const confirmClosedOutcome = async () => {
    if (!pendingClosedApp || !onStageChange) return;
    const app = pendingClosedApp;
    setPendingClosedApp(null);
    await onStageChange(app.id, "CLOSED", selectedClosedOutcome);
  };

  return (
    <div className="w-full select-none">
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 min-w-[900px] xl:min-w-0">
          {COLUMNS.map((col) => {
            const label = t(`applications.${col.label}`);
            const colApps = applications.filter(
              (app) => app.stage === col.stage,
            );
            const isColumnTarget =
              dragOverColumn === col.stage && draggedApp?.stage !== col.stage;

            return (
              <div
                key={col.stage}
                onDragOver={(e) => handleDragOver(e, col.stage)}
                onDragLeave={(e) => handleDragLeave(e, col.stage)}
                onDrop={(e) => handleDrop(e, col.stage)}
                className={`rounded-2xl p-3 flex flex-col min-h-[460px] transition-all duration-200 border ${
                  isColumnTarget
                    ? "bg-neutral-100 dark:bg-neutral-800/60 border-neutral-500 dark:border-neutral-500 ring-2 ring-neutral-300/70 shadow-sm"
                    : "bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 shadow-sm"
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-2 py-2 mb-2.5 border-b border-neutral-300 dark:border-neutral-700">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${getColumnDotColor(col.stage)}`}
                      aria-hidden="true"
                    />
                    <h3 className="text-xs font-semibold tracking-wider text-text-primary uppercase">
                      {label}
                    </h3>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      colApps.length > 0
                        ? "bg-neutral-200/80 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                        : "bg-neutral-200/40 dark:bg-neutral-800/40 text-neutral-400"
                    }`}
                  >
                    {colApps.length}
                  </span>
                </div>

                {/* Cards Container & Drop Zone */}
                <div className="space-y-2.5 flex-1 flex flex-col overflow-y-auto">
                  {colApps.length === 0 ? (
                    <div
                      className={`flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl text-center transition-all ${
                        isColumnTarget
                          ? "border-neutral-500 bg-neutral-100 text-neutral-700 dark:border-neutral-500 dark:bg-neutral-800 dark:text-neutral-200"
                          : "border-neutral-300 bg-neutral-50/70 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-950/50 dark:text-neutral-400"
                      }`}
                    >
                      <p className="text-xs font-medium">
                        {isColumnTarget
                          ? t("applications.dropToMove")
                          : t("applications.noApplications")}
                      </p>
                      <p className="text-[11px] mt-0.5 opacity-70">
                        {isColumnTarget
                          ? t("applications.moveToStage", { stage: label })
                          : t("applications.dragToMove")}
                      </p>
                    </div>
                  ) : (
                    <>
                      {colApps.map((app) => {
                        return (
                          <div
                            key={app.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, app)}
                            onDragEnd={handleDragEnd}
                            onClick={() => {
                              if (!isDraggingNow) {
                                navigate(`/applications/${app.id}`);
                              }
                            }}
                            className={`p-3.5 rounded-xl border shadow-xs transition-all duration-150 group cursor-grab active:cursor-grabbing hover:shadow-sm ${getApplicationCardColor(app)}`}
                          >
                            {/* Card Top: Grip handle & Company */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <GripVerticalIcon className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors shrink-0" />
                                <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors truncate">
                                  {app.companyName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {app.isTailored && (
                                  <span
                                    title={t("applications.tailoredBadge")}
                                    className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
                                  >
                                    <SparklesIcon className="h-2.5 w-2.5" />
                                    <span>{t("applications.tailoredShort")}</span>
                                  </span>
                                )}
                                {app.jobUrl && (
                                  <a
                                    href={app.jobUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-0.5 rounded-sm shrink-0"
                                    title={t("applications.openJob", {
                                      company: app.companyName,
                                    })}
                                  >
                                    <ExternalLinkIcon className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Job Title */}
                            <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mt-1.5 ps-5 truncate">
                              {app.jobTitle}
                            </div>

                            {/* Location & Date */}
                            <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                              <span>
                                {formatShortDate(app.applicationDate, locale)}
                              </span>
                              <span className="truncate max-w-[110px] text-end">
                                {app.location || t("common.remote")}
                              </span>
                            </div>

                            {/* Footer: Application Method and Outcome Badge */}
                            <div className="flex items-center justify-between gap-2 mt-2 pt-1 text-[11px]">
                              <span className="text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[130px]">
                                {formatApplicationMethod(
                                  app.applicationMethod,
                                  t,
                                )}
                              </span>

                              {col.stage === "CLOSED" &&
                                (app.outcome === "NONE" ? (
                                  <StatusBadge kind="stage" value="CLOSED" />
                                ) : (
                                  <StatusBadge
                                    kind="outcome"
                                    value={app.outcome}
                                  />
                                ))}
                            </div>
                          </div>
                        );
                      })}

                      {isColumnTarget && (
                        <div className="h-14 border-2 border-dashed border-neutral-400 dark:border-neutral-500 rounded-xl bg-neutral-100 dark:bg-neutral-800/50 flex items-center justify-center text-xs font-medium text-neutral-600 dark:text-neutral-300 animate-pulse">
                          {t("applications.dropToMove")}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Outcome Selection Modal when moved to CLOSED stage */}
      <Modal
        isOpen={!!pendingClosedApp}
        onClose={() => setPendingClosedApp(null)}
        title={t("applications.closeApplication")}
        subtitle={t("applications.moveClosedPrompt", {
          company: pendingClosedApp?.companyName ?? "",
        })}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPendingClosedApp(null)}
              className="button-secondary text-sm"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={confirmClosedOutcome}
              className="button-primary text-sm"
            >
              {t("applications.saveAndMove")}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="field-label">
            {t("applications.selectOutcome")}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              {
                value: "ACCEPTED" as Outcome,
                label: t("applications.accepted"),
                desc: t("applications.offer"),
                style:
                  selectedClosedOutcome === "ACCEPTED"
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                    : "bg-surface text-text-primary border-border hover:bg-surface-hover",
              },
              {
                value: "REJECTED" as Outcome,
                label: t("applications.rejected"),
                desc: t("applications.passed"),
                style:
                  selectedClosedOutcome === "REJECTED"
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                    : "bg-surface text-text-primary border-border hover:bg-surface-hover",
              },
              {
                value: "WITHDRAWN" as Outcome,
                label: t("applications.withdrawn"),
                desc: t("applications.optOut"),
                style:
                  selectedClosedOutcome === "WITHDRAWN"
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                    : "bg-surface text-text-primary border-border hover:bg-surface-hover",
              },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setSelectedClosedOutcome(item.value)}
                className={`p-3 rounded-xl border text-center transition-all ${item.style}`}
              >
                <div className="text-xs font-semibold">{item.label}</div>
                <div className="text-[11px] opacity-75 mt-0.5">
                  {item.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

