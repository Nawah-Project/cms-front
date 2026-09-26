import type { Outcome, Stage } from "../types";
import { useI18n } from "../i18n";

type StatusBadgeProps =
  | { kind: "stage"; value: Stage; className?: string }
  | { kind: "outcome"; value: Exclude<Outcome, "NONE">; className?: string };

const STAGE_STYLE: Record<Stage, string> = {
  APPLIED: "status-neutral",
  INTERVIEW: "status-info",
  DECISION: "status-warning",
  CLOSED: "status-neutral",
};

const OUTCOME_STYLE: Record<Exclude<Outcome, "NONE">, string> = {
  ACCEPTED: "status-success",
  REJECTED: "status-danger",
  WITHDRAWN: "status-neutral",
};

export function StatusBadge(props: StatusBadgeProps) {
  const { t } = useI18n();
  const stageKeys: Record<Stage, string> = {
    APPLIED: "applications.submitted",
    INTERVIEW: "applications.interview",
    DECISION: "applications.decision",
    CLOSED: "applications.closed",
  };
  const outcomeKeys: Record<Exclude<Outcome, "NONE">, string> = {
    ACCEPTED: "applications.accepted",
    REJECTED: "applications.rejected",
    WITHDRAWN: "applications.withdrawn",
  };
  const label = props.kind === "stage" ? t(stageKeys[props.value]) : t(outcomeKeys[props.value]);
  const semanticStyle =
    props.kind === "stage"
      ? STAGE_STYLE[props.value]
      : OUTCOME_STYLE[props.value];

  return (
    <span className={`status-badge ${semanticStyle} ${props.className ?? ""}`}>
      {label}
    </span>
  );
}
