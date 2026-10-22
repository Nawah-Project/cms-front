export const OPEN_JOURNEY_TASKS_PANEL_EVENT =
  "nawah:open-journey-tasks-panel";

export function openJourneyTasksPanel() {
  window.dispatchEvent(new Event(OPEN_JOURNEY_TASKS_PANEL_EVENT));
}
