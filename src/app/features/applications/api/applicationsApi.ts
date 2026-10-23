import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../services/api";
import type {
  Application,
  CreateApplicationInput,
  UpdateApplicationInput,
} from "../../../types";
import {
  journeyQueryKeys,
  notificationQueryKeys,
} from "../../journey/config/query-keys";
import {
  applicationQueryKeys,
  type ApplicationListFilters,
} from "../config/query-keys";

export const applicationsApi = {
  getApplications: (filters?: ApplicationListFilters) =>
    api.getApplications(filters),
  getApplication: (id: string) => api.getApplication(id),
  createApplication: (input: CreateApplicationInput) =>
    api.createApplication(input),
  updateApplication: (id: string, updates: UpdateApplicationInput) =>
    api.updateApplication(id, updates),
  deleteApplication: (id: string) => api.deleteApplication(id),
  getDashboardStats: () => api.getDashboardStats(),
};

export function useApplications(filters?: ApplicationListFilters) {
  return useQuery({
    queryKey: applicationQueryKeys.list(filters),
    queryFn: () => applicationsApi.getApplications(filters),
  });
}

export function useApplication(id?: string) {
  return useQuery({
    queryKey: applicationQueryKeys.detail(id ?? ""),
    queryFn: () => applicationsApi.getApplication(id!),
    enabled: Boolean(id),
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApplicationInput) =>
      applicationsApi.createApplication(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: journeyQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
      ]);
    },
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateApplicationInput;
    }) => applicationsApi.updateApplication(id, updates),
    onSuccess: async (updated: Application) => {
      queryClient.setQueryData(
        applicationQueryKeys.detail(updated.id),
        updated,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationQueryKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: applicationQueryKeys.stats() }),
        queryClient.invalidateQueries({ queryKey: journeyQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
      ]);
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => applicationsApi.deleteApplication(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: journeyQueryKeys.all }),
      ]);
    },
  });
}

