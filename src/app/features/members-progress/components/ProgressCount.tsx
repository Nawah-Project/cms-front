import type { MemberProgressCounts } from "../types/membersProgress.types";
import { useI18n } from "../../../i18n";

export type ProgressStage = "applied" | "assignment" | "interview" | "decision" | "closed";

const STAGE_STYLES: Record<ProgressStage, string> = {
  applied: "border-border bg-neutral-soft text-neutral-strong",
  assignment: "border-[#c5cbe3] bg-[#eef0f7] text-[#3b4266] dark:border-[#47507a] dark:bg-[rgba(82,91,136,0.2)] dark:text-[#b8c0e0]",
  interview: "border-info-border bg-info-soft text-info-strong",
  decision: "border-warning-border bg-warning-soft text-warning-strong",
  closed: "border-border-strong bg-neutral-100 text-neutral-800",
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

  if (stage === "assignment") {
    return (
      <svg {...common}>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="m9 14 2 2 4-4" />
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
  highlightSuccess = false,
}: {
  stage: ProgressStage;
  count: number;
  highlightSuccess?: boolean;
}) {
  const { t, number } = useI18n();
  const label = t(`applications.${stage === "applied" ? "submitted" : stage}`);
  if (count === 0) {
    return (
      <span
        aria-label={t("members.stageApplicationCount", { stage: label, count: number(count) })}
        className="mx-auto flex min-h-11 w-16 items-center justify-center rounded-xl border border-border-subtle bg-neutral-50/70 text-base font-medium tabular-nums text-neutral-400"
      >
        {number(count)}
      </span>
    );
  }

  const stageStyle =
    stage === "closed" && highlightSuccess
      ? "border-2 border-green-800 bg-green-50 text-green-950 dark:border-green-400 dark:bg-green-950/40 dark:text-green-100"
      : STAGE_STYLES[stage];

  return (
    <span
      aria-label={t("members.stageApplicationCount", { stage: label, count: number(count) })}
      className={`mx-auto flex h-11 w-16 max-w-20 items-center justify-center rounded-xl border text-sm font-semibold tabular-nums shadow-xs ${stageStyle}`}
    >
      {number(count)}
    </span>
  );
}
