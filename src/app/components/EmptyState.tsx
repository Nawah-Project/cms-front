import React from "react";
import { PlusIcon } from "./Icons";
import { useI18n } from "../i18n";

interface EmptyStateProps {
  onAddClick: () => void;
  title?: string;
  description?: string;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export function EmptyState({
  onAddClick,
  title = "",
  description = "",
  isFiltered = false,
  onClearFilters,
}: EmptyStateProps) {
  const { t } = useI18n();
  if (isFiltered) {
    return (
      <div className="w-full py-16 px-4 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          {t("applications.noResults")}
        </h3>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {t("applications.adjustFilters")}
        </p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-xs"
          >
            {t("applications.clearFilters")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full py-20 px-6 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs max-w-lg mx-auto my-6">
      <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400 mb-4">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
          />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
        {title || t("applications.title")}
      </h2>
      <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto leading-relaxed">
        {description || t("applications.noApplicationsYet")}
      </p>
      <div className="mt-6">
        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-xs"
        >
          <PlusIcon className="w-4 h-4" />
          <span>{t("common.addApplication")}</span>
        </button>
      </div>
    </div>
  );
}
