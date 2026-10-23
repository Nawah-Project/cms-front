import { QueryClient, type QueryClientConfig } from "@tanstack/react-query";

export function createQueryClient(config: Partial<QueryClientConfig> = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
    ...config,
  });
}

export const queryClient = createQueryClient();

