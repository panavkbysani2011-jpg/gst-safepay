import type { PaymentStatus } from "@/lib/rules/types";
import { TONE_BADGE, type Tone } from "./tone";

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

const TONE: Record<PaymentStatus, Tone> = {
  "not-applicable": "neutral",
  safe: "success",
  "due-soon": "warning",
  breached: "danger",
  "paid-on-time": "success",
  "paid-late": "danger",
};

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${TONE_BADGE[TONE[status]]}`}
    >
      {LABELS[status]}
    </span>
  );
}
