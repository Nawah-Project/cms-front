import React from "react";
import { Lock, ListChecks, PlusIcon, ArrowRight, ArrowLeft } from "lucide-react";
import { useI18n } from "../../i18n";

export interface LockedStateViewProps {
  title: string;
  subtitle: string;
  description: string;
  progressCurrent?: number;
  progressTotal?: number;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function LockedStateView({
  title,
  subtitle,
  description,
  progressCurrent,
  progressTotal,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}: LockedStateViewProps) {
  const { t, number, locale } = useI18n();
  const ArrowIcon = locale === "ar" ? ArrowLeft : ArrowRight;

  const hasProgress =
    typeof progressCurrent === "number" && typeof progressTotal === "number";
  const progressPercent = hasProgress
    ? Math.min(100, Math.round((progressCurrent! / progressTotal!) * 100))
    : 0;

  return (
    <div className="n-locked-state mx-auto my-8 max-w-xl rounded-3xl border border-neutral-200/80 bg-surface p-7 sm:p-10 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {/* Lock Icon */}
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-700 shadow-inner dark:bg-amber-950/60 dark:text-amber-300">
        <Lock className="h-8 w-8" />
      </div>

      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
        {subtitle}
      </span>

      <h2 className="mt-3 text-xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50 sm:text-2xl">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {description}
      </p>

      {/* Optional Progress Bar */}
      {hasProgress && (
        <div className="mx-auto mt-6 max-w-xs rounded-2xl border border-border bg-neutral-50 p-4 dark:bg-neutral-800/50">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            <span>التقدم الحالي لإلغاء القفل:</span>
            <span>
              {number(progressCurrent!)} من {number(progressTotal!)}
            </span>
          </div>
          <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="button-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
          >
            <ListChecks className="h-4 w-4" />
            <span>{secondaryActionLabel || t("journey.panelTitle")}</span>
          </button>
        )}

        {onPrimaryAction && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="button-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm shadow-md active:scale-95 transition-all"
          >
            <span>{primaryActionLabel || t("common.continue")}</span>
            <ArrowIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

