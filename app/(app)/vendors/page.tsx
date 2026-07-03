import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { VendorsTable, type VendorRowView } from "@/app/_components/VendorsTable";
import { EmptyState } from "@/app/_components/ui";

export default async function VendorsPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);

  if (data.totalVendors === 0) {
    return (
      <EmptyState
        title="No vendors yet"
        actionHref="/import"
        actionLabel="Import vendors"
      >
        Upload your vendor list to validate GSTINs and track when each one is due
        for re-verification.
      </EmptyState>
    );
  }

  const rows: VendorRowView[] = data.vendorVerifications.map((v) => ({
    vendorId: v.assessment.vendorId,
    vendorName: v.vendorName,
    gstin: v.gstin,
    status: v.assessment.status,
    gstinValid: v.assessment.gstinValid,
    lastVerifiedDate: v.assessment.lastVerifiedDate,
    daysSinceVerified: v.assessment.daysSinceVerified,
  }));

  return <VendorsTable rows={rows} summary={data.vendorVerificationSummary} />;
}
