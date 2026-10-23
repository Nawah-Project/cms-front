export interface MilestoneCelebrationData {
  title: string;
  description: string;
  unlockedItems?: string[];
  ctaLabel?: string;
  ctaRoute?: string;
}

export const CELEBRATE_MILESTONE_EVENT = "nawah:celebrate-milestone";

export function dispatchMilestoneCelebration(data: MilestoneCelebrationData) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CELEBRATE_MILESTONE_EVENT, { detail: data }),
  );
}

