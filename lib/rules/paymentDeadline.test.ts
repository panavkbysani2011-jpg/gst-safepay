import { describe, expect, it } from "vitest";
import { assessPaymentRisk } from "./paymentDeadline";
import { DEFAULT_PAYMENT_RULE_CONFIG, type Bill, type Vendor } from "./types";

const ASOF = "2026-07-02";

function vendor(overrides: Partial<Vendor> = {}): Vendor {
  return {
    id: "v1",
    name: "Test Vendor",
    gstin: "29ABCDE1234F1Z5",
    gstinActive: true,
    udyamRegistered: true,
    udyamCategory: "micro",
    ...overrides,
  };
}

function bill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "b1",
    vendorId: "v1",
    invoiceAcceptanceDate: "2026-06-01",
    amount: 100000,
    hasWrittenAgreement: true,
    agreedPaymentDays: 45,
    paidDate: null,
    ...overrides,
  };
}

describe("assessPaymentRisk", () => {
  it("is not applicable when the vendor is not Udyam-registered", () => {
    const result = assessPaymentRisk(
      vendor({ udyamRegistered: false, udyamCategory: null }),
      bill(),
      ASOF,
      DEFAULT_PAYMENT_RULE_CONFIG
    );
    expect(result.applicable).toBe(false);
    expect(result.status).toBe("not-applicable");
    expect(result.taxDeductionAtRisk).toBe(0);
  });

  it("is not applicable for a medium-enterprise vendor (43B(h) only covers micro/small)", () => {
    const result = assessPaymentRisk(
      vendor({ udyamCategory: "medium" }),
      bill(),
      ASOF,
      DEFAULT_PAYMENT_RULE_CONFIG
    );
    expect(result.applicable).toBe(false);
  });

  it("caps the deadline at 45 days even if the contract agrees to a longer term", () => {
    const result = assessPaymentRisk(
      vendor(),
      bill({ agreedPaymentDays: 60 }),
      ASOF,
      DEFAULT_PAYMENT_RULE_CONFIG
    );
    expect(result.deadlineDays).toBe(45);
  });

  it("uses the 15-day deadline when there is no written agreement", () => {
    const result = assessPaymentRisk(
      vendor(),
      bill({ hasWrittenAgreement: false, agreedPaymentDays: null }),
      ASOF,
      DEFAULT_PAYMENT_RULE_CONFIG
    );
    expect(result.deadlineDays).toBe(15);
  });

  it("marks a bill 'safe' when well within the deadline", () => {
    const result = assessPaymentRisk(
      vendor(),
      bill({ invoiceAcceptanceDate: "2026-06-25" }),
      ASOF,
      DEFAULT_PAYMENT_RULE_CONFIG
    );
    // accepted 2026-06-25, 45-day deadline -> due 2026-08-09; asOf 2026-07-02 -> ~38 days left
    expect(result.status).toBe("safe");
    expect(result.totalCostOfDelay).toBe(0);
  });

  it("marks a bill 'due-soon' within the 7-day warning window", () => {
    const result = assessPaymentRisk(
      vendor(),
      bill({ invoiceAcceptanceDate: "2026-05-20" }),
      ASOF,
      DEFAULT_PAYMENT_RULE_CONFIG
    );
    // accepted 2026-05-20 + 45 days -> due 2026-07-04; asOf 2026-07-02 -> 2 days left
    expect(result.status).toBe("due-soon");
    expect(result.daysRemaining).toBe(2);
  });

  it("marks an unpaid, past-deadline bill 'breached' and charges the full deduction + interest", () => {
    const result = assessPaymentRisk(
      vendor(),
      bill({ invoiceAcceptanceDate: "2026-04-01" }),
      ASOF,
      DEFAULT_PAYMENT_RULE_CONFIG
    );
    // accepted 2026-04-01 + 45 days -> due 2026-05-16; asOf 2026-07-02 is well past
    expect(result.status).toBe("breached");
    expect(result.taxDeductionAtRisk).toBe(100000 * 0.25);
    expect(result.projectedInterestCost).toBeGreaterThan(0);
    expect(result.totalCostOfDelay).toBe(
      result.taxDeductionAtRisk + result.projectedInterestCost
    );
  });

  it("marks a bill paid within the deadline as 'paid-on-time' with zero cost", () => {
    const result = assessPaymentRisk(
      vendor(),
      bill({ invoiceAcceptanceDate: "2026-06-01", paidDate: "2026-06-20" }),
      ASOF,
      DEFAULT_PAYMENT_RULE_CONFIG
    );
    expect(result.status).toBe("paid-on-time");
    expect(result.totalCostOfDelay).toBe(0);
  });

  it("marks a bill paid after the deadline as 'paid-late' — the deduction loss is permanent even though it's since been paid", () => {
    const result = assessPaymentRisk(
      vendor(),
      bill({ invoiceAcceptanceDate: "2026-04-01", paidDate: "2026-06-01" }),
      ASOF,
      DEFAULT_PAYMENT_RULE_CONFIG
    );
    expect(result.status).toBe("paid-late");
    expect(result.taxDeductionAtRisk).toBe(100000 * 0.25);
    expect(result.projectedInterestCost).toBeGreaterThan(0);
  });
});
