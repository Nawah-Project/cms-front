import type { QueryClient } from "@tanstack/react-query";
export function clearPrivateAccountCache(client: QueryClient) {
  void client.cancelQueries();
  client.clear();
}
