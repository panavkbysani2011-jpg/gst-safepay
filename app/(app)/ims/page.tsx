import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { ImsClosePanel } from "@/app/_components/ImsClosePanel";
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

  return <ImsClosePanel rows={data.imsRows} asOf={data.imsAsOf} />;
}
