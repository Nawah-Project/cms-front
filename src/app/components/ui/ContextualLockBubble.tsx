import React, { useEffect, useRef } from "react";
import { Lock, X, ListChecks } from "lucide-react";
import { useI18n } from "../../i18n";

export interface ContextualLockBubbleProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  requirement: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  placement?: "inline-end" | "bottom" | "top";
  className?: string;
}

export function ContextualLockBubble({
  isOpen,
  onClose,
  title,
  requirement,
  ctaLabel,
  onCtaClick,
  placement = "inline-end",
  className = "",
}: ContextualLockBubbleProps) {
  const { t } = useI18n();
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Placement styling for RTL / LTR
  let placementClasses = "";
  let arrowClasses = "";

  if (placement === "inline-end") {
    // In RTL, inline-end is to the left of the element
    placementClasses = "start-full top-1/2 -translate-y-1/2 ms-2.5";
    arrowClasses = "end-full top-1/2 -translate-y-1/2 border-y-transparent border-s-transparent border-e-surface";
  } else if (placement === "bottom") {
    placementClasses = "top-full start-1/2 -translate-x-1/2 rtl:translate-x-1/2 mt-2";
    arrowClasses = "bottom-full start-1/2 -translate-x-1/2 rtl:translate-x-1/2 border-x-transparent border-t-transparent border-b-surface";
  } else {
    placementClasses = "bottom-full start-1/2 -translate-x-1/2 rtl:translate-x-1/2 mb-2";
    arrowClasses = "top-full start-1/2 -translate-x-1/2 rtl:translate-x-1/2 border-x-transparent border-b-transparent border-t-surface";
  }

  return (
    <div
      ref={bubbleRef}
      role="dialog"
      aria-modal="false"
      aria-label={title || t("journey.lockedBadge")}
      className={`absolute z-[100] w-72 sm:w-80 rounded-2xl border border-amber-300/80 bg-surface p-4 shadow-xl text-start transition-all animate-in fade-in zoom-in-95 dark:border-amber-700/80 dark:bg-neutral-900 ${placementClasses} ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </span>
          <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
            {title || t("journey.lockedBadge")}
          </h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Requirement body */}
      <p className="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
        {requirement}
      </p>

      {/* Action Button (CTA) */}
      {onCtaClick && (
        <div className="mt-3.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              onClose();
              onCtaClick();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 active:scale-95 transition-all dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            <ListChecks className="h-3.5 w-3.5" />
            <span>{ctaLabel || t("journey.panelTitle")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

