"use client";

import { useState } from "react";
import { formatINR, formatDate } from "@/lib/format";
import type { ImsStatus, ImsCloseSummary } from "@/lib/rules/types";
import { DetailDrawer } from "./DetailDrawer";
import { TONE_BADGE, type Tone } from "./tone";

export type ImsRowView = {
  invoiceId: string;
  vendorName: string;
  invoiceNo: string;
  taxPeriod: string;
  taxableValue: number;
  gstAmount: number;
  status: ImsStatus;
  cutoffDate: string;
  daysToCutoff: number;
  itcAtRisk: number;
  projectedInterestCost: number;
  totalExposure: number;
};

const STATUS_LABEL: Record<ImsStatus, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
  pending: "Pending",
  "action-required": "Action required",
  "deemed-accept-imminent": "Auto-accepts soon",
  "auto-accepted-missed": "Auto-accepted · missed",
};

const STATUS_TONE: Record<ImsStatus, Tone> = {
  accepted: "success",
  rejected: "neutral",
  pending: "neutral",
  "action-required": "warning",
  "deemed-accept-imminent": "warning",
  "auto-accepted-missed": "danger",
};

function cutoffLabel(d: number): string {
  if (d < 0) {
    const n = Math.abs(d);
    return `${n} ${n === 1 ? "day" : "days"} ago`;
  }
  if (d === 0) return "today";
  return `in ${d} ${d === 1 ? "day" : "days"}`;
}

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${TONE_BADGE[tone]}`}
    >
      {children}
    </span>
  );
}

export function ImsTable({
  rows,
  summary,
}: {
  rows: ImsRowView[];
  summary: ImsCloseSummary;
}) {
  const [selected, setSelected] = useState<ImsRowView | null>(null);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-5 py-3.5">
        <h2 className="font-display text-[15px] font-semibold text-fg">GST IMS monthly close</h2>
        <span className="text-xs text-faint">
          {summary.nextCutoffDate
            ? `next GSTR-2B cutoff ${formatDate(summary.nextCutoffDate)}`
            : "no open cutoff"}
        </span>
        <div className="ml-auto flex items-center gap-2 text-[11.5px]">
          <span className="tnum font-mono font-semibold text-warning">
            {formatINR(summary.totalItcAtRisk)}
          </span>
          <span className="text-faint">ITC at risk</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[11px] text-muted">
              <th className="px-4 py-2.5 font-semibold">Vendor</th>
              <th className="px-4 py-2.5 font-semibold">Invoice</th>
              <th className="px-4 py-2.5 font-semibold">GSTR-2B cutoff</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 text-right font-semibold">GST amount</th>
              <th className="px-4 py-2.5 text-right font-semibold">At stake</th>
              <th className="w-10 px-4 py-2.5" aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tone = STATUS_TONE[r.status];
              const isSel = selected?.invoiceId === r.invoiceId;
              const atStake =
                r.totalExposure > 0
                  ? formatINR(r.totalExposure)
                  : r.itcAtRisk > 0
                    ? formatINR(r.itcAtRisk)
                    : "—";
              return (
                <tr
                  key={r.invoiceId}
                  onClick={() => setSelected(r)}
                  className={`cursor-pointer border-t border-border transition-colors ${
                    isSel ? "bg-accent-soft" : "hover:bg-surface-2"
                  }`}
                >
                  <td className="px-4 py-3 text-[13.5px] font-semibold text-fg">{r.vendorName}</td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-[12.5px] text-fg">{r.invoiceNo}</div>
                    <div className="text-[11.5px] text-faint">{r.taxPeriod}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[13px] text-fg">{formatDate(r.cutoffDate)}</div>
                    <div className="text-[11.5px] text-faint">{cutoffLabel(r.daysToCutoff)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone={tone}>{STATUS_LABEL[r.status]}</Chip>
                  </td>
                  <td className="tnum px-4 py-3 text-right font-mono text-[13.5px] font-semibold text-fg">
                    {formatINR(r.gstAmount)}
                  </td>
                  <td
                    className={`tnum px-4 py-3 text-right font-mono text-[13.5px] font-semibold ${
                      r.totalExposure > 0 ? "text-danger" : r.itcAtRisk > 0 ? "text-warning" : "text-muted"
                    }`}
                  >
                    {atStake}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(r);
                      }}
                      aria-label={`View how ${r.vendorName}'s invoice is assessed`}
                      className="inline-grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DetailDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.vendorName ?? ""}
        subtitle={selected ? `Invoice ${selected.invoiceNo} · ${selected.taxPeriod}` : undefined}
        footer="Deterministic assessment against the IMS rule config a CA verifies. Not tax advice."
      >
        {selected && (
          <>
            {selected.totalExposure > 0 ? (
              <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3.5">
                <p className="text-[11px] font-medium tracking-[0.08em] text-danger uppercase">
                  Reversible ITC + interest
                </p>
                <p className="tnum mt-1 font-mono text-3xl font-semibold text-danger">
                  {formatINR(selected.totalExposure)}
                </p>
                <p className="mt-1 text-[12.5px] text-muted">
                  Deemed-accepted past cutoff and flagged ineligible: ITC to reverse plus GST s.50 interest.
                </p>
              </div>
            ) : selected.itcAtRisk > 0 ? (
              <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3.5">
                <p className="text-[11px] font-medium tracking-[0.08em] text-warning uppercase">
                  Unverified ITC into GSTR-2B
                </p>
                <p className="tnum mt-1 font-mono text-3xl font-semibold text-warning">
                  {formatINR(selected.itcAtRisk)}
                </p>
                <p className="mt-1 text-[12.5px] text-muted">
                  Will auto-flow into 2B unless you accept or reject it before the cutoff.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface-2 px-4 py-3.5">
                <p className="text-[11px] font-medium tracking-[0.08em] text-muted uppercase">Actioned</p>
                <p className="mt-1 text-[13px] text-fg">This invoice is {STATUS_LABEL[selected.status].toLowerCase()}; nothing at risk.</p>
              </div>
            )}

            <div>
              <p className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
                How this is assessed
              </p>
              <div>
                {[
                  { n: "1", label: "Invoice value", basis: `Taxable ${formatINR(selected.taxableValue)} + GST`, value: formatINR(selected.gstAmount) },
                  { n: "2", label: "Tax period", basis: "Period the supplier filed it under", value: selected.taxPeriod },
                  { n: "3", label: "GSTR-2B cutoff", basis: "Unactioned invoices are deemed-accepted into 2B on this date", value: `${formatDate(selected.cutoffDate)} (${cutoffLabel(selected.daysToCutoff)})` },
                  { n: "4", label: "Status", basis: "Your action in the IMS dashboard", value: STATUS_LABEL[selected.status] },
                  ...(selected.itcAtRisk > 0
                    ? [{ n: "+", label: "Unverified ITC", basis: "Auto-included into 2B without accept/reject", value: formatINR(selected.itcAtRisk), add: true }]
                    : []),
                  ...(selected.projectedInterestCost > 0
                    ? [{ n: "+", label: "GST s.50 interest", basis: "If the deemed-accepted ITC is ineligible and must be reversed", value: formatINR(selected.projectedInterestCost), add: true }]
                    : []),
                ].map((s, i) => (
                  <div key={i} className="flex gap-3 border-b border-border py-2.5 last:border-b-0">
                    <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${"add" in s && s.add ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted"}`}>
                      {s.n}
                    </span>
                    <span className="min-w-0">
                      <span className="text-[13px] font-semibold text-fg">{s.label}</span>
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-faint">{s.basis}</span>
                    </span>
                    <span className={`tnum ml-auto shrink-0 pl-2 text-right font-mono text-[13.5px] font-semibold ${"add" in s && s.add ? "text-danger" : "text-fg"}`}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DetailDrawer>
    </section>
  );
}
