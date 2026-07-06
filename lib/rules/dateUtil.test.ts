import { describe, expect, it } from "vitest";
import { addDays, daysBetween } from "./dateUtil";

describe("daysBetween", () => {
  it("counts whole days between two date-only strings", () => {
    expect(daysBetween("2026-07-01", "2026-07-08")).toBe(7);
  });

  it("is negative when the target is earlier", () => {
    expect(daysBetween("2026-07-08", "2026-07-01")).toBe(-7);
  });

  it("is 0 for the same day", () => {
    expect(daysBetween("2026-07-06", "2026-07-06")).toBe(0);
  });

  it("counts across a month boundary", () => {
    expect(daysBetween("2026-01-31", "2026-02-01")).toBe(1);
  });

  it("counts across a leap day (2028 is a leap year)", () => {
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2); // 28 -> 29 -> Mar 1
  });

  it("counts across a non-leap February", () => {
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
  });

  // Regression guard: these are exported functions. If a caller ever passes a
  // full ISO timestamp instead of a date, a deadline due "today" must still read
  // as 0 days away, never -1 (which would wrongly flip it to overdue).
  it("ignores a time component: a same-day timestamp is 0 days, not -1", () => {
    expect(daysBetween("2026-07-06T18:30:00.000Z", "2026-07-06")).toBe(0);
    expect(daysBetween("2026-07-06", "2026-07-06T23:59:59.000Z")).toBe(0);
  });

  it("ignores time components when counting across days", () => {
    expect(
      daysBetween("2026-07-06T18:30:00.000Z", "2026-07-13T02:00:00.000Z")
    ).toBe(7);
  });
});

describe("addDays", () => {
  it("adds days within a month", () => {
    expect(addDays("2026-07-01", 7)).toBe("2026-07-08");
  });

  it("rolls over a month boundary", () => {
    expect(addDays("2026-01-20", 45)).toBe("2026-03-06");
  });

  it("rolls over a year boundary", () => {
    expect(addDays("2026-12-20", 45)).toBe("2027-02-03");
  });

  it("lands on the leap day when adding into a leap February", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("skips the non-existent leap day in a common year", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("subtracts with a negative offset", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("drops any time component, returning a clean date", () => {
    expect(addDays("2026-07-06T18:30:00.000Z", 1)).toBe("2026-07-07");
  });
});
