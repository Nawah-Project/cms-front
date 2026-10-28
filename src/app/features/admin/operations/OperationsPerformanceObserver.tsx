import { useEffect } from "react";
import { API_BASE_URL } from "../../../lib/api-client";
import { useAuth } from "../../auth/store/authStore";
// Account-bound transport; only numeric durations enter aggregate storage. No URLs, forms or file contents.
export function OperationsPerformanceObserver() {
  const { user } = useAuth();
  useEffect(() => {
    if (user?.role !== "USER" || !("PerformanceObserver" in window)) return;
    const base = new URL(API_BASE_URL, location.origin);
    let alive = true,
      busy = false;
    let pending: number[] = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        if (
          !alive ||
          document.visibilityState !== "visible" ||
          !["fetch", "xmlhttprequest"].includes(entry.initiatorType)
        )
          continue;
        try {
          const url = new URL(entry.name);
          if (
            url.origin !== base.origin ||
            !url.pathname.startsWith(base.pathname)
          )
            continue;
          const path = url.pathname;
          if (
            /\/(?:admin|auth|operations)(?:\/|$)/.test(path) ||
            /\/cv(?:\/|$)/.test(path) ||
            path.includes("/ux-lab/events")
          )
            continue;
          if (
            Number.isFinite(entry.duration) &&
            entry.duration > 0 &&
            entry.duration <= 120000 &&
            pending.length < 20
          )
            pending.push(Math.round(entry.duration));
        } catch {}
      }
    });
    observer.observe({ type: "resource", buffered: false });
    const flush = async () => {
      if (
        !alive ||
        busy ||
        !pending.length ||
        document.visibilityState !== "visible"
      )
        return;
      const timingsMs = pending;
      pending = [];
      busy = true;
      try {
        await fetch(API_BASE_URL + "/operations/browser-timings", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: user.id, timingsMs }),
          keepalive: true,
        });
      } catch {
      } finally {
        busy = false;
      }
    };
    const timer = setInterval(() => void flush(), 15000);
    return () => {
      alive = false;
      observer.disconnect();
      clearInterval(timer);
      pending = [];
    };
  }, [user?.id, user?.role]);
  return null;
}
