import { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import { useLocation } from "react-router";
import { ChevronLeft, ChevronRight, ListChecks, X } from "lucide-react";
import { useI18n } from "../i18n";
import { useAuth } from "../features/auth/store/authStore";
import { useJourneyState } from "../features/journey/api/journeyApi";
import { JourneyQuestsMap } from "../features/journey/components/JourneyQuestsMap";
import {
  OPEN_JOURNEY_TASKS_PANEL_EVENT,
  CLOSE_JOURNEY_TASKS_PANEL_EVENT,
} from "./journeyTasksPanelEvents";
import { CELEBRATE_MILESTONE_EVENT } from "../features/journey/lib/celebrationEvents";
import { useTour } from "../features/applications/components/FirstApplicationGuidedTour";
import {
  isGuideFinished,
  useExperienceProgress,
} from "../features/experience/ExperienceProgress";

export function JourneyTasksPanel() {
  const { t, locale } = useI18n();
  const location = useLocation();
  const { user } = useAuth();
  const { data: journeyData } = useJourneyState();
  const [open, setOpen] = useState(false);
  const [hasUnseenUpdate, setHasUnseenUpdate] = useState(false);
  const { isTourActive, isTourBlocking, step, setStep } = useTour();
  const experience = useExperienceProgress();
  const coachmarkSeen =
    !experience.ready ||
    isTourBlocking ||
    Boolean(experience.leaseOwner) ||
    isGuideFinished(experience.progress["journey-coachmark-v1"]);

  const dismissCoachmark = () => {
    experience.record("journey-coachmark-v1", "COMPLETED");
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

  // Step 2 forcing open & Step >= 3 auto-closing
  useEffect(() => {
    if (isTourActive && step === 2) {
      setOpen(true);
    } else if (isTourActive && step >= 3 && open) {
      setOpen(false);
    }
  }, [isTourActive, step, open]);

  // Route change auto-close (unless locked in tour step 2)
  useEffect(() => {
    if (open && (!isTourActive || step !== 2)) {
      setOpen(false);
    }
  }, [location.pathname, location.search]);

  // Close task window on external events (celebrations, modals, explicit close events)
  useEffect(() => {
    const handleClose = () => {
      if (!isTourActive || step !== 2) {
        setOpen(false);
      }
    };
    window.addEventListener(CLOSE_JOURNEY_TASKS_PANEL_EVENT, handleClose);
    window.addEventListener(CELEBRATE_MILESTONE_EVENT, handleClose);
    window.addEventListener("nawah_open_add_modal", handleClose);
    return () => {
      window.removeEventListener(CLOSE_JOURNEY_TASKS_PANEL_EVENT, handleClose);
      window.removeEventListener(CELEBRATE_MILESTONE_EVENT, handleClose);
      window.removeEventListener("nawah_open_add_modal", handleClose);
    };
  }, [isTourActive, step]);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener(OPEN_JOURNEY_TASKS_PANEL_EVENT, openPanel);
    return () =>
      window.removeEventListener(OPEN_JOURNEY_TASKS_PANEL_EVENT, openPanel);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!isTourActive || step !== 2) setOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, isTourActive, step]);

  if (location.pathname.startsWith("/admin")) return null;
  const isRtl = locale === "ar";
  const locked = isTourActive && step === 2;
  return (
    <>
      <div
        id="journey-tasks-panel"
        className="fixed end-0 top-1/2 z-[60] -translate-y-1/2"
      >
        <button
          type="button"
          data-tour-step="journey-drawer-handle"
          aria-controls="journey-tasks-drawer"
          aria-expanded={open}
          aria-label={t("journey.panelTitle")}
          onClick={() => {
            if (!open && isTourActive && step === 1) setStep(2);
            setOpen(true);
          }}
          className="relative flex h-11 items-center gap-1.5 rounded-s-xl border border-border bg-surface px-3 text-text-primary shadow-md focus-visible:outline-2 focus-visible:outline-info-strong"
        >
          <ListChecks size={17} />
          {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {hasUnseenUpdate && !open && (
            <span className="absolute -top-1 end-0 h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-white" />
          )}
        </button>
        {!open && !coachmarkSeen && (
          <div
            role="tooltip"
            className="absolute end-full top-1/2 me-3 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-xl bg-neutral-900 p-3 text-xs text-white shadow-xl"
          >
            <button
              onClick={() => {
                dismissCoachmark();
                setOpen(true);
              }}
            >
              {t("journey.startTourQuestHandlePrompt")}
            </button>
            <button aria-label={t("common.close")} onClick={dismissCoachmark}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>
      <Modal
        isOpen={open}
        onClose={() => {
          if (!locked) setOpen(false);
        }}
        disableClose={locked}
        closeJourneyPanelOnOpen={false}
        title={t("journey.panelTitle")}
        subtitle={t("journey.panelSubtitle")}
        size="xl"
      >
        <div id="journey-tasks-drawer" aria-hidden={false}>
          <JourneyQuestsMap compact />
        </div>
      </Modal>
    </>
  );
}
