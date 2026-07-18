import { describe, expect, it } from "vitest";
import { buildOverview } from "./overview";
import type { DashboardData, RankedRisk } from "./dashboard";
import { DEFAULT_RULE_CONFIG } from "@/lib/rules/ruleConfig";
import type {
  ComplianceDeadline,
  ImsInvoice,
  VendorVerificationAssessment,
} from "@/lib/rules/types";

// A fully-empty account, so each test only sets the slice it exercises.
function makeData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    asOf: "2026-07-15",
    ranked: [],
    moneyAlreadyAtRisk: 0,
    billsNeedingActionThisWeek: 0,
    totalBills: 0,
    totalVendors: 0,
    imsRows: [],
    imsAsOf: "2026-07-13",
    totalImsInvoices: 0,
    rcmRows: [],
    rcmAsOf: "2026-07-15",
    totalRcmPurchases: 0,
    vendorVerifications: [],
    vendorOptions: [],
    vendorVerificationSummary: {
      total: 0,
      verifiedCount: 0,
      recheckDueCount: 0,
      neverVerifiedCount: 0,
      invalidCount: 0,
      needsAttentionCount: 0,
    },
    verifyAsOf: "2026-07-15",
    complianceDeadlines: [],
    complianceAsOf: "2026-07-15",
    totalCompliance: 0,
    ruleConfig: DEFAULT_RULE_CONFIG,
    ...overrides,
  };
}

const breached: RankedRisk = {
  billId: "b1",
  applicable: true,
  deadlineDays: 45,
  dueDate: "2026-05-16",
  daysRemaining: -60,
  status: "breached",
  taxDeductionAtRisk: 25000,
  projectedInterestCost: 5000,
  totalCostOfDelay: 30000,
  vendorName: "Acme Traders",
  amount: 100000,
  vendorId: "v1",
  invoiceAcceptanceDate: "2026-04-01",
  hasWrittenAgreement: true,
  agreedPaymentDays: 45,
  paidDate: null,
};

// Unactioned + known-ineligible, tax period well before imsAsOf -> auto-accepted
// past the cutoff, so its full ITC + interest is a realized exposure.
const missedIneligible: ImsInvoice = {
  id: "i1",
  vendorId: "v9",
  invoiceNo: "INV-1",
  taxPeriod: "2026-05",
  taxableValue: 500000,
  gstAmount: 100000,
  imsAction: "none",
  eligibility: "ineligible",
};

describe("buildOverview", () => {
  it("is empty and flags no data for an account with nothing imported", () => {
    const o = buildOverview(makeData());
    expect(o.totalAtRisk).toBe(0);
    expect(o.composition).toEqual([]);
    expect(o.needsAction).toEqual([]);
    expect(o.hasAnyData).toBe(false);
  });

  it("counts a breached bill into payments exposure and the action queue", () => {
    const o = buildOverview(
      makeData({ ranked: [breached], totalBills: 1, totalVendors: 1 })
    );
    expect(o.totalAtRisk).toBe(30000);
    expect(o.composition).toHaveLength(1);
    expect(o.composition[0].key).toBe("payments");
    expect(o.composition[0].amount).toBe(30000);
    expect(o.needsAction[0]).toMatchObject({
      module: "Payments",
      tone: "danger",
      amount: 30000,
    });
    expect(o.hasAnyData).toBe(true);
  });

  it("adds IMS reversal exposure and keeps only composition segments that carry money", () => {
    const o = buildOverview(
      makeData({
        ranked: [breached],
        imsRows: [
          { invoice: missedIneligible, vendorName: "Beta Supplies" },
        ] as DashboardData["imsRows"],
        totalImsInvoices: 1,
      })
    );
    // payments + ims carry money; reverse charge has none, so it's dropped.
    expect(o.composition.map((c) => c.key)).toEqual(["payments", "ims"]);
    expect(o.totalAtRisk).toBeGreaterThan(30000);
  });

  it("ranks urgent (danger) items above soon (warning) items", () => {
    const dueSoon: ComplianceDeadline = {
      id: "c1",
      name: "GSTR-3B",
      authority: "GST",
      period: "2026-06",
      dueDate: "2026-07-18", // 3 days out from complianceAsOf -> due-soon
      filedDate: null,
      proofRef: null,
    };
    const o = buildOverview(
      makeData({
        ranked: [breached],
        complianceDeadlines: [dueSoon],
        totalCompliance: 1,
      })
    );
    expect(o.needsAction[0].tone).toBe("danger");
    expect(o.needsAction.at(-1)!.tone).toBe("warning");
  });

  it("surfaces an invalid GSTIN as a danger item with no rupee amount", () => {
    const invalid: VendorVerificationAssessment = {
      vendorId: "v1",
      gstinValid: false,
      status: "invalid-gstin",
      lastVerifiedDate: null,
      daysSinceVerified: null,
    };
    const o = buildOverview(
      makeData({
        vendorVerifications: [
          {
            vendorName: "Gamma",
            gstin: "27AAPFU0939F1ZA",
            assessment: invalid,
            gstinActive: true,
            udyamRegistered: false,
            udyamCategory: null,
          },
        ],
        totalVendors: 1,
      })
    );
    const item = o.needsAction.find((i) => i.module === "Vendors");
    expect(item).toBeDefined();
    expect(item!.tone).toBe("danger");
    expect(item!.amount).toBeNull();
  });

  it("has data even when nothing is at risk (only filed compliance rows)", () => {
    const filed: ComplianceDeadline = {
      id: "c1",
      name: "PF/ESI",
      authority: "PF/ESI",
      period: "2026-06",
      dueDate: "2026-07-30",
      filedDate: "2026-07-10",
      proofRef: "ARN-1",
    };
    const o = buildOverview(
      makeData({ complianceDeadlines: [filed], totalCompliance: 1 })
    );
    expect(o.totalAtRisk).toBe(0);
    expect(o.needsAction).toEqual([]);
    expect(o.hasAnyData).toBe(true);
  });
});
