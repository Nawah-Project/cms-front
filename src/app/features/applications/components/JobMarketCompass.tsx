import { useState } from "react";
import { Compass, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useI18n } from "../../../i18n";
import { useJobMarketCompass } from "../../journey/api/journeyApi";
import type {
  ApplicationMethod,
  CreateApplicationInput,
} from "../../../types";

const LOCATION_PRESETS = [
  { key: "Egypt", labelKey: "applications.locationEgypt" },
  { key: "Saudi Arabia", labelKey: "applications.locationSaudi" },
  { key: "UAE", labelKey: "applications.locationUAE" },
  { key: "Remote", labelKey: "applications.locationRemote" },
] as const;

const PLATFORM_METHOD_MAP: Record<string, ApplicationMethod> = {
  linkedin: "LINKEDIN",
  wuzzuf: "RECRUITMENT_PLATFORM",
  bayt: "RECRUITMENT_PLATFORM",
  wellfound: "RECRUITMENT_PLATFORM",
  remoteok: "RECRUITMENT_PLATFORM",
};

interface JobMarketCompassProps {
  onLaunchDraft: (draft: Partial<CreateApplicationInput>) => void;
}

export function JobMarketCompass({ onLaunchDraft }: JobMarketCompassProps) {
  const { t, locale } = useI18n();
  const [expanded, setExpanded] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>("Remote");
  const { data: compass, isLoading } = useJobMarketCompass(selectedLocation);

  const targetJobTitle = compass?.targetJobTitle || "Software Engineer";
  const currentLocation = compass?.location || selectedLocation;

  const handlePlatformClick = (platform: {
    id: string;
    name: string;
    url: string;
  }) => {
    window.open(platform.url, "_blank", "noopener,noreferrer");
    onLaunchDraft({
      jobTitle: targetJobTitle,
      location: currentLocation,
      applicationMethod:
        PLATFORM_METHOD_MAP[platform.id] || "RECRUITMENT_PLATFORM",
      jobUrl: platform.url,
    });
  };

  return (
    <section
      aria-label={t("applications.compassTitle")}
      className="rounded-2xl border border-border bg-surface shadow-xs transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
            <Compass className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {t("applications.compassTitle")}
              </h2>
              <span className="rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                {targetJobTitle}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {t("applications.compassSubtitle")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <span>
            {expanded
              ? t("applications.compassHide")
              : t("applications.compassShow")}
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-border px-4 py-4 sm:px-5">
          {/* Quick Location Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {t("applications.compassTargetMarket")}:
            </span>
            {LOCATION_PRESETS.map((loc) => {
              const active = selectedLocation === loc.key;
              return (
                <button
                  key={loc.key}
                  type="button"
                  onClick={() => setSelectedLocation(loc.key)}
                  aria-pressed={active}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                      : "border-border bg-neutral-50 text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  }`}
                >
                  {t(loc.labelKey)}
                </button>
              );
            })}
          </div>

          {/* Job Board Launchers */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
              {[0, 1, 2, 3, 4].map((idx) => (
                <div
                  key={idx}
                  className="h-16 animate-pulse rounded-xl border border-border bg-neutral-100 dark:bg-neutral-800"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
              {(compass?.platforms ?? []).map((platform) => (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => handlePlatformClick(platform)}
                  className="group flex flex-col justify-between rounded-xl border border-border bg-neutral-50/70 p-3 text-start transition-all hover:border-neutral-400 hover:bg-white hover:shadow-xs dark:bg-neutral-900/60 dark:hover:border-neutral-600 dark:hover:bg-neutral-900"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {platform.name}
                    </span>
                    <ExternalLink
                      className="h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform group-hover:-translate-y-0.5 group-hover:text-neutral-800 dark:group-hover:text-neutral-200"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">
                    {locale === "ar"
                      ? platform.descriptionAr
                      : platform.descriptionEn}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

