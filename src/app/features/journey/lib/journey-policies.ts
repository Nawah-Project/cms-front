import type {
  EnrichedJourneyNode,
  JourneyNodeStatus,
  JourneyStateResponse,
  UserJourneyState,
} from "../types";

type JourneyStateLike =
  | UserJourneyState
  | JourneyStateResponse
  | null
  | undefined;

function extractState(input: JourneyStateLike): UserJourneyState | null {
  if (!input) return null;
  if ("state" in input && input.state) {
    return input.state;
  }
  return input as UserJourneyState;
}

/**
 * Group section (`/members-progress`) is unlocked when:
 * - User is an ADMIN, OR
 * - `isGroupUnlocked === true`, OR
 * - `TASK_0` is in `completedNodeCodes`, OR
 * - `currentWeek >= 1`
 */
export function canAccessGroupSection(
  journeyState?: JourneyStateLike,
  user?: { role?: string } | null,
): boolean {
  if (user?.role === "ADMIN") return true;
  const state = extractState(journeyState);
  if (!state) return false;
  return (
    state.isGroupUnlocked === true ||
    (state.completedNodeCodes ?? []).includes("TASK_0") ||
    state.currentWeek >= 1
  );
}

/**
 * Professional Development section (`/professional-development`) is unlocked when:
 * - User is an ADMIN, OR
 * - `isGroupUnlocked === true`, OR
 * - `TASK_0` is in `completedNodeCodes`, OR
 * - `currentWeek >= 1`
 */
export function canAccessProfessionalDevelopment(
  journeyState?: JourneyStateLike,
  user?: { role?: string } | null,
): boolean {
  if (user?.role === "ADMIN") return true;
  const state = extractState(journeyState);
  if (!state) return false;
  return (
    state.isGroupUnlocked === true ||
    (state.completedNodeCodes ?? []).includes("TASK_0") ||
    state.currentWeek >= 1
  );
}

/**
 * Advanced Table View in `/applications` is unlocked when the user has 10+ total applications,
 * or `canUseTableView === true`, or after completing `W1_M1` (or for ADMINs).
 */
export function canUseApplicationsTableView(
  journeyState?: JourneyStateLike,
  user?: { role?: string } | null,
  totalAppsCount?: number,
): boolean {
  if (user?.role === "ADMIN") return true;
  if (typeof totalAppsCount === "number" && totalAppsCount >= 10) return true;
  const state = extractState(journeyState);
  if (!state) return false;
  return (
    state.canUseTableView === true ||
    (state.completedNodeCodes ?? []).includes("W1_M1") ||
    state.currentWeek >= 2
  );
}

/**
 * Tailored Application checkbox (`isTailored`) is shown starting from Week 2 (`currentWeek >= 2`)
 * or once `W1_REVIEW` is completed (or for ADMINs).
 */
export function canAddTailoredApplication(
  journeyState?: JourneyStateLike,
  user?: { role?: string } | null,
): boolean {
  if (user?.role === "ADMIN") return true;
  const state = extractState(journeyState);
  if (!state) return false;
  return (
    state.currentWeek >= 2 ||
    (state.completedNodeCodes ?? []).includes("W1_REVIEW")
  );
}

/**
 * Only ACTIVE nodes allow user submission / interaction.
 * COMPLETED nodes are read-only, and LOCKED_BLURRED nodes have Fog of War applied.
 */
export function isNodeInteractive(
  node?: Pick<EnrichedJourneyNode, "status"> | { status?: JourneyNodeStatus } | null,
): boolean {
  return node?.status === "ACTIVE";
}

