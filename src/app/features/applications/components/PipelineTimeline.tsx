import React from "react";
import type { Outcome, Stage } from "../../../types";
import { CheckIcon, SparklesIcon } from "../../../components/Icons";
import { StatusBadge } from "./StatusBadge";
import { useI18n } from "../../../i18n";

interface PipelineTimelineProps {
  currentStage: Stage;
  outcome?: Outcome;
  onStageSelect?: (stage: Stage) => void;
  onOutcomeSelect?: (outcome: Outcome) => void;
}

const ORDERED_STAGES: Stage[] = [
  "APPLIED",
  "ASSIGNMENT",
  "INTERVIEW",
  "DECISION",
  "CLOSED",
];

export function PipelineTimeline({
  currentStage,
  outcome = "NONE",
  onStageSelect,
  onOutcomeSelect,
}: PipelineTimelineProps) {
  const { t, locale } = useI18n();
  const isRtl = locale === "ar";

  const labels: Record<Stage, string> = {
    APPLIED: t("applications.submitted"),
    ASSIGNMENT: t("applications.assignment"),
    INTERVIEW: t("applications.interview"),
    DECISION: t("applications.decision"),
    CLOSED: t("applications.closed"),
  };

  const currentIndex = ORDERED_STAGES.findIndex((s) => s === currentStage);

  return (
    <div className="w-full py-2">
      {/* Interactive Controller Header & Hint */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {t("applications.pipelineProgress")}
          </span>
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
            ({isRtl ? "المرحلة الحالية:" : "Current Stage:"}{" "}
            <strong className="text-neutral-900 dark:text-neutral-100">
              {labels[currentStage]}
            </strong>
            )
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 text-xs text-primary-strong dark:text-info-hover font-medium bg-info-soft dark:bg-neutral-800/80 px-2.5 py-1 rounded-full border border-info-border/60">
          <SparklesIcon className="w-3.5 h-3.5 text-info-strong shrink-0" />
          <span>
            {isRtl
              ? "اضغط على أي محطة لتحديث مرحلة الطلب فوراً"
              : "Click any station to update stage immediately"}
          </span>
        </div>
      </div>

      {/* Connected Stations Track */}
      <div className="flex items-center justify-between relative px-2">
        {/* Background track line */}
        <div className="absolute top-4 inset-x-8 h-1 bg-neutral-200 dark:bg-neutral-800 -z-0 rounded-full" />
        {/* Active progress fill line */}
        <div
          className="absolute top-4 start-8 h-1 bg-neutral-900 dark:bg-white -z-0 transition-all duration-300 rounded-full"
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                (currentIndex / (ORDERED_STAGES.length - 1)) * 100,
              ),
            )}%`,
          }}
        />

        {ORDERED_STAGES.map((step, idx) => {
          const label = labels[step];
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <button
              key={step}
              type="button"
              onClick={() => onStageSelect?.(step)}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`${label}: ${
                isCurrent
                  ? t("common.current")
                  : isCompleted
                    ? t("common.completed")
                    : t("common.upcoming")
              }`}
              className="group flex cursor-pointer flex-col items-center relative z-10 px-2 py-1 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-neutral-500"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-medium text-xs transition-all duration-200 ${
                  isCurrent
                    ? step === "ASSIGNMENT"
                      ? "bg-[#525b88] text-white ring-4 ring-[#525b88]/30 shadow-md font-bold scale-110"
                      : step === "INTERVIEW"
                        ? "bg-[#285987] text-white ring-4 ring-[#285987]/30 shadow-md font-bold scale-110"
                        : step === "DECISION"
                          ? "bg-[#b47d1c] text-white ring-4 ring-[#b47d1c]/30 shadow-md font-bold scale-110"
                          : step === "CLOSED"
                            ? "bg-[#4b5563] text-white ring-4 ring-[#4b5563]/30 shadow-md font-bold scale-110"
                            : "bg-[#64748b] text-white ring-4 ring-[#64748b]/30 shadow-md font-bold scale-110"
                    : isCompleted
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "bg-surface text-neutral-400 border-2 border-neutral-300 dark:border-neutral-700 hover:border-neutral-400"
                }`}
                title={`${label}: ${
                  isCurrent
                    ? t("common.current")
                    : isCompleted
                      ? t("common.completed")
                      : t("common.upcoming")
                }`}
              >
                {isCompleted ? (
                  <CheckIcon className="w-4 h-4 stroke-[3]" />
                ) : isCurrent ? (
                  <span className="w-3 h-3 rounded-full bg-white dark:bg-neutral-900 animate-pulse" />
                ) : (
                  <span className="text-xs font-semibold">{idx + 1}</span>
                )}
              </div>

              <div className="mt-2.5 text-center">
                <span
                  className={`text-xs block transition-colors ${
                    isCurrent
                      ? "font-bold text-neutral-900 dark:text-neutral-100"
                      : isCompleted
                        ? "font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-950 dark:group-hover:text-white"
                        : "font-normal text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300"
                  }`}
                >
                  {label}
                </span>

                {isCurrent && step === "CLOSED" && outcome !== "NONE" && (
                  <StatusBadge className="mt-1" kind="outcome" value={outcome} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Closed Stage Inline Outcome Selector */}
      {currentStage === "CLOSED" && (
        <div className="mt-6 pt-4 border-t border-dashed border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 me-1">
            {isRtl ? "🎯 نتيجة الإغلاق:" : "🎯 Outcome:"}
          </span>
          {[
            {
              key: "ACCEPTED",
              label: isRtl ? "مقبول 🎉" : "Accepted 🎉",
              color:
                "border-success-border bg-success-soft text-success-strong hover:bg-success-hover",
            },
            {
              key: "REJECTED",
              label: isRtl ? "مرفوض" : "Rejected",
              color:
                "border-danger-border bg-danger-soft text-danger-strong hover:bg-danger-hover",
            },
            {
              key: "WITHDRAWN",
              label: isRtl ? "منسحب" : "Withdrawn",
              color:
                "border-neutral-300 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
            },
            {
              key: "NO_RESPONSE",
              label: isRtl ? "لم يتم الرد" : "No Response",
              color:
                "border-warning-border bg-warning-soft text-warning-strong hover:bg-warning-hover",
            },
          ].map((item) => {
            const isSelected = outcome === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onOutcomeSelect?.(item.key as Outcome)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-offset-1 ring-neutral-900 dark:ring-white " +
                      item.color
                    : "opacity-75 hover:opacity-100 " + item.color
                }`}
              >
                {item.label} {isSelected && "✓"}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
