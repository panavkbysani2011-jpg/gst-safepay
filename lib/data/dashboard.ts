import { db } from "@/lib/db";
import { assessPaymentRisk } from "@/lib/rules/paymentDeadline";
import { rankBillsByRisk } from "@/lib/rules/prioritize";
import {
  type Bill,
  type ImsAction,
  type ImsEligibility,
  type PaymentRiskAssessment,
  type RcmSupplyType,
  type UdyamCategory,
  type ComplianceDeadline,
  type Vendor,
  type VendorVerificationAssessment,
  type VendorVerificationSummary,
} from "@/lib/rules/types";
import {
  assessVendorVerification,
  summarizeVendorVerification,
} from "@/lib/rules/vendorVerification";
import type { DemoImsRow } from "@/lib/rules/imsFixtures";
import type { DemoRcmRow } from "@/lib/rules/rcmFixtures";
import { getRuleConfig } from "./ruleConfig";
import type { RuleConfig } from "@/lib/rules/ruleConfig";
import { todayInBusinessZone } from "@/lib/businessDate";

export interface VendorVerificationRow {
  vendorName: string;
  gstin: string;
  assessment: VendorVerificationAssessment;
  // Raw editable fields, so the in-app edit form can prefill without a round-trip.
  gstinActive: boolean;
  udyamRegistered: boolean;
  udyamCategory: UdyamCategory | null;
}

export type RankedRisk = PaymentRiskAssessment & {
  vendorName: string;
  amount: number;
  // Raw editable fields, so the in-app edit form can prefill without a round-trip.
  vendorId: string;
  invoiceAcceptanceDate: string;
  hasWrittenAgreement: boolean;
  agreedPaymentDays: number | null;
  paidDate: string | null;
};

/** Minimal vendor list for the bill form's supplier picker. */
export interface VendorOption {
  id: string;
  name: string;
}

export interface DashboardData {
  asOf: string;
  ranked: RankedRisk[];
  moneyAlreadyAtRisk: number;
  billsNeedingActionThisWeek: number;
  totalBills: number;
  totalVendors: number;
  // Modules 2-3 read from the DB per owner. asOf is a fixed demo date while the
  // rows are synthetic (keeps the illustrative status spread stable); switch to
  // the live `asOf` once real IMS/RCM data replaces the seed.
  imsRows: DemoImsRow[];
  imsAsOf: string;
  totalImsInvoices: number;
  rcmRows: DemoRcmRow[];
  rcmAsOf: string;
  totalRcmPurchases: number;
  vendorVerifications: VendorVerificationRow[];
  /** Supplier picker options for the bill form. */
  vendorOptions: VendorOption[];
  vendorVerificationSummary: VendorVerificationSummary;
  verifyAsOf: string;
  complianceDeadlines: ComplianceDeadline[];
  complianceAsOf: string;
  totalCompliance: number;
  // The owner's resolved rule config (shipped defaults + any CA overrides).
  // Threaded so pages, the Overview, and client tables all compute with the
  // same values a CA has confirmed. Equals the defaults until a CA edits them.
  ruleConfig: RuleConfig;
}

/** Reads vendors + bills from the DB and runs the deterministic rule engine over them. */
export async function getDashboardData(ownerId: string): Promise<DashboardData> {
  const [
    ruleConfig,
    vendorRows,
    billRows,
    imsRowsDb,
    rcmRowsDb,
    complianceRowsDb,
  ] = await Promise.all([
    getRuleConfig(ownerId),
    db.vendor.findMany({ where: { ownerId } }),
    db.bill.findMany({ where: { ownerId } }),
    db.imsInvoice.findMany({ where: { ownerId }, orderBy: { createdAt: "asc" } }),
    db.rcmPurchase.findMany({ where: { ownerId }, orderBy: { createdAt: "asc" } }),
    db.complianceDeadline.findMany({
      where: { ownerId },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const vendorsById = new Map(vendorRows.map((v) => [v.id, v]));
  // Indian statutory time: every deadline below is defined by the Indian day,
  // and this is recomputed per request, so countdowns move as the day does.
  const asOf = todayInBusinessZone();

  const imsRows: DemoImsRow[] = imsRowsDb.map((r) => ({
    vendorName: r.vendorName,
    invoice: {
      id: r.id,
      vendorId: r.vendorId,
      invoiceNo: r.invoiceNo,
      taxPeriod: r.taxPeriod,
      // Prisma returns money columns as Decimal; the engines compute in numbers.
      taxableValue: r.taxableValue.toNumber(),
      gstAmount: r.gstAmount.toNumber(),
      imsAction: r.imsAction as ImsAction,
      eligibility: r.eligibility as ImsEligibility,
    },
  }));

  const rcmRows: DemoRcmRow[] = rcmRowsDb.map((r) => ({
    vendorName: r.vendorName,
    purchase: {
      id: r.id,
      vendorId: r.vendorId,
      supplierUnregistered: r.supplierUnregistered,
      supplyType: r.supplyType as RcmSupplyType,
      supplyDate: r.supplyDate,
      rcmTaxAmount: r.rcmTaxAmount.toNumber(),
      selfInvoiceIssued: r.selfInvoiceIssued,
      rcmTaxPaidDate: r.rcmTaxPaidDate,
    },
  }));

  const risks: RankedRisk[] = [];
  for (const row of billRows) {
    const vendorRow = vendorsById.get(row.vendorId);
    if (!vendorRow) continue;

    const vendor: Vendor = {
      id: vendorRow.id,
      name: vendorRow.name,
      gstin: vendorRow.gstin,
      gstinActive: vendorRow.gstinActive,
      udyamRegistered: vendorRow.udyamRegistered,
      udyamCategory: (vendorRow.udyamCategory as UdyamCategory | null) ?? null,
    };
    const bill: Bill = {
      id: row.id,
      vendorId: row.vendorId,
      invoiceAcceptanceDate: row.invoiceAcceptanceDate,
      amount: row.amount.toNumber(),
      hasWrittenAgreement: row.hasWrittenAgreement,
      agreedPaymentDays: row.agreedPaymentDays,
      paidDate: row.paidDate,
    };

    const assessment = assessPaymentRisk(vendor, bill, asOf, ruleConfig.payment);
    risks.push({
      ...assessment,
      vendorName: vendor.name,
      amount: bill.amount,
      vendorId: bill.vendorId,
      invoiceAcceptanceDate: bill.invoiceAcceptanceDate,
      hasWrittenAgreement: bill.hasWrittenAgreement,
      agreedPaymentDays: bill.agreedPaymentDays,
      paidDate: bill.paidDate,
    });
  }

  const ranked = rankBillsByRisk(risks) as RankedRisk[];

  const moneyAlreadyAtRisk = ranked
    .filter((r) => r.status === "breached" || r.status === "paid-late")
    .reduce((sum, r) => sum + r.totalCostOfDelay, 0);

  const billsNeedingActionThisWeek = ranked.filter(
    (r) => r.status === "due-soon"
  ).length;

  const vendorsForVerify: Vendor[] = vendorRows.map((v) => ({
    id: v.id,
    name: v.name,
    gstin: v.gstin,
    gstinActive: v.gstinActive,
    udyamRegistered: v.udyamRegistered,
    udyamCategory: (v.udyamCategory as UdyamCategory | null) ?? null,
    lastVerifiedDate: v.lastVerifiedDate,
  }));
  const vendorVerifications: VendorVerificationRow[] = vendorsForVerify.map(
    (v) => ({
      vendorName: v.name,
      gstin: v.gstin,
      assessment: assessVendorVerification(v, asOf, ruleConfig.vendor),
      gstinActive: v.gstinActive,
      udyamRegistered: v.udyamRegistered,
      udyamCategory: v.udyamCategory,
    })
  );
  const vendorVerificationSummary = summarizeVendorVerification(
    vendorsForVerify,
    asOf,
    ruleConfig.vendor
  );

  const complianceDeadlines: ComplianceDeadline[] = complianceRowsDb.map((r) => ({
    id: r.id,
    name: r.name,
    authority: r.authority,
    period: r.period,
    dueDate: r.dueDate,
    filedDate: r.filedDate,
    proofRef: r.proofRef,
  }));

  return {
    asOf,
    ranked,
    moneyAlreadyAtRisk,
    billsNeedingActionThisWeek,
    totalBills: billRows.length,
    totalVendors: vendorRows.length,
    imsRows,
    imsAsOf: asOf,
    totalImsInvoices: imsRowsDb.length,
    rcmRows,
    rcmAsOf: asOf,
    totalRcmPurchases: rcmRowsDb.length,
    vendorVerifications,
    vendorOptions: vendorRows.map((v) => ({ id: v.id, name: v.name })),
    vendorVerificationSummary,
    verifyAsOf: asOf,
    complianceDeadlines,
    complianceAsOf: asOf,
    totalCompliance: complianceRowsDb.length,
    ruleConfig,
  };
}
