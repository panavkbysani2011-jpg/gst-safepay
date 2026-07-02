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
