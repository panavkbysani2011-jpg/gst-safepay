"use client";

import { useState } from "react";
import { formatINR, formatDate } from "@/lib/format";
import type {
  RcmPaymentStatus,
  RcmSelfInvoiceStatus,
  RcmSummary,
  RcmSupplyType,
} from "@/lib/rules/types";
import type { RcmCfg } from "@/lib/rules/ruleConfig";
import { DetailDrawer } from "./DetailDrawer";
import { TONE_BADGE, type Tone } from "./tone";

export type RcmRowView = {
  purchaseId: string;
  vendorName: string;
  supplyType: RcmSupplyType;
  supplyDate: string;
  rcmTaxAmount: number;
  selfInvoiceApplicable: boolean;
  selfInvoiceDeadline: string | null;
  selfInvoiceStatus: RcmSelfInvoiceStatus;
  timeOfSupply: string;
  rcmPaymentDueDate: string;
  rcmPaymentStatus: RcmPaymentStatus;
  rcmTaxDueInCash: number;
  projectedInterestCost: number;
  penaltyExposure: number;
  totalExposure: number;
};

const PAYMENT: Record<RcmPaymentStatus, { label: string; tone: Tone }> = {
  "paid-on-time": { label: "Tax paid", tone: "success" },
  "paid-late": { label: "Tax paid late", tone: "danger" },
  safe: { label: "Tax scheduled", tone: "neutral" },
  "due-soon": { label: "Tax due soon", tone: "warning" },
  overdue: { label: "Tax overdue", tone: "danger" },
};

const SELF_INVOICE: Record<RcmSelfInvoiceStatus, { label: string; tone: Tone }> = {
  "not-applicable": { label: "Self-inv N/A", tone: "neutral" },
  issued: { label: "Self-inv done", tone: "success" },
  safe: { label: "Self-inv ok", tone: "neutral" },
  "due-soon": { label: "Self-inv due", tone: "warning" },
  overdue: { label: "Self-inv overdue", tone: "danger" },
};

function daysLabel(fromToday: number): string {
  if (fromToday < 0) return `${Math.abs(fromToday)} days overdue`;
  if (fromToday === 0) return "due today";
  return `in ${fromToday} days`;
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

type Step = { n: string; label: string; basis: string; value: string; add?: boolean };

function buildSteps(r: RcmRowView, config: RcmCfg): Step[] {
  const steps: Step[] = [
    {
      n: "1",
      label: "Supply",
      basis: `Reverse-charge ${r.supplyType} received`,
      value: formatDate(r.supplyDate),
    },
    {
      n: "2",
      label: "Time of supply",
      basis: `${r.supplyType === "goods" ? config.timeOfSupplyDaysGoods : config.timeOfSupplyDaysServices}-day rule (${r.supplyType})`,
      value: formatDate(r.timeOfSupply),
    },
    {
      n: "3",
      label: "RCM tax payable in cash by",
      basis: `GSTR-3B due (day ${config.gstr3bDueDayOfNextMonth} of the next month). RCM tax is cash, no ITC set-off`,
      value: formatDate(r.rcmPaymentDueDate),
    },
  ];
  if (r.selfInvoiceApplicable && r.selfInvoiceDeadline) {
    steps.push({
      n: "4",
      label: "Self-invoice deadline",
      basis: `Rule 47A: self-invoice within ${config.selfInvoiceDays} days (unregistered supplier)`,
      value: formatDate(r.selfInvoiceDeadline),
    });
  }
  if (r.projectedInterestCost > 0) {
    steps.push({
      n: "+",
      label: "s.50 interest on late RCM tax",
      basis: `${config.latePaymentInterestRatePercent}% p.a. from the due date to payment`,
      value: formatINR(r.projectedInterestCost),
      add: true,
    });
  }
  if (r.penaltyExposure > 0) {
    steps.push({
      n: "+",
      label: "Self-invoice default penalty",
      basis: `${formatINR(config.lateSelfInvoicePenalty)} exposure under s.122`,
      value: formatINR(r.penaltyExposure),
      add: true,
    });
  }
  return steps;
}

export function RcmTable({ rows, summary, config }: { rows: RcmRowView[]; summary: RcmSummary; config: RcmCfg }) {
  const [selected, setSelected] = useState<RcmRowView | null>(null);
  const exposure = summary.totalInterestExposure + summary.totalPenaltyExposure;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-5 py-3.5">
        <h2 className="font-display text-[15px] font-semibold text-fg">
          Reverse-charge watch
        </h2>
        <span className="text-xs text-faint">self-invoice (Rule 47A) & cash-GST deadlines</span>
        <div className="ml-auto flex items-center gap-2 text-[11.5px]">
          <span className="tnum font-mono font-semibold text-danger">{formatINR(exposure)}</span>
          <span className="text-faint">interest + penalty exposure</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[11px] text-muted">
              <th className="px-4 py-2.5 font-semibold">Vendor</th>
              <th className="px-4 py-2.5 font-semibold">Supply</th>
              <th className="px-4 py-2.5 font-semibold">RCM tax due</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 text-right font-semibold">RCM tax</th>
              <th className="px-4 py-2.5 text-right font-semibold">Exposure</th>
              <th className="w-10 px-4 py-2.5" aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isSel = selected?.purchaseId === r.purchaseId;
              const pay = PAYMENT[r.rcmPaymentStatus];
              const self = SELF_INVOICE[r.selfInvoiceStatus];
              return (
                <tr
                  key={r.purchaseId}
                  onClick={() => setSelected(r)}
                  className={`cursor-pointer border-t border-border transition-colors ${
                    isSel ? "bg-accent-soft" : "hover:bg-surface-2"
                  }`}
                >
                  <td className="px-4 py-3 text-[13.5px] font-semibold text-fg">{r.vendorName}</td>
                  <td className="px-4 py-3">
                    <div className="text-[13px] text-fg capitalize">{r.supplyType}</div>
                    <div className="text-[11.5px] text-faint">{formatDate(r.supplyDate)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[13px] text-fg">{formatDate(r.rcmPaymentDueDate)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Chip tone={pay.tone}>{pay.label}</Chip>
                      {r.selfInvoiceApplicable && <Chip tone={self.tone}>{self.label}</Chip>}
                    </div>
                  </td>
                  <td className="tnum px-4 py-3 text-right font-mono text-[13.5px] font-semibold text-fg">
                    {formatINR(r.rcmTaxAmount)}
                  </td>
                  <td
                    className={`tnum px-4 py-3 text-right font-mono text-[13.5px] font-semibold ${
                      r.totalExposure > 0 ? "text-danger" : "text-muted"
                    }`}
                  >
                    {r.totalExposure > 0 ? formatINR(r.totalExposure) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(r);
                      }}
                      aria-label={`View how ${r.vendorName}'s reverse-charge purchase is assessed`}
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
        subtitle={
          selected ? `${selected.supplyType} · RCM tax ${formatINR(selected.rcmTaxAmount)}` : undefined
        }
        footer="Deterministic assessment against the RCM rule config a CA verifies. Not tax advice."
      >
        {selected && (
          <>
            {selected.totalExposure > 0 ? (
              <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3.5">
                <p className="text-[11px] font-medium tracking-[0.08em] text-danger uppercase">
                  Interest + penalty exposure
                </p>
                <p className="tnum mt-1 font-mono text-3xl font-semibold text-danger">
                  {formatINR(selected.totalExposure)}
                </p>
                <p className="mt-1 text-[12.5px] text-muted">
                  s.50 interest on late reverse-charge tax and/or the s.122 self-invoice default penalty.
                </p>
              </div>
            ) : selected.rcmTaxDueInCash > 0 ? (
              <div className="rounded-xl border border-info/30 bg-info-soft px-4 py-3.5">
                <p className="text-[11px] font-medium tracking-[0.08em] text-info uppercase">
                  RCM tax payable in cash
                </p>
                <p className="tnum mt-1 font-mono text-3xl font-semibold text-info">
                  {formatINR(selected.rcmTaxDueInCash)}
                </p>
                <p className="mt-1 text-[12.5px] text-muted">
                  Reverse-charge tax must be paid in cash. It cannot be set off with input-tax credit.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface-2 px-4 py-3.5">
                <p className="text-[11px] font-medium tracking-[0.08em] text-muted uppercase">Settled</p>
                <p className="mt-1 text-[13px] text-fg">
                  Reverse-charge tax paid and self-invoice handled; nothing at risk.
                </p>
              </div>
            )}

            <div>
              <p className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
                How this is assessed
              </p>
              <div>
                {buildSteps(selected, config).map((s, i) => (
                  <div key={i} className="flex gap-3 border-b border-border py-2.5 last:border-b-0">
                    <span
                      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                        s.add ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted"
                      }`}
                    >
                      {s.n}
                    </span>
                    <span className="min-w-0">
                      <span className="text-[13px] font-semibold text-fg">{s.label}</span>
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-faint">{s.basis}</span>
                    </span>
                    <span
                      className={`tnum ml-auto shrink-0 pl-2 text-right font-mono text-[13.5px] font-semibold ${
                        s.add ? "text-danger" : "text-fg"
                      }`}
                    >
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
