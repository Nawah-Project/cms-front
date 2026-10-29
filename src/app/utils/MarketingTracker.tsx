import { useEffect } from "react";
import { useLocation } from "react-router";
import { API_BASE_URL } from "../lib/api-client";
import { useAuth } from "../features/auth/store/authStore";
import { marketingSession } from "./marketingSession";

type MarketingType = "PAGE_VIEW" | "PULSE" | "SIGNUP_COMPLETED" | "ONBOARDING_COMPLETED";
const VISITOR_KEY = "nawah.marketing.visitor.v1";
let lastNavigation = "";
let entryUrl = typeof window === "undefined" ? null : new URL(window.location.href);

function deviceType() {
  const width = Math.min(window.innerWidth, window.screen?.width || window.innerWidth);
  const touch = navigator.maxTouchPoints > 0;
  return touch && width <= 767 ? "mobile" : touch && width <= 1180 ? "tablet" : "desktop";
}

export function trackMarketingEvent(type: MarketingType) {
  if (typeof window === "undefined" || location.pathname.startsWith("/admin")) return;
  const pageUrl = new URL(location.href);
  const acquisitionUrl = entryUrl ?? pageUrl;
  const referrer = document.referrer;
  entryUrl = null;
  const send = async () => {
    try {
      let visitorId = localStorage.getItem(VISITOR_KEY);
      if (!visitorId) { visitorId = crypto.randomUUID(); localStorage.setItem(VISITOR_KEY, visitorId); }
      const { session, isNew } = marketingSession(localStorage, acquisitionUrl, referrer, Date.now(), () => crypto.randomUUID());
      const base = { visitorId, sessionId: session.id, path: pageUrl.pathname.slice(0, 300), deviceType: deviceType(), ...session.attribution };
      const post = (eventType: string, conversion = false) => fetch(`${API_BASE_URL}/marketing/${conversion ? 'conversions' : 'events'}`, {
        method: "POST", credentials: "include", keepalive: true,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...base, type: eventType }),
      }).catch(() => undefined);
      if (isNew) await post("SESSION_START");
      await post(type, type === "SIGNUP_COMPLETED" || type === "ONBOARDING_COMPLETED");
    } catch { /* Tracking must not break navigation when browser storage is blocked. */ }
  };
  if (navigator.locks?.request) void navigator.locks.request("nawah-marketing", send).catch(() => undefined);
  else void send();
}

export function trackMarketingConversion(type: "SIGNUP_COMPLETED" | "ONBOARDING_COMPLETED") {
  trackMarketingEvent(type);
}

export function MarketingTracker() {
  const { pathname, search } = useLocation();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading || user?.role === "ADMIN" || pathname.startsWith("/admin")) return;
    const navigation = `${pathname}${search}`;
    if (lastNavigation !== navigation) { lastNavigation = navigation; trackMarketingEvent("PAGE_VIEW"); }
  }, [pathname, search, loading, user?.role]);
  useEffect(() => {
    if (user && user.role !== "ADMIN") trackMarketingConversion("SIGNUP_COMPLETED");
  }, [user?.id]);
  useEffect(() => {
    if (loading || user?.role === "ADMIN" || pathname.startsWith("/admin")) return;
    let lastActivity = Date.now();
    let lastPulse = 0;
    const activity = () => { lastActivity = Date.now(); };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach(event => window.addEventListener(event, activity, { passive: true }));
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && lastActivity > lastPulse) {
        lastPulse = Date.now(); trackMarketingEvent("PULSE");
      }
    }, 60_000);
    return () => { clearInterval(timer); events.forEach(event => window.removeEventListener(event, activity)); };
  }, [pathname, loading, user?.role]);
  return null;
}
