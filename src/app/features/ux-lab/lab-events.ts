let emitter: (name: string) => void = () => {};
export const trackSectionAction = (name: string) => emitter(name);
export function setSectionEmitter(next: (name: string) => void) {
  emitter = next;
  return () => {
    if (emitter === next) emitter = () => {};
  };
}
export const SECTION_ACTIONS: Record<string, string[]> = {
  home: [
    "home_continue_clicked",
    "home_station_opened",
    "home_scope_changed",
    "home_peer_opened",
  ],
  applications: ["application_created", "application_stage_updated"],
  development: ["feedback_read", "prompt_copied", "task_status_changed"],
  "members-progress": ["member_detail_loaded", "member_profile_loaded"],
  analytics: ["linked_applications_opened"],
  profile: ["profile_saved"],
  onboarding: ["onboarding_completed"],
};
