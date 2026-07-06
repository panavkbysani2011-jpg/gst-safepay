// Shared date helpers for the rule engines.
//
// Every module's money math counts *whole calendar days* between two dates.
// The engines are fed "YYYY-MM-DD" strings today, but they're exported pure
// functions — a caller passing a full timestamp (e.g. `new Date().toISOString()`)
// must not skew the count. So both sides are floored to their UTC calendar day
// before differencing: a deadline due "today" is always 0 days away, never -1,
// and the result never drifts with the server's timezone or DST.

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Midnight-UTC epoch ms for the calendar day of an ISO string. A date-only
 *  string and a same-day full timestamp collapse to the same value. */
function utcMidnight(iso: string): number {
  const d = new Date(iso);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Whole days from `fromIso` to `toIso` (negative when `toIso` is earlier). */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((utcMidnight(toIso) - utcMidnight(fromIso)) / MS_PER_DAY);
}

/** `iso` advanced by `days` days, as a "YYYY-MM-DD" string. UTC-based, so
 *  month/year boundaries and leap days roll over correctly. */
export function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
