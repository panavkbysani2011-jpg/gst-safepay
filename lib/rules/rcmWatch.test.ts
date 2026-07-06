import { describe, expect, it } from "vitest";
import { assessRcmPurchase, summarizeRcm } from "./rcmWatch";
import { DEFAULT_RCM_RULE_CONFIG, type RcmPurchase } from "./types";

// Fixed reference date for all scenarios.
//   Self-invoice deadline (Rule 47A) = supplyDate + 30 days.
//   Time of supply = supplyDate + 30 (goods) / 60 (services);
//   RCM cash tax is due on the 20th of the month AFTER the tax period (month of ToS).
const ASOF = "2026-07-15";

function purchase(overrides: Partial<RcmPurchase> = {}): RcmPurchase {
  return {
    id: "r1",
    vendorId: "v1",
    supplierUnregistered: true,
    supplyType: "goods",
    supplyDate: "2026-07-01",
    rcmTaxAmount: 100000,
    selfInvoiceIssued: false,
    rcmTaxPaidDate: null,
    ...overrides,
  };
}

describe("assessRcmPurchase — self-invoice (Rule 47A)", () => {
  it("is not applicable when the supplier is registered (self-invoice only for unregistered)", () => {
    const r = assessRcmPurchase(
      purchase({ supplierUnregistered: false }),
      ASOF,
      DEFAULT_RCM_RULE_CONFIG
    );
    expect(r.selfInvoiceApplicable).toBe(false);
    expect(r.selfInvoiceStatus).toBe("not-applicable");
    expect(r.selfInvoiceDeadline).toBeNull();
  });

  it("derives the self-invoice deadline as supplyDate + 30 days", () => {
    const r = assessRcmPurchase(
      purchase({ supplyDate: "2026-05-01" }),
      ASOF,
      DEFAULT_RCM_RULE_CONFIG
    );
    expect(r.selfInvoiceDeadline).toBe("2026-05-31");
  });

  it("marks the self-invoice 'safe' when comfortably before the deadline", () => {
    const r = assessRcmPurchase(purchase(), ASOF, DEFAULT_RCM_RULE_CONFIG);
    // supplyDate 2026-07-01 -> deadline 2026-07-31; asOf 2026-07-15 -> 16 days
    expect(r.selfInvoiceStatus).toBe("safe");
    expect(r.penaltyExposure).toBe(0);
  });

  it("marks the self-invoice 'due-soon' inside the warning window", () => {
    const r = assessRcmPurchase(
      purchase({ supplyDate: "2026-06-20" }),
      ASOF,
      DEFAULT_RCM_RULE_CONFIG
    );
    // deadline 2026-07-20; asOf 2026-07-15 -> 5 days
    expect(r.selfInvoiceStatus).toBe("due-soon");
  });

  it("marks a missed self-invoice 'overdue' and charges the s.122 penalty", () => {
    const r = assessRcmPurchase(
      purchase({ supplyDate: "2026-05-01" }),
      ASOF,
      DEFAULT_RCM_RULE_CONFIG
    );
    // deadline 2026-05-31; asOf 2026-07-15 -> overdue
    expect(r.selfInvoiceStatus).toBe("overdue");
    expect(r.penaltyExposure).toBe(10000);
  });

  it("marks an issued self-invoice 'issued' with no penalty", () => {
    const r = assessRcmPurchase(
      purchase({ supplyDate: "2026-05-01", selfInvoiceIssued: true }),
      ASOF,
      DEFAULT_RCM_RULE_CONFIG
    );
    expect(r.selfInvoiceStatus).toBe("issued");
    expect(r.penaltyExposure).toBe(0);
  });
});

describe("assessRcmPurchase — RCM cash tax", () => {
  it("uses a 30-day time-of-supply for goods and a 20th-of-next-month payment due date", () => {
    const r = assessRcmPurchase(
      purchase({ supplyType: "goods", supplyDate: "2026-04-01" }),
      ASOF,
      DEFAULT_RCM_RULE_CONFIG
    );
    // ToS 2026-05-01 -> period 2026-05 -> due 2026-06-20
    expect(r.timeOfSupply).toBe("2026-05-01");
    expect(r.rcmPaymentDueDate).toBe("2026-06-20");
  });

  it("uses a 60-day time-of-supply for services", () => {
    const r = assessRcmPurchase(
      purchase({ supplyType: "services", supplyDate: "2026-05-01" }),
      ASOF,
      DEFAULT_RCM_RULE_CONFIG
    );
    // ToS 2026-06-30 -> period 2026-06 -> due 2026-07-20
    expect(r.timeOfSupply).toBe("2026-06-30");
    expect(r.rcmPaymentDueDate).toBe("2026-07-20");
  });

  it("flags unpaid RCM tax as 'safe' when the due date is far off, and shows the cash owed", () => {
    const r = assessRcmPurchase(purchase(), ASOF, DEFAULT_RCM_RULE_CONFIG);
    // supplyDate 2026-07-01 goods -> ToS 2026-07-31 -> due 2026-08-20 (far)
    expect(r.rcmPaymentStatus).toBe("safe");
    expect(r.rcmTaxDueInCash).toBe(100000);
    expect(r.projectedInterestCost).toBe(0);
  });

  it("charges 18% interest on unpaid, overdue RCM tax", () => {
    const r = assessRcmPurchase(
      purchase({ supplyDate: "2026-04-01" }),
      ASOF,
      DEFAULT_RCM_RULE_CONFIG
    );
    // due 2026-06-20; asOf 2026-07-15 -> 25 days late. 100000 * 18% * 25/365.
    expect(r.rcmPaymentStatus).toBe("overdue");
    expect(r.projectedInterestCost).toBeCloseTo(1232.88, 1);
    expect(r.rcmTaxDueInCash).toBe(100000);
  });

  it("marks RCM tax paid before the due date 'paid-on-time' with no interest", () => {
    const r = assessRcmPurchase(
      purchase({ supplyDate: "2026-07-01", rcmTaxPaidDate: "2026-08-10" }),
      ASOF,
      DEFAULT_RCM_RULE_CONFIG
    );
    // due 2026-08-20, paid 2026-08-10
    expect(r.rcmPaymentStatus).toBe("paid-on-time");
    expect(r.projectedInterestCost).toBe(0);
    expect(r.rcmTaxDueInCash).toBe(0);
  });

  it("marks RCM tax paid after the due date 'paid-late' and charges interest for the delay", () => {
    const r = assessRcmPurchase(
      purchase({ supplyDate: "2026-04-01", rcmTaxPaidDate: "2026-07-01" }),
      ASOF,
      DEFAULT_RCM_RULE_CONFIG
    );
    // due 2026-06-20, paid 2026-07-01 -> 11 days late. 100000 * 18% * 11/365.
    expect(r.rcmPaymentStatus).toBe("paid-late");
    expect(r.projectedInterestCost).toBeCloseTo(542.47, 1);
    expect(r.rcmTaxDueInCash).toBe(0);
  });
});

describe("summarizeRcm", () => {
  it("aggregates self-invoice, cash-due, interest and penalty exposure", () => {
    const purchases: RcmPurchase[] = [
      purchase({ id: "a", supplyDate: "2026-05-01" }), // self-invoice overdue (+10k penalty), payment overdue (interest)
      purchase({ id: "b", supplyDate: "2026-07-01" }), // all safe, cash 100000 owed
      purchase({
        id: "c",
        supplierUnregistered: false,
        supplyDate: "2026-07-01",
        rcmTaxAmount: 50000,
      }), // registered: no self-invoice; cash 50000 owed
    ];

    const s = summarizeRcm(purchases, ASOF, DEFAULT_RCM_RULE_CONFIG);

    expect(s.totalPurchases).toBe(3);
    expect(s.selfInvoicesOverdueCount).toBe(1); // a
    expect(s.totalRcmCashDue).toBe(100000 + 100000 + 50000); // all three unpaid
    expect(s.totalPenaltyExposure).toBe(10000); // a
    expect(s.totalInterestExposure).toBeGreaterThan(0); // a's overdue payment
  });
});

describe("assessRcmPurchase — boundaries and overrides", () => {
  // ASOF 2026-07-15; self-invoice window 7 days; selfInvoiceDays 30.
  it("marks the self-invoice 'due-soon' exactly on the deadline day (0 days left)", () => {
    // supplyDate 2026-06-15 + 30 -> deadline 2026-07-15 == ASOF
    const r = assessRcmPurchase(
      purchase({ supplyDate: "2026-06-15" }),
      ASOF,
      DEFAULT_RCM_RULE_CONFIG
    );
    expect(r.selfInvoiceDeadline).toBe("2026-07-15");
    expect(r.selfInvoiceStatus).toBe("due-soon");
    expect(r.penaltyExposure).toBe(0);
  });

  it("marks the self-invoice 'overdue' one day after the deadline", () => {
    // supplyDate 2026-06-14 + 30 -> deadline 2026-07-14, one day before ASOF
    const r = assessRcmPurchase(
      purchase({ supplyDate: "2026-06-14" }),
      ASOF,
      DEFAULT_RCM_RULE_CONFIG
    );
    expect(r.selfInvoiceDeadline).toBe("2026-07-14");
    expect(r.selfInvoiceStatus).toBe("overdue");
    expect(r.penaltyExposure).toBe(10000);
  });

  it("marks RCM tax paid exactly on the due date 'paid-on-time'", () => {
    // goods supply 2026-04-01 -> ToS 2026-05-01 -> due 2026-06-20; pay same day
    const r = assessRcmPurchase(
      purchase({ supplyDate: "2026-04-01", rcmTaxPaidDate: "2026-06-20" }),
      ASOF,
      DEFAULT_RCM_RULE_CONFIG
    );
    expect(r.rcmPaymentDueDate).toBe("2026-06-20");
    expect(r.rcmPaymentStatus).toBe("paid-on-time");
    expect(r.projectedInterestCost).toBe(0);
  });

  it("rolls the services time-of-supply across a year boundary", () => {
    // services supply 2026-11-15 + 60 -> ToS 2027-01-14 -> due 2027-02-20
    const r = assessRcmPurchase(
      purchase({ supplyType: "services", supplyDate: "2026-11-15" }),
      ASOF,
      DEFAULT_RCM_RULE_CONFIG
    );
    expect(r.timeOfSupply).toBe("2027-01-14");
    expect(r.rcmPaymentDueDate).toBe("2027-02-20");
  });

  it("respects a CA-configured self-invoice window", () => {
    const cfg = { ...DEFAULT_RCM_RULE_CONFIG, selfInvoiceDays: 15 };
    // supply 2026-07-01 + 15 -> deadline 2026-07-16
    const r = assessRcmPurchase(
      purchase({ supplyDate: "2026-07-01" }),
      ASOF,
      cfg
    );
    expect(r.selfInvoiceDeadline).toBe("2026-07-16");
  });

  it("summarizes an empty purchase list to zeros", () => {
    const s = summarizeRcm([], ASOF, DEFAULT_RCM_RULE_CONFIG);
    expect(s.totalPurchases).toBe(0);
    expect(s.totalRcmCashDue).toBe(0);
    expect(s.totalPenaltyExposure).toBe(0);
    expect(s.totalInterestExposure).toBe(0);
  });
});
