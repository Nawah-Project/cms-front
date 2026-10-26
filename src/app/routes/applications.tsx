import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext, useSearchParams } from "react-router";
import { Lock, Compass, Filter } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { profileApi, type CvHistoryItem } from "../features/profile/profileApi";
import { FeatureTour, markFeatureTourSeen } from "../components/FeatureTour";
import { CV_FILTER_TOUR, EXPLORER_TOUR } from "../features/journey/lib/week-one-tours";
import { AnchoredSelect } from "../components/ui/AnchoredSelect";
import { Modal } from "../components/ui/Modal";
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
import { dispatchMilestoneCelebration } from "../features/journey/lib/celebrationEvents";
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
  const createdFrom = searchParams.get("createdFrom") || undefined;
  const createdBefore = searchParams.get("createdBefore") || undefined;
  const cohortLabel = searchParams.get("change") || "";
  const cohortActive = Boolean(createdFrom || createdBefore || /^v[1-9]\d*$/.test(searchParams.get("period") || ""));
  const cohortPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const currentStage = searchParams.get("stage") || "ALL";
  const [mobileStage,setMobileStage]=useState<Stage>(()=>["APPLIED","ASSIGNMENT","INTERVIEW","DECISION","CLOSED"].includes(currentStage)?currentStage as Stage:"APPLIED");
  useEffect(()=>{if(["APPLIED","ASSIGNMENT","INTERVIEW","DECISION","CLOSED"].includes(currentStage))setMobileStage(currentStage as Stage);},[currentStage]);
  const currentOutcome = searchParams.get("outcome") || "ALL";
  const currentPeriod = searchParams.get("period") || "ALL";
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
    cvVersion: /^v[1-9]\d*$/.test(currentPeriod) ? Number(currentPeriod.slice(1)) : undefined,
    createdFrom, createdBefore, page: cohortActive ? cohortPage : undefined, limit: cohortActive ? 100 : undefined,
  });

  const rawApplications = applicationsData?.items ?? [];
  const totalCount =
    applicationsData?.unfilteredTotal ?? applicationsData?.total ?? 0;

  const { data: journeyData } = useJourneyState({ enabled: Boolean(user) });
  const currentWeek = journeyData?.state.currentWeek ?? 0;
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

  // Query profile to fetch cvHistory for periods & version tags
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => profileApi.get(),
    enabled: Boolean(user),
  });

  const cvHistory = useMemo(() => {
    return (profile?.cvHistory ?? [])
      .slice()
      .sort((a: CvHistoryItem, b: CvHistoryItem) => a.versionNumber - b.versionNumber);
  }, [profile?.cvHistory]);

  const maxCvVersion =
    cvHistory.length > 0 ? cvHistory[cvHistory.length - 1].versionNumber : 1;

  // Compute map of appId -> cvVersion
  const appCvVersionMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (cvHistory.length <= 1) {
      for (const app of rawApplications) map[app.id] = 1;
      return map;
    }
    for (const app of rawApplications) {
      const appTime = new Date(app.createdAt || app.applicationDate).getTime();
      let assignedVersion = 1;
      for (let i = cvHistory.length - 1; i >= 0; i--) {
        const v = cvHistory[i];
        const vTime = new Date(v.uploadedAt).getTime();
        if (appTime >= vTime) {
          assignedVersion = v.versionNumber;
          break;
        }
      }
      map[app.id] = assignedVersion;
    }
    return map;
  }, [cvHistory, rawApplications]);

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

  const [isCompassModalOpen, setIsCompassModalOpen] = useState(false);

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
    const assignedV = appCvVersionMap[app.id] || 1;
    const matchesPeriod =
      currentPeriod === "ALL" ||
      currentWeek === 0 ||
      maxCvVersion <= 1 ||
      (currentPeriod === "v1" && assignedV === 1) ||
      (currentPeriod === "v2" && assignedV === 2) ||
      currentPeriod === `v${assignedV}`;
    return matchesStage && matchesOutcome && matchesPeriod;
  };

  const updatePeriodFilter = (periodKey: string) => {
    const next = new URLSearchParams(searchParams);
    for (const key of ["createdFrom", "createdBefore", "change", "page"]) next.delete(key);
    if (periodKey === "ALL") {
      next.delete("period");
    } else {
      next.set("period", periodKey);
    }
    setSearchParams(next);
  };

  const isRtl = locale === "ar";

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: rawApplications.length,
      active: 0,
      APPLIED: 0,
      ASSIGNMENT: 0,
      INTERVIEW: 0,
      DECISION: 0,
      CLOSED: 0,
    };
    for (const app of rawApplications) {
      if (app.stage !== "CLOSED") counts.active++;
      if (counts[app.stage] !== undefined) {
        counts[app.stage]++;
      }
    }
    return counts;
  }, [rawApplications]);

  const toggleStageCapsule = (stageKey: Stage) => {
    if (currentStage === stageKey) {
      updateStageFilter("ALL");
    } else {
      updateStageFilter(stageKey);
    }
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
      if (newStage === "CLOSED" && nextOutcome === "ACCEPTED") {
        const app = rawApplications.find((a) => a.id === appId);
        dispatchMilestoneCelebration({
          title:
            locale === "ar"
              ? "🎉 مبارك! ألف مبروك قبولك في الوظيفة!"
              : "🎉 Congratulations on Your Job Offer!",
          description:
            locale === "ar"
              ? `تهانينا لك على قبولك في شركة ${app?.companyName || "العمل"} بمسمى ${app?.jobTitle || "المهني"}! هذا تتويج رائع لجهدك في رحلة نواة.`
              : `Congratulations on your offer! A well-deserved milestone in your journey.`,
          unlockedItems:
            locale === "ar"
              ? [
                  "تسجيل أول قبول وظيفي ناجح (First Job Offer)",
                  "تحديث بوصلة الإنجاز ومعدلات التحول",
                ]
              : [
                  "First Job Offer Logged",
                  "Performance Conversion Traction Updated",
                ],
          ctaLabel:
            locale === "ar"
              ? "استعرض تقرير أدائك"
              : "View Performance Analytics",
          ctaRoute: "/reports",
        });
      }
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
    nextParams.delete("page");
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

  const handleMobileStageChange=(stage:Stage)=>{setMobileStage(stage);if(currentStage!=="ALL"||currentOutcome!=="ALL")updateStageFilter("ALL");};
  const updateOutcomeFilter = (newOutcome: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("page");
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
    nextParams.delete("page");
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
    cohortActive ||
    currentStage !== "ALL" ||
    currentOutcome !== "ALL" ||
    Boolean(searchQuery.trim());

  const isRefreshing = isFetching && !isLoading;

  return (
    <div className="space-y-5 sm:space-y-7">
      {cohortActive && <section className="rounded-xl border border-emerald-800/20 bg-emerald-50 p-4 dark:bg-emerald-950/30" aria-label={locale === "ar" ? "فلتر فترة التغيير" : "Change period filter"}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{locale === "ar" ? "طلبات مرتبطة بفترة تغيير" : "Applications in a change period"}{cohortLabel ? ` · ${cohortLabel}` : ""}</h2><p className="mt-1 text-sm text-text-secondary">{locale === "ar" ? "الفلتر حسب تاريخ تسجيل الطلب، من بداية التغيير لحد التغيير التالي." : "Filtered by recording time, from this checkpoint up to the next one."}</p>{(createdFrom || createdBefore) && <p className="mt-1 text-xs text-text-secondary">{createdFrom ? new Date(createdFrom).toLocaleString(locale === "ar" ? "ar-EG" : "en-US") : "—"} — {createdBefore ? new Date(createdBefore).toLocaleString(locale === "ar" ? "ar-EG" : "en-US") : (locale === "ar" ? "حتى الآن" : "Present")}</p>}</div><button type="button" className="button-secondary min-h-10" onClick={() => { const next = new URLSearchParams(searchParams); for (const key of ["createdFrom", "createdBefore", "change", "page", "period"]) next.delete(key); setSearchParams(next); }}>{locale === "ar" ? "إلغاء فلتر التغيير" : "Clear change filter"}</button></div>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm"><span>{locale === "ar" ? `${applicationsData?.total ?? 0} طلبات مطابقة` : `${applicationsData?.total ?? 0} matching applications`}</span><div className="flex items-center gap-2"><button type="button" className="button-secondary min-h-10" disabled={cohortPage<=1} onClick={() => {const next=new URLSearchParams(searchParams);next.set("page",String(cohortPage-1));setSearchParams(next);}}>{locale === "ar" ? "السابق" : "Previous"}</button><span>{cohortPage}</span><button type="button" className="button-secondary min-h-10" disabled={cohortPage*100 >= (applicationsData?.total ?? 0)} onClick={() => {const next=new URLSearchParams(searchParams);next.set("page",String(cohortPage+1));setSearchParams(next);}}>{locale === "ar" ? "التالي" : "Next"}</button></div></div>
      </section>}

      <FeatureTour feature="cv-filter-week1-v1" enabled={Boolean(journeyData?.features.analytics && maxCvVersion > 1)} steps={CV_FILTER_TOUR} />
      <FeatureTour feature="explorer-filters-week1-v1" enabled={isCompassModalOpen && Boolean(user?.id && typeof window !== "undefined" && localStorage.getItem(`nawah_v2_guided_tour_done_${user.id}`) === "true")} steps={EXPLORER_TOUR} />
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-stone-300/80 pb-4 sm:pb-7 sm:flex-row sm:items-end sm:justify-between dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100 sm:text-4xl">
            {t("applications.title")}
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {t("applications.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setIsCompassModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3.5 py-2 text-xs font-bold text-neutral-800 transition-all shadow-2xs hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <Compass className="h-4 w-4 text-primary-strong" />
              <span>
                {locale === "ar"
                  ? "🧭 مستكشف الوظائف"
                  : "🧭 Job Explorer"}
              </span>
            </button>
          </div>

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

      {/* Two-Tier Filter and Search Bar */}
      <div className="space-y-3.5 rounded-2xl border border-neutral-200/90 bg-white/70 p-3.5 shadow-2xs backdrop-blur-xs dark:border-neutral-800 dark:bg-neutral-900/70">
        {/* Tier 1: Scope Switcher + Search + Preparation Period + View Mode */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Scope Switcher: All vs Active */}
            <div className="inline-flex rounded-xl bg-neutral-100 p-1 border border-neutral-200/80 dark:bg-neutral-800/80 dark:border-neutral-700/80">
              <button
                type="button"
                onClick={() => updateStageFilter("ALL")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  currentStage === "ALL" || (currentStage !== "ACTIVE" && !["APPLIED", "ASSIGNMENT", "INTERVIEW", "DECISION", "CLOSED"].includes(currentStage))
                    ? "bg-white text-neutral-950 shadow-xs dark:bg-neutral-900 dark:text-white"
                    : "text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                {locale === "ar" ? "كل الطلبات" : "All Applications"}
                <span className="ms-1.5 text-[11px] font-normal opacity-70">({stageCounts.all})</span>
              </button>
              <button
                type="button"
                onClick={() => updateStageFilter("ACTIVE")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  currentStage === "ACTIVE"
                    ? "bg-white text-neutral-950 shadow-xs dark:bg-neutral-900 dark:text-white"
                    : "text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                {locale === "ar" ? "الطلبات المفتوحة" : "Active Applications"}
                <span className="ms-1.5 text-[11px] font-normal opacity-70">({stageCounts.active})</span>
              </button>
            </div>

            {/* Preparation Period Dropdown - Hidden in Week 0 or when only 1 CV version exists */}
            {journeyData?.features.analytics && maxCvVersion > 1 && (
              <div className="flex items-center gap-1.5">
                <AnchoredSelect guide="cv-filter" label={locale === "ar" ? "فلتر نسخة السيرة والتغيير" : "CV and change filter"} value={currentPeriod} onChange={updatePeriodFilter} options={[{value:"ALL",label:locale==="ar"?"كل النسخ والتغييرات":"All versions"},...Array.from({length:maxCvVersion},(_,i)=>({value:`v${i+1}`,label:`CV ${i}${i+1===maxCvVersion?(locale==="ar"?" — الحالية":" — current"):i===0?(locale==="ar"?" — البداية":" — initial"):""}`}))]} />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:flex-1 lg:max-w-md lg:justify-end">
            {/* Search Input */}
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
                className="field-control ps-9 py-1.5 text-xs rounded-xl"
              />
              <SearchIcon className="w-4 h-4 text-text-muted absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </form>

            {/* View Switcher */}
            <div className="hidden md:inline-flex w-fit shrink-0 items-center gap-1 rounded-xl border border-neutral-300 bg-white p-1 shadow-2xs dark:border-neutral-700 dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => handleViewModeChange("kanban")}
                title={t("applications.viewBoard")}
                aria-label={t("applications.viewBoard")}
                aria-pressed={viewMode === "kanban"}
                className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                  viewMode === "kanban"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                    : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                }`}
              >
                <KanbanIcon className="h-3.5 w-3.5" />
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
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                    !canUseTableView
                      ? "cursor-pointer opacity-75 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      : viewMode === "table"
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                        : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>{t("applications.table")}</span>
                  {!canUseTableView && (
                    <Lock className="h-3 w-3 text-amber-600" aria-hidden="true" />
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

        {/* Tier 2: Dedicated Stage Filter Bar */}
        <div className="hidden md:flex flex-wrap items-center gap-2 pt-2.5 border-t border-neutral-200/70 dark:border-neutral-800/70">
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 me-1">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <span>{locale === "ar" ? "المرحلة:" : "Stage:"}</span>
          </div>

          {[
            { key: "APPLIED", label: t("applications.submitted"), color: "bg-[#64748b]", count: stageCounts.APPLIED },
            { key: "ASSIGNMENT", label: t("applications.assignment"), color: "bg-[#525b88]", count: stageCounts.ASSIGNMENT },
            { key: "INTERVIEW", label: t("applications.interview"), color: "bg-[#285987]", count: stageCounts.INTERVIEW },
            { key: "DECISION", label: t("applications.decision"), color: "bg-[#b47d1c]", count: stageCounts.DECISION },
            { key: "CLOSED", label: t("applications.closed"), color: "bg-[#4b5563]", count: stageCounts.CLOSED },
          ].map((stage) => {
            const isSelected = currentStage === stage.key;
            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => toggleStageCapsule(stage.key as Stage)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                  isSelected
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900 shadow-2xs"
                    : "border-neutral-200/90 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${stage.color} shrink-0`} />
                <span>{stage.label}</span>
                <span className={`text-[11px] rounded-full px-1.5 py-0.2 ${isSelected ? "bg-white/20 dark:bg-neutral-900/20 font-bold" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"}`}>
                  {stage.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary Outcome Filter when Closed is selected */}
        {currentStage === "CLOSED" && (
          <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-stone-200/90 pt-2.5 text-xs animate-in fade-in duration-150 dark:border-neutral-800">
            <span className="me-1 font-medium text-neutral-500 dark:text-neutral-400">
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
                  className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    isSelected
                      ? "font-semibold bg-neutral-200/80 text-neutral-950 dark:bg-neutral-800 dark:text-white"
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
            <><div className="md:hidden"><KanbanView mobileStage={mobileStage} onMobileStageChange={handleMobileStageChange} applications={applications} onStageChange={handleKanbanStageChange} appCvVersionMap={appCvVersionMap} /></div><div className="hidden md:block"><TableView
              applications={applications}
              appCvVersionMap={appCvVersionMap}
            /></div></>
          ) : (
            <KanbanView
              mobileStage={mobileStage} onMobileStageChange={handleMobileStageChange}
              applications={applications}
              onStageChange={handleKanbanStageChange}
              appCvVersionMap={appCvVersionMap}
            />
          )}
        </div>
      )}

      {/* Job Explorer Modal */}
      {isCompassModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => { markFeatureTourSeen(user?.id, "explorer-filters-week1-v1"); setIsCompassModalOpen(false); }}
          title={locale === "ar" ? "مستكشف الوظائف" : "Job Explorer"}
          size="2xl"
        >
          <div className="max-h-[80vh] overflow-y-auto -m-4 p-4 sm:-m-6 sm:p-6">
            <JobMarketCompass
              collapsible={false}
              onLaunchDraft={(draft) => {
                setIsCompassModalOpen(false);
                openAddModal(draft);
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
