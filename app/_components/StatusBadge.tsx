import type { PaymentStatus } from "@/lib/rules/types";

type Props = {
  status: PaymentStatus;
};

const LABELS: Record<PaymentStatus, string> = {
  "not-applicable": "N/A",
  safe: "Safe",
  "due-soon": "Due soon",
  breached: "Breached",
  "paid-on-time": "Paid on time",
  "paid-late": "Paid late",
};

const CLASSES: Record<PaymentStatus, string> = {
  "not-applicable": "bg-slate-800 text-slate-400 border-slate-700",
  safe: "bg-emerald-950 text-emerald-300 border-emerald-800",
  "due-soon": "bg-amber-950 text-amber-300 border-amber-800",
  breached: "bg-red-950 text-red-300 border-red-800",
  "paid-on-time": "bg-emerald-950 text-emerald-300 border-emerald-800",
  "paid-late": "bg-red-950 text-red-300 border-red-800",
};

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${CLASSES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
