import { daysBetween } from "./dateUtil";
import type {
  ComplianceAssessment,
  ComplianceDeadline,
  ComplianceRuleConfig,
  ComplianceStatus,
  ComplianceSummary,
} from "./types";

export function assessComplianceDeadline(
  deadline: ComplianceDeadline,
  asOfDate: string,
  config: ComplianceRuleConfig
): ComplianceAssessment {
  const daysToDue = daysBetween(asOfDate, deadline.dueDate);
  const hasEvidence = deadline.filedDate !== null && deadline.proofRef !== null;

  let status: ComplianceStatus;
  if (deadline.filedDate !== null) {
    status = "filed";
  } else if (daysToDue < 0) {
    status = "overdue";
  } else if (daysToDue <= config.dueSoonWindowDays) {
    status = "due-soon";
  } else {
    status = "upcoming";
  }

  return { deadlineId: deadline.id, status, daysToDue, hasEvidence };
}

export function summarizeCompliance(
  deadlines: ComplianceDeadline[],
  asOfDate: string,
  config: ComplianceRuleConfig
): ComplianceSummary {
  const assessments = deadlines.map((d) =>
    assessComplianceDeadline(d, asOfDate, config)
  );
  const count = (s: ComplianceStatus) =>
    assessments.filter((a) => a.status === s).length;

  return {
    total: assessments.length,
    overdueCount: count("overdue"),
    dueSoonCount: count("due-soon"),
    upcomingCount: count("upcoming"),
    filedCount: count("filed"),
    evidenceGapCount: assessments.filter(
      (a) => a.status === "filed" && !a.hasEvidence
    ).length,
  };
}
