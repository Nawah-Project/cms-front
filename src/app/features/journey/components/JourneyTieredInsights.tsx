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
        {JOURNEY_INSIGHTS_CATALOG.map((item) => {
          const isUnlocked = isAdmin || unlockedSet.has(item.code);
          const title = locale === "ar" ? item.titleAr : item.titleEn;
          const summary = locale === "ar" ? item.summaryAr : item.summaryEn;
          const unlockReq =
            locale === "ar"
              ? item.unlockRequirementAr
              : item.unlockRequirementEn;
          const promptTemplate =
            locale === "ar" ? item.promptTemplateAr : item.promptTemplateEn;

          return (
            <article
              key={item.code}
              className={`flex flex-col justify-between rounded-2xl border p-4 transition-all sm:p-5 ${
                isUnlocked
                  ? "border-neutral-300 bg-white shadow-2xs dark:border-neutral-700 dark:bg-neutral-900"
                  : item.isAdvanced
                    ? "border-amber-300/80 bg-amber-50/40 dark:border-amber-800/60 dark:bg-amber-950/20"
                    : "border-dashed border-border bg-neutral-50/60 dark:bg-neutral-900/40"
              }`}
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      isUnlocked
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                        : "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200"
                    }`}
                  >
                    {isUnlocked ? (
                      <>
                        <Unlock className="h-3 w-3" aria-hidden="true" />
                        <span>{t("journey.insightUnlockedBadge")}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" aria-hidden="true" />
                        <span>{unlockReq}</span>
                      </>
                    )}
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
                locked={!isUnlocked}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}

