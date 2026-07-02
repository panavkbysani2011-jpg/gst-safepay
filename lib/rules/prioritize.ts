import type { PaymentRiskAssessment } from "./types";

const ACTIONABLE_STATUSES = new Set<PaymentRiskAssessment["status"]>([
  "due-soon",
  "breached",
  "paid-late",
]);

/**
 * Ranks bills by money-at-risk: highest-cost breaches first, then paid-late,
 * then due-soon bills ordered by urgency. Anything not yet at risk (safe,
 * paid-on-time, not-applicable) is dropped — this list is an action list, not a ledger.
 */
export function rankBillsByRisk(
  risks: PaymentRiskAssessment[]
): PaymentRiskAssessment[] {
  return risks
    .filter((r) => ACTIONABLE_STATUSES.has(r.status))
    .sort((a, b) => {
      if (a.totalCostOfDelay !== b.totalCostOfDelay) {
        return b.totalCostOfDelay - a.totalCostOfDelay;
      }
      return (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0);
    });
}
