import {
  assessComplianceDeadline,
  summarizeCompliance,
} from "@/lib/rules/compliance";
import {
  DEFAULT_COMPLIANCE_CONFIG,
  type ComplianceDeadline,
  type ComplianceStatus,
} from "@/lib/rules/types";

type Props = {
  deadlines: ComplianceDeadline[];
  asOf: string;
};

const BADGE: Record<ComplianceStatus, { label: string; cls: string }> = {
  filed: {
    label: "Filed",
    cls: "bg-emerald-950 text-emerald-300 border-emerald-800",
  },
  overdue: { label: "Overdue", cls: "bg-red-950 text-red-300 border-red-800" },
  "due-soon": {
    label: "Due soon",
    cls: "bg-amber-950 text-amber-300 border-amber-800",
  },
  upcoming: {
    label: "Upcoming",
    cls: "bg-slate-800 text-slate-300 border-slate-700",
  },
};

const CARD_TINT: Partial<Record<ComplianceStatus, string>> = {
  overdue: "bg-red-500/[0.06] border-red-900/50",
  "due-soon": "bg-amber-500/[0.05] border-amber-900/40",
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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide text-slate-300 uppercase">
          Compliance calendar & evidence
        </h2>
        <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-medium tracking-widest text-slate-500 uppercase">
          As of {asOf}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-red-900/60 bg-gradient-to-br from-red-950/60 to-[#0f1420] p-6">
          <p className="text-xs font-medium tracking-widest text-red-300/80 uppercase">
            Overdue filings
          </p>
          <p className="mt-2 font-mono text-4xl font-semibold text-red-200 tabular-nums">
            {summary.overdueCount}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {summary.dueSoonCount} more due within 7 days — of {summary.total}{" "}
            tracked obligations.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-900/60 bg-gradient-to-br from-amber-950/50 to-[#0f1420] p-6">
          <p className="text-xs font-medium tracking-widest text-amber-300/80 uppercase">
            Filed without proof on file
          </p>
          <p className="mt-2 font-mono text-4xl font-semibold text-amber-200 tabular-nums">
            {summary.evidenceGapCount}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Filed obligations missing an ARN/challan reference — an audit gap.
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {deadlines.map((d) => {
          const a = assessComplianceDeadline(d, asOf, DEFAULT_COMPLIANCE_CONFIG);
          const badge = BADGE[a.status];
          return (
            <li
              key={d.id}
              className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                CARD_TINT[a.status] ?? "border-slate-800 bg-[#0f1420]"
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-100">{d.name}</span>
                  <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-medium tracking-widest text-slate-400 uppercase">
                    {d.authority}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  {d.period} · due {d.dueDate}
                  {a.status !== "filed" ? ` (${dueLabel(a.daysToDue)})` : ""}
                </p>
              </div>
              <p className="text-left text-xs sm:text-right">
                {a.status === "filed" ? (
                  a.hasEvidence ? (
                    <span className="font-mono text-emerald-300/80">
                      proof: {d.proofRef}
                    </span>
                  ) : (
                    <span className="text-amber-300/80">no proof on file</span>
                  )
                ) : (
                  <span className="text-slate-500">not filed</span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
