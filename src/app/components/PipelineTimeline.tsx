import React from "react";
import type { Outcome, Stage } from "../types";
import { StatusBadge } from "./StatusBadge";
import { useI18n } from "../i18n";

interface PipelineTimelineProps {
  currentStage: Stage;
  outcome?: Outcome;
  onStageSelect?: (stage: Stage) => void;
}

const ORDERED_STAGES: Stage[] = ["APPLIED", "INTERVIEW", "DECISION", "CLOSED"];

export function PipelineTimeline({
  currentStage,
  outcome = "NONE",
  onStageSelect,
}: PipelineTimelineProps) {
  const { t } = useI18n();
  const labels: Record<Stage, string> = { APPLIED: t("applications.submitted"), INTERVIEW: t("applications.interview"), DECISION: t("applications.decision"), CLOSED: t("applications.closed") };
  const currentIndex = ORDERED_STAGES.findIndex(
    (s) => s === currentStage,
  );

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-4 inset-x-6 h-0.5 bg-neutral-200 dark:bg-neutral-800 -z-0" />
        <div
          className="absolute top-4 start-6 h-0.5 bg-neutral-900 dark:bg-neutral-100 -z-0 transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, (currentIndex / (ORDERED_STAGES.length - 1)) * 100))}%`,
          }}
        />

        {ORDERED_STAGES.map((step, idx) => {
          const label = labels[step];
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isUpcoming = idx > currentIndex;

          return (
            <button
              key={step}
              type="button"
              onClick={() => onStageSelect?.(step)}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`${label}: ${isCurrent ? t("common.current") : isCompleted ? t("common.completed") : t("common.upcoming")}`}
              className="group flex cursor-pointer flex-col items-center relative z-10 rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-500"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs transition-colors duration-200 ${
                  isCurrent
                    ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 ring-4 ring-neutral-100 dark:ring-neutral-800 font-semibold"
                    : isCompleted
                      ? "bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900"
                      : "bg-white text-neutral-400 border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-700"
                }`}
                title={`${label}: ${isCurrent ? t("common.current") : isCompleted ? t("common.completed") : t("common.upcoming")}`}
              >
                {isCompleted ? (
                  <span className="text-sm">✓</span>
                ) : isCurrent ? (
                  <span className="text-xs">●</span>
                ) : (
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    ○
                  </span>
                )}
              </div>

              <div className="mt-2 text-center">
                <span
                  className={`text-xs font-medium block transition-colors ${
                    isCurrent
                      ? "text-neutral-900 dark:text-neutral-100 font-semibold"
                      : isCompleted
                        ? "text-neutral-700 group-hover:text-neutral-950 dark:text-neutral-300 dark:group-hover:text-white"
                        : "text-neutral-500 group-hover:text-neutral-800 dark:text-neutral-500 dark:group-hover:text-neutral-200"
                  }`}
                >
                  {label}
                </span>

                {isCurrent && step === "CLOSED" && outcome !== "NONE" && (
                  <StatusBadge
                    className="mt-1"
                    kind="outcome"
                    value={outcome}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
