import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import arCommon from "./locales/ar/common";
import arAuth from "./locales/ar/auth";
import arApplications from "./locales/ar/applications";
import arDashboard from "./locales/ar/dashboard";
import arMembers from "./locales/ar/members";
import arAdmin from "./locales/ar/admin";
import arProfile from "./locales/ar/profile";
import enCommon from "./locales/en/common";
import enAuth from "./locales/en/auth";
import enApplications from "./locales/en/applications";
import enDashboard from "./locales/en/dashboard";
import enMembers from "./locales/en/members";
import enAdmin from "./locales/en/admin";
import enProfile from "./locales/en/profile";

export type Locale = "ar" | "en";
export type Message = string | Partial<Record<Intl.LDMLPluralRule, string>>;
type Domain = "common" | "auth" | "applications" | "dashboard" | "members" | "admin" | "profile";
type DomainMessages = Record<string, Message>;
type Catalog = Record<Domain, DomainMessages>;

const catalogs: Record<Locale, Catalog> = {
  ar: {
    common: arCommon,
    auth: arAuth,
    applications: arApplications,
    dashboard: arDashboard,
    members: arMembers,
    admin: arAdmin,
    profile: arProfile,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    applications: enApplications,
    dashboard: enDashboard,
    members: enMembers,
    admin: enAdmin,
    profile: enProfile,
  },
};

const STORAGE_KEY = "job-tracker.locale";
const supportedLocales: Locale[] = ["ar", "en"];

function isLocale(value: string | null): value is Locale {
  return value !== null && supportedLocales.includes(value as Locale);
}

function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}

function lookup(locale: Locale, key: string): Message | undefined {
  const separator = key.indexOf(".");
  if (separator < 0) return undefined;
  const domain = key.slice(0, separator) as Domain;
  const messageKey = key.slice(separator + 1);
  return catalogs[locale][domain]?.[messageKey];
}

function interpolate(template: string, values: Record<string, string | number> = {}, locale: Locale) {
  return template.replace(/\{([\w]+)\}/g, (token, name: string) => {
    const value = values[name];
    if (value === undefined) return token;
    return typeof value === "number" ? new Intl.NumberFormat(locale).format(value) : value;
  });
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  tp: (key: string, count: number, values?: Record<string, string | number>) => string;
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  date: (value: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  relativeTime: (value: string | Date | null) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");
  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    applyDocumentLocale(nextLocale);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, nextLocale);
      } catch {
        // The current page still changes locale when storage is unavailable.
      }
    }
  }, []);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Use Arabic when browser storage is unavailable.
    }
    const initial = isLocale(saved) ? saved : "ar";
    setLocaleState(initial);
    applyDocumentLocale(initial);
  }, []);

  const t = useCallback(
    (key: string, values?: Record<string, string | number>) => {
      const message = lookup(locale, key) ?? lookup("en", key);
      if (!message) return key;
      const text = typeof message === "string" ? message : message.other;
      return text ? interpolate(text, values, locale) : key;
    },
    [locale],
  );

  const tp = useCallback(
    (key: string, count: number, values: Record<string, string | number> = {}) => {
      const message = lookup(locale, key) ?? lookup("en", key);
      if (!message) return key;
      if (typeof message === "string")
        return interpolate(message, { ...values, count }, locale);
      const plural = new Intl.PluralRules(locale).select(count);
      const text = message[plural] ?? message.other ?? message.one;
      return text ? interpolate(text, { ...values, count }, locale) : key;
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      tp,
      number: (amount, options) => new Intl.NumberFormat(locale, options).format(amount),
      date: (dateValue, options = { dateStyle: "medium" }) =>
        new Intl.DateTimeFormat(locale, options).format(new Date(dateValue)),
      relativeTime: (dateValue) => {
        if (!dateValue) return t("common.noActivity");
        const diff = new Date(dateValue).getTime() - Date.now();
        const seconds = Math.round(diff / 1000);
        const absSeconds = Math.abs(seconds);
        const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
          absSeconds < 60
            ? [seconds, "second"]
            : absSeconds < 3600
              ? [Math.round(seconds / 60), "minute"]
              : absSeconds < 86400
                ? [Math.round(seconds / 3600), "hour"]
                : absSeconds < 2_592_000
                  ? [Math.round(seconds / 86400), "day"]
                  : absSeconds < 31_536_000
                    ? [Math.round(seconds / 2_592_000), "month"]
                    : [Math.round(seconds / 31_536_000), "year"];
        return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit);
      },
    }),
    [locale, setLocale, t, tp],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
