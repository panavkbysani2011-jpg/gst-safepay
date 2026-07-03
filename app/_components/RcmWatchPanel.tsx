import { formatINR } from "@/lib/format";
import { assessRcmPurchase, summarizeRcm } from "@/lib/rules/rcmWatch";
import {
  DEFAULT_RCM_RULE_CONFIG,
  type RcmPaymentStatus,
  type RcmSelfInvoiceStatus,
} from "@/lib/rules/types";
import type { DemoRcmRow } from "@/lib/rules/rcmFixtures";
import { PanelHeader, StatCard } from "./ui";
import { TONE_BADGE, TONE_CARD, type Tone } from "./tone";

type Props = {
  rows: DemoRcmRow[];
  asOf: string;
};

const BADGE_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase";

const SELF_INVOICE: Record<RcmSelfInvoiceStatus, { label: string; tone: Tone }> =
  {
    "not-applicable": { label: "Self-inv N/A", tone: "neutral" },
    issued: { label: "Self-inv done", tone: "success" },
    safe: { label: "Self-inv ok", tone: "neutral" },
    "due-soon": { label: "Self-inv due", tone: "warning" },
    overdue: { label: "Self-inv overdue", tone: "danger" },
  };

const PAYMENT: Record<RcmPaymentStatus, { label: string; tone: Tone }> = {
  "paid-on-time": { label: "Tax paid", tone: "success" },
  "paid-late": { label: "Tax paid late", tone: "danger" },
  safe: { label: "Tax scheduled", tone: "neutral" },
  "due-soon": { label: "Tax due soon", tone: "warning" },
  overdue: { label: "Tax overdue", tone: "danger" },
};

export function RcmWatchPanel({ rows, asOf }: Props) {
  const summary = summarizeRcm(
    rows.map((r) => r.purchase),
    asOf,
    DEFAULT_RCM_RULE_CONFIG
  );
  const exposure = summary.totalInterestExposure + summary.totalPenaltyExposure;

  return (
    <section className="flex flex-col gap-3">
      <PanelHeader
        title="RCM self-invoice & cash-tax watch"
        tag="Preview · synthetic data"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          eyebrow="RCM GST owed in cash"
          tone="info"
          value={formatINR(summary.totalRcmCashDue)}
        >
          Reverse-charge tax you must pay in cash (cannot be set off with ITC).
        </StatCard>
        <StatCard
          eyebrow="Interest + penalty exposure"
          tone="danger"
          value={formatINR(exposure)}
        >
          {summary.selfInvoicesOverdueCount} self-invoice(s) overdue (s.122
          penalty) + s.50 interest on late RCM tax.
        </StatCard>
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map(({ purchase, vendorName }) => {
          const a = assessRcmPurchase(purchase, asOf, DEFAULT_RCM_RULE_CONFIG);
          const alarmed =
            a.selfInvoiceStatus === "overdue" ||
            a.rcmPaymentStatus === "overdue" ||
            a.rcmPaymentStatus === "paid-late";
          const self = SELF_INVOICE[a.selfInvoiceStatus];
          const pay = PAYMENT[a.rcmPaymentStatus];
          return (
            <li
              key={purchase.id}
              className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors duration-150 hover:border-border-strong sm:flex-row sm:items-center sm:justify-between ${
                alarmed ? TONE_CARD.danger : "border-border bg-surface"
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-fg">{vendorName}</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`${BADGE_BASE} ${TONE_BADGE[self.tone]}`}>
                    {self.label}
                  </span>
                  <span className={`${BADGE_BASE} ${TONE_BADGE[pay.tone]}`}>
                    {pay.label}
                  </span>
                </div>
                <p className="text-sm text-muted">
                  {purchase.supplyType} · RCM tax due {a.rcmPaymentDueDate}
                  {a.selfInvoiceDeadline
                    ? ` · self-invoice by ${a.selfInvoiceDeadline}`
                    : ""}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="tnum font-mono text-lg font-semibold text-fg">
                  {formatINR(purchase.rcmTaxAmount)}
                </p>
                <p className="text-xs text-faint">
                  {a.totalExposure > 0
                    ? `+ ${formatINR(a.totalExposure)} interest/penalty`
                    : "RCM tax"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
