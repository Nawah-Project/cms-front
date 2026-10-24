import React, { useEffect, useRef, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router";
import { Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "../components/EmptyState";
import {
  KanbanIcon,
  PlusIcon,
  SearchIcon,
  SpinnerIcon,
  TableIcon,
} from "../components/Icons";
import { KanbanView } from "../features/applications/components/KanbanView";
import { TableView } from "../features/applications/components/TableView";
import { JobMarketCompass } from "../features/applications/components/JobMarketCompass";
import {
  useApplications,
  useUpdateApplication,
} from "../features/applications/api/applicationsApi";
import {
  journeyApi,
  useJourneyState,
} from "../features/journey/api/journeyApi";
import { journeyQueryKeys } from "../features/journey/config/query-keys";
import { canUseApplicationsTableView } from "../features/journey/lib/journey-policies";
import { celebrateJourneyUnlocks } from "../features/journey/lib/celebrate-unlocks";
import type { JourneyStateResponse } from "../features/journey/types";
import { useAuth } from "../features/auth/store/authStore";
import type {
  Application,
  CreateApplicationInput,
  Outcome,
  Stage,
} from "../types";
import { useI18n } from "../i18n";
import { useToast } from "../components/ui/ToastProvider";
import { trackUxEvent } from "../utils/uxAnalytics";
import { ContextualLockBubble } from "../components/ui/ContextualLockBubble";
import { openJourneyTasksPanel } from "../components/journeyTasksPanelEvents";

export function meta() {
  return [
    { title: "Applications | Nawah Project" },
    { name: "description", content: "List of all tracked job applications" },
  ];
}

export default function ApplicationsPage() {
  const { openAddModal } = useOutletContext<{
    openAddModal: (initialValues?: Partial<CreateApplicationInput>) => void;
  }>();
  const { t, tp, locale } = useI18n();
  const toast = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters from search params
  const currentStage = searchParams.get("stage") || "ALL";
  const currentOutcome = searchParams.get("outcome") || "ALL";
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || "",
  );
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedSearch(searchQuery),
      300,
    );
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const stageParam = currentStage === "ALL" ? undefined : currentStage;
  const outcomeParam = currentOutcome === "ALL" ? undefined : currentOutcome;
  const searchParam = debouncedSearch.trim() || undefined;

  const {
    data: applicationsData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useApplications({
    stage: stageParam,
    outcome: outcomeParam,
    search: searchParam,
  });

  const rawApplications = applicationsData?.items ?? [];
  const totalCount =
    applicationsData?.unfilteredTotal ?? applicationsData?.total ?? 0;

  const { data: journeyData } = useJourneyState({ enabled: Boolean(user) });
  const canUseTableView = canUseApplicationsTableView(
    journeyData,
    user,
    totalCount,
  );
  const remainingForTableView = Math.max(1, 10 - totalCount);
  const tableViewLockedMessage = t("applications.tableViewLockedTooltip", {
    remaining: remainingForTableView,
    current: totalCount,
  });

  // Default view mode is 'kanban' in V2; 'table' is unlocked after reaching 10 total applications or W1_M1
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [tableLockBubbleOpen, setTableLockBubbleOpen] = useState(false);

  // Initialize view mode from localStorage (only allow 'table' if unlocked)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("job_tracker_view_mode");
      if (saved === "table" && canUseTableView) {
        setViewMode("table");
      } else if (saved === "kanban") {
        setViewMode("kanban");
      }
    } catch {
      // localStorage may not be available in private mode
    }
  }, [canUseTableView]);

  useEffect(() => {
    if (!canUseTableView && viewMode === "table") {
      setViewMode("kanban");
    }
  }, [canUseTableView, viewMode]);

  const handleViewModeChange = (mode: "table" | "kanban") => {
    if (mode === "table" && !canUseTableView) {
      setTableLockBubbleOpen((prev) => !prev);
      return;
    }
    setTableLockBubbleOpen(false);
    setViewMode(mode);
    try {
      localStorage.setItem("job_tracker_view_mode", mode);
    } catch {
      // ignore
    }
  };

  const updateAppMutation = useUpdateApplication();
  const [optimisticOverrides, setOptimisticOverrides] = useState<
    Record<string, { stage: Stage; outcome: Outcome }>
  >({});
  const pendingMoves = useRef(new Set<string>());
  const [moveError, setMoveError] = useState(false);

  const matchesCurrentFilters = (app: Application) => {
    const matchesStage =
      currentStage === "ALL" ||
      (currentStage === "ACTIVE"
        ? app.stage !== "CLOSED"
        : app.stage === currentStage);
    const matchesOutcome =
      currentOutcome === "ALL" ||
      (app.stage === "CLOSED" && app.outcome === currentOutcome);
    return matchesStage && matchesOutcome;
  };

  const applications = rawApplications
    .map((app) =>
      optimisticOverrides[app.id]
        ? {
            ...app,
            stage: optimisticOverrides[app.id].stage,
            outcome: optimisticOverrides[app.id].outcome,
          }
        : app,
    )
    .filter(matchesCurrentFilters);

  const handleKanbanStageChange = async (
    appId: string,
    newStage: Stage,
    outcome?: Outcome,
  ) => {
    if (pendingMoves.current.has(appId)) return;
    pendingMoves.current.add(appId);

    const nextOutcome = outcome || "NONE";
    setMoveError(false);
    setOptimisticOverrides((prev) => ({
      ...prev,
      [appId]: { stage: newStage, outcome: nextOutcome },
    }));

    const prevJourney = queryClient.getQueryData<JourneyStateResponse>(
      journeyQueryKeys.state(),
    );

    try {
      await updateAppMutation.mutateAsync({
        id: appId,
        updates: {
          stage: newStage,
          outcome: nextOutcome,
        },
      });
      toast.success(t("applications.applicationUpdated"));
      trackUxEvent("application_stage_updated", { appId, stage: newStage });

      try {
        const nextJourney = await queryClient.fetchQuery({
          queryKey: journeyQueryKeys.state(),
          queryFn: () => journeyApi.getJourneyState(),
        });
        celebrateJourneyUnlocks(
          prevJourney,
          nextJourney,
          t,
          locale,
          toast.showToast,
        );
      } catch {
        // ignore
      }
    } catch {
      setMoveError(true);
      toast.error(t("common.unexpectedError"));
    } finally {
      pendingMoves.current.delete(appId);
      setOptimisticOverrides((prev) => {
        const copy = { ...prev };
        delete copy[appId];
        return copy;
      });
    }
  };

  useEffect(() => {
    const searchFromUrl = searchParams.get("search") || "";
    if (searchFromUrl !== searchQuery) setSearchQuery(searchFromUrl);
  }, [searchParams]);

  const updateStageFilter = (newStage: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (newStage === "ALL") {
      nextParams.delete("stage");
      nextParams.delete("outcome");
    } else {
      nextParams.set("stage", newStage);
      if (newStage !== "CLOSED") {
        nextParams.delete("outcome");
      }
    }
    setSearchParams(nextParams);
  };

  const updateOutcomeFilter = (newOutcome: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (newOutcome === "ALL") {
      nextParams.delete("outcome");
    } else {
      nextParams.set("outcome", newOutcome);
    }
    setSearchParams(nextParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextParams = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      nextParams.set("search", searchQuery.trim());
    } else {
      nextParams.delete("search");
    }
    setSearchParams(nextParams);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSearchParams(new URLSearchParams());
  };

  const isFiltering =
    currentStage !== "ALL" ||
    currentOutcome !== "ALL" ||
    Boolean(searchQuery.trim());

  const isRefreshing = isFetching && !isLoading;

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-stone-300/80 pb-7 sm:flex-row sm:items-end sm:justify-between dark:border-neutral-800">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100 sm:text-4xl">
            {t("applications.title")}
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {t("applications.subtitle")}
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => openAddModal()}
            className="button-primary inline-flex items-center gap-1.5 py-2 text-sm"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>{t("common.addApplication")}</span>
          </button>
        </div>
      </div>

      {/* Job Market Compass (V2 Smart Launcher) */}
      <JobMarketCompass onLaunchDraft={(draft) => openAddModal(draft)} />

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Stage Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-stone-200 pb-0.5 sm:pb-0 scrollbar-none dark:border-neutral-800">
            {[
              { key: "ALL", label: t("applications.filterAll") },
              { key: "ACTIVE", label: t("applications.filterActive") },
              { key: "APPLIED", label: t("applications.submitted") },
              { key: "ASSIGNMENT", label: t("applications.assignment") },
              { key: "INTERVIEW", label: t("applications.interview") },
              { key: "DECISION", label: t("applications.decision") },
              { key: "CLOSED", label: t("applications.closed") },
            ].map((tab) => {
              const isSelected = currentStage === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => updateStageFilter(tab.key)}
                  className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-neutral-800 text-neutral-950 dark:border-neutral-200 dark:text-white"
                      : "border-transparent text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:flex-1">
            <form
              onSubmit={handleSearchSubmit}
              className="relative min-w-0 w-full sm:flex-1"
            >
              <input
                type="text"
                aria-label={t("applications.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("applications.search")}
                className="field-control ps-9 py-2"
              />
              <SearchIcon className="w-4 h-4 text-text-muted absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </form>

            <div className="inline-flex w-fit shrink-0 items-center gap-1 rounded-lg border border-neutral-300 bg-white p-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => handleViewModeChange("kanban")}
                title={t("applications.viewBoard")}
                aria-label={t("applications.viewBoard")}
                aria-pressed={viewMode === "kanban"}
                className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                  viewMode === "kanban"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                }`}
              >
                <KanbanIcon className="h-4 w-4" />
                <span>{t("applications.board")}</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => handleViewModeChange("table")}
                  title={
                    canUseTableView
                      ? t("applications.viewTable")
                      : tableViewLockedMessage
                  }
                  aria-label={t("applications.viewTable")}
                  aria-pressed={viewMode === "table"}
                  aria-disabled={!canUseTableView}
                  aria-expanded={tableLockBubbleOpen}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                    !canUseTableView
                      ? "cursor-pointer opacity-75 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      : viewMode === "table"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                        : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  }`}
                >
                  <TableIcon className="h-4 w-4" />
                  <span>{t("applications.table")}</span>
                  {!canUseTableView && (
                    <Lock className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                  )}
                </button>
                <ContextualLockBubble
                  isOpen={tableLockBubbleOpen}
                  onClose={() => setTableLockBubbleOpen(false)}
                  title={t("applications.viewTable")}
                  requirement={tableViewLockedMessage}
                  ctaLabel={t("journey.panelTitle")}
                  onCtaClick={() => openJourneyTasksPanel()}
                  placement="bottom"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Outcome Filter when Closed is selected */}
        {currentStage === "CLOSED" && (
          <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 pt-3 text-sm animate-in fade-in duration-150 dark:border-neutral-800">
            <span className="me-1 text-xs text-neutral-500 dark:text-neutral-400">
              {t("applications.outcome")}:
            </span>
            {[
              { key: "ALL", label: t("applications.allClosed") },
              { key: "ACCEPTED", label: t("applications.accepted") },
              { key: "REJECTED", label: t("applications.rejected") },
              { key: "WITHDRAWN", label: t("applications.withdrawn") },
              { key: "NO_RESPONSE", label: t("applications.noResponse") },
            ].map((sub) => {
              const isSelected = currentOutcome === sub.key;
              return (
                <button
                  key={sub.key}
                  type="button"
                  onClick={() => updateOutcomeFilter(sub.key)}
                  className={`rounded-sm px-2 py-1 text-xs transition-colors ${
                    isSelected
                      ? "font-medium text-neutral-950 underline decoration-stone-400 underline-offset-4 dark:text-white dark:decoration-neutral-500"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {moveError && (
        <p
          role="alert"
          className="rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger-strong"
        >
          {t("applications.moveError")}
        </p>
      )}

      {/* Main Content Area: Loading, Error, Empty, or Data */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <SpinnerIcon className="w-6 h-6 text-neutral-500 mb-3" />
          <p className="text-xs text-neutral-500">
            {t("applications.loading")}
          </p>
        </div>
      ) : isError ? (
        <div className="py-16 max-w-md mx-auto text-center">
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
            <p className="font-semibold mb-1">{t("applications.loadFailed")}</p>
            <p>{t("common.loadError")}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded-md font-medium text-xs hover:bg-red-700 transition-colors"
            >
              {t("common.retry")}
            </button>
          </div>
        </div>
      ) : applications.length === 0 ? (
        totalCount === 0 ? (
          <EmptyState onAddClick={() => openAddModal()} />
        ) : (
          <EmptyState
            isFiltered
            onAddClick={() => openAddModal()}
            onClearFilters={clearAllFilters}
          />
        )
      ) : (
        <div
          className={`space-y-4 ${
            isRefreshing
              ? "opacity-60 transition-opacity duration-150"
              : "transition-opacity duration-150"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
            <div className="flex items-center gap-2">
              <span>
                {t("applications.showingCount", {
                  count: tp("common.applicationCount", applications.length),
                })}
              </span>
              {isRefreshing && (
                <SpinnerIcon className="h-3.5 w-3.5 animate-spin text-neutral-400" />
              )}
            </div>
            {isFiltering && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-neutral-600 dark:text-neutral-400 hover:underline"
              >
                {t("applications.clearFilters")}
              </button>
            )}
          </div>

          {viewMode === "table" && canUseTableView ? (
            <TableView applications={applications} />
          ) : (
            <KanbanView
              applications={applications}
              onStageChange={handleKanbanStageChange}
            />
          )}
        </div>
      )}
    </div>
  );
}
