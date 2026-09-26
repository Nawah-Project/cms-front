import React from "react";
import { Link, useLocation } from "react-router";
import { PlusIcon } from "./Icons";
import { useAuth } from "../features/auth/store/authStore";
import { useLogout } from "../features/auth/hooks/useLogout";

interface NavbarProps {
  onOpenAddModal: () => void;
}

export function Navbar({ onOpenAddModal }: NavbarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const logout = useLogout();
  const isDashboard = location.pathname === "/";
  const isApplications = location.pathname.startsWith("/applications") && location.pathname !== "/";

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 sticky top-0 z-40 backdrop-blur-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-neutral-900 dark:text-neutral-100 font-semibold text-sm tracking-tight hover:opacity-85 transition-opacity"
          >
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center font-bold text-xs">
              J
            </div>
            <span>Job Tracker</span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isDashboard
                  ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/applications"
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isApplications
                  ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Applications
            </Link>
          </nav>
        </div>

        {/* Right: + Add Application Button */}
        <div className="flex items-center gap-3">
          <Link to="/profile" className="hidden sm:inline text-xs text-neutral-600 dark:text-neutral-400">{user?.name || "Profile"}</Link>
          <button type="button" onClick={() => void logout().catch(() => undefined)} className="text-xs text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">Sign out</button>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-xs"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>+ Add Application</span>
          </button>
        </div>
      </div>
    </header>
  );
}
