import { describe, expect, it } from "vitest";
import { formatDate, formatINR, subtractDaysIso } from "./format";

describe("formatINR", () => {
  it("uses the Indian digit grouping and the ₹ symbol", () => {
    expect(formatINR(100000)).toBe("₹1,00,000");
    expect(formatINR(12345678)).toBe("₹1,23,45,678");
  });

  it("rounds to whole rupees (no paise)", () => {
    expect(formatINR(1234.56)).toBe("₹1,235");
  });

  it("formats zero", () => {
    expect(formatINR(0)).toBe("₹0");
  });

  it("keeps the sign on a negative amount", () => {
    expect(formatINR(-5000)).toBe("-₹5,000");
  });
});

describe("formatDate", () => {
  it("formats an ISO date as 'D Mon YYYY'", () => {
    expect(formatDate("2026-05-27")).toBe("27 May 2026");
  });

  it("does not shift the day across time zones (parsed and formatted in UTC)", () => {
    expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
    expect(formatDate("2026-12-31")).toBe("31 Dec 2026");
  });
});

describe("subtractDaysIso", () => {
  it("subtracts days within a month", () => {
    expect(subtractDaysIso("2026-07-15", 5)).toBe("2026-07-10");
  });

  it("rolls back across a month boundary", () => {
    expect(subtractDaysIso("2026-03-01", 1)).toBe("2026-02-28");
  });

  it("lands on the leap day when rolling into a leap February", () => {
    expect(subtractDaysIso("2028-03-01", 1)).toBe("2028-02-29");
  });
});
