import { formatINR } from "@/lib/format";
import type { PaymentRiskAssessment } from "@/lib/rules/types";
import { StatusBadge } from "./StatusBadge";
import { TONE_CARD, type Tone } from "./tone";

type RankedRisk = PaymentRiskAssessment & {
  vendorName: string;
  amount: number;
};

type Props = {
  risks: RankedRisk[];
};

const CARD_TONE: Record<string, Tone> = {
  breached: "danger",
  "paid-late": "danger",
  "due-soon": "warning",
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
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
        Nothing needs action right now — every tracked bill is safe or settled.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {risks.map((risk) => (
        <li
          key={risk.billId}
          className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors duration-150 hover:border-border-strong sm:flex-row sm:items-center sm:justify-between ${
            TONE_CARD[CARD_TONE[risk.status] ?? "neutral"]
          }`}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-fg">{risk.vendorName}</span>
              <StatusBadge status={risk.status} />
            </div>
            <p className="text-sm text-muted">
              {formatINR(risk.amount)} · due {risk.dueDate} ·{" "}
              {daysLabel(risk.daysRemaining)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="tnum font-mono text-lg font-semibold text-fg">
              {formatINR(risk.totalCostOfDelay)}
            </p>
            <p className="text-xs text-faint">cost if unresolved</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
