import React, { useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router";
import { EmptyState } from "../components/EmptyState";
import {
  KanbanIcon,
  PlusIcon,
  SearchIcon,
  SpinnerIcon,
  TableIcon,
} from "../components/Icons";
import { KanbanView } from "../components/KanbanView";
import { TableView } from "../components/TableView";
import { api } from "../services/api";
import type { Application, Outcome, Stage } from "../types";

export function meta() {
  return [
    { title: "Applications | Job Tracker" },
    { name: "description", content: "List of all tracked job applications" },
  ];
}

export default function ApplicationsPage() {
  const { openAddModal } = useOutletContext<{ openAddModal: () => void }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [applications, setApplications] = useState<Application[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View mode: 'table' | 'kanban', persisted locally
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  // Read filters from search params
  const currentStage = searchParams.get("stage") || "ALL";
  const currentOutcome = searchParams.get("outcome") || "ALL";
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || "",
  );

  // Initialize view mode from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("job_tracker_view_mode");
      if (saved === "table" || saved === "kanban") {
        setViewMode(saved);
      }
    } catch {
      // localStorage may not be available in private mode
    }
  }, []);

  const handleViewModeChange = (mode: "table" | "kanban") => {
    setViewMode(mode);
    try {
      localStorage.setItem("job_tracker_view_mode", mode);
    } catch {
      // ignore
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch full applications list to know totalCount
      const allApps = await api.getApplications();
      setTotalCount(allApps.length);

      // Fetch with current stage/outcome/search filters
      const stageParam = currentStage === "ALL" ? undefined : currentStage;
      const outcomeParam =
        currentOutcome === "ALL" ? undefined : currentOutcome;
      const searchParam = searchQuery.trim() || undefined;

      const filtered = await api.getApplications({
        stage: stageParam,
        outcome: outcomeParam,
        search: searchParam,
      });

      setApplications(filtered);
    } catch (err: any) {
      setError(err.message || "Failed to load applications.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKanbanStageChange = async (
    appId: string,
    newStage: Stage,
    outcome?: Outcome,
  ) => {
    // Optimistic update: move the card immediately in the UI
    const prevApplications = [...applications];
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId
          ? { ...app, stage: newStage, outcome: outcome || "NONE" }
          : app,
      ),
    );

    try {
      await api.updateApplication(appId, {
        stage: newStage,
        outcome: outcome || "NONE",
      });
      // Reload to get fresh server state
      await loadData();
    } catch (err: any) {
      // Revert on failure
      setApplications(prevApplications);
      alert(err.message || "Failed to move application.");
    }
  };

  useEffect(() => {
    loadData();
  }, [currentStage, currentOutcome, searchQuery]);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-stone-300/80 pb-7 sm:flex-row sm:items-end sm:justify-between dark:border-neutral-800">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100 sm:text-4xl">
            Applications
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Manage and track all submitted job applications
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="inline-flex items-center rounded-md border border-stone-200 bg-white/60 p-1 dark:border-neutral-700 dark:bg-neutral-900/60">
            <button
              type="button"
              onClick={() => handleViewModeChange("table")}
              title="Table View"
              aria-label="Table View"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === "table"
                  ? "bg-stone-100 text-neutral-950 dark:bg-neutral-800 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("kanban")}
              title="Kanban / Cards View"
              aria-label="Kanban View"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === "kanban"
                  ? "bg-stone-100 text-neutral-950 dark:bg-neutral-800 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              }`}
            >
              <KanbanIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="button-primary inline-flex items-center gap-1.5 py-2 text-sm dark:border-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>+ Add Application</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Stage Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-stone-200 pb-0.5 sm:pb-0 scrollbar-none dark:border-neutral-800">
            {[
              { key: "ALL", label: "All" },
              { key: "ACTIVE", label: "Active" },
              { key: "APPLIED", label: "Applied" },
              { key: "INTERVIEW", label: "Interview" },
              { key: "DECISION", label: "Decision" },
              { key: "CLOSED", label: "Closed" },
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

          {/* Simple Search Field for companyName and jobTitle */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative min-w-[240px]"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company or job title..."
              className="w-full rounded-md border border-stone-300/80 bg-white/65 py-2 pl-8 pr-3 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-stone-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-neutral-700"
            />
            <SearchIcon className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </form>
        </div>

        {/* Secondary Outcome Filter when Closed is selected */}
        {currentStage === "CLOSED" && (
          <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 pt-3 text-sm animate-in fade-in duration-150 dark:border-neutral-800">
            <span className="mr-1 text-xs text-neutral-500 dark:text-neutral-400">
              Outcome:
            </span>
            {[
              { key: "ALL", label: "All Closed" },
              { key: "ACCEPTED", label: "Accepted" },
              { key: "REJECTED", label: "Rejected" },
              { key: "WITHDRAWN", label: "Withdrawn" },
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

      {/* Main Content Area: Loading, Error, Empty, or Data */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <SpinnerIcon className="w-6 h-6 text-neutral-500 mb-3" />
          <p className="text-xs text-neutral-500">Loading applications...</p>
        </div>
      ) : error ? (
        <div className="py-16 max-w-md mx-auto text-center">
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
            <p className="font-semibold mb-1">Failed to load applications</p>
            <p>{error}</p>
            <button
              type="button"
              onClick={loadData}
              className="mt-3 px-3 py-1.5 bg-red-600 text-white rounded-md font-medium text-xs hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : applications.length === 0 ? (
        totalCount === 0 ? (
          <EmptyState onAddClick={openAddModal} />
        ) : (
          <EmptyState
            isFiltered
            onAddClick={openAddModal}
            onClearFilters={clearAllFilters}
          />
        )
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
            <span>
              Showing {applications.length}{" "}
              {applications.length === 1 ? "application" : "applications"}
            </span>
            {isFiltering && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-neutral-600 dark:text-neutral-400 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          {viewMode === "table" ? (
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
