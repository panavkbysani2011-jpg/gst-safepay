/**
 * SYNTHETIC DEMO DATA — not a real business. Illustrates the compliance
 * calendar's statuses (overdue, due-soon, upcoming, filed with/without proof).
 * As-of date is fixed so the illustrative spread stays stable.
 */
import type { ComplianceDeadline } from "./types";

export const DEMO_COMPLIANCE_ASOF = "2026-07-15";

export const DEMO_COMPLIANCE: ComplianceDeadline[] = [
  {
    id: "cmp-gstr1-0626",
    name: "GSTR-1",
    authority: "GST",
    period: "2026-06",
    dueDate: "2026-07-11",
    filedDate: null,
    proofRef: null,
  },
  {
    id: "cmp-tds-0626",
    name: "TDS payment (challan)",
    authority: "TDS",
    period: "2026-06",
    dueDate: "2026-07-07",
    filedDate: null,
    proofRef: null,
  },
  {
    id: "cmp-pf-0626",
    name: "PF & ESI",
    authority: "PF/ESI",
    period: "2026-06",
    dueDate: "2026-07-15",
    filedDate: null,
    proofRef: null,
  },
  {
    id: "cmp-gstr3b-0626",
    name: "GSTR-3B",
    authority: "GST",
    period: "2026-06",
    dueDate: "2026-07-20",
    filedDate: null,
    proofRef: null,
  },
  {
    id: "cmp-gstr3b-0526",
    name: "GSTR-3B",
    authority: "GST",
    period: "2026-05",
    dueDate: "2026-06-20",
    filedDate: "2026-06-18",
    proofRef: "ARN-AA290626012345X",
  },
  {
    id: "cmp-tds-0526",
    name: "TDS payment (challan)",
    authority: "TDS",
    period: "2026-05",
    dueDate: "2026-06-07",
    filedDate: "2026-06-05",
    proofRef: null,
  },
  {
    id: "cmp-aoc4-fy26",
    name: "AOC-4 (annual accounts)",
    authority: "MCA/ROC",
    period: "FY2025-26",
    dueDate: "2026-10-30",
    filedDate: null,
    proofRef: null,
  },
  {
    id: "cmp-posh-fy26",
    name: "POSH annual report",
    authority: "POSH",
    period: "FY2025-26",
    dueDate: "2027-01-31",
    filedDate: null,
    proofRef: null,
  },
];
