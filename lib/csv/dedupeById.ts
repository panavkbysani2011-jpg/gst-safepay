// Every import upserts by (ownerId, id), so two rows in one file that share an
// id collapse into a single database row: the second silently overwrites the
// first. That made the "Imported N" count (rows in the file) disagree with the
// vendor/bill count shown on the page (rows in the database), and worse, for a
// bills file it meant a real money row could vanish without a word.
//
// Deduplicating up front, last-wins to match the upsert, lets us report the
// honest count AND tell the user a merge happened instead of losing a row
// quietly.

export interface DedupeResult<T> {
  /** Distinct rows, keeping the last occurrence of each id. */
  rows: T[];
  /** How many rows were dropped because an earlier row had the same id. */
  duplicateCount: number;
}

export function dedupeById<T extends { id: string }>(rows: readonly T[]): DedupeResult<T> {
  const byId = new Map<string, T>();
  let duplicateCount = 0;
  for (const row of rows) {
    if (byId.has(row.id)) duplicateCount += 1;
    byId.set(row.id, row); // last wins, matching the DB upsert
  }
  return { rows: Array.from(byId.values()), duplicateCount };
}

/**
 * A sentence to append to an import message when rows were merged, or "" when
 * none were. Leading space so it can be concatenated after the main message.
 */
export function duplicateNote(duplicateCount: number): string {
  if (duplicateCount <= 0) return "";
  const one = duplicateCount === 1;
  return ` ${duplicateCount} row${one ? "" : "s"} shared an id with another and ${
    one ? "was" : "were"
  } merged, keeping the last.`;
}
