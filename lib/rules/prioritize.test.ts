import { describe, expect, it } from "vitest";
import { rankBillsByRisk } from "./prioritize";
import type { PaymentRiskAssessment } from "./types";

function risk(overrides: Partial<PaymentRiskAssessment>): PaymentRiskAssessment {
  return {
    billId: "b",
    applicable: true,
    deadlineDays: 45,
    dueDate: "2026-07-10",
    daysRemaining: 5,
    status: "due-soon",
    taxDeductionAtRisk: 0,
    projectedInterestCost: 0,
    totalCostOfDelay: 0,
    ...overrides,
  };
}

describe("rankBillsByRisk", () => {
  it("puts breached bills with the highest money at risk first", () => {
    const ranked = rankBillsByRisk([
      risk({ billId: "small-breach", status: "breached", totalCostOfDelay: 5000 }),
      risk({ billId: "big-breach", status: "breached", totalCostOfDelay: 50000 }),
      risk({ billId: "due-soon", status: "due-soon", totalCostOfDelay: 0, daysRemaining: 2 }),
    ]);

    expect(ranked.map((r) => r.billId)).toEqual([
      "big-breach",
      "small-breach",
      "due-soon",
    ]);
  });

  it("ranks due-soon bills by urgency (fewer days remaining first) when nothing is breached yet", () => {
    const ranked = rankBillsByRisk([
      risk({ billId: "5-days", status: "due-soon", daysRemaining: 5 }),
      risk({ billId: "1-day", status: "due-soon", daysRemaining: 1 }),
      risk({ billId: "3-days", status: "due-soon", daysRemaining: 3 }),
    ]);

    expect(ranked.map((r) => r.billId)).toEqual(["1-day", "3-days", "5-days"]);
  });

  it("excludes not-applicable, paid-on-time, and safe bills from the action list", () => {
    const ranked = rankBillsByRisk([
      risk({ billId: "not-applicable", status: "not-applicable" }),
      risk({ billId: "paid-on-time", status: "paid-on-time" }),
      risk({ billId: "safe", status: "safe", daysRemaining: 30 }),
      risk({ billId: "due-soon", status: "due-soon", daysRemaining: 4 }),
    ]);

    expect(ranked.map((r) => r.billId)).toEqual(["due-soon"]);
  });

  it("places paid-late bills alongside breached ones, ranked by cost", () => {
    const ranked = rankBillsByRisk([
      risk({ billId: "paid-late", status: "paid-late", totalCostOfDelay: 8000 }),
      risk({ billId: "breached", status: "breached", totalCostOfDelay: 20000 }),
    ]);

    expect(ranked.map((r) => r.billId)).toEqual(["breached", "paid-late"]);
  });

  it("returns an empty list when given no bills", () => {
    expect(rankBillsByRisk([])).toEqual([]);
  });
});
