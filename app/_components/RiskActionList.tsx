import { formatINR } from "@/lib/format";
import type { PaymentRiskAssessment } from "@/lib/rules/types";
import { StatusBadge } from "./StatusBadge";

type RankedRisk = PaymentRiskAssessment & {
  vendorName: string;
  amount: number;
};

type Props = {
  risks: RankedRisk[];
};

const CARD_TINT_BY_STATUS: Record<string, string> = {
  breached: "bg-red-500/[0.06] border-red-900/50",
  "paid-late": "bg-red-500/[0.06] border-red-900/50",
  "due-soon": "bg-amber-500/[0.05] border-amber-900/40",
};

function daysLabel(daysRemaining: number | null): string {
  if (daysRemaining === null) return "—";
  if (daysRemaining < 0) return `${Math.abs(daysRemaining)} days overdue`;
  if (daysRemaining === 0) return "Due today";
  return `${daysRemaining} days left`;
}

export function RiskActionList({ risks }: Props) {
  if (risks.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0f1420] p-8 text-center text-slate-400">
        Nothing needs action right now — every tracked bill is safe or
        settled.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {risks.map((risk) => (
        <li
          key={risk.billId}
          className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
            CARD_TINT_BY_STATUS[risk.status] ??
            "border-slate-800 bg-[#0f1420]"
          }`}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-100">
                {risk.vendorName}
              </span>
              <StatusBadge status={risk.status} />
            </div>
            <p className="text-sm text-slate-400">
              {formatINR(risk.amount)} · due {risk.dueDate} ·{" "}
              {daysLabel(risk.daysRemaining)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-mono text-lg font-semibold text-slate-100 tabular-nums">
              {formatINR(risk.totalCostOfDelay)}
            </p>
            <p className="text-xs text-slate-500">cost if unresolved</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
