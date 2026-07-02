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
      <div className="rounded-2xl border border-red-900/60 bg-gradient-to-br from-red-950/60 to-[#0f1420] p-6">
        <p className="text-xs font-medium tracking-widest text-red-300/80 uppercase">
          Money already at risk
        </p>
        <p className="mt-2 font-mono text-4xl font-semibold text-red-200 tabular-nums">
          {formatINR(moneyAlreadyAtRisk)}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Lost tax deductions + MSMED penalty interest on breached payments.
        </p>
      </div>
      <div className="rounded-2xl border border-amber-900/60 bg-gradient-to-br from-amber-950/50 to-[#0f1420] p-6">
        <p className="text-xs font-medium tracking-widest text-amber-300/80 uppercase">
          Bills needing action this week
        </p>
        <p className="mt-2 font-mono text-4xl font-semibold text-amber-200 tabular-nums">
          {billsNeedingActionThisWeek}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Approaching their 45/15-day payment deadline within 7 days.
        </p>
      </div>
    </div>
  );
}
