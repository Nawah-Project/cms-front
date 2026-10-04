import React, { useState } from "react";
import { useNavigate } from "react-router";
import type { Application, Outcome, Stage } from "../types";
import { formatApplicationMethod } from "../types";
import { formatShortDate } from "../utils/date";
import { ExternalLinkIcon, GripVerticalIcon } from "./Icons";
import { StatusBadge } from "./StatusBadge";
import { useI18n } from "../i18n";

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

function getApplicationCardAccent(app: Application) {
  if (app.stage === "CLOSED") {
    switch (app.outcome) {
      case "ACCEPTED":
        return "border-s-4 border-s-emerald-500";
      case "REJECTED":
        return "border-s-4 border-s-rose-500";
      case "WITHDRAWN":
        return "border-s-4 border-s-neutral-400";
      case "NO_RESPONSE":
        return "border-s-4 border-s-amber-500";
      default:
        return "border-s-4 border-s-neutral-400";
    }
  }

  switch (app.stage) {
    case "INTERVIEW":
      return "border-s-4 border-s-blue-500";
    case "DECISION":
      return "border-s-4 border-s-amber-500";
    default:
      return "border-s-4 border-s-neutral-300 dark:border-s-neutral-600";
  }
}

function getColumnDotColor(stage: Stage) {
  switch (stage) {
    case "INTERVIEW":
      return "bg-blue-600 dark:bg-blue-400";
    case "DECISION":
      return "bg-amber-500 dark:bg-amber-400";
    case "CLOSED":
      return "bg-neutral-500 dark:bg-neutral-400";
    default:
      return "bg-neutral-400 dark:bg-neutral-500";
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

  // Get currently dragged app object
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
    // Slight delay so click navigation is not triggered on drag release
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
    // Only reset if leaving the column boundary
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

    // If dropped in the same column, do nothing
    if (app.stage === targetStage) return;

    if (targetStage === "CLOSED") {
      // Backend requires outcome for CLOSED. Prompt user for outcome.
      setPendingClosedApp(app);
      setSelectedClosedOutcome(
        app.outcome !== "NONE" ? app.outcome : "ACCEPTED",
      );
      return;
    }

    // Active stages (APPLIED, INTERVIEW, DECISION): outcome is always NONE
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-[700px] lg:min-w-0">
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
                      className={`w-2 h-2 rounded-full ${getColumnDotColor(col.stage)}`}
                      style={
                        col.stage === "CLOSED"
                          ? {
                              background:
                                "conic-gradient(#15803d 0deg 120deg, #dc2626 120deg 240deg, #52525b 240deg 360deg)",
                            }
                          : undefined
                      }
                      aria-hidden="true"
                    />
                    <h3 className="text-xs font-semibold tracking-wider text-neutral-800 dark:text-neutral-200 uppercase">
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
                            tabIndex={0}
                            role="button"
                            aria-label={`${app.jobTitle} - ${app.companyName}`}
                            onDragStart={(e) => handleDragStart(e, app)}
                            onDragEnd={handleDragEnd}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                if (!isDraggingNow) {
                                  navigate(`/applications/${app.id}`);
                                }
                              }
                            }}
                            onClick={() => {
                              if (!isDraggingNow) {
                                navigate(`/applications/${app.id}`);
                              }
                            }}
                            className={`p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs transition-all duration-150 group cursor-grab active:cursor-grabbing hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white ${getApplicationCardAccent(app)}`}
                          >
                            {/* Card Top: Grip handle & Company */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <GripVerticalIcon className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors shrink-0" />
                                <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors truncate">
                                  {app.companyName}
                                </span>
                              </div>
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

                            {/* Footer: Application Method, Stage Changer & Outcome Badge */}
                            <div className="flex items-center justify-between gap-2 mt-2 pt-1 text-[11px]">
                              <span className="text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-[10px] font-medium truncate max-w-[110px]">
                                {formatApplicationMethod(
                                  app.applicationMethod,
                                  t,
                                )}
                              </span>

                              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <label htmlFor={`quick-stage-${app.id}`} className="sr-only">
                                  {t("applications.updateStage")}
                                </label>
                                <select
                                  id={`quick-stage-${app.id}`}
                                  aria-label={t("applications.updateStage")}
                                  value={app.stage}
                                  onChange={async (e) => {
                                    const nextStage = e.target.value as Stage;
                                    if (nextStage === app.stage) return;
                                    if (nextStage === "CLOSED") {
                                      setPendingClosedApp(app);
                                      setSelectedClosedOutcome(
                                        app.outcome !== "NONE" ? app.outcome : "ACCEPTED",
                                      );
                                    } else if (onStageChange) {
                                      await onStageChange(app.id, nextStage, "NONE");
                                    }
                                  }}
                                  className="text-[10px] py-0.5 px-1 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                                >
                                  <option value="APPLIED">{t("applications.submitted")}</option>
                                  <option value="INTERVIEW">{t("applications.interview")}</option>
                                  <option value="DECISION">{t("applications.decision")}</option>
                                  <option value="CLOSED">{t("applications.closed")}</option>
                                </select>

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
                          </div>
                        );
                      })}

                      {/* Drop placeholder highlight at bottom when dragging over populated column */}
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
      {pendingClosedApp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {t("applications.closeApplication")}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {t("applications.moveClosedPrompt", {
                  company: pendingClosedApp.companyName,
                })}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {t("applications.selectOutcome")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    value: "ACCEPTED" as Outcome,
                    label: t("applications.accepted"),
                    desc: t("applications.offer"),
                    style:
                      selectedClosedOutcome === "ACCEPTED"
                        ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700",
                  },
                  {
                    value: "REJECTED" as Outcome,
                    label: t("applications.rejected"),
                    desc: t("applications.passed"),
                    style:
                      selectedClosedOutcome === "REJECTED"
                        ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700",
                  },
                  {
                    value: "WITHDRAWN" as Outcome,
                    label: t("applications.withdrawn"),
                    desc: t("applications.optOut"),
                    style:
                      selectedClosedOutcome === "WITHDRAWN"
                        ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700",
                  },
                  {
                    value: "NO_RESPONSE" as Outcome,
                    label: t("applications.noResponse"),
                    desc: t("applications.noResponseDescription") || t("applications.noResponse"),
                    style:
                      selectedClosedOutcome === "NO_RESPONSE"
                        ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900"
                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700",
                  },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSelectedClosedOutcome(item.value)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${item.style}`}
                  >
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[10px] opacity-80 mt-0.5 truncate">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setPendingClosedApp(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={confirmClosedOutcome}
                className="px-4 py-1.5 text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-lg shadow-xs transition-colors"
              >
                {t("applications.saveAndMove")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
