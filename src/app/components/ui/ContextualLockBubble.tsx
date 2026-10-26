import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [position,setPosition]=useState({top:0,left:0});
  useLayoutEffect(()=>{if(!isOpen)return;const place=()=>{const r=anchorRef.current?.parentElement?.getBoundingClientRect();if(!r)return;const width=Math.min(320,innerWidth-24),height=bubbleRef.current?.offsetHeight??180;const rtl=document.documentElement.dir==="rtl";setPosition({left:Math.max(12,Math.min(rtl?r.left-width-10:r.right+10,innerWidth-width-12)),top:Math.max(12,Math.min(placement==="bottom"?r.bottom+8:placement==="top"?r.top-height-8:r.top,innerHeight-height-12))});};place();window.addEventListener("resize",place);window.addEventListener("scroll",place,true);return()=>{window.removeEventListener("resize",place);window.removeEventListener("scroll",place,true);};},[isOpen,placement]);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (bubbleRef.current && !bubbleRef.current.contains(event.target as Node) && !anchorRef.current?.parentElement?.contains(event.target as Node)) {
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



  return <> <span ref={anchorRef} hidden />{isOpen && createPortal(
    <div
      ref={bubbleRef}
      role="dialog"
      aria-modal="false"
      aria-label={title || t("journey.lockedBadge")}
      style={{...position,width:"min(320px, calc(100vw - 24px))"}}
      className={`fixed z-[12030] rounded-2xl border border-amber-300/80 bg-surface p-4 shadow-xl text-start transition-all animate-in fade-in zoom-in-95 dark:border-amber-700/80 dark:bg-neutral-900 ${className}`}
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
    </div>, document.body)} </>;
}

