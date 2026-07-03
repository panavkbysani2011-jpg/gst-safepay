import {
  assessComplianceDeadline,
  summarizeCompliance,
} from "@/lib/rules/compliance";
import {
  DEFAULT_COMPLIANCE_CONFIG,
  type ComplianceDeadline,
  type ComplianceStatus,
} from "@/lib/rules/types";
import { PanelHeader, StatCard } from "./ui";
import { TONE_BADGE, TONE_CARD, type Tone } from "./tone";

type Props = {
  deadlines: ComplianceDeadline[];
  asOf: string;
};

const STATUS: Record<ComplianceStatus, { label: string; tone: Tone }> = {
  filed: { label: "Filed", tone: "success" },
  overdue: { label: "Overdue", tone: "danger" },
  "due-soon": { label: "Due soon", tone: "warning" },
  upcoming: { label: "Upcoming", tone: "neutral" },
};

function dueLabel(daysToDue: number): string {
  if (daysToDue < 0) return `${Math.abs(daysToDue)} days overdue`;
  if (daysToDue === 0) return "due today";
  return `in ${daysToDue} days`;
}

export function CompliancePanel({ deadlines, asOf }: Props) {
  const summary = summarizeCompliance(deadlines, asOf, DEFAULT_COMPLIANCE_CONFIG);

  return (
    <section className="flex flex-col gap-3">
      <PanelHeader title="Compliance calendar & evidence" tag={`As of ${asOf}`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          eyebrow="Overdue filings"
          tone="danger"
          value={summary.overdueCount}
        >
          {summary.dueSoonCount} more due within 7 days — of {summary.total}{" "}
          tracked obligations.
        </StatCard>
        <StatCard
          eyebrow="Filed without proof on file"
          tone="warning"
          value={summary.evidenceGapCount}
        >
          Filed obligations missing an ARN/challan reference — an audit gap.
        </StatCard>
      </div>

      <ul className="flex flex-col gap-2">
        {deadlines.map((d) => {
          const a = assessComplianceDeadline(d, asOf, DEFAULT_COMPLIANCE_CONFIG);
          const s = STATUS[a.status];
          return (
            <li
              key={d.id}
              className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors duration-150 hover:border-border-strong sm:flex-row sm:items-center sm:justify-between ${
                s.tone === "danger" || s.tone === "warning"
                  ? TONE_CARD[s.tone]
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-fg">{d.name}</span>
                  <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium tracking-widest text-faint uppercase">
                    {d.authority}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${TONE_BADGE[s.tone]}`}
                  >
                    {s.label}
                  </span>
                </div>
                <p className="text-sm text-muted">
                  {d.period} · due {d.dueDate}
                  {a.status !== "filed" ? ` (${dueLabel(a.daysToDue)})` : ""}
                </p>
              </div>
              <p className="text-left text-xs sm:text-right">
                {a.status === "filed" ? (
                  a.hasEvidence ? (
                    <span className="font-mono text-success">
                      proof: {d.proofRef}
                    </span>
                  ) : (
                    <span className="text-warning">no proof on file</span>
                  )
                ) : (
                  <span className="text-faint">not filed</span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
