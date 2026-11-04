import { apiClient, ApiError } from "../../../lib/api-client";
import type { Command, LibraryDocument } from "../domain/types";
import type { LearningRepository } from "./repository";
const path = "/admin/learning-library";
export async function openAccountRepository(
  owner: string,
): Promise<LearningRepository> {
  const channel = new BroadcastChannel("nawah.learning.account." + owner),
    listeners = new Set<() => void>();
  channel.onmessage = () => listeners.forEach((fn) => fn());
  let pending: { key: string; command: Command } | null = null;
  return {
    mode: "account",
    load: () => apiClient.get<LibraryDocument>(path),
    commit: async (expectedRevision, command) => {
      const key = JSON.stringify({
        expectedRevision,
        type: command.type,
        payload: command.payload,
      });
      if (pending?.key === key) command = pending.command;
      else pending = { key, command };
      try {
        const result = await apiClient.post<LibraryDocument>(
          path + (command.type === "restore" ? "/restore" : "/commands"),
          { expectedRevision, command },
        );
        pending = null;
        channel.postMessage({ revision: result.revision });
        return result;
      } catch (error) {
        if (error instanceof ApiError) {
          const code = (error.details as { code?: string })?.code;
          if (error.status === 409) throw Error(code || "REVISION_CONFLICT");
          throw Error(code || "SAVE_FAILED");
        }
        throw Error("SAVE_FAILED");
      }
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    close: () => {
      channel.close();
      listeners.clear();
      pending = null;
    },
  };
}
