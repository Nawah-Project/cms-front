import { useEffect } from "react";
import { useLocation } from "react-router";
import { API_BASE_URL } from "../lib/api-client";

type MarketingType =
  | "SESSION_START"
  | "PAGE_VIEW"
  | "SIGNUP_COMPLETED"
  | "ONBOARDING_COMPLETED";

const VISITOR_KEY = "nawah.marketing.visitor.v1";
const SESSION_KEY = "nawah.marketing.session.v1";
const SESSION_SENT_KEY = "nawah.marketing.session.sent.v1";
const ATTRIBUTION_KEY = "nawah.marketing.attribution.v1";

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (
      Number(c) ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))
    ).toString(16),
  );
}

function stableId(storage: Storage, key: string) {
  const current = storage.getItem(key);
  if (current) return current;
  const next = uuid();
  storage.setItem(key, next);
  return next;
}

function attribution() {
  const saved = localStorage.getItem(ATTRIBUTION_KEY);
  if (saved) {
    try {
      return JSON.parse(saved) as Record<string, string>;
    } catch {
      localStorage.removeItem(ATTRIBUTION_KEY);
    }
  }
  const query = new URLSearchParams(location.search);
  let referrerHost = "";
  try {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    if (referrer && referrer.host !== location.host) referrerHost = referrer.host;
  } catch {
    // Ignore malformed browser referrers.
  }
  const value = {
    utmSource: query.get("utm_source")?.slice(0, 120) ?? "",
    utmMedium: query.get("utm_medium")?.slice(0, 120) ?? "",
    utmCampaign: query.get("utm_campaign")?.slice(0, 160) ?? "",
    utmContent: query.get("utm_content")?.slice(0, 160) ?? "",
    referrerHost,
  };
  if (Object.values(value).some(Boolean))
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(value));
  return value;
}

function deviceType() {
  const width = Math.min(
    window.innerWidth,
    window.screen?.width || window.innerWidth,
  );
  const touch = navigator.maxTouchPoints > 0;
  if (touch && width <= 767) return "mobile";
  if (touch && width <= 1180) return "tablet";
  return "desktop";
}

export function trackMarketingEvent(type: MarketingType) {
  if (typeof window === "undefined" || location.pathname.startsWith("/admin"))
    return;
  try {
    const payload = {
      visitorId: stableId(localStorage, VISITOR_KEY),
      sessionId: stableId(sessionStorage, SESSION_KEY),
      type,
      path: location.pathname,
      deviceType: deviceType(),
      ...attribution(),
    };
    void fetch(`${API_BASE_URL}/marketing/events`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    }).catch(() => undefined);
  } catch {
    // Analytics must never block navigation or account actions.
  }
}

export function trackMarketingConversion(
  type: "SIGNUP_COMPLETED" | "ONBOARDING_COMPLETED",
) {
  trackMarketingEvent(type);
}

export function MarketingTracker() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    if (sessionStorage.getItem(SESSION_SENT_KEY) !== "true") {
      sessionStorage.setItem(SESSION_SENT_KEY, "true");
      trackMarketingEvent("SESSION_START");
    }
    const pageKey = `nawah.marketing.page:${pathname}${search}`;
    if (sessionStorage.getItem(pageKey) === "true") return;
    sessionStorage.setItem(pageKey, "true");
    trackMarketingEvent("PAGE_VIEW");
  }, [pathname, search]);
  return null;
}
