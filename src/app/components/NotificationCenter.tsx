import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router";
import { useI18n } from "../i18n";
import { BellIcon, CheckIcon, ClockIcon, SparklesIcon } from "./Icons";
import { api } from "../services/api";
import type { DashboardStats } from "../types";
import {
  useJourneyState,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../features/journey/api/journeyApi";
import { useAuth } from "../features/auth/store/authStore";
import type {
  AppNotification,
} from "../features/journey/types";
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [unreadFeedback, setUnreadFeedback] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const pendingReadIds = useRef(new Set<string>());
  const timerMap = useRef(new Map<string, NodeJS.Timeout>());

  const [readError,setReadError]=useState(false);
  const { data: notificationsData, isError: notificationsError, isPending: notificationsLoading, refetch: retryNotifications } = useNotifications(30);
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
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
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

  const { user } = useAuth();
  const { data: journeyData } = useJourneyState({ enabled: Boolean(user) });
  const currentWeek = journeyData?.state.currentWeek ?? 0;

  const persistentItems = notificationsData?.items ?? [];
  const persistentUnreadCount = notificationsData?.unreadCount ?? 0;

  // Viewport Auto-Read via IntersectionObserver (65% visibility, 350ms dwell)
  useEffect(() => {
    if (!open || readError) return;
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).getAttribute(
            "data-notification-id",
          );
          if (!id) return;

          if (entry.isIntersecting) {
            if (pendingReadIds.current.has(id)) return;
            if (!timerMap.current.has(id)) {
              const timer = setTimeout(() => {
                timerMap.current.delete(id);
                if (pendingReadIds.current.has(id)) return;
                pendingReadIds.current.add(id);

                // Update unread state only after the API confirms persistence.
                markReadMutation.mutate(id,{onError:()=>{pendingReadIds.current.delete(id);setReadError(true);}});
              }, 350);
              timerMap.current.set(id, timer);
            }
          } else {
            // Scrolled out of view before 350ms dwell
            const existingTimer = timerMap.current.get(id);
            if (existingTimer) {
              clearTimeout(existingTimer);
              timerMap.current.delete(id);
            }
          }
        });
      },
      {
        root: scrollContainer,
        threshold: 0.65,
      },
    );

    const unreadNodes = scrollContainer.querySelectorAll(
      '[data-notification-id][data-unread="true"]',
    );
    unreadNodes.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
      timerMap.current.forEach((t) => clearTimeout(t));
      timerMap.current.clear();
    };
  }, [open, persistentItems, markReadMutation, readError]);

  const expiringSoon = stats?.expiringSoonCount ?? 0;
  const recentNoResponse = stats?.recentNoResponseCount ?? 0;
  const staleApplicationsCount = stats?.closed?.noResponse ?? 0;
  const companionAlertsCount =
    (unreadFeedback > 0 && currentWeek >= 3 ? 1 : 0) +
    (expiringSoon > 0 ? 1 : 0) +
    (recentNoResponse > 0 ? 1 : 0) +
    (staleApplicationsCount > 0 && recentNoResponse === 0 && expiringSoon === 0
      ? 1
      : 0);

  // Render the menu outside the sidebar/header stacking and overflow contexts.
  useEffect(() => {
    if (!open) {
      setPopoverPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const dropdown = dropdownRef.current;
      if (!trigger || !dropdown) return;

      const triggerRect = trigger.getBoundingClientRect();
      const viewportPadding = 12;
      const gap = 8;
      const dropdownRect = dropdown.getBoundingClientRect();
      const dropdownHeight = Math.min(
        dropdownRect.height,
        window.innerHeight - viewportPadding * 2,
      );
      const spaceBelow =
        window.innerHeight - triggerRect.bottom - gap - viewportPadding;
      const spaceAbove = triggerRect.top - gap - viewportPadding;
      const placeBelow =
        spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove;
      const top = placeBelow
        ? Math.min(
            triggerRect.bottom + gap,
            window.innerHeight - viewportPadding - dropdownHeight,
          )
        : Math.max(
            viewportPadding,
            triggerRect.top - gap - dropdownHeight,
          );
      const width = Math.min(
        window.innerWidth < 640 ? 320 : 384,
        window.innerWidth - viewportPadding * 2,
      );
      const left = Math.min(
        Math.max(viewportPadding, triggerRect.right - width),
        window.innerWidth - viewportPadding - width,
      );

      setPopoverPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [
    open,
    persistentItems.length,
    companionAlertsCount,
    notificationsLoading,
    readError,
  ]);

  const handleNotificationClick = (item: AppNotification) => {
    if (!item.isRead && !pendingReadIds.current.has(item.id)) {
      pendingReadIds.current.add(item.id);
      markReadMutation.mutate(item.id,{onError:()=>{pendingReadIds.current.delete(item.id);setReadError(true);}});
    }
    setOpen(false);

    // 1. Quests & Journey Tasks -> Open sliding tasks panel immediately
    if (
      item.type === "QUEST_UNLOCKED" ||
      item.actionUrl === "/journey/tasks" ||
      item.actionUrl === "/tasks"
    ) {
      openJourneyTasksPanel();
      return;
    }

    // 2. Career Insights & Advanced Interview Prep -> Navigate to guidance tab
    if (
      item.type === "INSIGHT_UNLOCKED" ||
      item.type === "INTERVIEW_PREP"
    ) {
      navigate(item.actionUrl || "/professional-development");
      return;
    }

    // 3. Professional Development Unlocked
    if (
      item.type === "PROFESSIONAL_DEVELOPMENT_UNLOCKED" ||
      item.actionUrl === "/professional-development"
    ) {
      navigate("/professional-development");
      return;
    }

    // 4. Cohort Group Progress
    if (item.type === "GROUP_ACTIVITY") {
      navigate("/members-progress");
      return;
    }

    // 5. Default URL routing
    if (item.actionUrl) {
      navigate(item.actionUrl);
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);triggerRef.current?.focus();}}}>
      <button
        ref={triggerRef}
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
        {persistentUnreadCount > 0 && (
          <span className="absolute -top-1 -end-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-danger-strong px-1 text-[10px] font-bold text-white shadow-xs">
            {number(persistentUnreadCount)}
          </span>
        )}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[90] flex max-h-[calc(100dvh-1.5rem)] w-80 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface p-4 text-text-primary shadow-xl sm:w-96"
          style={{
            top: popoverPosition?.top ?? 12,
            left: popoverPosition?.left ?? 12,
            visibility: popoverPosition ? "visible" : "hidden",
          }}
        >
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
                  onClick={() => markAllReadMutation.mutate(undefined,{onError:()=>setReadError(true),onSuccess:()=>setReadError(false)})}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-info-strong transition-colors hover:bg-info-soft"
                >
                  <CheckIcon className="h-3 w-3" />
                  <span>{t("journey.markAllRead")}</span>
                </button>
              )}
              {persistentUnreadCount > 0 && (
                <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-semibold text-info-strong">
                  {number(persistentUnreadCount)}
                </span>
              )}
            </div>
          </div>

          <div
            ref={scrollContainerRef}
            className="min-h-0 max-h-[min(20rem,calc(100dvh-12rem))] flex-1 overflow-y-auto py-2 divide-y divide-border/60"
          >
            {(readError || notificationsError) && <div role="alert" className="p-3 text-xs"><p>{locale==='ar'?'تعذر تحديث الإشعارات؛ القراءة لسه مش مؤكدة.':'Notifications could not update; reading is not confirmed.'}</p><button className="button-secondary mt-2" onClick={()=>{setReadError(false);void retryNotifications();}}>{t('common.retry')}</button></div>}
            {notificationsLoading && <p role="status">{t('common.loading')}</p>}
            {/* Persistent V2 Journey & System Notifications */}
            {persistentItems.map((item) => {
              const title = locale === "ar" ? item.titleAr : item.titleEn;
              const body = locale === "ar" ? item.bodyAr : item.bodyEn;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-notification-id={item.id}
                  data-unread={!item.isRead ? "true" : "false"}
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
            {unreadFeedback > 0 && currentWeek >= 3 && (
              <Link
                to="/professional-development/feedback"
                onClick={() => setOpen(false)}
                className="flex w-full items-start gap-3 rounded-xl p-2.5 text-start transition hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
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
                    {locale === "ar" ? "الملاحظات" : "Feedback"}
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

          <p className="mt-2 border-t border-border pt-3 text-xs text-text-muted">{locale === 'ar' ? 'إرسال البريد حسب إعدادات المنصة؛ التحكم الفردي في التذكيرات مش متاح حاليًا.' : 'Email follows platform settings; individual reminder preferences are not available yet.'}</p>
        </div>,
        document.body,
      )}
    </div>
  );
}
