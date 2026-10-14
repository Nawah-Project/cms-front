import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { useI18n } from "../i18n";
import { BellIcon, ClockIcon, SparklesIcon } from "./Icons";
import { api } from "../services/api";
import type { DashboardStats } from "../types";

export interface NotificationCenterProps {
  variant?: "dark" | "light";
}

export function NotificationCenter({ variant = "dark" }: NotificationCenterProps) {
  const { t, number } = useI18n();
  const [open, setOpen] = useState(false);
  const [emailReminders, setEmailReminders] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("nawah_email_reminders") !== "false";
  });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [unreadFeedback, setUnreadFeedback] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load stats once to populate notifications
  useEffect(() => {
    let active = true;
    void Promise.all([
      api.getDashboardStats().catch(() => null),
      api.getFeedbackUnreadCount().catch(() => ({ unreadCount: 0 })),
    ]).then(([statsRes, feedbackRes]) => {
      if (!active) return;
      if (statsRes) setStats(statsRes);
      if (feedbackRes) setUnreadFeedback(feedbackRes.unreadCount);
    });
    return () => {
      active = false;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleToggleEmail = () => {
    const next = !emailReminders;
    setEmailReminders(next);
    localStorage.setItem("nawah_email_reminders", next ? "true" : "false");
  };

  // Calculate notifications
  const expiringSoon = stats?.expiringSoonCount ?? 0;
  const recentNoResponse = stats?.recentNoResponseCount ?? 0;
  const staleApplicationsCount = stats?.closed?.noResponse ?? 0;
  const totalNotifications =
    (unreadFeedback > 0 ? 1 : 0) +
    (expiringSoon > 0 ? 1 : 0) +
    (recentNoResponse > 0 ? 1 : 0) +
    (staleApplicationsCount > 0 && recentNoResponse === 0 && expiringSoon === 0 ? 1 : 0);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        aria-label={t("dashboard.notificationsTitle")}
        title={t("dashboard.notificationsTitle")}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-info-strong ${
          variant === "dark"
            ? "border border-neutral-700 text-neutral-200 hover:bg-neutral-800"
            : "border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        <BellIcon className="h-4 w-4" />
        {totalNotifications > 0 && (
          <span className="absolute top-1.5 end-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger-strong opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-danger-strong" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute start-0 lg:start-0 max-lg:end-0 top-full mt-2 w-80 sm:w-88 rounded-2xl border border-border bg-surface p-4 shadow-xl z-50 text-text-primary">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <BellIcon className="h-4 w-4 text-info-strong" />
              <span>{t("dashboard.notificationsTitle")}</span>
            </h3>
            {totalNotifications > 0 && (
              <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-semibold text-info-strong">
                {number(totalNotifications)}
              </span>
            )}
          </div>

          <div className="py-2 divide-y divide-border/60">
            {unreadFeedback > 0 && (
              <Link
                to="/professional-development"
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 p-2.5 rounded-xl transition hover:bg-neutral-50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info-strong">
                  <BellIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-text-primary">
                    {t("dashboard.companionUnreadFeedback", {
                      count: number(unreadFeedback),
                    })}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-secondary">
                    {t("common.navProfessionalDevelopment")}
                  </p>
                </div>
              </Link>
            )}

            {expiringSoon > 0 && (
              <Link
                to="/applications?stage=ACTIVE"
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 p-2.5 rounded-xl transition hover:bg-neutral-50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning-strong">
                  <ClockIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-text-primary">
                    {t("dashboard.companionExpiringSoon", {
                      count: number(expiringSoon),
                    })}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-secondary">
                    {t("dashboard.viewAllApplications")}
                  </p>
                </div>
              </Link>
            )}

            {recentNoResponse > 0 && (
              <Link
                to="/applications?stage=CLOSED"
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 p-2.5 rounded-xl transition hover:bg-neutral-50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger-strong">
                  <ClockIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-text-primary">
                    {t("dashboard.companionRecentNoResponse", {
                      count: number(recentNoResponse),
                    })}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-secondary">
                    {t("dashboard.viewAllApplications")}
                  </p>
                </div>
              </Link>
            )}

            {staleApplicationsCount > 0 && recentNoResponse === 0 && expiringSoon === 0 && (
              <Link
                to="/applications"
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 p-2.5 rounded-xl transition hover:bg-neutral-50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning-strong">
                  <ClockIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-text-primary">
                    {t("dashboard.companionStaleApps", {
                      count: number(staleApplicationsCount),
                    })}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-secondary">
                    {t("dashboard.viewAllApplications")}
                  </p>
                </div>
              </Link>
            )}

            {totalNotifications === 0 && (
              <div className="py-6 text-center text-xs text-text-secondary">
                {t("dashboard.noNotifications")}
              </div>
            )}
          </div>

          {/* Email Reminders Toggle */}
          <div className="mt-2 border-t border-border pt-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-xs text-text-secondary leading-snug">
                {t("dashboard.emailRemindersLabel")}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={emailReminders}
                onClick={handleToggleEmail}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  emailReminders ? "bg-info-strong" : "bg-neutral-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    emailReminders
                      ? "ltr:translate-x-4 rtl:-translate-x-4"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
