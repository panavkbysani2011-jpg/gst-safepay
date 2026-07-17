// "What's due when" — the one view this tool was missing.
//
// Every module computes a real date (the MSME payment due date, the GSTR-2B
// cutoff, the Rule 47A self-invoice deadline, the reverse-charge cash date, a
// filing due date), but the Overview only ever kept prose like "within 7 days"
// and threw the dates away. So there was no way to see WHEN things land: that
// four deadlines cluster on the same Tuesday, or that nothing is due for weeks.
// A sorted list cannot show that; a distribution over time can.
//
// Pure: takes already-fetched DashboardData and runs the deterministic engines.
// No AI, no clock of its own — `asOf` comes from the caller's business date.

import type { DashboardData } from "./dashboard";
import type { OverviewTone } from "./overview";
import { assessImsInvoice } from "@/lib/rules/imsClose";
import { assessRcmPurchase } from "@/lib/rules/rcmWatch";
import { assessComplianceDeadline } from "@/lib/rules/compliance";
import { daysBetween } from "@/lib/rules/dateUtil";

export interface UpcomingDeadline {
  id: string;
  module: string;
  href: string;
  /** Who or what it concerns, e.g. a vendor or a filing name. */
  title: string;
  /** The obligation itself, e.g. "MSME payment" or "GSTR-2B cutoff". */
  what: string;
  dueDate: string;
  /** Negative once the date has passed. */
  daysToDue: number;
  /** Money at stake, or null where the obligation is not monetary. */
  amount: number | null;
}

export type DeadlineBucketKey = "overdue" | "next7" | "next30" | "later";

export interface DeadlineBucket {
  key: DeadlineBucketKey;
  label: string;
  items: UpcomingDeadline[];
  count: number;
  amount: number;
  tone: OverviewTone;
}

/**
 * Collect every still-open obligation with a real date on it. Settled work is
 * excluded on purpose: a paid bill or an actioned invoice has no deadline left,
 * and padding the view with them would bury what actually needs doing.
 */
export function buildDeadlines(data: DashboardData): UpcomingDeadline[] {
  const out: UpcomingDeadline[] = [];

  // Payments: unpaid bills where the MSME clock applies.
  for (const row of data.ranked) {
    if (row.dueDate === null) continue; // rule does not apply to this bill
    if (row.status === "paid-on-time" || row.status === "paid-late") continue; // settled
    out.push({
      id: `pay-${row.billId}`,
      module: "Payments",
      href: "/payments",
      title: row.vendorName,
      what: "MSME payment",
      dueDate: row.dueDate,
      daysToDue: daysBetween(data.asOf, row.dueDate),
      // Once breached the loss is the cost of delay; before that, the sum you owe.
      amount: row.status === "breached" ? row.totalCostOfDelay : row.amount,
    });
  }

  // IMS: invoices not yet accepted/rejected, so still heading for the cutoff.
  for (const { invoice, vendorName } of data.imsRows) {
    const a = assessImsInvoice(invoice, data.imsAsOf, data.ruleConfig.ims);
    if (a.status === "accepted" || a.status === "rejected" || a.status === "pending") continue;
    out.push({
      id: `ims-${invoice.id}`,
      module: "GST IMS",
      href: "/ims",
      title: vendorName,
      what: "GSTR-2B cutoff",
      dueDate: a.cutoffDate,
      daysToDue: a.daysToCutoff,
      amount: a.itcAtRisk || a.totalExposure,
    });
  }

  // RCM: up to two separate clocks per purchase, so they are listed separately.
  for (const { purchase, vendorName } of data.rcmRows) {
    const a = assessRcmPurchase(purchase, data.rcmAsOf, data.ruleConfig.rcm);
    if (a.selfInvoiceApplicable && a.selfInvoiceDeadline !== null && !purchase.selfInvoiceIssued) {
      out.push({
        id: `rcm-si-${purchase.id}`,
        module: "Reverse charge",
        href: "/rcm",
        title: vendorName,
        what: "Self-invoice (Rule 47A)",
        dueDate: a.selfInvoiceDeadline,
        daysToDue: daysBetween(data.rcmAsOf, a.selfInvoiceDeadline),
        amount: a.penaltyExposure || null,
      });
    }
    if (purchase.rcmTaxPaidDate === null) {
      out.push({
        id: `rcm-pay-${purchase.id}`,
        module: "Reverse charge",
        href: "/rcm",
        title: vendorName,
        what: "Reverse-charge tax in cash",
        dueDate: a.rcmPaymentDueDate,
        daysToDue: daysBetween(data.rcmAsOf, a.rcmPaymentDueDate),
        amount: a.rcmTaxDueInCash,
      });
    }
  }

  // Compliance: anything not yet filed.
  for (const d of data.complianceDeadlines) {
    if (d.filedDate !== null) continue;
    const a = assessComplianceDeadline(d, data.complianceAsOf, data.ruleConfig.compliance);
    out.push({
      id: `cmp-${d.id}`,
      module: "Compliance",
      href: "/compliance",
      title: d.name,
      what: `${d.authority} filing`,
      dueDate: d.dueDate,
      daysToDue: a.daysToDue,
      amount: null, // a filing deadline has no rupee figure of its own
    });
  }

  // Soonest first; overdue (negative) naturally leads.
  out.sort((a, b) => a.daysToDue - b.daysToDue);
  return out;
}

const BUCKET_META: {
  key: DeadlineBucketKey;
  label: string;
  tone: OverviewTone;
  match: (days: number) => boolean;
}[] = [
  { key: "overdue", label: "Overdue", tone: "danger", match: (d) => d < 0 },
  { key: "next7", label: "Next 7 days", tone: "warning", match: (d) => d >= 0 && d <= 7 },
  { key: "next30", label: "8 to 30 days", tone: "info", match: (d) => d > 7 && d <= 30 },
  { key: "later", label: "Later", tone: "neutral", match: (d) => d > 30 },
];

/**
 * Group deadlines into the windows a business actually acts on: what is already
 * late, what lands this week, what to plan for this month, and what is merely on
 * the horizon. Empty buckets are kept so the shape of the month stays readable
 * (a gap is information too).
 */
export function bucketDeadlines(deadlines: UpcomingDeadline[]): DeadlineBucket[] {
  return BUCKET_META.map((meta) => {
    const items = deadlines.filter((d) => meta.match(d.daysToDue));
    return {
      key: meta.key,
      label: meta.label,
      tone: meta.tone,
      items,
      count: items.length,
      amount: items.reduce((sum, d) => sum + (d.amount ?? 0), 0),
    };
  });
}
