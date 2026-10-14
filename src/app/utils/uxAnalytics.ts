import { useState, useEffect } from "react";

export type SupportedBackendUxEvent =
  | "onboarding_started"
  | "onboarding_video_watched"
  | "onboarding_completed"
  | "application_created"
  | "application_stage_updated"
  | "task_status_changed"
  | "feedback_read";

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
  variant?: "A" | "B";
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

const STORAGE_KEY = "nawah_ux_telemetry";
const EXPERIMENT_KEY = "nawah_exp_dashboard_layout_v2";

const BASE_URL = (
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
]);

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

export function getActiveVariant(): "A" | "B" {
  if (typeof window === "undefined") return "B";
  try {
    const saved = localStorage.getItem(EXPERIMENT_KEY);
    if (saved === "A" || saved === "B") return saved;
    localStorage.setItem(EXPERIMENT_KEY, "B");
    return "B";
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

  // 1. Local fallback storage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: UxEventRecord[] = raw ? JSON.parse(raw) : [];
    list.push(localRecord);
    if (list.length > 100) list.shift();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage errors
  }

  // 2. Send strictly whitelisted DTO to Backend POST /ux-analytics/events
  if (!normalizedName) return;

  try {
    void fetch(`${BASE_URL}/ux-analytics/events`, {
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
    }).catch(() => {
      // Silently ignore network errors for telemetry
    });
  } catch {
    // Silently ignore
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

export function useUxExperiment(experimentId: "dashboard_layout_v2") {
  const key = `nawah_exp_${experimentId}`;
  const [variant, setVariantState] = useState<"A" | "B">(() => getActiveVariant());

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && (e.newValue === "A" || e.newValue === "B")) {
        setVariantState(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key]);

  const setVariant = (val: "A" | "B") => {
    setVariantState(val);
    try {
      localStorage.setItem(key, val);
    } catch {
      // Ignore
    }
  };

  const toggleVariant = () => {
    const next = variant === "A" ? "B" : "A";
    setVariant(next);
  };

  return { variant, setVariant, toggleVariant };
}
