import type {
  LibraryDocument,
  Command,
  Range,
  KnowledgeMap,
  Weekly,
} from "./types";
export class LearningError extends Error {
  code: string;
}
export function uid(): string;
export function blank(): LibraryDocument;
export function validate(document: unknown): LibraryDocument;
export function execute(
  document: LibraryDocument,
  command: Command,
): LibraryDocument;
export function mergeRanges(ranges: Range[], pages?: number): Range[];
export function rangeCount(ranges: Range[]): number;
export function coverage(
  document: LibraryDocument,
  editionId: string,
  required?: Range[],
): { completed: number; total: number; percent: number };
export function weekStats(
  document: LibraryDocument,
  from: string,
  until: string,
): Weekly;
export function visibleGraph(map: KnowledgeMap): {
  nodes: KnowledgeMap["nodes"];
  edges: KnowledgeMap["edges"];
};
export function arrangeGraph(map: KnowledgeMap): KnowledgeMap["nodes"];
