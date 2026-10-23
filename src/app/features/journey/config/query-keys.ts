export const journeyQueryKeys = {
  all: ["journey"] as const,
  state: () => [...journeyQueryKeys.all, "state"] as const,
  sideTasks: (filters?: { week?: number; nodeCode?: string }) =>
    [...journeyQueryKeys.all, "side-tasks", filters ?? {}] as const,
  compass: (locationFilter?: string) =>
    [
      ...journeyQueryKeys.all,
      "compass",
      locationFilter?.trim() || "default",
    ] as const,
};

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  list: (limit?: number) =>
    [...notificationQueryKeys.all, "list", limit ?? 30] as const,
};

