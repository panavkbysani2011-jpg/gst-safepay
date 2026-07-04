import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import {
  assessComplianceDeadline,
  summarizeCompliance,
} from "@/lib/rules/compliance";
import { DEFAULT_COMPLIANCE_CONFIG } from "@/lib/rules/types";
import {
  ComplianceTable,
  type ComplianceRowView,
} from "@/app/_components/ComplianceTable";
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

  const rows: ComplianceRowView[] = data.complianceDeadlines.map((d) => {
    const a = assessComplianceDeadline(d, data.complianceAsOf, DEFAULT_COMPLIANCE_CONFIG);
    return {
      deadlineId: d.id,
      name: d.name,
      authority: d.authority,
      period: d.period,
      dueDate: d.dueDate,
      proofRef: d.proofRef,
      status: a.status,
      daysToDue: a.daysToDue,
      hasEvidence: a.hasEvidence,
    };
  });

  const summary = summarizeCompliance(
    data.complianceDeadlines,
    data.complianceAsOf,
    DEFAULT_COMPLIANCE_CONFIG
  );

  return <ComplianceTable rows={rows} summary={summary} />;
}
