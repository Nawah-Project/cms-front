import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../features/auth/store/authStore";
import { useLogout } from "../features/auth/hooks/useLogout";
import { useI18n } from "../i18n";
import { GlobeIcon } from "./Icons";

type NavItem = {
  labelKey: string;
  to: string;
  icon:
    | "dashboard"
    | "applications"
    | "development"
    | "members"
    | "profile"
    | "admin";
};
const NAV_ITEMS: NavItem[] = [
  { labelKey: "common.navDashboard", to: "/", icon: "dashboard" },
  {
    labelKey: "common.navApplications",
    to: "/applications",
    icon: "applications",
  },
  {
    labelKey: "common.navProfessionalDevelopment",
    to: "/professional-development",
    icon: "development",
  },
  { labelKey: "common.navMembers", to: "/members-progress", icon: "members" },
  { labelKey: "common.navAdmin", to: "/admin", icon: "admin" },
  { labelKey: "common.navProfile", to: "/profile", icon: "profile" },
];

function NavIcon({ name }: { name: NavItem["icon"] }) {
  const common = {
    className: "h-[18px] w-[18px] shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
  };
  if (name === "dashboard")
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </svg>
    );
  if (name === "applications")
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 5.5h-2A2.5 2.5 0 0 0 3.5 8v10A2.5 2.5 0 0 0 6 20.5h12a2.5 2.5 0 0 0 2.5-2.5V8A2.5 2.5 0 0 0 18 5.5h-2M8 5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5m-8 0h8m-8 5h8m-8 4h5"
        />
      </svg>
    );
  if (name === "members")
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 19.5v-1.2a3.3 3.3 0 0 0-3.3-3.3H7.3A3.3 3.3 0 0 0 4 18.3v1.2m15.5 0v-1.2a3.3 3.3 0 0 0-2.4-3.17M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm9.5-3.5a3.5 3.5 0 0 1-2.7 3.4"
        />
      </svg>
    );
  if (name === "development")
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v14a.5.5 0 0 1-.78.42L12 15.25l-7.72 5.17A.5.5 0 0 1 3.5 20V6A1.5 1.5 0 0 1 5 4.5Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 8h8M8 11.5h5"
        />
      </svg>
    );
  if (name === "admin")
    return (
      <svg {...common}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3.5 19 6v5.1c0 4.2-2.9 7.4-7 9.4-4.1-2-7-5.2-7-9.4V6l7-2.5Z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 20a7 7 0 0 1 14 0"
      />
    </svg>
  );
}

function isActive(pathname: string, item: NavItem) {
  if (item.to === "/") return pathname === "/";
  if (item.to === "/applications") return pathname.startsWith("/applications");
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const logout = useLogout();
  const today = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    new Date(),
  );

  const localeToggle = (
    <button
      type="button"
      aria-label={t("common.changeLanguage")}
      title={t("common.changeLanguage")}
      onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-neutral-700 px-2.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-info-strong"
    >
      <GlobeIcon className="h-4 w-4" />
      <span>{locale === "ar" ? "ع" : "EN"}</span>
    </button>
  );

  const navLinks = (mobile = false) =>
    NAV_ITEMS.filter(
      (item) => item.to !== "/admin" || user?.role === "ADMIN",
    ).map((item) => {
      const active = isActive(location.pathname, item);
      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => mobile && setMobileOpen(false)}
          aria-current={active ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition duration-150 hover:scale-[1.01] ${mobile ? (active ? "bg-neutral-100 font-medium text-neutral-950 shadow-xs" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900") : active ? "bg-neutral-700 font-medium text-white shadow-xs" : "text-neutral-300 hover:bg-neutral-800 hover:text-white"}`}
        >
          <NavIcon name={item.icon} />
          <span>{t(item.labelKey)}</span>
        </Link>
      );
    });

  const actions = (mobile = false) => (
    <button
      type="button"
      onClick={() => {
        setMobileOpen(false);
        void logout().catch(() => undefined);
      }}
      className={`mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition duration-150 hover:scale-[1.01] ${mobile ? "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900" : "text-neutral-400 hover:bg-neutral-800 hover:text-white"}`}
    >
      <svg
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 17l5-5-5-5m5 5H3.5m8-8.5h5A3.5 3.5 0 0 1 20 7v10a3.5 3.5 0 0 1-3.5 3.5h-5"
        />
      </svg>
      <span>{t("common.signOut")}</span>
    </button>
  );

  return (
    <>
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col border-e border-neutral-800 bg-neutral-900 px-5 py-7 lg:flex">
        <div className="mb-10 flex items-start justify-between gap-2 px-2">
          <Link
            to="/"
            className="flex min-w-0 flex-1 items-start gap-3 text-sm font-semibold tracking-tight text-white"
          >
            <img
              src="/nawah-logo.svg"
              alt=""
              className="h-9 w-9 shrink-0 object-contain"
            />
            <span className="min-w-0 pt-0.5">
              <span className="block whitespace-normal break-words leading-tight">{t("common.brand")}</span>
              <time
                className="mt-1 block text-xs font-normal tracking-normal text-neutral-400"
                dateTime={new Date().toISOString()}
              >
                {today}
              </time>
            </span>
          </Link>
          {localeToggle}
        </div>
        <nav aria-label={t("common.primaryNavigation")} className="space-y-1">
          {navLinks()}
        </nav>
        <div className="mt-auto border-t border-neutral-800 pt-4">
          {actions()}
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 px-5 py-3.5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Link
              to="/"
              className="flex min-w-0 flex-1 items-start gap-2.5 text-sm font-semibold tracking-tight text-neutral-950 dark:text-white"
            >
              <img
                src="/nawah-logo.svg"
                alt=""
                className="h-8 w-8 shrink-0 object-contain"
              />
              <span className="min-w-0 pt-0.5">
                <span className="block whitespace-normal break-words leading-tight">{t("common.brand")}</span>
                <time
                  className="mt-0.5 block text-[11px] font-normal tracking-normal text-neutral-500"
                  dateTime={new Date().toISOString()}
                >
                  {today}
                </time>
              </span>
            </Link>
            {localeToggle}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={
                mobileOpen
                  ? t("common.closeNavigation")
                  : t("common.openNavigation")
              }
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
              className="rounded-lg border border-neutral-200 p-2 text-neutral-700 dark:border-neutral-800 dark:text-neutral-300"
            >
              {mobileOpen ? (
                <span
                  aria-hidden="true"
                  className="block h-5 w-5 text-lg leading-4"
                >
                  ×
                </span>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6.5h16M4 12h16M4 17.5h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="absolute inset-x-0 top-full border-b border-border bg-surface px-5 pb-4 pt-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
            <nav
              aria-label={t("common.primaryNavigation")}
              className="space-y-1"
            >
              {navLinks(true)}
            </nav>
            <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
              {actions(true)}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
