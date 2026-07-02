import { formatINR } from "@/lib/format";
import { assessImsInvoice, summarizeImsClose } from "@/lib/rules/imsClose";
import { DEFAULT_IMS_RULE_CONFIG, type ImsStatus } from "@/lib/rules/types";
import type { DemoImsRow } from "@/lib/rules/imsFixtures";

type Props = {
  rows: DemoImsRow[];
  asOf: string;
};

const STATUS_LABEL: Record<ImsStatus, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
  pending: "Pending",
  "action-required": "Action required",
  "deemed-accept-imminent": "Auto-accepts soon",
  "auto-accepted-missed": "Auto-accepted · missed",
};

const STATUS_CLASS: Record<ImsStatus, string> = {
  accepted: "bg-emerald-950 text-emerald-300 border-emerald-800",
  rejected: "bg-slate-800 text-slate-400 border-slate-700",
  pending: "bg-slate-800 text-slate-300 border-slate-700",
  "action-required": "bg-amber-950 text-amber-300 border-amber-800",
  "deemed-accept-imminent": "bg-orange-950 text-orange-300 border-orange-800",
  "auto-accepted-missed": "bg-red-950 text-red-300 border-red-800",
};

const CARD_TINT: Partial<Record<ImsStatus, string>> = {
  "deemed-accept-imminent": "bg-orange-500/[0.05] border-orange-900/40",
  "auto-accepted-missed": "bg-red-500/[0.06] border-red-900/50",
};

function cutoffLabel(daysToCutoff: number): string {
  if (daysToCutoff < 0) return `${Math.abs(daysToCutoff)} days ago`;
  if (daysToCutoff === 0) return "today";
  return `in ${daysToCutoff} days`;
}

export function ImsClosePanel({ rows, asOf }: Props) {
  const summary = summarizeImsClose(
    rows.map((r) => r.invoice),
    asOf,
    DEFAULT_IMS_RULE_CONFIG
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide text-slate-300 uppercase">
          GST IMS monthly close
        </h2>
        <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-medium tracking-widest text-slate-500 uppercase">
          Preview · synthetic data
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-900/60 bg-gradient-to-br from-amber-950/50 to-[#0f1420] p-6">
          <p className="text-xs font-medium tracking-widest text-amber-300/80 uppercase">
            Unverified ITC auto-flowing into GSTR-2B
          </p>
          <p className="mt-2 font-mono text-4xl font-semibold text-amber-200 tabular-nums">
            {formatINR(summary.totalItcAtRisk)}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {summary.actionRequiredCount} invoice(s) still need accept/reject
            {summary.nextCutoffDate
              ? ` before the next 2B cutoff on ${summary.nextCutoffDate}.`
              : "."}
          </p>
        </div>
        <div className="rounded-2xl border border-red-900/60 bg-gradient-to-br from-red-950/60 to-[#0f1420] p-6">
          <p className="text-xs font-medium tracking-widest text-red-300/80 uppercase">
            Wrong-ITC interest exposure
          </p>
          <p className="mt-2 font-mono text-4xl font-semibold text-red-200 tabular-nums">
            {formatINR(summary.totalInterestExposure)}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {summary.autoAcceptedMissedCount} invoice(s) already deemed-accepted
            past their cutoff — reversible ITC + GST s.50 interest if ineligible.
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map(({ invoice, vendorName }) => {
          const a = assessImsInvoice(invoice, asOf, DEFAULT_IMS_RULE_CONFIG);
          return (
            <li
              key={invoice.id}
              className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                CARD_TINT[a.status] ?? "border-slate-800 bg-[#0f1420]"
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-100">
                    {vendorName}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${STATUS_CLASS[a.status]}`}
                  >
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  {invoice.invoiceNo} · {invoice.taxPeriod} · GSTR-2B cutoff{" "}
                  {a.cutoffDate} ({cutoffLabel(a.daysToCutoff)})
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-mono text-lg font-semibold text-slate-100 tabular-nums">
                  {formatINR(invoice.gstAmount)}
                </p>
                <p className="text-xs text-slate-500">
                  {a.totalExposure > 0
                    ? `${formatINR(a.totalExposure)} at stake`
                    : a.itcAtRisk > 0
                      ? "ITC unverified"
                      : "settled"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
