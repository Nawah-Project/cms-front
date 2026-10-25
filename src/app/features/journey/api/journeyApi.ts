import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../lib/api-client";
import { journeyQueryKeys, notificationQueryKeys } from "../config/query-keys";
import type {
  AppNotification,
  CreateSideTaskInput,
  JobMarketCompassResponse,
  JourneyStateResponse,
  NotificationsListResponse,
  SideTaskSubmission,
  UserJourneyState,
} from "../types";

export const journeyApi = {
  markInsightRead(code: string): Promise<UserJourneyState> {
    return apiClient.post(`/journey/insights/${encodeURIComponent(code)}/read`);
  },
  getJourneyState(): Promise<JourneyStateResponse> {
    return apiClient.get<JourneyStateResponse>("/journey/state");
  },

  submitSideTask(input: CreateSideTaskInput): Promise<{
    submission: SideTaskSubmission;
    journeyState: UserJourneyState;
  }> {
    return apiClient.post<{
      submission: SideTaskSubmission;
      journeyState: UserJourneyState;
    }>("/journey/side-tasks", input);
  },

  getSideTasks(filters?: {
    week?: number;
    nodeCode?: string;
  }): Promise<SideTaskSubmission[]> {
    const query = new URLSearchParams();
    if (filters?.week !== undefined) query.set("week", String(filters.week));
    if (filters?.nodeCode) query.set("nodeCode", filters.nodeCode);
    const qs = query.toString();
    return apiClient.get<SideTaskSubmission[]>(
      `/journey/side-tasks${qs ? `?${qs}` : ""}`,
    );
  },

  getJobMarketCompass(
    locationFilter?: string,
  ): Promise<JobMarketCompassResponse> {
    const query = new URLSearchParams();
    if (locationFilter?.trim()) {
      query.set("location", locationFilter.trim());
    }
    const qs = query.toString();
    return apiClient.get<JobMarketCompassResponse>(
      `/journey/compass${qs ? `?${qs}` : ""}`,
    );
  },

  getNotifications(limit = 30): Promise<NotificationsListResponse> {
    return apiClient.get<NotificationsListResponse>(
      `/notifications?limit=${limit}`,
    );
  },

  markNotificationRead(id: string): Promise<AppNotification> {
    return apiClient.patch<AppNotification>(`/notifications/${id}/read`);
  },

  markAllNotificationsRead(): Promise<{ updatedCount: number }> {
    return apiClient.post<{ updatedCount: number }>("/notifications/read-all");
  },
};

export function useJourneyState(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: journeyQueryKeys.state(),
    queryFn: () => journeyApi.getJourneyState(),
    enabled: options?.enabled ?? true,
  });
}

export function useSubmitSideTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSideTaskInput) =>
      journeyApi.submitSideTask(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: journeyQueryKeys.all });
      void queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.all,
      });
    },
  });
}

export function useSideTasks(
  filters?: { week?: number; nodeCode?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: journeyQueryKeys.sideTasks(filters),
    queryFn: () => journeyApi.getSideTasks(filters),
    enabled: options?.enabled ?? true,
  });
}

export function useJobMarketCompass(
  locationFilter?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: journeyQueryKeys.compass(locationFilter),
    queryFn: () => journeyApi.getJobMarketCompass(locationFilter),
    enabled: options?.enabled ?? true,
  });
}

export function useNotifications(limit = 30, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: notificationQueryKeys.list(limit),
    queryFn: () => journeyApi.getNotifications(limit),
    enabled: options?.enabled ?? true,
    refetchInterval: 45_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => journeyApi.markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.all,
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => journeyApi.markAllNotificationsRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.all,
      });
    },
  });
}
