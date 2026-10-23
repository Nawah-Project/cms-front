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

export interface CompanionBannerProps {
  stats: DashboardStats;
  unreadFeedbackCount?: number;
  overdueTasksCount?: number;
  activeTasksCount?: number;
  onAddApplication?: () => void;
}

export function CompanionBanner({
  stats,
  unreadFeedbackCount = 0,
  overdueTasksCount = 0,
  activeTasksCount = 0,
  onAddApplication,
}: CompanionBannerProps) {
  const { t, number } = useI18n();

  const totalApps = (stats.active?.total ?? 0) + (stats.closed?.total ?? 0);
  const expiringSoon = stats.expiringSoonCount ?? 0;
  const recentNoResponse = stats.recentNoResponseCount ?? 0;
  const noResponseTotal = stats.closed?.noResponse ?? 0;

  // Determine state priority
  let variant: "empty" | "expiring" | "no_response" | "feedback" | "stale" | "healthy" =
    "healthy";

  if (totalApps === 0) {
    variant = "empty";
  } else if (expiringSoon > 0) {
    variant = "expiring";
  } else if (recentNoResponse > 0) {
    variant = "no_response";
  } else if (unreadFeedbackCount > 0 || overdueTasksCount > 0) {
    variant = "feedback";
  } else if (noResponseTotal > 0) {
    variant = "stale";
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
              variant === "expiring" || variant === "stale"
                ? "bg-warning-soft text-warning-strong"
                : variant === "no_response"
                  ? "bg-danger-soft text-danger-strong"
                  : variant === "feedback"
                    ? "bg-info-soft text-info-strong"
                    : "bg-info-soft text-info-strong"
            }`}
          >
            {variant === "expiring" || variant === "stale" ? (
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
              {variant === "expiring" &&
                t("dashboard.companionExpiringSoon", {
                  count: number(expiringSoon),
                })}
              {variant === "no_response" &&
                t("dashboard.companionRecentNoResponse", {
                  count: number(recentNoResponse),
                })}
              {variant === "feedback" &&
                (unreadFeedbackCount > 0
                  ? t("dashboard.companionUnreadFeedback", {
                      count: number(unreadFeedbackCount),
                    })
                  : t("dashboard.companionAllGood"))}
              {variant === "stale" &&
                t("dashboard.companionStaleApps", {
                  count: number(noResponseTotal),
                })}
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

          {variant === "expiring" && (
            <Link
              to="/applications?stage=ACTIVE"
              className="button-primary inline-flex items-center gap-2 py-2 px-4 text-xs font-medium"
            >
              <span>{t("dashboard.viewAllApplications")}</span>
              <ArrowLeftIcon className="h-3.5 w-3.5 rotate-180 rtl:rotate-0" />
            </Link>
          )}

          {variant === "no_response" && (
            <Link
              to="/applications?stage=CLOSED"
              className="button-primary inline-flex items-center gap-2 py-2 px-4 text-xs font-medium"
            >
              <span>{t("dashboard.viewAllApplications")}</span>
              <ArrowLeftIcon className="h-3.5 w-3.5 rotate-180 rtl:rotate-0" />
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
              to="/professional-development/feedback"
              className="button-primary inline-flex items-center gap-2 py-2 px-4 text-xs font-medium"
            >
              <span>{t("professionalDevelopment.feedbackInsights")}</span>
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
