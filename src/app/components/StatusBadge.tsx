import type { Outcome, Stage } from "../types";

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
  const label = props.value.charAt(0) + props.value.slice(1).toLowerCase();
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
