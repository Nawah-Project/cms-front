import { STAGE_DOT } from "../../../design-system/stage-visuals";
import React, { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, ExternalLink, Pencil } from "lucide-react";
import type { Application, Outcome, Stage, UpdateApplicationInput } from "../../../types";
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
import { EditApplicationModal } from "./EditApplicationModal";
import { useUpdateApplication } from "../api/applicationsApi";

interface KanbanViewProps {
  applications: Application[];
  appCvVersionMap?: Record<string, number>;
  mobileStage?: Stage;
  onMobileStageChange?: (stage:Stage)=>void;
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
      return "bg-surface border-border border-s-4 border-s-info-strong hover:border-border-hover";
    case "INTERVIEW":
      return "bg-surface border-border border-s-4 border-s-info-strong hover:border-border-hover";
    case "DECISION":
      return "bg-surface border-border border-s-4 border-s-warning-strong hover:border-border-hover";
    default:
      return "bg-surface border-border border-s-4 border-s-neutral-400 hover:border-border-hover";
  }
}

function getColumnDotColor(stage: Stage) {
  return STAGE_DOT[stage];
}

export function KanbanView({
  applications,
  appCvVersionMap,
  onStageChange,
  mobileStage: selectedMobileStage,
  onMobileStageChange,
}: KanbanViewProps) {
  const { t, locale } = useI18n();
  const [localMobileStage,setLocalMobileStage]=useState<Stage>(()=>applications[0]?.stage??"APPLIED");
  const mobileStage=selectedMobileStage??localMobileStage;
  const setMobileStage=onMobileStageChange??setLocalMobileStage;
  const isRtl = locale === "ar";
  const navigate = useNavigate();
  const updateMutation = useUpdateApplication();

  // Accordion expanded cards state
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

  // Edit modal state
  const [editingApp, setEditingApp] = useState<Application | null>(null);

  // Drag and drop state
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Stage | null>(null);
  const [isDraggingNow, setIsDraggingNow] = useState(false);

  // Outcome selection modal when dropping into CLOSED stage
  const [pendingClosedApp, setPendingClosedApp] = useState<Application | null>(null);
  const [selectedClosedOutcome, setSelectedClosedOutcome] = useState<Outcome>("ACCEPTED");

  const draggedApp = draggedAppId
    ? applications.find((a) => a.id === draggedAppId) || null
    : null;

  const toggleCardExpanded = (appId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  };

  const handleOpenEdit = (app: Application, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingApp(app);
  };

  const handleSaveEdit = async (id: string, updates: UpdateApplicationInput) => {
    await updateMutation.mutateAsync({ id, updates });
    setEditingApp(null);
  };

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

  const handleQuickStageChange = async (app: Application, newStage: Stage, e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    if (newStage === app.stage) return;
    if (newStage === "CLOSED") {
      setPendingClosedApp(app);
      setSelectedClosedOutcome(app.outcome !== "NONE" ? app.outcome : "ACCEPTED");
      return;
    }
    if (onStageChange) {
      await onStageChange(app.id, newStage, "NONE");
    }
  };

  return (
    <div className="w-full select-none">
      <nav aria-label={locale==="ar"?"مراحل طلباتك":"Application stages"} className="mb-3 grid grid-cols-5 gap-1 rounded-xl border border-border bg-surface p-1 md:hidden">
        {COLUMNS.map(c=><button key={c.stage} type="button" aria-pressed={mobileStage===c.stage} onClick={()=>setMobileStage(c.stage)} className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] ${mobileStage===c.stage?'bg-neutral-900 font-bold text-white dark:bg-white dark:text-neutral-900':'text-text-secondary'}`}><span className="text-base font-bold tabular-nums">{applications.filter(a=>a.stage===c.stage).length}</span><span className="max-w-full truncate" title={t(`applications.${c.label}`)}>{locale==="ar"?({APPLIED:"تم التقديم",ASSIGNMENT:"تكليف",INTERVIEW:"مقابلة",DECISION:"القرار",CLOSED:"مغلق"}[c.stage]):t(`applications.${c.label}`)}</span></button>)}
      </nav>
      <div className="min-w-0 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3.5 min-w-0 items-start">
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
                className={`kanban-column ${mobileStage===col.stage?"flex":"hidden"} md:flex h-fit md:max-h-[calc(100dvh-13rem)] flex-col rounded-2xl border border-neutral-200/90 bg-surface dark:border-neutral-800 dark:bg-neutral-900/80 p-2.5 shadow-2xs transition-all duration-200 ${
                  isColumnTarget
                    ? "ring-2 ring-neutral-400 dark:ring-neutral-500 shadow-sm"
                    : ""
                }`}
              >
                {/* Column Header */}
                <div className="kanban-column-header flex items-center justify-between px-2 py-2 mb-2 border-b border-neutral-300 dark:border-neutral-700">
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
                <div className="space-y-2 flex flex-col md:overflow-y-auto">
                  {colApps.length === 0 ? (
                    <div
                      className={`kanban-empty py-5 px-3 rounded-xl border border-dashed text-center transition-all ${
                        isColumnTarget
                          ? "border-neutral-500 bg-neutral-100 text-neutral-700 dark:border-neutral-500 dark:bg-neutral-800 dark:text-neutral-200"
                          : "border-border bg-surface text-text-muted dark:border-neutral-700/80 dark:bg-neutral-950/40"
                      }`}
                    >
                      <p className="text-[11px] font-medium">
                        {isColumnTarget
                          ? t("applications.dropToMove")
                          : t("applications.noApplications")}
                      </p>
                    </div>
                  ) : (
                    <>
                      {colApps.map((app) => {
                        const isExpanded = expandedCardIds.has(app.id);
                        return (
                          <div
                            key={app.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, app)}
                            onDragEnd={handleDragEnd}
                            onClick={() => {
                              if (!isDraggingNow) {
                                toggleCardExpanded(app.id);
                              }
                            }}
                            className={`application-card p-3.5 md:p-2.5 rounded-xl border shadow-xs transition-all duration-150 group cursor-grab active:cursor-grabbing hover:shadow-sm ${getApplicationCardColor(app)}`}
                          >
                            {/* Line 1: Grip + Company Name + CV Version + Edit Pencil + Chevron */}
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <GripVerticalIcon className="hidden md:block w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors shrink-0" />
                                <span className="font-bold text-sm md:text-xs text-neutral-900 dark:text-neutral-100 truncate">
                                  {app.companyName}
                                </span>
                                {appCvVersionMap && (
                                  <span className="rounded px-1.5 py-0.2 text-[9px] font-semibold bg-neutral-200/70 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 shrink-0">
                                    CV {Math.max(0, (appCvVersionMap[app.id] || 1) - 1)}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-0.5 shrink-0">
                                {/* Quick Edit Pencil */}
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenEdit(app, e)}
                                  title={t("common.edit")}
                                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>

                                {/* Chevron Toggle */}
                                <button
                                  type="button"
                                  onClick={(e) => toggleCardExpanded(app.id, e)}
                                  aria-expanded={isExpanded}
                                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                                >
                                  <ChevronDown
                                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                      isExpanded ? "rotate-180" : ""
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            {/* Line 2: Job Title & Short Date */}
                            <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-400 ps-5 mt-1">
                              <span className="truncate font-medium max-w-[130px]">
                                {app.jobTitle}
                              </span>
                              <span className="shrink-0 text-neutral-400 ms-1 text-[10px]">
                                {formatShortDate(app.applicationDate, locale)}
                              </span>
                            </div>

                            {/* Accordion Drawer on Click */}
                            {isExpanded && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="member-detail-enter mt-2.5 pt-2.5 border-t border-neutral-200/80 dark:border-neutral-800 space-y-2.5 text-xs"
                              >
                                {/* Location & Method & Job Link */}
                                <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                                  <span className="truncate max-w-[110px]">
                                    {app.location || t("common.remote")}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-[10px]">
                                      {formatApplicationMethod(app.applicationMethod, t)}
                                    </span>
                                    {app.jobUrl && (
                                      <a
                                        href={app.jobUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-info-strong hover:text-info-strong/80 p-0.5 rounded"
                                        title={t("applications.openJob", {
                                          company: app.companyName,
                                        })}
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>

                                {/* Badges */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {app.isTailored && (
                                    <span
                                      title={t("applications.tailoredBadge")}
                                      className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
                                    >
                                      <SparklesIcon className="h-2.5 w-2.5" />
                                      <span>{t("applications.tailoredShort")}</span>
                                    </span>
                                  )}
                                  {app.sharedWithGroup && (
                                    <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                                      <SparklesIcon className="h-2.5 w-2.5" />
                                      <span>{t("members.sharedOpportunityBadge")}</span>
                                    </span>
                                  )}
                                  {col.stage === "CLOSED" && app.outcome !== "NONE" && (
                                    <StatusBadge kind="outcome" value={app.outcome} />
                                  )}
                                </div>

                                {/* Stage Selector & Prep Workspace CTA */}
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                                  <select
                                    value={app.stage}
                                    onChange={(e) => handleQuickStageChange(app, e.target.value as Stage, e)}
                                    className="text-[11px] font-medium rounded-lg border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800 px-2 py-1 text-neutral-800 dark:text-neutral-200 focus:outline-none"
                                  >
                                    {COLUMNS.map((c) => (
                                      <option key={c.stage} value={c.stage}>
                                        {t(`applications.${c.label}`)}
                                      </option>
                                    ))}
                                  </select>

                                  {(app.stage === "INTERVIEW" || app.stage === "ASSIGNMENT") ? (
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/applications/${app.id}`)}
                                      className="text-[11px] font-bold text-info-strong hover:underline inline-flex items-center gap-1"
                                    >
                                      <span>{t("applications.openPrepWorkspace")}</span>
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/applications/${app.id}`)}
                                      className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:underline"
                                    >
                                      {t("common.details")}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
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

      {/* Edit Application Modal */}
      {editingApp && (
        <EditApplicationModal
          isOpen={true}
          application={editingApp}
          onClose={() => setEditingApp(null)}
          onSave={handleSaveEdit}
        />
      )}

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
