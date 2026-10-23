import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ListChecks, X } from "lucide-react";
import { useI18n } from "../i18n";
import { useAuth } from "../features/auth/store/authStore";
import { useJourneyState } from "../features/journey/api/journeyApi";
import { JourneyQuestsMap } from "../features/journey/components/JourneyQuestsMap";
import { OPEN_JOURNEY_TASKS_PANEL_EVENT } from "./journeyTasksPanelEvents";

export function JourneyTasksPanel() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { data: journeyData } = useJourneyState();
  const [open, setOpen] = useState(false);
  const [hasUnseenUpdate, setHasUnseenUpdate] = useState(false);
  const [coachmarkSeen, setCoachmarkSeen] = useState<boolean>(() => {
    try {
      return localStorage.getItem("nawah_journey_coachmark_seen") === "true";
    } catch {
      return false;
    }
  });

  const dismissCoachmark = () => {
    try {
      localStorage.setItem("nawah_journey_coachmark_seen", "true");
    } catch {
      // ignore
    }
    setCoachmarkSeen(true);
  };

  const storageKey = `journey_last_seen_${user?.id ?? "default"}`;

  // Unique fingerprint representing the user's quest progress (active node + completed nodes)
  const currentFingerprint = journeyData?.state
    ? `${journeyData.state.currentNodeCode}:${(journeyData.state.completedNodeCodes ?? []).slice().sort().join(",")}`
    : null;

  // Detect when a quest is unlocked, completed, or newly available
  useEffect(() => {
    if (!currentFingerprint) return;

    try {
      const lastSeen = localStorage.getItem(storageKey);
      if (!lastSeen) {
        // Initial state prompt: alert user of available quest
        setHasUnseenUpdate(true);
      } else if (lastSeen !== currentFingerprint) {
        // A new quest was unlocked or completed!
        setHasUnseenUpdate(true);
      } else {
        setHasUnseenUpdate(false);
      }
    } catch {
      // Fallback if storage access is restricted
    }
  }, [currentFingerprint, storageKey]);

  // When panel is opened, mark state as viewed and clear red dot indicator
  useEffect(() => {
    if (open && currentFingerprint) {
      try {
        localStorage.setItem(storageKey, currentFingerprint);
      } catch {
        // ignore
      }
      setHasUnseenUpdate(false);
    }
  }, [open, currentFingerprint, storageKey]);

  // Dismiss first-time coachmark when user opens panel
  useEffect(() => {
    if (open && !coachmarkSeen) {
      dismissCoachmark();
    }
  }, [open, coachmarkSeen]);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener(OPEN_JOURNEY_TASKS_PANEL_EVENT, openPanel);
    return () =>
      window.removeEventListener(OPEN_JOURNEY_TASKS_PANEL_EVENT, openPanel);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const isRtl = locale === "ar";
  // In RTL (drawer on left): closed arrow points right (>), open arrow points left (<)
  // In LTR (drawer on right): closed arrow points left (<), open arrow points right (>)
  const ClosedChevron = isRtl ? ChevronRight : ChevronLeft;
  const OpenChevron = isRtl ? ChevronLeft : ChevronRight;

  const panelWidth = "min(31rem, calc(100vw - 2.5rem))";
  const hiddenOffset =
    locale === "ar" ? "calc(-100% - 1.25rem)" : "calc(100% + 1.25rem)";

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label={t("common.close")}
          onClick={() => setOpen(false)}
          className="fixed inset-y-0 end-0 start-0 z-50 cursor-default bg-neutral-950/30 lg:start-64"
        />
      )}

      {/* The sliding panel container with attached mechanical handle */}
      <aside
        id="journey-tasks-panel"
        style={{
          width: panelWidth,
          height: "min(50rem, calc(100dvh - 2rem))",
          transform: open ? "translateX(0)" : `translateX(${hiddenOffset})`,
        }}
        className="fixed end-5 top-1/2 z-[60] -translate-y-1/2 transition-transform duration-300 ease-out pointer-events-none"
      >
        {/* Inner Panel Drawer */}
        <div
          id="journey-tasks-drawer"
          aria-label={t("journey.panelTitle")}
          aria-hidden={!open}
          inert={!open}
          className={`flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-border bg-surface transition-shadow duration-300 ${
            open ? "pointer-events-auto shadow-2xl" : "pointer-events-none shadow-none"
          }`}
        >
          <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
                <ListChecks className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-neutral-950 dark:text-neutral-100">
                  {t("journey.panelTitle")}
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {t("journey.panelSubtitle")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("common.close")}
              aria-controls="journey-tasks-drawer"
              aria-expanded={true}
              className="rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <JourneyQuestsMap compact />
          </div>
        </div>

        {/* Unified Sliding Handle Button (100% mechanical lockstep with drawer movement) */}
        <button
          type="button"
          aria-controls="journey-tasks-drawer"
          aria-expanded={open}
          aria-label={open ? t("journey.closePanel") : t("journey.panelTitle")}
          onClick={() => setOpen((prev) => !prev)}
          style={{
            [isRtl ? "left" : "right"]: "calc(100% - 1px)",
          }}
          className={`pointer-events-auto absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center bg-surface border-border text-neutral-800 shadow-md transition-colors duration-150 hover:bg-neutral-50 hover:text-neutral-950 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-info-strong ${
            open
              ? "h-11 w-8 px-1"
              : "h-11 px-2.5"
          } ${
            isRtl
              ? "rounded-r-xl rounded-l-none border-y border-r border-l-0"
              : "rounded-l-xl rounded-r-none border-y border-l border-r-0"
          }`}
        >
          {/* Notification Red Dot (pulses when new quest unlocks or completes, dismisses on open) */}
          {hasUnseenUpdate && !open && (
            <span
              className="absolute flex h-2.5 w-2.5 pointer-events-none"
              style={{
                top: "-4px",
                [isRtl ? "right" : "left"]: "-4px",
              }}
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600 shadow-xs ring-2 ring-white dark:ring-neutral-900" />
            </span>
          )}

          {open ? (
            <OpenChevron className="h-4 w-4 shrink-0 text-neutral-600 dark:text-neutral-300" aria-hidden="true" />
          ) : (
            <div
              className="flex items-center gap-1.5"
              style={{ direction: isRtl ? "ltr" : "rtl" }}
            >
              <ListChecks
                className="h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-200"
                aria-hidden="true"
              />
              <ClosedChevron
                className="h-3.5 w-3.5 shrink-0 text-neutral-500 dark:text-neutral-400"
                aria-hidden="true"
              />
            </div>
          )}
        </button>

        {/* First-time coachmark pointer targeting the journey quest handle */}
        {!open && !coachmarkSeen && (
          <div
            role="tooltip"
            onClick={() => {
              dismissCoachmark();
              setOpen(true);
            }}
            style={{
              [isRtl ? "left" : "right"]: "calc(100% + 46px)",
            }}
            className="pointer-events-auto absolute top-1/2 -translate-y-1/2 z-20 flex cursor-pointer items-center gap-2.5 rounded-xl border border-neutral-700 bg-neutral-900/95 px-3.5 py-2 text-xs font-medium text-white shadow-xl backdrop-blur-xs transition hover:bg-neutral-900"
          >
            {isRtl ? (
              <ChevronLeft className="h-4 w-4 shrink-0 text-amber-400 animate-pulse" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-amber-400 animate-pulse" aria-hidden="true" />
            )}
            <span className="whitespace-nowrap">{t("journey.startTourQuestHandlePrompt")}</span>
            <button
              type="button"
              aria-label={t("common.close")}
              onClick={(e) => {
                e.stopPropagation();
                dismissCoachmark();
              }}
              className="ms-1 rounded-md p-0.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
            {/* Arrow tail pointing toward the handle */}
            <span
              aria-hidden="true"
              className={`absolute top-1/2 -translate-y-1/2 h-2 w-2 rotate-45 border-neutral-700 bg-neutral-900 ${
                isRtl ? "-left-1 border-b border-l" : "-right-1 border-t border-r"
              }`}
            />
          </div>
        )}
      </aside>
    </>
  );
}
