import React from "react";
import { Link } from "react-router";
import { useI18n } from "../i18n";
import type { DashboardStats } from "../types";
import {
  SparklesIcon,
  ArrowLeftIcon,
  PlusIcon,
  ClockIcon,
  BellIcon,
} from "./Icons";

export interface CompanionCardProps {
  stats: DashboardStats;
  unreadFeedbackCount?: number;
  overdueTasksCount?: number;
  activeTasksCount?: number;
  onAddApplication?: () => void;
}

export function CompanionCard({
  stats,
  unreadFeedbackCount = 0,
  overdueTasksCount = 0,
  activeTasksCount = 0,
  onAddApplication,
}: CompanionCardProps) {
  const { t, number } = useI18n();

  const totalApps = (stats.active?.total ?? 0) + (stats.closed?.total ?? 0);

  // Check for stale applications: >10 days without update or marked as NO_RESPONSE
  const now = Date.now();
  const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
  const staleRecentApps = (stats.recentApplications ?? []).filter((app) => {
    if (app.outcome === "NO_RESPONSE") return true;
    if (app.stage === "APPLIED") {
      const updated = new Date(app.updatedAt || app.applicationDate).getTime();
      return now - updated > tenDaysMs;
    }
    return false;
  });

  const noResponseCount = stats.closed?.noResponse ?? 0;
  const staleCount = Math.max(staleRecentApps.length, noResponseCount);

  // Determine state
  let variant: "empty" | "stale" | "feedback" | "healthy" = "healthy";
  if (totalApps === 0) {
    variant = "empty";
  } else if (staleCount > 0) {
    variant = "stale";
  } else if (unreadFeedbackCount > 0 || overdueTasksCount > 0) {
    variant = "feedback";
  } else {
    variant = "healthy";
  }

  return (
    <section
      aria-label={t("dashboard.companionTitle")}
      className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs transition-shadow hover:shadow-sm"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              variant === "stale"
                ? "bg-warning-soft text-warning-strong"
                : variant === "feedback"
                  ? "bg-info-soft text-info-strong"
                  : "bg-info-soft text-info-strong"
            }`}
          >
            {variant === "stale" ? (
              <ClockIcon className="h-6 w-6" />
            ) : variant === "feedback" ? (
              <BellIcon className="h-6 w-6" />
            ) : (
              <SparklesIcon className="h-6 w-6" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-700">
                <SparklesIcon className="h-3 w-3 text-info-strong" />
                <span>{t("dashboard.companionTitle")}</span>
              </span>
            </div>

            <p className="mt-2 text-sm font-medium leading-relaxed text-text-primary">
              {variant === "empty" && t("dashboard.companionFirstApp")}
              {variant === "stale" &&
                t("dashboard.companionStaleApps", {
                  count: number(staleCount),
                })}
              {variant === "feedback" &&
                (unreadFeedbackCount > 0
                  ? t("dashboard.companionUnreadFeedback", {
                      count: number(unreadFeedbackCount),
                    })
                  : t("dashboard.companionAllGood"))}
              {variant === "healthy" && t("dashboard.companionAllGood")}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
          {variant === "empty" && onAddApplication && (
            <button
              type="button"
              onClick={onAddApplication}
              className="button-primary inline-flex items-center gap-2 py-2 px-4 text-xs font-medium"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span>{t("common.addApplication")}</span>
            </button>
          )}

          {variant === "empty" && !onAddApplication && (
            <Link
              to="/applications"
              className="button-primary inline-flex items-center gap-2 py-2 px-4 text-xs font-medium"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span>{t("common.addApplication")}</span>
            </Link>
          )}

          {variant === "stale" && (
            <Link
              to="/applications"
              className="button-primary inline-flex items-center gap-2 py-2 px-4 text-xs font-medium"
            >
              <span>{t("dashboard.viewAllApplications")}</span>
              <ArrowLeftIcon className="h-3.5 w-3.5 rotate-180 rtl:rotate-0" />
            </Link>
          )}

          {variant === "feedback" && (
            <Link
              to="/professional-development"
              className="button-primary inline-flex items-center gap-2 py-2 px-4 text-xs font-medium"
            >
              <span>{t("common.navProfessionalDevelopment")}</span>
              <ArrowLeftIcon className="h-3.5 w-3.5 rotate-180 rtl:rotate-0" />
            </Link>
          )}

          {variant === "healthy" && (
            <Link
              to="/members-progress"
              className="button-secondary inline-flex items-center gap-2 py-2 px-4 text-xs font-medium"
            >
              <span>{t("common.navMembersProgress")}</span>
              <ArrowLeftIcon className="h-3.5 w-3.5 rotate-180 rtl:rotate-0" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
