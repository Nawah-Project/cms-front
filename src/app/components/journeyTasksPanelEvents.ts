export const OPEN_JOURNEY_TASKS_PANEL_EVENT = "nawah:open-journey-tasks-panel";
export const CLOSE_JOURNEY_TASKS_PANEL_EVENT =
  "nawah:close-journey-tasks-panel";

export function openJourneyTasksPanel(code?: string, week?: number) {
  window.dispatchEvent(
    new CustomEvent(OPEN_JOURNEY_TASKS_PANEL_EVENT, { detail: { code, week } }),
  );
}

export function closeJourneyTasksPanel() {
  window.dispatchEvent(new Event(CLOSE_JOURNEY_TASKS_PANEL_EVENT));
}
