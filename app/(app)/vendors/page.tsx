import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { VendorVerificationPanel } from "@/app/_components/VendorVerificationPanel";
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

  return (
    <VendorVerificationPanel
      rows={data.vendorVerifications}
      summary={data.vendorVerificationSummary}
      asOf={data.verifyAsOf}
    />
  );
}
