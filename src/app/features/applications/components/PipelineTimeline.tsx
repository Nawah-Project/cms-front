import type { Outcome, Stage } from "../../../types";
import { CheckIcon } from "../../../components/Icons";
import { StatusBadge } from "./StatusBadge";
import { useI18n } from "../../../i18n";

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
  const labels: Record<Stage, string> = {
    APPLIED: t("applications.submitted"),
    INTERVIEW: t("applications.interview"),
    DECISION: t("applications.decision"),
    CLOSED: t("applications.closed"),
  };
  const currentIndex = ORDERED_STAGES.findIndex((s) => s === currentStage);

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-4 inset-x-6 h-0.5 bg-neutral-200 -z-0" />
        <div
          className="absolute top-4 start-6 h-0.5 bg-neutral-900 -z-0 transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, (currentIndex / (ORDERED_STAGES.length - 1)) * 100))}%`,
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
              aria-label={`${label}: ${isCurrent ? t("common.current") : isCompleted ? t("common.completed") : t("common.upcoming")}`}
              className="group flex cursor-pointer flex-col items-center relative z-10 rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-500"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs transition-colors duration-200 ${
                  isCurrent
                    ? "bg-neutral-900 text-white ring-4 ring-neutral-200 font-semibold"
                    : isCompleted
                      ? "bg-neutral-900 text-white"
                      : "bg-surface text-neutral-400 border border-border"
                }`}
                title={`${label}: ${isCurrent ? t("common.current") : isCompleted ? t("common.completed") : t("common.upcoming")}`}
              >
                {isCompleted ? (
                  <CheckIcon className="w-4 h-4" />
                ) : isCurrent ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-current" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-current" />
                )}
              </div>

              <div className="mt-2 text-center">
                <span
                  className={`text-xs font-medium block transition-colors ${
                    isCurrent
                      ? "text-neutral-900 font-semibold"
                      : isCompleted
                        ? "text-neutral-700 group-hover:text-neutral-950"
                        : "text-neutral-500 group-hover:text-neutral-800"
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

