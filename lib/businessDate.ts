// The business clock.
//
// Every deadline this tool tracks (MSME 45-day, the GSTR-2B cutoff, GSTR-3B,
// filing due dates) is an Indian statutory date, so "today" must mean today in
// India — not on the server, and not wherever the user happens to be sitting.
// A CA in London checking an Indian client's deadlines still needs the Indian day.
//
// This previously used `new Date().toISOString().slice(0, 10)`, which is UTC.
// Between 00:00 and 05:30 IST that returns YESTERDAY, so the engines computed
// every countdown one day early and OVERSTATED the time remaining — telling a
// user they had 2 days when they had 1. Wrong in the dangerous direction, for
// ~5.5 hours of every day.

/** Indian statutory time. Deadlines are defined in law by this clock. */
export const BUSINESS_TIME_ZONE = "Asia/Kolkata";

const ISO_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Today's date in Indian time as ISO "YYYY-MM-DD" — the `asOf` every rule engine
 * measures against. Built from Intl parts rather than a locale's format string so
 * the shape can't shift with the runtime's locale data.
 *
 * @param now instant to read; defaults to the real clock. Injectable for tests.
 */
export function todayInBusinessZone(now: Date = new Date()): string {
  const parts = ISO_PARTS.formatToParts(now);
  const value = (type: string): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
