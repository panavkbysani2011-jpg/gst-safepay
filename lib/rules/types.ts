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
