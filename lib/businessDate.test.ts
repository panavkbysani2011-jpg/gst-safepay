import { describe, it, expect } from "vitest";
import { todayInBusinessZone, BUSINESS_TIME_ZONE } from "./businessDate";

describe("todayInBusinessZone", () => {
  it("uses Indian statutory time", () => {
    expect(BUSINESS_TIME_ZONE).toBe("Asia/Kolkata");
  });

  it("returns the INDIAN day, not the UTC day, in the early-morning window", () => {
    // 20:30 UTC on 16 July is already 02:00 IST on 17 July. The old UTC-based
    // code returned "2026-07-16" here, making every countdown a day too generous.
    const instant = new Date("2026-07-16T20:30:00Z");
    expect(instant.toISOString().slice(0, 10)).toBe("2026-07-16"); // the old, wrong answer
    expect(todayInBusinessZone(instant)).toBe("2026-07-17"); // the Indian day
  });

  it("rolls over exactly at IST midnight, not UTC midnight", () => {
    // 18:29:59 UTC = 23:59:59 IST, still the 16th in India.
    expect(todayInBusinessZone(new Date("2026-07-16T18:29:59Z"))).toBe("2026-07-16");
    // 18:30:00 UTC = 00:00:00 IST on the 17th.
    expect(todayInBusinessZone(new Date("2026-07-16T18:30:00Z"))).toBe("2026-07-17");
  });

  it("agrees with UTC during Indian working hours", () => {
    // 10:00 UTC = 15:30 IST, same calendar day either way.
    expect(todayInBusinessZone(new Date("2026-07-16T10:00:00Z"))).toBe("2026-07-16");
  });

  it("always returns a valid ISO date the rule engines accept", () => {
    for (const iso of [
      "2026-01-01T00:00:00Z",
      "2026-12-31T23:59:59Z",
      "2026-03-15T18:45:00Z",
    ]) {
      expect(todayInBusinessZone(new Date(iso))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("crosses a year boundary in Indian time", () => {
    // 19:00 UTC on 31 Dec = 00:30 IST on 1 Jan.
    expect(todayInBusinessZone(new Date("2026-12-31T19:00:00Z"))).toBe("2027-01-01");
  });

  it("reads the real clock when given no argument", () => {
    expect(todayInBusinessZone()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
