import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { CompliancePanel } from "@/app/_components/CompliancePanel";
import { EmptyState } from "@/app/_components/ui";

export default async function CompliancePage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);

  if (data.totalCompliance === 0) {
    return (
      <EmptyState
        title="No compliance deadlines yet"
        actionHref="/import"
        actionLabel="Import deadlines"
      >
        Upload your filing calendar to track GST, TDS, PF, ROC and other due
        dates, with an evidence reference for each.
      </EmptyState>
    );
  }

  return (
    <CompliancePanel
      deadlines={data.complianceDeadlines}
      asOf={data.complianceAsOf}
    />
  );
}
