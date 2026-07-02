import type {
  Bill,
  PaymentRiskAssessment,
  PaymentRuleConfig,
  Vendor,
} from "./types";

const DUE_SOON_WINDOW_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_COMPOUNDING_PERIOD = 30;

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return Math.round((to - from) / MS_PER_DAY);
}

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isMsmeCovered(vendor: Vendor): boolean {
  return (
    vendor.udyamRegistered &&
    (vendor.udyamCategory === "micro" || vendor.udyamCategory === "small")
  );
}

function getApplicableDeadlineDays(
  bill: Bill,
  config: PaymentRuleConfig
): number {
  if (!bill.hasWrittenAgreement) {
    return config.statutoryMaxDaysWithoutAgreement;
  }
  const agreed = bill.agreedPaymentDays ?? config.statutoryMaxDaysWithAgreement;
  return Math.min(agreed, config.statutoryMaxDaysWithAgreement);
}

/**
 * MSMED Act s.16 interest: compound interest at (multiplier x RBI bank rate),
 * compounded with monthly rests, accruing from the day after the deadline until payment (or today, if still unpaid).
 * This is a simplification of the statutory formula — CA sign-off required before it drives real invoicing/advice.
 */
function calculateInterestCost(
  amount: number,
  daysOverdue: number,
  config: PaymentRuleConfig
): number {
  if (daysOverdue <= 0) return 0;
  const annualRate =
    (config.rbiBankRatePercent / 100) * config.msmedInterestMultiplier;
  const monthlyRate = annualRate / 12;
  const periods = Math.ceil(daysOverdue / DAYS_PER_COMPOUNDING_PERIOD);
  return amount * (Math.pow(1 + monthlyRate, periods) - 1);
}

export function assessPaymentRisk(
  vendor: Vendor,
  bill: Bill,
  asOfDate: string,
  config: PaymentRuleConfig
): PaymentRiskAssessment {
  if (!isMsmeCovered(vendor)) {
    return {
      billId: bill.id,
      applicable: false,
      deadlineDays: null,
      dueDate: null,
      daysRemaining: null,
      status: "not-applicable",
      taxDeductionAtRisk: 0,
      projectedInterestCost: 0,
      totalCostOfDelay: 0,
    };
  }

  const deadlineDays = getApplicableDeadlineDays(bill, config);
  const dueDate = addDays(bill.invoiceAcceptanceDate, deadlineDays);
  const wasPaidOnTime = bill.paidDate !== null && daysBetween(dueDate, bill.paidDate) <= 0;
  const breached = bill.paidDate === null
    ? daysBetween(dueDate, asOfDate) > 0
    : daysBetween(dueDate, bill.paidDate) > 0;

  if (bill.paidDate !== null && wasPaidOnTime) {
    return {
      billId: bill.id,
      applicable: true,
      deadlineDays,
      dueDate,
      daysRemaining: daysBetween(asOfDate, dueDate),
      status: "paid-on-time",
      taxDeductionAtRisk: 0,
      projectedInterestCost: 0,
      totalCostOfDelay: 0,
    };
  }

  if (!breached) {
    const daysRemaining = daysBetween(asOfDate, dueDate);
    return {
      billId: bill.id,
      applicable: true,
      deadlineDays,
      dueDate,
      daysRemaining,
      status: daysRemaining <= DUE_SOON_WINDOW_DAYS ? "due-soon" : "safe",
      taxDeductionAtRisk: 0,
      projectedInterestCost: 0,
      totalCostOfDelay: 0,
    };
  }

  // Breached: the deduction loss is locked in for the year regardless of whether it's since been paid.
  const overdueUntil = bill.paidDate ?? asOfDate;
  const daysOverdue = daysBetween(dueDate, overdueUntil);
  const taxDeductionAtRisk =
    bill.amount * (config.assumedMarginalTaxRatePercent / 100);
  const projectedInterestCost = calculateInterestCost(
    bill.amount,
    daysOverdue,
    config
  );

  return {
    billId: bill.id,
    applicable: true,
    deadlineDays,
    dueDate,
    daysRemaining: daysBetween(asOfDate, dueDate),
    status: bill.paidDate !== null ? "paid-late" : "breached",
    taxDeductionAtRisk,
    projectedInterestCost,
    totalCostOfDelay: taxDeductionAtRisk + projectedInterestCost,
  };
}
