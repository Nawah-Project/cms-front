import React from "react";
import { MoonIcon, SunIcon } from "../components/Icons";
import { useI18n } from "../i18n";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { locale } = useI18n();

  const isDark = theme === "dark";
  const title = isDark
    ? locale === "ar"
      ? "تفعيل المظهر الفاتح"
      : "Switch to light mode"
    : locale === "ar"
      ? "تفعيل المظهر الداكن"
      : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={title}
      aria-label={title}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-700 text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white focus-visible:outline-2 focus-visible:outline-info-strong dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white ${className}`}
    >
      {isDark ? (
        <SunIcon className="h-4 w-4 text-amber-400" />
      ) : (
        <MoonIcon className="h-4 w-4 text-neutral-300" />
      )}
    </button>
  );
}
