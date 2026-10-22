import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { useI18n } from "../i18n";
import { BellIcon, CheckIcon, ClockIcon, SparklesIcon } from "./Icons";
import { api } from "../services/api";
import type { DashboardStats } from "../types";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../features/journey/api/journeyApi";
import type { AppNotification } from "../features/journey/types";
import { openJourneyTasksPanel } from "./journeyTasksPanelEvents";

export interface NotificationCenterProps {
  variant?: "dark" | "light";
}

export function NotificationCenter({
  variant = "dark",
}: NotificationCenterProps) {
  const { t, number, locale, date } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [emailReminders, setEmailReminders] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("nawah_email_reminders") !== "false";
  });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [unreadFeedback, setUnreadFeedback] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: notificationsData } = useNotifications(30);
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  // Load companion stats once
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

  const persistentItems = notificationsData?.items ?? [];
  const persistentUnreadCount = notificationsData?.unreadCount ?? 0;

  const expiringSoon = stats?.expiringSoonCount ?? 0;
  const recentNoResponse = stats?.recentNoResponseCount ?? 0;
  const staleApplicationsCount = stats?.closed?.noResponse ?? 0;
  const companionAlertsCount =
    (unreadFeedback > 0 ? 1 : 0) +
    (expiringSoon > 0 ? 1 : 0) +
    (recentNoResponse > 0 ? 1 : 0) +
    (staleApplicationsCount > 0 && recentNoResponse === 0 && expiringSoon === 0
      ? 1
      : 0);

  const totalUnread = persistentUnreadCount + companionAlertsCount;

  const handleNotificationClick = (item: AppNotification) => {
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
    setOpen(false);
    if (item.actionUrl) {
      const actionPath = new URL(item.actionUrl, window.location.origin).pathname;
      if (actionPath.replace(/\/$/, "") === "/professional-development") {
        openJourneyTasksPanel();
        return;
      }
      navigate(item.actionUrl);
    }
  };

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
        {totalUnread > 0 && (
          <span className="absolute -top-1 -end-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-danger-strong px-1 text-[10px] font-bold text-white shadow-xs">
            {number(totalUnread)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute start-0 max-lg:start-auto max-lg:end-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-surface p-4 shadow-xl z-50 text-text-primary">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <BellIcon className="h-4 w-4 text-info-strong" />
              <span>{t("dashboard.notificationsTitle")}</span>
            </h3>
            <div className="flex items-center gap-2">
              {persistentUnreadCount > 0 && (
                <button
                  type="button"
                  disabled={markAllReadMutation.isPending}
                  onClick={() => markAllReadMutation.mutate()}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-info-strong transition-colors hover:bg-info-soft"
                >
                  <CheckIcon className="h-3 w-3" />
                  <span>{t("journey.markAllRead")}</span>
                </button>
              )}
              {totalUnread > 0 && (
                <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-semibold text-info-strong">
                  {number(totalUnread)}
                </span>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto py-2 divide-y divide-border/60">
            {/* Persistent V2 Journey & System Notifications */}
            {persistentItems.map((item) => {
              const title = locale === "ar" ? item.titleAr : item.titleEn;
              const body = locale === "ar" ? item.bodyAr : item.bodyEn;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNotificationClick(item)}
                  className={`flex w-full items-start gap-3 p-2.5 rounded-xl text-start transition hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${
                    !item.isRead
                      ? "bg-info-soft/20 dark:bg-blue-950/20"
                      : "opacity-80"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      item.type.includes("UNLOCK") ||
                      item.type.includes("COMPLETED")
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                        : "bg-info-soft text-info-strong"
                    }`}
                  >
                    <SparklesIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-text-primary">
                        {title}
                      </p>
                      {!item.isRead && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-info-strong"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-4 text-text-secondary">
                      {body}
                    </p>
                    <time
                      dateTime={item.createdAt}
                      className="mt-1 block text-[10px] text-neutral-400"
                    >
                      {date(item.createdAt, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </time>
                  </div>
                </button>
              );
            })}

            {/* Companion Alerts */}
            {unreadFeedback > 0 && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openJourneyTasksPanel();
                }}
                className="flex w-full items-start gap-3 rounded-xl p-2.5 text-start transition hover:bg-neutral-50"
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
              </button>
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

            {staleApplicationsCount > 0 &&
              recentNoResponse === 0 &&
              expiringSoon === 0 && (
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

            {persistentItems.length === 0 && companionAlertsCount === 0 && (
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
