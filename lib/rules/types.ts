export type UdyamCategory = "micro" | "small" | "medium";

export interface Vendor {
  id: string;
  name: string;
  gstin: string;
  gstinActive: boolean;
  udyamRegistered: boolean;
  udyamCategory: UdyamCategory | null;
}

export interface Bill {
  id: string;
  vendorId: string;
  /** Date the goods/services were accepted — the clock for §43B(h)/MSMED starts here. */
  invoiceAcceptanceDate: string;
  amount: number;
  hasWrittenAgreement: boolean;
  /** Contractual payment term in days, if a written agreement exists. Capped at the statutory max regardless of what the contract says. */
  agreedPaymentDays: number | null;
  paidDate: string | null;
}

export interface PaymentRuleConfig {
  statutoryMaxDaysWithAgreement: number;
  statutoryMaxDaysWithoutAgreement: number;
  /** RBI bank rate (%). MSMED Act interest = this rate x the multiplier below. VERIFY current rate with a CA before relying on this for real money. */
  rbiBankRatePercent: number;
  msmedInterestMultiplier: number;
  /** Business's effective marginal tax rate (%) — used to size the deduction-loss cost. Should be a per-business input in the real product, not a global default. */
  assumedMarginalTaxRatePercent: number;
}

export const DEFAULT_PAYMENT_RULE_CONFIG: PaymentRuleConfig = {
  statutoryMaxDaysWithAgreement: 45,
  statutoryMaxDaysWithoutAgreement: 15,
  rbiBankRatePercent: 6.5,
  msmedInterestMultiplier: 3,
  assumedMarginalTaxRatePercent: 25,
};

export type PaymentStatus =
  | "not-applicable"
  | "safe"
  | "due-soon"
  | "breached"
  | "paid-on-time"
  | "paid-late";

export interface PaymentRiskAssessment {
  billId: string;
  applicable: boolean;
  deadlineDays: number | null;
  dueDate: string | null;
  daysRemaining: number | null;
  status: PaymentStatus;
  taxDeductionAtRisk: number;
  projectedInterestCost: number;
  totalCostOfDelay: number;
}

// ---------------------------------------------------------------------------
// Module 2 — IMS (GST Invoice Management System) monthly-close copilot
//
// Since the IMS went live on the GST portal, any purchase invoice a supplier
// files that the buyer does NOT action (accept / reject / keep pending) is
// DEEMED ACCEPTED and auto-flows into the buyer's GSTR-2B when 2B is generated
// (the 14th of the following month). Deemed-accepting a wrong/ineligible
// invoice means claiming wrong input-tax-credit (ITC) → later reversal with
// interest under GST s.50. This module flags what must be actioned before each
// cutoff and sizes the money at stake.
// ---------------------------------------------------------------------------

/** The action the business has taken on a supplier invoice in the GST IMS dashboard. */
export type ImsAction = "accept" | "reject" | "pending" | "none";

/** The business's own view of whether an invoice's ITC is legitimately claimable. */
export type ImsEligibility = "eligible" | "ineligible" | "unsure";

export interface ImsInvoice {
  id: string;
  vendorId: string;
  invoiceNo: string;
  /** Supplier's tax period the invoice belongs to, as "YYYY-MM". The GSTR-2B cutoff is derived from this. */
  taxPeriod: string;
  taxableValue: number;
  /** Total GST on the invoice — this is the input-tax-credit (ITC) at stake. */
  gstAmount: number;
  /** "none" = not yet actioned → deemed accepted into GSTR-2B at the cutoff. */
  imsAction: ImsAction;
  /** Most SMBs won't know at close time → default "unsure". Only "ineligible" implies a realized loss if deemed-accepted. */
  eligibility: ImsEligibility;
}

export interface ImsRuleConfig {
  /** GSTR-2B is generated on this day of the month AFTER the invoice's tax period; unactioned invoices are deemed accepted then. VERIFY with a CA. */
  gstr2bCutoffDayOfNextMonth: number;
  /** Warn this many days before the cutoff. */
  dueSoonWindowDays: number;
  /** GST s.50 interest rate (% p.a.) on wrongly-availed ITC. VERIFY the current rate with a CA before relying on this. */
  wrongItcInterestRatePercent: number;
}

export const DEFAULT_IMS_RULE_CONFIG: ImsRuleConfig = {
  gstr2bCutoffDayOfNextMonth: 14,
  dueSoonWindowDays: 3,
  wrongItcInterestRatePercent: 18,
};

export type ImsStatus =
  | "accepted"
  | "rejected"
  | "pending"
  | "action-required" // unactioned, cutoff comfortably ahead
  | "deemed-accept-imminent" // unactioned, cutoff within the warning window
  | "auto-accepted-missed"; // unactioned, cutoff passed → deemed accepted, ITC in 2B unverified

export interface ImsAssessment {
  invoiceId: string;
  status: ImsStatus;
  /** GSTR-2B generation date — the point of no return for taking action. */
  cutoffDate: string;
  /** Days from the as-of date to the cutoff (negative once the cutoff has passed). */
  daysToCutoff: number;
  /** ITC that will be / was auto-included into GSTR-2B without verification (0 once explicitly accepted/rejected/pending). */
  itcAtRisk: number;
  /** GST s.50 interest if a deemed-accepted invoice is actually ineligible and must be reversed. */
  projectedInterestCost: number;
  /** Hard money loss if left unfixed: reversible ITC principal + interest (only for known-ineligible, auto-accepted invoices). */
  totalExposure: number;
}

export interface ImsCloseSummary {
  totalInvoices: number;
  /** Unactioned invoices whose cutoff has not yet passed (action-required + deemed-accept-imminent). */
  actionRequiredCount: number;
  autoAcceptedMissedCount: number;
  totalItcAtRisk: number;
  totalInterestExposure: number;
  /** Earliest still-open cutoff among unactioned invoices, or null if nothing is actionable. */
  nextCutoffDate: string | null;
}

// ---------------------------------------------------------------------------
// Module 3 — RCM (Reverse Charge Mechanism) Rule 47A watchdog
//
// On reverse-charge purchases the BUYER owes the GST (in CASH — it cannot be
// paid with ITC). Two silent, money-losing deadlines:
//   1. Rule 47A (from 1 Nov 2024): when the supplier is UNREGISTERED, the buyer
//      must issue a self-invoice within 30 days of the supply, else a s.122
//      penalty (₹10,000 or the tax, whichever higher).
//   2. The RCM tax must be paid in cash by the GSTR-3B due date for the period
//      of the "time of supply"; late payment attracts GST s.50 interest (18%).
// This module surfaces both deadlines and sizes the cash + interest + penalty.
// ---------------------------------------------------------------------------

export type RcmSupplyType = "goods" | "services";

export interface RcmPurchase {
  id: string;
  vendorId: string;
  /** True if the supplier is unregistered — then Rule 47A self-invoice (30 days) applies. */
  supplierUnregistered: boolean;
  supplyType: RcmSupplyType;
  /** Date the goods/services were received (the invoice/receipt date) — drives both clocks. */
  supplyDate: string;
  /** GST the buyer owes under reverse charge — must be paid in CASH. */
  rcmTaxAmount: number;
  /** Has the buyer issued the self-invoice required under s.31(3)(f)? */
  selfInvoiceIssued: boolean;
  /** Date the RCM tax was actually paid (via the GSTR-3B cash ledger), if paid. */
  rcmTaxPaidDate: string | null;
}

export interface RcmRuleConfig {
  /** Rule 47A: self-invoice must be issued within this many days of supply (unregistered supplier). VERIFY with a CA. */
  selfInvoiceDays: number;
  /** Time-of-supply cap (days from supply) for goods RCM — s.12(3). VERIFY. */
  timeOfSupplyDaysGoods: number;
  /** Time-of-supply cap (days from supply) for services RCM — s.13(3). VERIFY. */
  timeOfSupplyDaysServices: number;
  /** RCM cash tax is due on this day of the month AFTER the tax period (GSTR-3B). VERIFY. */
  gstr3bDueDayOfNextMonth: number;
  /** GST s.50 interest rate (% p.a.) on late RCM tax. VERIFY the current rate with a CA. */
  latePaymentInterestRatePercent: number;
  /** s.122 penalty for a missed self-invoice (₹10,000 or the tax, whichever higher — simplified to a flat default). VERIFY. */
  lateSelfInvoicePenalty: number;
  /** Warning window (days) before a deadline. */
  dueSoonWindowDays: number;
}

export const DEFAULT_RCM_RULE_CONFIG: RcmRuleConfig = {
  selfInvoiceDays: 30,
  timeOfSupplyDaysGoods: 30,
  timeOfSupplyDaysServices: 60,
  gstr3bDueDayOfNextMonth: 20,
  latePaymentInterestRatePercent: 18,
  lateSelfInvoicePenalty: 10000,
  dueSoonWindowDays: 7,
};

export type RcmSelfInvoiceStatus =
  | "not-applicable"
  | "issued"
  | "safe"
  | "due-soon"
  | "overdue";

export type RcmPaymentStatus =
  | "paid-on-time"
  | "paid-late"
  | "safe"
  | "due-soon"
  | "overdue";

export interface RcmAssessment {
  purchaseId: string;
  selfInvoiceApplicable: boolean;
  selfInvoiceDeadline: string | null;
  selfInvoiceStatus: RcmSelfInvoiceStatus;
  timeOfSupply: string;
  rcmPaymentDueDate: string;
  rcmPaymentStatus: RcmPaymentStatus;
  /** Cash GST still owed under RCM (0 once paid). */
  rcmTaxDueInCash: number;
  /** GST s.50 interest for late RCM tax payment. */
  projectedInterestCost: number;
  /** s.122 penalty exposure for a missed self-invoice. */
  penaltyExposure: number;
  /** Hard money loss if unresolved: interest + penalty (the tax itself is owed regardless). */
  totalExposure: number;
}

export interface RcmSummary {
  totalPurchases: number;
  selfInvoicesOverdueCount: number;
  /** Total cash GST still owed under RCM across all unpaid purchases. */
  totalRcmCashDue: number;
  totalInterestExposure: number;
  totalPenaltyExposure: number;
}
