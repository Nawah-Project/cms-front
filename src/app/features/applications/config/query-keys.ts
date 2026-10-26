export interface ApplicationListFilters {
  createdFrom?: string;
  createdBefore?: string;
  stage?: string;
  outcome?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const applicationQueryKeys = {
  all: ["applications"] as const,
  lists: () => [...applicationQueryKeys.all, "list"] as const,
  list: (filters?: ApplicationListFilters) =>
    [...applicationQueryKeys.lists(), filters ?? {}] as const,
  details: () => [...applicationQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...applicationQueryKeys.details(), id] as const,
  stats: () => [...applicationQueryKeys.all, "stats"] as const,
};

