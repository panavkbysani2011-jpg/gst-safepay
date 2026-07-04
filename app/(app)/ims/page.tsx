import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { assessImsInvoice, summarizeImsClose } from "@/lib/rules/imsClose";
import { DEFAULT_IMS_RULE_CONFIG } from "@/lib/rules/types";
import { ImsTable, type ImsRowView } from "@/app/_components/ImsTable";
import { EmptyState } from "@/app/_components/ui";

export default async function ImsPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);

  if (data.totalImsInvoices === 0) {
    return (
      <EmptyState
        title="No IMS invoices yet"
        actionHref="/import"
        actionLabel="Import IMS invoices"
      >
        Upload your GST IMS invoice list to catch deemed-accept deadlines before
        the GSTR-2B cutoff.
      </EmptyState>
    );
  }

  const rows: ImsRowView[] = data.imsRows.map(({ invoice, vendorName }) => {
    const a = assessImsInvoice(invoice, data.imsAsOf, DEFAULT_IMS_RULE_CONFIG);
    return {
      invoiceId: invoice.id,
      vendorName,
      invoiceNo: invoice.invoiceNo,
      taxPeriod: invoice.taxPeriod,
      taxableValue: invoice.taxableValue,
      gstAmount: invoice.gstAmount,
      status: a.status,
      cutoffDate: a.cutoffDate,
      daysToCutoff: a.daysToCutoff,
      itcAtRisk: a.itcAtRisk,
      projectedInterestCost: a.projectedInterestCost,
      totalExposure: a.totalExposure,
    };
  });

  const summary = summarizeImsClose(
    data.imsRows.map((r) => r.invoice),
    data.imsAsOf,
    DEFAULT_IMS_RULE_CONFIG
  );

  return <ImsTable rows={rows} summary={summary} />;
}
