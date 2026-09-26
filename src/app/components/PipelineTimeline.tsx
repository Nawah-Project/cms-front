import React from "react";
import type { Outcome, Stage } from "../types";
import { StatusBadge } from "./StatusBadge";

interface PipelineTimelineProps {
  currentStage: Stage;
  outcome?: Outcome;
}

const ORDERED_STAGES: { stage: Stage; label: string }[] = [
  { stage: "APPLIED", label: "Applied" },
  { stage: "INTERVIEW", label: "Interview" },
  { stage: "DECISION", label: "Decision" },
  { stage: "CLOSED", label: "Closed" },
];

export function PipelineTimeline({
  currentStage,
  outcome = "NONE",
}: PipelineTimelineProps) {
  const currentIndex = ORDERED_STAGES.findIndex(
    (s) => s.stage === currentStage,
  );

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-neutral-200 dark:bg-neutral-800 -z-0" />
        <div
          className="absolute top-4 left-6 h-0.5 bg-neutral-900 dark:bg-neutral-100 -z-0 transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, (currentIndex / (ORDERED_STAGES.length - 1)) * 100))}%`,
          }}
        />

        {ORDERED_STAGES.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isUpcoming = idx > currentIndex;

          return (
            <div
              key={step.stage}
              className="flex flex-col items-center relative z-10"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs transition-colors duration-200 ${
                  isCurrent
                    ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 ring-4 ring-neutral-100 dark:ring-neutral-800 font-semibold"
                    : isCompleted
                      ? "bg-neutral-900 text-white dark:bg-neutral-200 dark:text-neutral-900"
                      : "bg-white text-neutral-400 border border-neutral-300 dark:bg-neutral-950 dark:border-neutral-700"
                }`}
                title={`${step.label}: ${isCurrent ? "Current" : isCompleted ? "Completed" : "Upcoming"}`}
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
                  className={`text-xs font-medium block ${
                    isCurrent
                      ? "text-neutral-900 dark:text-neutral-100 font-semibold"
                      : isCompleted
                        ? "text-neutral-700 dark:text-neutral-300"
                        : "text-neutral-400 dark:text-neutral-500"
                  }`}
                >
                  {step.label}
                </span>

                {isCurrent && step.stage === "CLOSED" && outcome !== "NONE" && (
                  <StatusBadge
                    className="mt-1"
                    kind="outcome"
                    value={outcome}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
