import { formatINR } from "@/lib/format";

type Props = {
  moneyAlreadyAtRisk: number;
  billsNeedingActionThisWeek: number;
};

export function MoneyAtRiskHero({
  moneyAlreadyAtRisk,
  billsNeedingActionThisWeek,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="animate-rise rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] transition-colors">
        <p className="text-xs font-medium tracking-[0.12em] text-danger uppercase">
          Money already at risk
        </p>
        <p className="tnum mt-2 font-mono text-4xl font-semibold text-danger">
          {formatINR(moneyAlreadyAtRisk)}
        </p>
        <p className="mt-2 text-sm text-muted">
          Lost tax deductions + MSMED penalty interest on breached payments.
        </p>
      </div>
      <div className="animate-rise rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] transition-colors">
        <p className="text-xs font-medium tracking-[0.12em] text-warning uppercase">
          Bills needing action this week
        </p>
        <p className="tnum mt-2 font-mono text-4xl font-semibold text-warning">
          {billsNeedingActionThisWeek}
        </p>
        <p className="mt-2 text-sm text-muted">
          Approaching their 45/15-day payment deadline within 7 days.
        </p>
      </div>
    </div>
  );
}
