import { describe, expect, it } from "vitest";
import { assessImsInvoice, summarizeImsClose } from "./imsClose";
import { DEFAULT_IMS_RULE_CONFIG, type ImsInvoice } from "./types";

// Fixed reference date for all scenarios.
// GSTR-2B cutoff = 14th of the month AFTER the invoice's tax period.
//   taxPeriod "2026-05" -> cutoff 2026-06-14 (29 days BEFORE asOf -> missed)
//   taxPeriod "2026-06" -> cutoff 2026-07-14 (1 day AFTER asOf   -> imminent)
//   taxPeriod "2026-07" -> cutoff 2026-08-14 (32 days ahead      -> action-required)
const ASOF = "2026-07-13";

function invoice(overrides: Partial<ImsInvoice> = {}): ImsInvoice {
  return {
    id: "i1",
    vendorId: "v1",
    invoiceNo: "INV-001",
    taxPeriod: "2026-06",
    taxableValue: 500000,
    gstAmount: 90000,
    imsAction: "none",
    eligibility: "unsure",
    ...overrides,
  };
}

describe("assessImsInvoice", () => {
  it("derives the GSTR-2B cutoff as the 14th of the month after the tax period", () => {
    const result = assessImsInvoice(
      invoice({ taxPeriod: "2026-05" }),
      ASOF,
      DEFAULT_IMS_RULE_CONFIG
    );
    expect(result.cutoffDate).toBe("2026-06-14");
  });

  it("rolls the cutoff into the next year for a December tax period", () => {
    const result = assessImsInvoice(
      invoice({ taxPeriod: "2026-12" }),
      ASOF,
      DEFAULT_IMS_RULE_CONFIG
    );
    expect(result.cutoffDate).toBe("2027-01-14");
  });

  it("marks an accepted invoice 'accepted' with no ITC at risk", () => {
    const result = assessImsInvoice(
      invoice({ imsAction: "accept" }),
      ASOF,
      DEFAULT_IMS_RULE_CONFIG
    );
    expect(result.status).toBe("accepted");
    expect(result.itcAtRisk).toBe(0);
    expect(result.totalExposure).toBe(0);
  });

  it("marks a rejected invoice 'rejected' with no ITC at risk", () => {
    const result = assessImsInvoice(
      invoice({ imsAction: "reject" }),
      ASOF,
      DEFAULT_IMS_RULE_CONFIG
    );
    expect(result.status).toBe("rejected");
    expect(result.itcAtRisk).toBe(0);
  });

  it("marks a pending invoice 'pending' — carried forward, not in this month's 2B", () => {
    const result = assessImsInvoice(
      invoice({ imsAction: "pending" }),
      ASOF,
      DEFAULT_IMS_RULE_CONFIG
    );
    expect(result.status).toBe("pending");
    expect(result.itcAtRisk).toBe(0);
  });

  it("flags an unactioned invoice with a comfortably-ahead cutoff as 'action-required' with its full ITC at risk", () => {
    const result = assessImsInvoice(
      invoice({ taxPeriod: "2026-07", gstAmount: 50000 }),
      ASOF,
      DEFAULT_IMS_RULE_CONFIG
    );
    expect(result.status).toBe("action-required");
    expect(result.itcAtRisk).toBe(50000);
    expect(result.projectedInterestCost).toBe(0);
    expect(result.daysToCutoff).toBe(32);
  });

  it("flags an unactioned invoice inside the warning window as 'deemed-accept-imminent'", () => {
    const result = assessImsInvoice(
      invoice({ taxPeriod: "2026-06", gstAmount: 30000 }),
      ASOF,
      DEFAULT_IMS_RULE_CONFIG
    );
    expect(result.status).toBe("deemed-accept-imminent");
    expect(result.itcAtRisk).toBe(30000);
    expect(result.daysToCutoff).toBe(1);
  });

  it("flags an unactioned past-cutoff invoice as 'auto-accepted-missed' — ITC is now in 2B unverified", () => {
    const result = assessImsInvoice(
      invoice({ taxPeriod: "2026-05", gstAmount: 40000, eligibility: "unsure" }),
      ASOF,
      DEFAULT_IMS_RULE_CONFIG
    );
    expect(result.status).toBe("auto-accepted-missed");
    expect(result.itcAtRisk).toBe(40000);
    // Eligibility unknown -> no realized loss yet, only unverified ITC to review.
    expect(result.projectedInterestCost).toBe(0);
    expect(result.totalExposure).toBe(0);
  });

  it("charges 18% interest + reversible principal when an auto-accepted invoice is known-ineligible", () => {
    const result = assessImsInvoice(
      invoice({
        taxPeriod: "2026-05",
        gstAmount: 100000,
        eligibility: "ineligible",
      }),
      ASOF,
      DEFAULT_IMS_RULE_CONFIG
    );
    // cutoff 2026-06-14 -> 29 days before asOf. Interest = 100000 * 18% * 29/365.
    expect(result.status).toBe("auto-accepted-missed");
    expect(result.projectedInterestCost).toBeCloseTo(1430.14, 1);
    expect(result.totalExposure).toBeCloseTo(100000 + 1430.14, 1);
  });
});

describe("summarizeImsClose", () => {
  it("aggregates counts, ITC at risk, interest exposure, and the next cutoff", () => {
    const invoices: ImsInvoice[] = [
      invoice({ id: "a", imsAction: "accept", taxPeriod: "2026-06" }),
      invoice({ id: "b", taxPeriod: "2026-07", gstAmount: 50000 }), // action-required
      invoice({ id: "c", taxPeriod: "2026-06", gstAmount: 30000 }), // imminent
      invoice({ id: "d", taxPeriod: "2026-05", gstAmount: 40000, eligibility: "unsure" }), // missed
      invoice({ id: "e", taxPeriod: "2026-05", gstAmount: 100000, eligibility: "ineligible" }), // missed + interest
    ];

    const summary = summarizeImsClose(invoices, ASOF, DEFAULT_IMS_RULE_CONFIG);

    expect(summary.totalInvoices).toBe(5);
    expect(summary.actionRequiredCount).toBe(2); // b + c
    expect(summary.autoAcceptedMissedCount).toBe(2); // d + e
    expect(summary.totalItcAtRisk).toBe(50000 + 30000 + 40000 + 100000);
    expect(summary.totalInterestExposure).toBeCloseTo(1430.14, 1);
    expect(summary.nextCutoffDate).toBe("2026-07-14"); // earliest still-open cutoff (c)
  });

  it("returns a null next cutoff when nothing is still actionable", () => {
    const invoices: ImsInvoice[] = [
      invoice({ id: "a", imsAction: "accept" }),
      invoice({ id: "b", imsAction: "reject" }),
    ];
    const summary = summarizeImsClose(invoices, ASOF, DEFAULT_IMS_RULE_CONFIG);
    expect(summary.actionRequiredCount).toBe(0);
    expect(summary.nextCutoffDate).toBeNull();
  });
});
