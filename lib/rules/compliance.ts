import type {
  ComplianceAssessment,
  ComplianceDeadline,
  ComplianceRuleConfig,
  ComplianceStatus,
  ComplianceSummary,
} from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return Math.round((to - from) / MS_PER_DAY);
}

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
