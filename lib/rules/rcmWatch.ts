import type {
  RcmAssessment,
  RcmPaymentStatus,
  RcmPurchase,
  RcmRuleConfig,
  RcmSelfInvoiceStatus,
  RcmSummary,
} from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_YEAR = 365;

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

/** The configured day of the month AFTER the given "YYYY-MM" period, e.g. "2026-05" + 20 -> "2026-06-20". */
function dueDayOfNextMonth(period: string, day: number): string {
  const [year, month] = period.split("-").map(Number);
  let dueYear = year;
  let dueMonth = month + 1;
  if (dueMonth > 12) {
    dueMonth = 1;
    dueYear += 1;
  }
  const mm = String(dueMonth).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${dueYear}-${mm}-${dd}`;
}

function interest(
  amount: number,
  daysLate: number,
  config: RcmRuleConfig
): number {
  if (daysLate <= 0) return 0;
  const annualRate = config.latePaymentInterestRatePercent / 100;
  return amount * annualRate * (daysLate / DAYS_PER_YEAR);
}

function assessSelfInvoice(
  purchase: RcmPurchase,
  asOfDate: string,
  config: RcmRuleConfig
): { status: RcmSelfInvoiceStatus; deadline: string | null; penalty: number } {
  if (!purchase.supplierUnregistered) {
    return { status: "not-applicable", deadline: null, penalty: 0 };
  }
  const deadline = addDays(purchase.supplyDate, config.selfInvoiceDays);
  if (purchase.selfInvoiceIssued) {
    return { status: "issued", deadline, penalty: 0 };
  }
  const daysToDeadline = daysBetween(asOfDate, deadline);
  if (daysToDeadline > config.dueSoonWindowDays) {
    return { status: "safe", deadline, penalty: 0 };
  }
  if (daysToDeadline >= 0) {
    return { status: "due-soon", deadline, penalty: 0 };
  }
  return { status: "overdue", deadline, penalty: config.lateSelfInvoicePenalty };
}

function assessPayment(
  purchase: RcmPurchase,
  rcmPaymentDueDate: string,
  asOfDate: string,
  config: RcmRuleConfig
): { status: RcmPaymentStatus; cashDue: number; interestCost: number } {
  if (purchase.rcmTaxPaidDate !== null) {
    const daysLate = daysBetween(rcmPaymentDueDate, purchase.rcmTaxPaidDate);
    if (daysLate > 0) {
      return {
        status: "paid-late",
        cashDue: 0,
        interestCost: interest(purchase.rcmTaxAmount, daysLate, config),
      };
    }
    return { status: "paid-on-time", cashDue: 0, interestCost: 0 };
  }

  const daysToDue = daysBetween(asOfDate, rcmPaymentDueDate);
  if (daysToDue > config.dueSoonWindowDays) {
    return { status: "safe", cashDue: purchase.rcmTaxAmount, interestCost: 0 };
  }
  if (daysToDue >= 0) {
    return {
      status: "due-soon",
      cashDue: purchase.rcmTaxAmount,
      interestCost: 0,
    };
  }
  return {
    status: "overdue",
    cashDue: purchase.rcmTaxAmount,
    interestCost: interest(purchase.rcmTaxAmount, -daysToDue, config),
  };
}

export function assessRcmPurchase(
  purchase: RcmPurchase,
  asOfDate: string,
  config: RcmRuleConfig
): RcmAssessment {
  const timeOfSupplyDays =
    purchase.supplyType === "goods"
      ? config.timeOfSupplyDaysGoods
      : config.timeOfSupplyDaysServices;
  const timeOfSupply = addDays(purchase.supplyDate, timeOfSupplyDays);
  const rcmPaymentDueDate = dueDayOfNextMonth(
    timeOfSupply.slice(0, 7),
    config.gstr3bDueDayOfNextMonth
  );

  const selfInvoice = assessSelfInvoice(purchase, asOfDate, config);
  const payment = assessPayment(purchase, rcmPaymentDueDate, asOfDate, config);

  return {
    purchaseId: purchase.id,
    selfInvoiceApplicable: purchase.supplierUnregistered,
    selfInvoiceDeadline: selfInvoice.deadline,
    selfInvoiceStatus: selfInvoice.status,
    timeOfSupply,
    rcmPaymentDueDate,
    rcmPaymentStatus: payment.status,
    rcmTaxDueInCash: payment.cashDue,
    projectedInterestCost: payment.interestCost,
    penaltyExposure: selfInvoice.penalty,
    totalExposure: payment.interestCost + selfInvoice.penalty,
  };
}

export function summarizeRcm(
  purchases: RcmPurchase[],
  asOfDate: string,
  config: RcmRuleConfig
): RcmSummary {
  const assessments = purchases.map((p) =>
    assessRcmPurchase(p, asOfDate, config)
  );

  return {
    totalPurchases: assessments.length,
    selfInvoicesOverdueCount: assessments.filter(
      (a) => a.selfInvoiceStatus === "overdue"
    ).length,
    totalRcmCashDue: assessments.reduce((sum, a) => sum + a.rcmTaxDueInCash, 0),
    totalInterestExposure: assessments.reduce(
      (sum, a) => sum + a.projectedInterestCost,
      0
    ),
    totalPenaltyExposure: assessments.reduce(
      (sum, a) => sum + a.penaltyExposure,
      0
    ),
  };
}
