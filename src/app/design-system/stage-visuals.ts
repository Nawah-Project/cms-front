import type { Stage } from "../types";
/** Board headers and filters share the same stage cues; labels always carry meaning. */
export const STAGE_DOT: Record<Stage,string> = {
 APPLIED: "n-dot-submitted", ASSIGNMENT: "n-dot-assignment", INTERVIEW: "n-dot-interview", DECISION: "n-dot-decision", CLOSED: "n-dot-closed",
};
