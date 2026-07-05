import type { DashboardData } from "./dashboard";
import { assessImsInvoice } from "@/lib/rules/imsClose";
import { assessRcmPurchase } from "@/lib/rules/rcmWatch";
import { assessComplianceDeadline } from "@/lib/rules/compliance";

// A calm subset of the shared Tone palette — the only tones the overview uses.
export type OverviewTone = "danger" | "warning" | "info" | "neutral";

export interface CompositionSegment {
  key: string;
  label: string;
  amount: number;
  tone: OverviewTone;
  href: string;
}

export interface NeedsActionItem {
  id: string;
  module: string;
  href: string;
  title: string;
  detail: string;
  amount: number | null;
  tone: OverviewTone;
  sev: number; // 2 = urgent (danger), 1 = soon (warning) — for ranking
}

export interface OverviewModel {
  totalAtRisk: number;
  composition: CompositionSegment[];
  needsAction: NeedsActionItem[];
  hasAnyData: boolean;
}

// Aggregates every module into one cross-cutting picture: where the money-at-risk
// concentrates (composition) and the single prioritised "do these now" queue.
// Pure: takes already-fetched DashboardData and runs the deterministic engines.
export function buildOverview(data: DashboardData): OverviewModel {
  const items: NeedsActionItem[] = [];

  let paymentsExposure = 0;
  for (const r of data.ranked) {
    if (r.status === "breached" || r.status === "paid-late") {
      paymentsExposure += r.totalCostOfDelay;
      items.push({
        id: `pay-${r.billId}`,
        module: "Payments",
        href: "/payments",
        title: r.vendorName,
        detail: r.status === "breached" ? "MSME deadline breached" : "Paid late — cost locked in",
        amount: r.totalCostOfDelay,
        tone: "danger",
        sev: 2,
      });
    } else if (r.status === "due-soon") {
      items.push({
        id: `pay-${r.billId}`,
        module: "Payments",
        href: "/payments",
        title: r.vendorName,
        detail: "Payment deadline within 7 days",
        amount: r.amount,
        tone: "warning",
        sev: 1,
      });
    }
  }

  let imsExposure = 0;
  for (const { invoice, vendorName } of data.imsRows) {
    const a = assessImsInvoice(invoice, data.imsAsOf, data.ruleConfig.ims);
    imsExposure += a.totalExposure;
    if (a.status === "auto-accepted-missed") {
      items.push({
        id: `ims-${invoice.id}`,
        module: "GST IMS",
        href: "/ims",
        title: vendorName,
        detail: "Auto-accepted past cutoff — ITC may need reversing",
        amount: a.totalExposure || a.itcAtRisk,
        tone: "danger",
        sev: 2,
      });
    } else if (a.status === "deemed-accept-imminent" || a.status === "action-required") {
      items.push({
        id: `ims-${invoice.id}`,
        module: "GST IMS",
        href: "/ims",
        title: vendorName,
        detail: "Accept or reject before the GSTR-2B cutoff",
        amount: a.itcAtRisk,
        tone: "warning",
        sev: 1,
      });
    }
  }

  let rcmExposure = 0;
  for (const { purchase, vendorName } of data.rcmRows) {
    const a = assessRcmPurchase(purchase, data.rcmAsOf, data.ruleConfig.rcm);
    rcmExposure += a.totalExposure;
    if (
      a.selfInvoiceStatus === "overdue" ||
      a.rcmPaymentStatus === "overdue" ||
      a.rcmPaymentStatus === "paid-late"
    ) {
      items.push({
        id: `rcm-${purchase.id}`,
        module: "Reverse charge",
        href: "/rcm",
        title: vendorName,
        detail:
          a.selfInvoiceStatus === "overdue"
            ? "Self-invoice overdue (Rule 47A)"
            : "Reverse-charge cash tax overdue",
        amount: a.totalExposure || a.rcmTaxDueInCash,
        tone: "danger",
        sev: 2,
      });
    } else if (a.rcmPaymentStatus === "due-soon" || a.selfInvoiceStatus === "due-soon") {
      items.push({
        id: `rcm-${purchase.id}`,
        module: "Reverse charge",
        href: "/rcm",
        title: vendorName,
        detail: "Reverse-charge deadline approaching",
        amount: a.rcmTaxDueInCash,
        tone: "warning",
        sev: 1,
      });
    }
  }

  for (const v of data.vendorVerifications) {
    if (v.assessment.status === "invalid-gstin") {
      items.push({
        id: `ven-${v.assessment.vendorId}`,
        module: "Vendors",
        href: "/vendors",
        title: v.vendorName,
        detail: "Invalid GSTIN — fix before claiming ITC",
        amount: null,
        tone: "danger",
        sev: 2,
      });
    } else if (v.assessment.status === "recheck-due") {
      items.push({
        id: `ven-${v.assessment.vendorId}`,
        module: "Vendors",
        href: "/vendors",
        title: v.vendorName,
        detail: "GSTIN re-check overdue",
        amount: null,
        tone: "warning",
        sev: 1,
      });
    }
  }

  for (const d of data.complianceDeadlines) {
    const a = assessComplianceDeadline(d, data.complianceAsOf, data.ruleConfig.compliance);
    if (a.status === "overdue") {
      items.push({
        id: `cmp-${d.id}`,
        module: "Compliance",
        href: "/compliance",
        title: d.name,
        detail: `Filing overdue by ${Math.abs(a.daysToDue)} days`,
        amount: null,
        tone: "danger",
        sev: 2,
      });
    } else if (a.status === "due-soon") {
      items.push({
        id: `cmp-${d.id}`,
        module: "Compliance",
        href: "/compliance",
        title: d.name,
        detail: `Filing due in ${a.daysToDue} days`,
        amount: null,
        tone: "warning",
        sev: 1,
      });
    }
  }

  items.sort((a, b) => b.sev - a.sev || (b.amount ?? 0) - (a.amount ?? 0));

  const composition: CompositionSegment[] = (
    [
      { key: "payments", label: "Payments", amount: paymentsExposure, tone: "danger", href: "/payments" },
      { key: "ims", label: "GST IMS", amount: imsExposure, tone: "warning", href: "/ims" },
      { key: "rcm", label: "Reverse charge", amount: rcmExposure, tone: "info", href: "/rcm" },
    ] as CompositionSegment[]
  ).filter((s) => s.amount > 0);

  return {
    totalAtRisk: paymentsExposure + imsExposure + rcmExposure,
    composition,
    needsAction: items,
    hasAnyData:
      data.totalVendors > 0 ||
      data.totalBills > 0 ||
      data.totalImsInvoices > 0 ||
      data.totalRcmPurchases > 0 ||
      data.totalCompliance > 0,
  };
}
