import { useState, useEffect, useCallback } from "react";

export type ExperimentVariant = "A" | "B" | "C";

export type SupportedBackendUxEvent =
  | "onboarding_started"
  | "onboarding_video_watched"
  | "onboarding_completed"
  | "application_created"
  | "application_stage_updated"
  | "task_status_changed"
  | "feedback_read"
  | "tour_completed"
  | "job_explorer_clicked"
  | "prompt_copied";

export type UxEventName =
  | SupportedBackendUxEvent
  | "onboarding_step_viewed"
  | "onboarding_video_opened"
  | "companion_cta_clicked"
  | "application_stage_changed"
  | "task_status_updated"
  | "feedback_opened";

export interface UxEventRecord {
  name: string;
  variant?: ExperimentVariant;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

const STORAGE_KEY = "nawah_ux_telemetry";
const ASSIGNED_VARIANT_KEY = "nawah_assigned_variant";
const ADMIN_PREVIEW_VARIANT_KEY = "nawah_admin_preview_variant";
const INTRO_VIDEO_CACHE_KEY = "nawah_intro_video_url";
const VARIANT_CHANGE_EVENT = "nawah:ux-variant-changed";

export const UX_API_BASE_URL = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "http://localhost:3000"
).replace(/\/$/, "");

const SUPPORTED_BACKEND_EVENTS = new Set<SupportedBackendUxEvent>([
  "onboarding_started",
  "onboarding_video_watched",
  "onboarding_completed",
  "application_created",
  "application_stage_updated",
  "task_status_changed",
  "feedback_read",
  "tour_completed",
  "job_explorer_clicked",
  "prompt_copied",
]);

export function isValidVariant(value: unknown): value is ExperimentVariant {
  return value === "A" || value === "B" || value === "C";
}

function normalizeEventName(eventName: string): SupportedBackendUxEvent | null {
  switch (eventName) {
    case "onboarding_video_opened":
      return "onboarding_video_watched";
    case "application_stage_changed":
      return "application_stage_updated";
    case "task_status_updated":
      return "task_status_changed";
    case "feedback_opened":
      return "feedback_read";
    default:
      return SUPPORTED_BACKEND_EVENTS.has(eventName as SupportedBackendUxEvent)
        ? (eventName as SupportedBackendUxEvent)
        : null;
  }
}

export function getAdminPreviewVariant(): ExperimentVariant | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(ADMIN_PREVIEW_VARIANT_KEY);
    return isValidVariant(value) ? value : null;
  } catch {
    return null;
  }
}

export function setAdminPreviewVariant(value: ExperimentVariant | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) {
      localStorage.removeItem(ADMIN_PREVIEW_VARIANT_KEY);
    } else {
      localStorage.setItem(ADMIN_PREVIEW_VARIANT_KEY, value);
    }
    window.dispatchEvent(new Event(VARIANT_CHANGE_EVENT));
  } catch {
    // Ignore storage errors.
  }
}

export function getActiveVariant(): ExperimentVariant {
  if (typeof window === "undefined") return "B";
  const preview = getAdminPreviewVariant();
  if (preview) return preview;
  try {
    const saved = localStorage.getItem(ASSIGNED_VARIANT_KEY);
    return isValidVariant(saved) ? saved : "B";
  } catch {
    return "B";
  }
}

export function trackUxEvent(
  eventName: UxEventName | string,
  metadata?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;

  const variant = getActiveVariant();
  const normalizedName = normalizeEventName(eventName);
  const localRecord: UxEventRecord = {
    name: normalizedName ?? eventName,
    variant,
    timestamp: new Date().toISOString(),
    metadata,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const events: UxEventRecord[] = raw ? JSON.parse(raw) : [];
    events.push(localRecord);
    if (events.length > 100) events.shift();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Ignore storage errors.
  }

  if (!normalizedName) return;
  try {
    void fetch(`${UX_API_BASE_URL}/ux-analytics/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        name: normalizedName,
        variant,
        ...(metadata ? { metadata } : {}),
      }),
    }).catch(() => {});
  } catch {
    // Ignore telemetry errors.
  }
}

export function getUxEvents(): UxEventRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useUxExperiment(_experimentId = "dashboard_layout_v2") {
  const [variant, setVariantState] = useState<ExperimentVariant>(() =>
    getActiveVariant(),
  );
  const [adminPreview, setAdminPreviewState] =
    useState<ExperimentVariant | null>(() => getAdminPreviewVariant());
  const [introVideoUrl, setIntroVideoUrlState] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return (
        localStorage.getItem(INTRO_VIDEO_CACHE_KEY) ||
        import.meta.env.VITE_INTRO_VIDEO_URL ||
        ""
      );
    } catch {
      return "";
    }
  });

  const syncFromServer = useCallback(async () => {
    if (typeof window === "undefined") return;
    let assignmentLoaded = false;

    try {
      const response = await fetch(
        `${UX_API_BASE_URL}/ux-analytics/my-assignment`,
        {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );
      if (response.ok) {
        const data = await response.json();
        if (isValidVariant(data.assignedVariant)) {
          localStorage.setItem(ASSIGNED_VARIANT_KEY, data.assignedVariant);
        }
        if (typeof data.introVideoUrl === "string") {
          localStorage.setItem(INTRO_VIDEO_CACHE_KEY, data.introVideoUrl);
          setIntroVideoUrlState(data.introVideoUrl);
        }
        assignmentLoaded = true;
      }
    } catch {
      // Try the public config below for unauthenticated screens.
    }

    if (!assignmentLoaded) {
      try {
        const response = await fetch(`${UX_API_BASE_URL}/ux-analytics/config`, {
          headers: { Accept: "application/json" },
        });
        if (response.ok) {
          const data = await response.json();
          if (isValidVariant(data.defaultVariant)) {
            localStorage.setItem(ASSIGNED_VARIANT_KEY, data.defaultVariant);
          }
          if (typeof data.introVideoUrl === "string") {
            localStorage.setItem(INTRO_VIDEO_CACHE_KEY, data.introVideoUrl);
            setIntroVideoUrlState(data.introVideoUrl);
          }
        }
      } catch {
        // Keep cached values if the API is unavailable.
      }
    }

    setVariantState(getActiveVariant());
  }, []);

  useEffect(() => {
    void syncFromServer();
    const handleUpdate = () => {
      setAdminPreviewState(getAdminPreviewVariant());
      setVariantState(getActiveVariant());
      try {
        setIntroVideoUrlState(localStorage.getItem(INTRO_VIDEO_CACHE_KEY) || "");
      } catch {
        // Ignore storage errors.
      }
    };
    window.addEventListener(VARIANT_CHANGE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(VARIANT_CHANGE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [syncFromServer]);

  const setVariant = (value: ExperimentVariant | null) => {
    setAdminPreviewVariant(value);
    setAdminPreviewState(value);
    setVariantState(getActiveVariant());
  };

  return {
    variant,
    adminPreview,
    setVariant,
    introVideoUrl,
    refreshAssignment: syncFromServer,
  };
}
