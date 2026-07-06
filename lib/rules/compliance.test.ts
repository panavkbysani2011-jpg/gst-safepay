import { describe, expect, it } from "vitest";
import {
  assessComplianceDeadline,
  summarizeCompliance,
} from "./compliance";
import {
  DEFAULT_COMPLIANCE_CONFIG,
  type ComplianceDeadline,
} from "./types";

const ASOF = "2026-07-15";

function deadline(overrides: Partial<ComplianceDeadline> = {}): ComplianceDeadline {
  return {
    id: "c1",
    name: "GSTR-3B",
    authority: "GST",
    period: "2026-06",
    dueDate: "2026-07-20",
    filedDate: null,
    proofRef: null,
    ...overrides,
  };
}

describe("assessComplianceDeadline", () => {
  it("marks a filed deadline 'filed' with evidence when a proof ref exists", () => {
    const r = assessComplianceDeadline(
      deadline({ filedDate: "2026-07-18", proofRef: "ARN-1234567890" }),
      ASOF,
      DEFAULT_COMPLIANCE_CONFIG
    );
    expect(r.status).toBe("filed");
    expect(r.hasEvidence).toBe(true);
  });

  it("marks a filed deadline without a proof ref as filed but missing evidence", () => {
    const r = assessComplianceDeadline(
      deadline({ filedDate: "2026-07-18", proofRef: null }),
      ASOF,
      DEFAULT_COMPLIANCE_CONFIG
    );
    expect(r.status).toBe("filed");
    expect(r.hasEvidence).toBe(false);
  });

  it("marks an unfiled deadline past its due date 'overdue'", () => {
    const r = assessComplianceDeadline(
      deadline({ dueDate: "2026-07-10" }),
      ASOF,
      DEFAULT_COMPLIANCE_CONFIG
    );
    expect(r.status).toBe("overdue");
    expect(r.daysToDue).toBe(-5);
  });

  it("marks an unfiled deadline inside the warning window 'due-soon'", () => {
    const r = assessComplianceDeadline(
      deadline({ dueDate: "2026-07-20" }),
      ASOF,
      DEFAULT_COMPLIANCE_CONFIG
    );
    // 5 days away, within the 7-day window
    expect(r.status).toBe("due-soon");
    expect(r.daysToDue).toBe(5);
  });

  it("marks an unfiled deadline comfortably ahead 'upcoming'", () => {
    const r = assessComplianceDeadline(
      deadline({ dueDate: "2026-08-20" }),
      ASOF,
      DEFAULT_COMPLIANCE_CONFIG
    );
    expect(r.status).toBe("upcoming");
  });
});

describe("summarizeCompliance", () => {
  it("counts statuses and evidence gaps", () => {
    const deadlines: ComplianceDeadline[] = [
      deadline({ id: "a", dueDate: "2026-07-10" }), // overdue
      deadline({ id: "b", dueDate: "2026-07-20" }), // due-soon
      deadline({ id: "c", dueDate: "2026-08-20" }), // upcoming
      deadline({ id: "d", filedDate: "2026-06-18", proofRef: "ARN-9" }), // filed + evidence
      deadline({ id: "e", filedDate: "2026-06-18", proofRef: null }), // filed, no evidence
    ];
    const s = summarizeCompliance(deadlines, ASOF, DEFAULT_COMPLIANCE_CONFIG);
    expect(s.total).toBe(5);
    expect(s.overdueCount).toBe(1);
    expect(s.dueSoonCount).toBe(1);
    expect(s.upcomingCount).toBe(1);
    expect(s.filedCount).toBe(2);
    expect(s.evidenceGapCount).toBe(1); // e: filed but no proof
  });
});

describe("assessComplianceDeadline — boundaries and gaps", () => {
  // ASOF 2026-07-15; default warning window = 7 days.
  it("marks a deadline due exactly today 'due-soon' (0 days), not overdue", () => {
    const r = assessComplianceDeadline(
      deadline({ dueDate: "2026-07-15" }),
      ASOF,
      DEFAULT_COMPLIANCE_CONFIG
    );
    expect(r.daysToDue).toBe(0);
    expect(r.status).toBe("due-soon");
  });

  it("is 'due-soon' at the window edge and 'upcoming' one day beyond it", () => {
    expect(
      assessComplianceDeadline(
        deadline({ dueDate: "2026-07-22" }), // 7 days out
        ASOF,
        DEFAULT_COMPLIANCE_CONFIG
      ).status
    ).toBe("due-soon");
    expect(
      assessComplianceDeadline(
        deadline({ dueDate: "2026-07-23" }), // 8 days out
        ASOF,
        DEFAULT_COMPLIANCE_CONFIG
      ).status
    ).toBe("upcoming");
  });

  it("still reports plain 'filed' even when filed after the due date", () => {
    // Documents current behaviour: a late filing is not distinguished today.
    const r = assessComplianceDeadline(
      deadline({
        dueDate: "2026-06-01",
        filedDate: "2026-07-10",
        proofRef: "ARN-1",
      }),
      ASOF,
      DEFAULT_COMPLIANCE_CONFIG
    );
    expect(r.status).toBe("filed");
    expect(r.hasEvidence).toBe(true);
  });

  it("respects a CA-configured due-soon window", () => {
    const cfg = { ...DEFAULT_COMPLIANCE_CONFIG, dueSoonWindowDays: 14 };
    // 10 days out: 'upcoming' under the default 7, 'due-soon' under 14
    expect(
      assessComplianceDeadline(deadline({ dueDate: "2026-07-25" }), ASOF, cfg)
        .status
    ).toBe("due-soon");
  });

  it("summarizes an empty deadline list to zeros", () => {
    const s = summarizeCompliance([], ASOF, DEFAULT_COMPLIANCE_CONFIG);
    expect(s.total).toBe(0);
    expect(s.overdueCount).toBe(0);
    expect(s.evidenceGapCount).toBe(0);
  });
});
