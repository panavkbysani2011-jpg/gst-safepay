// Setup progress for the Import page — pure state derivation.
//
// The import page previously showed five identical upload cards with no memory:
// nothing said which data you had already added, how much of it, or how far
// through setup you were. Each count is derived from what the account actually
// holds, so nothing needs separate progress tracking: import a file and its card
// ticks itself.

import type { ImportKind } from "./csv/fieldMapping";

export type ImportCounts = Record<ImportKind, number>;

export interface ImportKindStatus {
  kind: ImportKind;
  count: number;
  isAdded: boolean;
}

export interface ImportProgress {
  byKind: Record<ImportKind, ImportKindStatus>;
  /** How many of the data types have at least one row. */
  addedCount: number;
  total: number;
  /** 0..1, for the progress bar width. */
  fraction: number;
  allDone: boolean;
}

export const IMPORT_KINDS: ImportKind[] = [
  "vendors",
  "bills",
  "ims",
  "rcm",
  "compliance",
];

// A count only "counts" when it is a real, positive number — guards against
// NaN/Infinity/negatives so a bad input can never falsely tick a card.
function hasData(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

export function getImportProgress(counts: ImportCounts): ImportProgress {
  const byKind = {} as Record<ImportKind, ImportKindStatus>;
  let addedCount = 0;

  for (const kind of IMPORT_KINDS) {
    const raw = counts[kind];
    const isAdded = hasData(raw);
    byKind[kind] = { kind, count: isAdded ? raw : 0, isAdded };
    if (isAdded) addedCount += 1;
  }

  const total = IMPORT_KINDS.length;
  return {
    byKind,
    addedCount,
    total,
    fraction: total > 0 ? addedCount / total : 0,
    allDone: addedCount === total,
  };
}
