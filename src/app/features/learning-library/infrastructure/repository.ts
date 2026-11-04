import type { Command, LibraryDocument } from "../domain/types";
export interface LearningRepository {
  readonly mode: "preview" | "account";
  load(): Promise<LibraryDocument>;
  commit(expectedRevision: number, command: Command): Promise<LibraryDocument>;
  subscribe(listener: () => void): () => void;
  close(): void;
}
