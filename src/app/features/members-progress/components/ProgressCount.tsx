import type { MemberProgressCounts } from "../types/membersProgress.types";
import { useI18n } from "../../../i18n";

export type ProgressStage = keyof MemberProgressCounts;

const STAGE_STYLES: Record<ProgressStage, string> = {
  applied: "border-neutral-400 bg-neutral-200 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100",
  interview: "border-[#c3d8ef] bg-[#e8f1fb] text-info-strong dark:border-blue-700 dark:bg-blue-900/60 dark:text-blue-100",
  decision: "border-[#ead9a8] bg-[#fbf3df] text-[#74602f] dark:border-[#705d31] dark:bg-[#3a3324] dark:text-[#e7d9b2]",
  closed: "border-[#d8c7b3] bg-[#eee6dc] text-[#6b5842] dark:border-[#6f5b43] dark:bg-[#3a3026] dark:text-[#e7d9c7]",
};

export function ProgressStageIcon({ stage }: { stage: ProgressStage }) {
  const common = {
    className: "h-5 w-5 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
  };

  if (stage === "applied") {
    return (
      <svg {...common}>
        <path d="M7 3.5h7l4 4v13H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
        <path d="M14 3.5v4h4M8.5 13h7M8.5 16.5h7" />
      </svg>
    );
  }

  if (stage === "interview") {
    return (
      <svg {...common}>
        <path d="M4 5.5h16v11H9l-5 3v-14Z" />
        <path d="M8 10h8M8 13.5h5" />
      </svg>
    );
  }

  if (stage === "decision") {
    return (
      <svg {...common}>
        <path d="M7 3.5h10M7 20.5h10M8 4c0 4 2 5.5 4 8-2 2.5-4 4-4 8m8-16c0 4-2 5.5-4 8 2 2.5 4 4 4 8" />
        <path d="M10 14h4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12 2.3 2.3 4.8-5" />
    </svg>
  );
}

export function ProgressCount({
  stage,
  count,
}: {
  stage: ProgressStage;
  count: number;
}) {
  const { t, number } = useI18n();
  const label = t(`applications.${stage === "applied" ? "submitted" : stage}`);
  if (count === 0) {
    return (
      <span
        aria-label={t("members.stageApplicationCount", { stage: label, count: number(count) })}
        className="mx-auto flex min-h-12 w-full items-center justify-center text-lg font-medium tabular-nums text-neutral-300 dark:text-neutral-700"
      >
        {number(count)}
      </span>
    );
  }

  return (
    <span
      aria-label={t("members.stageApplicationCount", { stage: label, count: number(count) })}
      className={`mx-auto flex min-h-12 w-full max-w-44 items-center justify-center rounded-xl border px-3 py-2 text-lg font-semibold tabular-nums shadow-xs ${STAGE_STYLES[stage]}`}
    >
      {number(count)}
    </span>
  );
}
