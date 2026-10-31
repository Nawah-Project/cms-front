import React from "react";
import { PlusIcon } from "./Icons";
import { useI18n } from "../i18n";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onActionClick?: () => void;
  onAddClick?: () => void;
  compact?: boolean;
  isFiltered?: boolean;
  onClearFilters?: () => void;
  children?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onActionClick,
  onAddClick,
  compact = false,
  isFiltered = false,
  onClearFilters,
  children,
}: EmptyStateProps) {
  const { t } = useI18n();
  const handleAction = onActionClick || onAddClick;

  if (isFiltered) {
    return (
      <div className="n-empty w-full py-16 px-4 text-center rounded-xl border border-dashed border-border bg-neutral-50/50">
        <h3 className="text-sm font-semibold text-neutral-800">
          {title || t("applications.noResults")}
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          {description || t("applications.adjustFilters")}
        </p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="button-secondary mt-4 px-3 py-1.5 text-xs font-medium"
          >
            {t("applications.clearFilters")}
          </button>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="n-empty w-full py-8 px-4 text-center rounded-xl border border-dashed border-border bg-surface/50 max-w-md mx-auto my-2">
        {icon && <div className="mb-2 flex justify-center text-neutral-400">{icon}</div>}
        {title && <h3 className="text-sm font-semibold text-neutral-800">{title}</h3>}
        {description && <p className="mt-1 text-xs text-neutral-500">{description}</p>}
        {children}
        {handleAction && (
          <button
            type="button"
            onClick={handleAction}
            className="button-primary mt-3 inline-flex items-center gap-1.5 py-1.5 px-3 text-xs"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>{actionLabel || t("common.addApplication")}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="n-empty w-full py-16 px-6 text-center rounded-xl border border-dashed border-border bg-surface shadow-xs max-w-lg mx-auto my-6">
      <div className="n-empty-icon w-12 h-12 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 mb-4">
        {icon || (
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
        )}
      </div>
      <h2 className="text-base font-semibold text-text-primary">
        {title || t("applications.title")}
      </h2>
      <p className="mt-2 text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
        {description || t("applications.noApplicationsYet")}
      </p>
      {children}
      {handleAction && (
        <div className="mt-6">
          <button
            type="button"
            onClick={handleAction}
            className="button-primary inline-flex items-center gap-2 py-2 px-4 text-xs font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{actionLabel || t("common.addApplication")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

