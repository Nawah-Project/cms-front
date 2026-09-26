import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../features/auth/store/authStore";
import { useLogout } from "../features/auth/hooks/useLogout";
import { PlusIcon } from "./Icons";

type NavItem = {
  label: string;
  to: string;
  icon: "dashboard" | "applications" | "members" | "profile";
};
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/", icon: "dashboard" },
  { label: "My Applications", to: "/applications", icon: "applications" },
  { label: "Members Progress", to: "/members-progress", icon: "members" },
  { label: "Profile", to: "/profile", icon: "profile" },
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

export function AppSidebar({ onOpenAddModal }: { onOpenAddModal: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const logout = useLogout();
  const initials = user?.name.trim().charAt(0).toLocaleUpperCase() || "U";

  const navLinks = (mobile = false) =>
    NAV_ITEMS.map((item) => {
      const active = isActive(location.pathname, item);
      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => mobile && setMobileOpen(false)}
          aria-current={active ? "page" : undefined}
          className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-transform duration-150 hover:scale-[1.01] ${active ? "bg-neutral-900 font-medium text-white dark:bg-neutral-800 dark:text-white" : "text-neutral-600 dark:text-neutral-400"}`}
        >
          <NavIcon name={item.icon} />
          <span>{item.label}</span>
        </Link>
      );
    });

  const actions = (mobile = false) => (
    <>
      <button
        type="button"
        onClick={() => {
          onOpenAddModal();
          if (mobile) setMobileOpen(false);
        }}
        className="button-secondary mb-3 flex w-full items-center justify-center gap-2 px-3 py-3"
      >
        <PlusIcon className="h-4 w-4" />
        <span>Add application</span>
      </button>
      <Link
        to="/profile"
        className="flex items-center gap-3 rounded-lg px-3 py-3 transition-transform duration-150 hover:scale-[1.01]"
        onClick={() => mobile && setMobileOpen(false)}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {user?.name || "Your profile"}
          </span>
          <span className="block text-xs text-neutral-500">Profile</span>
        </span>
        <NavIcon name="profile" />
      </Link>
      <button
        type="button"
        onClick={() => {
          setMobileOpen(false);
          void logout().catch(() => undefined);
        }}
        className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-500 transition-transform duration-150 hover:scale-[1.01] dark:text-neutral-400"
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
        <span>Sign out</span>
      </button>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-surface px-5 py-7 dark:border-neutral-800 dark:bg-neutral-950 lg:flex">
        <Link
          to="/"
          className="mb-10 flex items-center gap-3 px-2 text-sm font-semibold tracking-tight text-neutral-950 dark:text-white"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-900 bg-neutral-100 text-sm font-bold text-neutral-900 dark:bg-white dark:text-neutral-900">
            J
          </span>
          <span>Job Tracker</span>
        </Link>
        <nav aria-label="Primary navigation" className="space-y-1">
          {navLinks()}
        </nav>
        <div className="mt-auto border-t border-neutral-100 pt-4 dark:border-neutral-800">
          {actions()}
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 px-5 py-3.5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 lg:hidden">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-neutral-950 dark:text-white"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-900 bg-neutral-100 text-xs font-bold text-neutral-900 dark:bg-white dark:text-neutral-900">
              J
            </span>
            <span>Job Tracker</span>
          </Link>
          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
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
        {mobileOpen && (
          <div className="absolute inset-x-0 top-full border-b border-border bg-surface px-5 pb-4 pt-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
            <nav aria-label="Primary navigation" className="space-y-1">
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
