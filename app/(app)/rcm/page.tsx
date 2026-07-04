import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { assessRcmPurchase, summarizeRcm } from "@/lib/rules/rcmWatch";
import { DEFAULT_RCM_RULE_CONFIG } from "@/lib/rules/types";
import { RcmTable, type RcmRowView } from "@/app/_components/RcmTable";
import { EmptyState } from "@/app/_components/ui";

export default async function RcmPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);

  if (data.totalRcmPurchases === 0) {
    return (
      <EmptyState
        title="No reverse-charge purchases yet"
        actionHref="/import"
        actionLabel="Import RCM purchases"
      >
        Upload your reverse-charge purchases to watch self-invoice deadlines and
        cash-GST payments under Rule 47A.
      </EmptyState>
    );
  }

  const rows: RcmRowView[] = data.rcmRows.map(({ purchase, vendorName }) => {
    const a = assessRcmPurchase(purchase, data.rcmAsOf, DEFAULT_RCM_RULE_CONFIG);
    return {
      purchaseId: purchase.id,
      vendorName,
      supplyType: purchase.supplyType,
      supplyDate: purchase.supplyDate,
      rcmTaxAmount: purchase.rcmTaxAmount,
      selfInvoiceApplicable: a.selfInvoiceApplicable,
      selfInvoiceDeadline: a.selfInvoiceDeadline,
      selfInvoiceStatus: a.selfInvoiceStatus,
      timeOfSupply: a.timeOfSupply,
      rcmPaymentDueDate: a.rcmPaymentDueDate,
      rcmPaymentStatus: a.rcmPaymentStatus,
      rcmTaxDueInCash: a.rcmTaxDueInCash,
      projectedInterestCost: a.projectedInterestCost,
      penaltyExposure: a.penaltyExposure,
      totalExposure: a.totalExposure,
    };
  });

  const summary = summarizeRcm(
    data.rcmRows.map((r) => r.purchase),
    data.rcmAsOf,
    DEFAULT_RCM_RULE_CONFIG
  );

  return <RcmTable rows={rows} summary={summary} />;
}
