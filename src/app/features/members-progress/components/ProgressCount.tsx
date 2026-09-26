import type { MemberProgressCounts } from "../types/membersProgress.types";

export type ProgressStage = keyof MemberProgressCounts;

const STAGE_STYLES: Record<ProgressStage, string> = {
  applied:
    "border-neutral-800 bg-neutral-800 text-white dark:border-neutral-200 dark:bg-neutral-200 dark:text-neutral-900",
  interview:
    "border-neutral-300 bg-neutral-100 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100",
  decision:
    "border-neutral-300 bg-white text-neutral-800 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100",
  closed:
    "border-neutral-200 bg-neutral-200 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-700 dark:text-neutral-100",
};

const STAGE_LABELS: Record<ProgressStage, string> = {
  applied: "Applied",
  interview: "Interview",
  decision: "Decision",
  closed: "Closed",
};

export function ProgressCount({
  stage,
  count,
}: {
  stage: ProgressStage;
  count: number;
}) {
  return (
    <span
      aria-label={`${STAGE_LABELS[stage]}: ${count} applications`}
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-sm font-medium tabular-nums ${STAGE_STYLES[stage]}`}
    >
      {count}
    </span>
  );
}
