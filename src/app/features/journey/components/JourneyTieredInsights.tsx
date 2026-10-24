import { Lock, Sparkles, Unlock } from "lucide-react";
import { useI18n } from "../../../i18n";
import { useJourneyState } from "../api/journeyApi";
import { JOURNEY_INSIGHTS_CATALOG } from "../lib/journey-insights-catalog";
import { PromptCopyBox } from "./PromptCopyBox";
import { useAuth } from "../../auth/store/authStore";

export function JourneyTieredInsights() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { data: journeyData, isLoading } = useJourneyState({
    enabled: Boolean(user),
  });

  if (isLoading) {
    return (
      <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <div className="h-5 w-1/3 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-44 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-44 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
        </div>
      </section>
    );
  }

  const unlockedSet = new Set(
    journeyData?.state.unlockedInsightCodes ?? ["INSIGHT_TASK_0_CV_BASE"],
  );
  const isAdmin = user?.role === "ADMIN";

  const unlockedItems = JOURNEY_INSIGHTS_CATALOG.filter(
    (item) => isAdmin || unlockedSet.has(item.code),
  );
  const firstLockedItem = JOURNEY_INSIGHTS_CATALOG.find(
    (item) => !isAdmin && !unlockedSet.has(item.code),
  );

  return (
    <section
      aria-labelledby="tiered-insights-heading"
      className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("journey.tieredInsightsBadge")}</span>
          </div>
          <h2
            id="tiered-insights-heading"
            className="mt-2 text-lg font-bold text-neutral-950 dark:text-neutral-100"
          >
            {t("journey.tieredInsightsTitle")}
          </h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {t("journey.tieredInsightsSubtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {unlockedItems.map((item) => {
          const title = locale === "ar" ? item.titleAr : item.titleEn;
          const summary = locale === "ar" ? item.summaryAr : item.summaryEn;
          const promptTemplate =
            locale === "ar" ? item.promptTemplateAr : item.promptTemplateEn;

          return (
            <article
              key={item.code}
              className="flex flex-col justify-between rounded-2xl border border-neutral-300 bg-white p-4 shadow-2xs transition-all sm:p-5 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    <Unlock className="h-3 w-3" aria-hidden="true" />
                    <span>{t("journey.insightUnlockedBadge")}</span>
                  </span>

                  <span className="text-[11px] font-medium text-neutral-400">
                    {item.weekNumber === 0
                      ? t("journey.weekZeroTab")
                      : t("journey.weekNumberTab", { week: item.weekNumber })}
                  </span>
                </div>

                <h3 className="mt-2.5 text-sm font-bold text-neutral-950 dark:text-neutral-100">
                  {title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-neutral-600 dark:text-neutral-400">
                  {summary}
                </p>
              </div>

              <PromptCopyBox
                promptTemplate={promptTemplate}
                locked={false}
              />
            </article>
          );
        })}

        {/* Single Fog of War Mystery Card (Zero Spoilers) */}
        {firstLockedItem && (
          <article className="relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 p-6 text-center transition-all dark:border-neutral-700 dark:bg-neutral-900/40 min-h-[220px]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-200/80 text-neutral-700 shadow-xs dark:bg-neutral-800 dark:text-neutral-300">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>

            <h3 className="mt-3 text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {locale === "ar" ? "رؤية المحطة القادمة 🔒" : "Next Station Insight 🔒"}
            </h3>

            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              {locale === "ar"
                ? "تفتح هذه الرؤية والبرومبت الاستراتيجي المرافق لها فور وصولك لمحطتك القادمة في الرحلة. ركّز على إنجاز مهامك الحالية أولاً!"
                : "This strategic insight and accompanying prompt will unlock upon reaching your next journey station. Stay focused on your current tasks!"}
            </p>
          </article>
        )}
      </div>
    </section>
  );
}

