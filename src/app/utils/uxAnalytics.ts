import { useState, useEffect } from "react";

export type UxEventName =
  | "onboarding_step_viewed"
  | "onboarding_video_opened"
  | "onboarding_completed"
  | "companion_cta_clicked"
  | "application_created"
  | "application_stage_changed"
  | "task_status_updated"
  | "feedback_opened";

export interface UxEventRecord {
  event: UxEventName;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

const STORAGE_KEY = "nawah_ux_telemetry";

export function trackUxEvent(
  eventName: UxEventName,
  metadata?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: UxEventRecord[] = raw ? JSON.parse(raw) : [];
    list.push({
      event: eventName,
      timestamp: new Date().toISOString(),
      metadata,
    });
    // Keep last 100 events for storage optimization
    if (list.length > 100) list.shift();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Fallback for private browsing storage restrictions
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
