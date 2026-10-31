import { useState, useMemo } from "react";
import {
  Compass,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Globe,
  Check,
} from "lucide-react";
import { useI18n } from "../../../i18n";
import { useAuth } from "../../auth/store/authStore";
import { useToast } from "../../../components/ui/ToastProvider";
import { trackUxEvent } from "../../../utils/uxAnalytics";
import type { ApplicationMethod, CreateApplicationInput } from "../../../types";

import {
  MACRO_MARKETS,
  PLATFORMS,
  getPlatformsForSelection,
  getManualFilters,
  type PlatformConfig,
  type WorkMode,
} from "../lib/job-explorer-catalog";
export type { WorkMode } from "../lib/job-explorer-catalog";

interface JobMarketCompassProps {
  onLaunchDraft: (draft: Partial<CreateApplicationInput>) => void;
  collapsible?: boolean;
  guided?: boolean;
}

export function JobMarketCompass({
  onLaunchDraft,
  collapsible = true,
  guided = false,
}: JobMarketCompassProps) {
  const { t, locale } = useI18n();
  const isRtl = locale === "ar";
  const { user } = useAuth();
  const toast = useToast();
  const filterLabel = (filter: "keyword" | "country" | "workMode") =>
    ({
      keyword: isRtl ? "التخصص" : "job title",
      country: isRtl ? "الدولة" : "country",
      workMode: isRtl ? "نمط العمل" : "work mode",
    })[filter];

  const [expanded, setExpanded] = useState(true);
  const [selectedMarketId, setSelectedMarketId] = useState<string>("Egypt");
  const [selectedSubCountryKey, setSelectedSubCountryKey] = useState<
    string | null
  >(null);
  const [workMode, setWorkMode] = useState<WorkMode>("ALL");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<
    "ALL" | "GLOBAL" | "REGIONAL"
  >("ALL");

  const targetJobTitle = user?.targetJobTitle || "Software Engineer";

  // Current active macro-market
  const activeMarket = useMemo(
    () =>
      MACRO_MARKETS.find((m) => m.id === selectedMarketId) ?? MACRO_MARKETS[0],
    [selectedMarketId],
  );

  // Determine effective location string
  const effectiveLocation = useMemo(() => {
    let base = "";
    if (selectedSubCountryKey && activeMarket.subCountries) {
      const sub = activeMarket.subCountries.find(
        (c) => c.key === selectedSubCountryKey,
      );
      base = isRtl
        ? sub?.labelAr || selectedSubCountryKey
        : sub?.labelEn || selectedSubCountryKey;
    } else if (selectedMarketId === "Egypt") {
      base = isRtl ? "مصر" : "Egypt";
    } else if (
      activeMarket.subCountries &&
      activeMarket.subCountries.length > 0
    ) {
      const sub = activeMarket.subCountries[0];
      base = isRtl ? sub.labelAr : sub.labelEn;
    } else {
      base = isRtl ? activeMarket.labelAr : activeMarket.labelEn;
    }

    if (workMode === "REMOTE") {
      return isRtl ? `${base} - عن بُعد` : `${base} - Remote`;
    }
    return base;
  }, [selectedMarketId, selectedSubCountryKey, activeMarket, workMode, isRtl]);

  const effectiveLocationQuery = useMemo(() => {
    if (selectedSubCountryKey) return selectedSubCountryKey;
    if (selectedMarketId === "Egypt") return "Egypt";
    if (activeMarket.subCountries && activeMarket.subCountries.length > 0) {
      return activeMarket.subCountries[0].key;
    }
    return activeMarket.labelEn;
  }, [selectedMarketId, selectedSubCountryKey, activeMarket]);

  const handleMarketChange = (marketId: string) => {
    setSelectedMarketId(marketId);
    const m = MACRO_MARKETS.find((x) => x.id === marketId);
    if (m?.subCountries && m.subCountries.length > 0) {
      setSelectedSubCountryKey(m.subCountries[0].key);
    } else {
      setSelectedSubCountryKey(null);
    }
  };

  const handlePlatformClick = (platform: PlatformConfig) => {
    trackUxEvent("job_explorer_clicked", { platform: platform.name });
    const manual = getManualFilters(platform, workMode, targetJobTitle);
    if (manual.length > 0) {
      toast.info(
        isRtl
          ? `اضبط ${manual.map(filterLabel).join("، ")} داخل ${platform.name}؛ باقي الفلاتر المدعومة موجودة في الرابط.`
          : `Set ${manual.map(filterLabel).join(", ")} inside ${platform.name}; supported filters are already included in the link.`,
      );
    }

    // Launch draft with smart auto-filled location and applicationMethod
    const appMethod: ApplicationMethod = platform.method;

    onLaunchDraft({
      jobTitle: targetJobTitle,
      location: effectiveLocation,
      applicationMethod: appMethod,
      jobUrl: "", // STRICTLY EMPTY: NEVER PREFILL SEARCH URL!
    });
  };

  const eligiblePlatforms = useMemo(
    () =>
      getPlatformsForSelection(
        selectedMarketId,
        effectiveLocationQuery,
        workMode,
      ),
    [selectedMarketId, effectiveLocationQuery, workMode],
  );
  const globalPlatforms = useMemo(() => {
    return eligiblePlatforms.filter((p) => p.category === "GLOBAL");
  }, [eligiblePlatforms]);

  const regionalPlatformsForMarket = useMemo(() => {
    return eligiblePlatforms.filter((p) => p.category === "REGIONAL");
  }, [eligiblePlatforms]);

  const allPlatformsForMarket = useMemo(() => {
    return [...globalPlatforms, ...regionalPlatformsForMarket];
  }, [globalPlatforms, regionalPlatformsForMarket]);

  const displayedPlatforms = useMemo(() => {
    if (activeCategoryFilter === "GLOBAL") return globalPlatforms;
    if (activeCategoryFilter === "REGIONAL") return regionalPlatformsForMarket;
    return allPlatformsForMarket;
  }, [
    activeCategoryFilter,
    globalPlatforms,
    regionalPlatformsForMarket,
    allPlatformsForMarket,
  ]);

  const globalCount = globalPlatforms.length;
  const regionalCount = regionalPlatformsForMarket.length;
  const allCount = allPlatformsForMarket.length;

  if (guided) {
    const linkedIn = PLATFORMS.find((platform) => platform.id === "linkedin")!;
    return (
      <section
        className="space-y-4"
        aria-label={isRtl ? "ابحث عن أول فرصة" : "Find your first opportunity"}
      >
        <p className="text-sm leading-6 text-text-secondary">
          {isRtl
            ? "افتح الوظائف المناسبة لتخصصك، اختار فرصة، وبعدها ارجع عشان تسجل طلبك."
            : "Browse jobs matching your specialization, choose an opportunity, then return to record your application."}
        </p>
        <a
          href={linkedIn.buildUrl(
            targetJobTitle,
            effectiveLocationQuery,
            workMode,
          )}
          target="_blank"
          rel="noopener noreferrer"
          data-tour-step="explorer-linkedin-card"
          data-platform="linkedin"
          onClick={() => handlePlatformClick(linkedIn)}
          className="flex min-h-24 w-full items-center gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-start hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-sky-700 dark:border-sky-800 dark:bg-sky-950/40"
        >
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0a66c2] text-xl font-bold text-white"
          >
            in
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold">LinkedIn Jobs</span>
            <span
              className="mt-1 block break-words text-sm text-text-secondary"
              dir="ltr"
            >
              {targetJobTitle}
            </span>
          </span>
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
        </a>
        <p className="job-explorer-mobile-help text-xs leading-6 text-text-secondary">
          {isRtl
            ? "لتجربة أسهل، جرّب تجمع نواة ومنصات التوظيف في مجموعة تبويبات. اضغط مطولًا على بطاقة المنصة لعرض خيارات الفتح؛ ولو متصفحك بيدعم المجموعات، تقدر تجمعهم وترجع لنواة بسرعة."
            : "For an easier return to Nawah, try keeping Nawah and job platforms in a tab group. Hold a platform card to see opening options, then group the tabs if your browser supports it."}
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label={t("applications.compassTitle")}
      className="rounded-3xl border border-border bg-surface p-5 sm:p-6 shadow-xs transition-all space-y-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
                {isRtl ? "مستكشف الوظائف" : "Job Explorer"}
              </h2>
              <span
                dir="ltr"
                className="rounded-full border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 px-2.5 py-0.5 text-xs font-mono font-semibold text-neutral-800 dark:text-neutral-200"
              >
                {targetJobTitle}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              {isRtl
                ? "ابدأ البحث بتخصصك ودولتك، وراجع الفلاتر المدعومة على بطاقة كل منصة."
                : "Search by your job title and country. Each platform shows which filters need to be set on its site."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Work Mode Switcher Segmented Control */}
          <div
            data-guide="explorer-work-mode"
            className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-neutral-100/80 dark:bg-neutral-900/80 p-1"
          >
            <span className="text-[11px] font-bold text-neutral-500 px-1.5 select-none">
              {isRtl ? "نمط العمل:" : "Work Mode:"}
            </span>
            {[
              { id: "ALL" as WorkMode, labelAr: "الكل", labelEn: "All" },
              {
                id: "REMOTE" as WorkMode,
                labelAr: "🏠 عن بُعد",
                labelEn: "🏠 Remote",
              },
              {
                id: "ON_SITE" as WorkMode,
                labelAr: "🏢 مقر الشركة / هجين",
                labelEn: "🏢 On-site / Hybrid",
              },
            ].map((mode) => {
              const isSelected = workMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={isSelected}
                  data-work-mode={mode.id}
                  onClick={() => setWorkMode(mode.id)}
                  className={`job-work-mode inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    isSelected
                      ? "border-accent bg-accent text-white shadow-xs"
                      : "border-transparent text-neutral-600 hover:bg-surface hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  <Check className={`h-3 w-3 shrink-0 ${isSelected ? "" : "invisible"}`} aria-hidden="true" />
                  {isRtl ? mode.labelAr : mode.labelEn}
                </button>
              );
            })}
          </div>

          {collapsible && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <span>
                {expanded
                  ? isRtl
                    ? "إخفاء الفلاتر"
                    : "Collapse"
                  : isRtl
                    ? "عرض المستكشف"
                    : "Expand"}
              </span>
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-4">
          <p className="job-explorer-mobile-help rounded-xl border border-border px-3 py-2 text-xs leading-6 text-text-secondary">
            {isRtl
              ? "لتجربة أسهل، جرّب تجمع نواة ومنصات التوظيف في مجموعة تبويبات. اضغط مطولًا على بطاقة المنصة لعرض خيارات الفتح؛ ولو متصفحك بيدعم المجموعات، تقدر تجمعهم وترجع لنواة بسرعة."
              : "For an easier return to Nawah, try keeping Nawah and job platforms in a tab group. Hold a platform card to see opening options, then group the tabs if your browser supports it."}
          </p>
          {/* Level 1: 7 Macro-Markets Selector */}
          <div data-guide="explorer-markets">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {isRtl
                  ? "1. اختر السوق الإقليمي المستهدف:"
                  : "1. Select Macro Market:"}
              </span>
              <span className="text-[11px] text-neutral-500 font-medium">
                {effectiveLocation}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {MACRO_MARKETS.map((m) => {
                const active = selectedMarketId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={active}
                    data-market={m.id}
                    onClick={() => handleMarketChange(m.id)}
                    className={`job-country inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? "border-neutral-900 bg-neutral-900 text-white shadow-xs dark:border-white dark:bg-white dark:text-neutral-900"
                        : "border-border bg-neutral-50/70 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-400 dark:bg-neutral-900/60 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <span>{m.flag}</span>
                    <span>{isRtl ? m.labelAr : m.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level 2: Sub-Country Flag Selector (for multi-country markets) */}
          {activeMarket.subCountries &&
            activeMarket.subCountries.length > 0 && (
              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/30 p-3 space-y-2 animate-in fade-in duration-150">
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 block">
                  {isRtl
                    ? "الدولة الفرعية المحددة:"
                    : "Select Specific Country:"}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {activeMarket.subCountries.map((c) => {
                    const active = selectedSubCountryKey === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        aria-pressed={active}
                        data-country={c.key}
                        onClick={() => setSelectedSubCountryKey(c.key)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                          active
                            ? "border-neutral-900 bg-neutral-900 text-white shadow-xs dark:border-white dark:bg-white dark:text-neutral-900"
                            : "border-border bg-surface text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                      >
                        <span>{c.flag}</span>
                        <span>{isRtl ? c.labelAr : c.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Category Tabs with Dynamic Market Counts */}
          <div
            data-guide="explorer-platforms"
            className="flex items-center justify-between pt-1 border-t border-border/70"
          >
            <div className="flex items-center gap-1.5">
              {[
                {
                  id: "ALL" as const,
                  label: isRtl
                    ? `كل المنصات (${allCount})`
                    : `All Platforms (${allCount})`,
                },
                {
                  id: "GLOBAL" as const,
                  label: isRtl
                    ? `منصات عالمية (${globalCount})`
                    : `Global (${globalCount})`,
                },
                {
                  id: "REGIONAL" as const,
                  label: isRtl
                    ? `منصات إقليمية ومحلية (${regionalCount})`
                    : `Regional (${regionalCount})`,
                },
              ].map((cat) => {
                const active = activeCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={active}
                    data-platform-category={cat.id}
                    onClick={() => setActiveCategoryFilter(cat.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                        : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-200 dark:hover:bg-neutral-800/50"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] text-neutral-400 hidden sm:inline-block">
              {isRtl
                ? "افتح نتائج البحث، وارجع لتسجيل فرصة فعلية"
                : "Browse results, then return to record a real opportunity"}
            </span>
          </div>

          {/* Horizontal Rectangular Cards Grid (2 Columns, Official Logos, Full Descriptions) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {displayedPlatforms.map((platform) => {
              const manualFilters = getManualFilters(
                platform,
                workMode,
                targetJobTitle,
              );
              return (
                <a
                  key={platform.id}
                  href={platform.buildUrl(
                    targetJobTitle,
                    effectiveLocationQuery,
                    workMode,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-platform={platform.id}
                  data-tour-step={
                    platform.id === "linkedin"
                      ? "explorer-linkedin-card"
                      : undefined
                  }
                  onClick={() => handlePlatformClick(platform)}
                  onAuxClick={(event) => {
                    if (event.button === 1) handlePlatformClick(platform);
                  }}
                  className="job-platform-card group flex items-start gap-3.5 rounded-2xl border border-border bg-surface p-4 text-start transition-all hover:border-neutral-400 hover:shadow-sm dark:hover:border-neutral-600 w-full"
                >
                  {/* Platform Logo Box */}
                  <div className="h-11 w-11 shrink-0 rounded-xl border border-border/80 bg-white dark:bg-neutral-900 flex items-center justify-center p-2 shadow-2xs">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${platform.domain}&sz=64`}
                      alt=""
                      className="h-6 w-6 object-contain"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallback = e.currentTarget
                          .nextElementSibling as HTMLElement;
                        if (fallback) fallback.classList.remove("hidden");
                      }}
                    />
                    <Globe className="h-5 w-5 text-neutral-500 hidden" />
                  </div>

                  {/* Content (Complete description, no line clamping) */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-neutral-950 dark:text-neutral-100 group-hover:text-info-strong transition-colors">
                          {platform.name}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            platform.category === "GLOBAL"
                              ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          }`}
                        >
                          {platform.category === "GLOBAL"
                            ? isRtl
                              ? "عالمي"
                              : "Global"
                            : isRtl
                              ? "إقليمي"
                              : "Regional"}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                          {platform.supportsLocationParam
                            ? effectiveLocation
                            : isRtl
                              ? "الدولة داخل الموقع"
                              : "Set country on site"}
                        </span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors" />
                    </div>

                    <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                      {isRtl ? platform.descriptionAr : platform.descriptionEn}
                    </p>
                    {manualFilters.length > 0 && (
                      <p
                        data-manual-filters
                        className="border-t border-border/70 pt-2 text-[11px] leading-5 text-text-secondary"
                      >
                        {isRtl ? "اضبط داخل الموقع: " : "Set on site: "}
                        {manualFilters
                          .map(filterLabel)
                          .join(isRtl ? "، " : ", ")}
                      </p>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
