import { useState, useEffect } from "react";

export type UxEventName =
  | "onboarding_started"
  | "onboarding_video_watched"
  | "onboarding_completed"
  | "onboarding_step_viewed"
  | "onboarding_video_opened"
  | "companion_cta_clicked"
  | "application_created"
  | "application_stage_updated"
  | "application_stage_changed"
  | "task_status_changed"
  | "task_status_updated"
  | "feedback_read"
  | "feedback_opened";

export interface UxEventRecord {
  event: UxEventName | string;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

const STORAGE_KEY = "nawah_ux_telemetry";

export function trackUxEvent(
  eventName: UxEventName | string,
  metadata?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;

  const payload: UxEventRecord = {
    event: eventName,
    timestamp: new Date().toISOString(),
    metadata,
  };

  // 1. Local backup storage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: UxEventRecord[] = raw ? JSON.parse(raw) : [];
    list.push(payload);
    if (list.length > 100) list.shift();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota or private mode issues
  }

  // 2. Asynchronous backend delivery to POST /ux-analytics/events
  try {
    const apiBase =
      typeof window !== "undefined" && (window as any).__API_BASE__
        ? (window as any).__API_BASE__
        : "";
    void fetch(`${apiBase}/ux-analytics/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    }).catch(() => {
      // Backend route might be unavailable or offline; swallow silently
    });
  } catch {
    // Silently continue
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
  const [variant, setVariantState] = useState<"A" | "B">(() => {
    if (typeof window === "undefined") return "B";
    const saved = localStorage.getItem(key);
    return saved === "A" || saved === "B" ? saved : "B"; // Default to Variant B
  });

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
    localStorage.setItem(key, val);
  };

  const toggleVariant = () => {
    const next = variant === "A" ? "B" : "A";
    setVariant(next);
  };

  return { variant, setVariant, toggleVariant };
}
