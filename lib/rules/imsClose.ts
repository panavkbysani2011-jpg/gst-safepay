import type {
  ImsAssessment,
  ImsCloseSummary,
  ImsInvoice,
  ImsRuleConfig,
} from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_YEAR = 365;

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return Math.round((to - from) / MS_PER_DAY);
}

/**
 * GSTR-2B cutoff for a tax period = the configured day of the month AFTER that period.
 * e.g. period "2026-05" + day 14 -> "2026-06-14"; "2026-12" -> "2027-01-14".
 */
function gstr2bCutoffDate(taxPeriod: string, dayOfNextMonth: number): string {
  const [year, month] = taxPeriod.split("-").map(Number);
  let cutoffYear = year;
  let cutoffMonth = month + 1;
  if (cutoffMonth > 12) {
    cutoffMonth = 1;
    cutoffYear += 1;
  }
  const mm = String(cutoffMonth).padStart(2, "0");
  const dd = String(dayOfNextMonth).padStart(2, "0");
  return `${cutoffYear}-${mm}-${dd}`;
}

/** GST s.50 simple interest on wrongly-availed ITC, accruing from the cutoff to the as-of date. */
function calculateWrongItcInterest(
  itcAmount: number,
  daysSinceCutoff: number,
  config: ImsRuleConfig
): number {
  if (daysSinceCutoff <= 0) return 0;
  const annualRate = config.wrongItcInterestRatePercent / 100;
  return itcAmount * annualRate * (daysSinceCutoff / DAYS_PER_YEAR);
}

export function assessImsInvoice(
  invoice: ImsInvoice,
  asOfDate: string,
  config: ImsRuleConfig
): ImsAssessment {
  const cutoffDate = gstr2bCutoffDate(
    invoice.taxPeriod,
    config.gstr2bCutoffDayOfNextMonth
  );
  const daysToCutoff = daysBetween(asOfDate, cutoffDate);

  const base = {
    invoiceId: invoice.id,
    cutoffDate,
    daysToCutoff,
    itcAtRisk: 0,
    projectedInterestCost: 0,
    totalExposure: 0,
  };

  // Explicitly actioned invoices carry no auto-acceptance risk.
  if (invoice.imsAction === "accept") return { ...base, status: "accepted" };
  if (invoice.imsAction === "reject") return { ...base, status: "rejected" };
  if (invoice.imsAction === "pending") return { ...base, status: "pending" };

  // Unactioned: the full ITC is at stake because it will be / was deemed accepted.
  const itcAtRisk = invoice.gstAmount;

  if (daysToCutoff > config.dueSoonWindowDays) {
    return { ...base, status: "action-required", itcAtRisk };
  }

  if (daysToCutoff >= 0) {
    return { ...base, status: "deemed-accept-imminent", itcAtRisk };
  }

  // Cutoff passed → deemed accepted. Only a known-ineligible invoice is a realized loss.
  const daysSinceCutoff = -daysToCutoff;
  const projectedInterestCost =
    invoice.eligibility === "ineligible"
      ? calculateWrongItcInterest(invoice.gstAmount, daysSinceCutoff, config)
      : 0;
  const totalExposure =
    invoice.eligibility === "ineligible"
      ? invoice.gstAmount + projectedInterestCost
      : 0;

  return {
    ...base,
    status: "auto-accepted-missed",
    itcAtRisk,
    projectedInterestCost,
    totalExposure,
  };
}

export function summarizeImsClose(
  invoices: ImsInvoice[],
  asOfDate: string,
  config: ImsRuleConfig
): ImsCloseSummary {
  const assessments = invoices.map((invoice) =>
    assessImsInvoice(invoice, asOfDate, config)
  );

  const stillActionable = assessments.filter(
    (a) =>
      a.status === "action-required" || a.status === "deemed-accept-imminent"
  );

  const nextCutoffDate =
    stillActionable.length === 0
      ? null
      : stillActionable
          .map((a) => a.cutoffDate)
          .sort()
          .at(0)!;

  return {
    totalInvoices: assessments.length,
    actionRequiredCount: stillActionable.length,
    autoAcceptedMissedCount: assessments.filter(
      (a) => a.status === "auto-accepted-missed"
    ).length,
    totalItcAtRisk: assessments.reduce((sum, a) => sum + a.itcAtRisk, 0),
    totalInterestExposure: assessments.reduce(
      (sum, a) => sum + a.projectedInterestCost,
      0
    ),
    nextCutoffDate,
  };
}
