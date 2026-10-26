import React from "react";
import { Sparkles, Trophy, ArrowRight, ArrowLeft } from "lucide-react";
import { Modal } from "./Modal";
import { useI18n } from "../../i18n";

export interface MilestoneCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  unlockedItems?: string[];
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export function MilestoneCelebrationModal({
  isOpen,
  onClose,
  title,
  description,
  unlockedItems = [],
  ctaLabel,
  onCtaClick,
}: MilestoneCelebrationModalProps) {
  const { t, locale } = useI18n();
  const ArrowIcon = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="md"
      footer={
        <div className="flex w-full items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="button-secondary text-sm"
          >
            {t("common.close")}
          </button>
          {onCtaClick && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onCtaClick();
              }}
              className="button-primary inline-flex items-center gap-2 text-sm shadow-md active:scale-95 transition-transform"
            >
              <span>{ctaLabel || t("common.continue")}</span>
              <ArrowIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      }
    >
      <div className="milestone-reveal text-center py-2">
        {/* Celebration Trophy Badge */}
        <div className="milestone-emblem mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full text-white">
          <Trophy className="h-8 w-8" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50 sm:text-xl">
          {title}
        </h3>

        {/* Description */}
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          {description}
        </p>

        {/* Unlocked Items Cards */}
        {unlockedItems.length > 0 && (
          <div className="mt-5 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 text-start dark:border-amber-800/60 dark:bg-amber-950/20">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 mb-2.5">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>{locale==="ar"?"خطوتك الجديدة اتفتحت":"Your next step is open"}</span>
            </h4>
            <ul className="space-y-2">
              {unlockedItems.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 text-xs font-medium text-neutral-800 dark:text-neutral-200"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 text-[11px]">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

