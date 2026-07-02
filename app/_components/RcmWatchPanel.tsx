import { formatINR } from "@/lib/format";
import { assessRcmPurchase, summarizeRcm } from "@/lib/rules/rcmWatch";
import {
  DEFAULT_RCM_RULE_CONFIG,
  type RcmPaymentStatus,
  type RcmSelfInvoiceStatus,
} from "@/lib/rules/types";
import type { DemoRcmRow } from "@/lib/rules/rcmFixtures";

type Props = {
  rows: DemoRcmRow[];
  asOf: string;
};

const BADGE_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase";

const SELF_INVOICE_BADGE: Record<
  RcmSelfInvoiceStatus,
  { label: string; cls: string }
> = {
  "not-applicable": {
    label: "Self-inv N/A",
    cls: "bg-slate-800 text-slate-500 border-slate-700",
  },
  issued: {
    label: "Self-inv done",
    cls: "bg-emerald-950 text-emerald-300 border-emerald-800",
  },
  safe: {
    label: "Self-inv ok",
    cls: "bg-slate-800 text-slate-300 border-slate-700",
  },
  "due-soon": {
    label: "Self-inv due",
    cls: "bg-amber-950 text-amber-300 border-amber-800",
  },
  overdue: {
    label: "Self-inv overdue",
    cls: "bg-red-950 text-red-300 border-red-800",
  },
};

const PAYMENT_BADGE: Record<
  RcmPaymentStatus,
  { label: string; cls: string }
> = {
  "paid-on-time": {
    label: "Tax paid",
    cls: "bg-emerald-950 text-emerald-300 border-emerald-800",
  },
  "paid-late": {
    label: "Tax paid late",
    cls: "bg-red-950 text-red-300 border-red-800",
  },
  safe: {
    label: "Tax scheduled",
    cls: "bg-slate-800 text-slate-300 border-slate-700",
  },
  "due-soon": {
    label: "Tax due soon",
    cls: "bg-amber-950 text-amber-300 border-amber-800",
  },
  overdue: {
    label: "Tax overdue",
    cls: "bg-red-950 text-red-300 border-red-800",
  },
};

export function RcmWatchPanel({ rows, asOf }: Props) {
  const summary = summarizeRcm(
    rows.map((r) => r.purchase),
    asOf,
    DEFAULT_RCM_RULE_CONFIG
  );
  const exposure =
    summary.totalInterestExposure + summary.totalPenaltyExposure;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide text-slate-300 uppercase">
          RCM self-invoice & cash-tax watch
        </h2>
        <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-medium tracking-widest text-slate-500 uppercase">
          Preview · synthetic data
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-sky-900/60 bg-gradient-to-br from-sky-950/50 to-[#0f1420] p-6">
          <p className="text-xs font-medium tracking-widest text-sky-300/80 uppercase">
            RCM GST owed in cash
          </p>
          <p className="mt-2 font-mono text-4xl font-semibold text-sky-200 tabular-nums">
            {formatINR(summary.totalRcmCashDue)}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Reverse-charge tax you must pay in cash (cannot be set off with ITC).
          </p>
        </div>
        <div className="rounded-2xl border border-red-900/60 bg-gradient-to-br from-red-950/60 to-[#0f1420] p-6">
          <p className="text-xs font-medium tracking-widest text-red-300/80 uppercase">
            Interest + penalty exposure
          </p>
          <p className="mt-2 font-mono text-4xl font-semibold text-red-200 tabular-nums">
            {formatINR(exposure)}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {summary.selfInvoicesOverdueCount} self-invoice(s) overdue (s.122
            penalty) + s.50 interest on late RCM tax.
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map(({ purchase, vendorName }) => {
          const a = assessRcmPurchase(purchase, asOf, DEFAULT_RCM_RULE_CONFIG);
          const alarmed =
            a.selfInvoiceStatus === "overdue" ||
            a.rcmPaymentStatus === "overdue" ||
            a.rcmPaymentStatus === "paid-late";
          const self = SELF_INVOICE_BADGE[a.selfInvoiceStatus];
          const pay = PAYMENT_BADGE[a.rcmPaymentStatus];
          return (
            <li
              key={purchase.id}
              className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                alarmed
                  ? "bg-red-500/[0.06] border-red-900/50"
                  : "border-slate-800 bg-[#0f1420]"
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-slate-100">{vendorName}</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`${BADGE_BASE} ${self.cls}`}>
                    {self.label}
                  </span>
                  <span className={`${BADGE_BASE} ${pay.cls}`}>
                    {pay.label}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  {purchase.supplyType} · RCM tax due {a.rcmPaymentDueDate}
                  {a.selfInvoiceDeadline
                    ? ` · self-invoice by ${a.selfInvoiceDeadline}`
                    : ""}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-mono text-lg font-semibold text-slate-100 tabular-nums">
                  {formatINR(purchase.rcmTaxAmount)}
                </p>
                <p className="text-xs text-slate-500">
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
