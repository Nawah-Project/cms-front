import React, { useEffect, useId, useRef } from "react";
import { useDialogFocus } from "./useDialogFocus";
import { createPortal } from "react-dom";
import { useI18n } from "../../i18n";
import { CloseIcon } from "../Icons";
import { closeJourneyTasksPanel } from "../journeyTasksPanelEvents";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  zIndex?: number;
  disableClose?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  "2xl": "max-w-4xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = "md",
  zIndex,
  disableClose = false,
  children,
  footer,
}: ModalProps) {
  const { t } = useI18n();
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, isOpen, onClose, disableClose);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    if (isOpen) {
      closeJourneyTasksPanel();
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
        if (previouslyFocusedElement.current) {
          previouslyFocusedElement.current.focus();
        }
      };
    }
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const containerZIndex = zIndex ?? 100;
  const zClass = containerZIndex === 110 ? "z-[110]" : "z-[100]";

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      style={{ zIndex: containerZIndex }}
      className={`fixed inset-0 ${zClass} flex items-center justify-center p-4 overflow-y-auto`}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={() => {
          if (!disableClose) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative z-10 w-full ${SIZE_CLASSES[size]} rounded-2xl border border-border bg-surface p-0 text-text-primary shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex max-h-[90vh] flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border px-6 py-4">
            <div className="space-y-0.5 pe-4">
              <h2 id={titleId} className="text-base font-semibold text-text-primary">
                {title}
              </h2>
              {subtitle && (
                <p id={subtitleId} className="text-xs text-text-secondary">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={disableClose}
              aria-label={t("common.close")}
              className="rounded-lg p-1 text-text-muted hover:bg-neutral-100 hover:text-text-primary disabled:pointer-events-none disabled:opacity-40"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto p-6">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 border-t border-border bg-neutral-50/60 px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
