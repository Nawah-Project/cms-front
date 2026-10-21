import type { JourneyStateResponse } from "../types";

export function celebrateJourneyUnlocks(
  prev: JourneyStateResponse | undefined,
  next: JourneyStateResponse | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
  locale: string,
  showToast: (opts: {
    message: string;
    variant?: "success" | "info" | "error";
    duration?: number;
  }) => void,
) {
  if (!prev?.state || !next?.state) return;

  const prevCompleted = new Set(prev.state.completedNodeCodes ?? []);
  const nextCompleted = new Set(next.state.completedNodeCodes ?? []);

  // Check if Group unlocked
  if (!prev.state.isGroupUnlocked && next.state.isGroupUnlocked) {
    showToast({
      message: t("journey.toastGroupUnlocked"),
      variant: "success",
      duration: 6000,
    });
    return;
  }

  // Check if Table View unlocked (W1_M1 completed)
  if (!prevCompleted.has("W1_M1") && nextCompleted.has("W1_M1")) {
    showToast({
      message: t("journey.toastTableViewUnlocked"),
      variant: "success",
      duration: 6000,
    });
    return;
  }

  // Check if any node newly completed
  const newlyCompletedCode = (next.state.completedNodeCodes ?? []).find(
    (code) => !prevCompleted.has(code),
  );
  if (newlyCompletedCode) {
    const completedNode = next.nodes.find((n) => n.code === newlyCompletedCode);
    const title = completedNode
      ? locale === "ar"
        ? completedNode.titleAr
        : completedNode.titleEn
      : newlyCompletedCode;
    showToast({
      message: t("journey.toastNodeCompleted", { title }),
      variant: "success",
      duration: 5500,
    });
    return;
  }

  // Check if any insight newly unlocked
  const prevInsights = new Set(prev.state.unlockedInsightCodes ?? []);
  const newlyUnlockedInsight = (next.state.unlockedInsightCodes ?? []).find(
    (code) => !prevInsights.has(code),
  );
  if (newlyUnlockedInsight) {
    showToast({
      message: t("journey.toastInsightUnlocked"),
      variant: "info",
      duration: 5500,
    });
  }
}
