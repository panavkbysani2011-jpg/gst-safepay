"use client";

import { useState } from "react";
import { formatINR, formatDate, subtractDaysIso } from "@/lib/format";
import type { PaymentCfg } from "@/lib/rules/ruleConfig";
import type { RankedRisk } from "@/lib/data/dashboard";
import { StatusBadge } from "./StatusBadge";
import { DetailDrawer } from "./DetailDrawer";

function daysLabel(daysRemaining: number | null): string {
  if (daysRemaining === null) return "—";
  if (daysRemaining < 0) {
    const n = Math.abs(daysRemaining);
    return `${n} ${n === 1 ? "day" : "days"} overdue`;
  }
  if (daysRemaining === 0) return "Due today";
  return `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`;
}

function deadlineBasis(deadlineDays: number | null, config: PaymentCfg): string {
  if (deadlineDays === config.statutoryMaxDaysWithoutAgreement)
    return `No written agreement → statutory ${deadlineDays}-day limit (MSMED Act s.15)`;
  if (deadlineDays === config.statutoryMaxDaysWithAgreement)
    return `${deadlineDays}-day statutory cap for MSME suppliers (MSMED Act s.15)`;
  return `Agreed ${deadlineDays}-day payment term`;
}

type Step = { n: string; label: string; basis: string; value?: string; add?: boolean };

function buildSteps(r: RankedRisk, config: PaymentCfg): Step[] {
  const steps: Step[] = [];
  if (r.dueDate && r.deadlineDays !== null) {
    steps.push({
      n: "1",
      label: "Invoice accepted",
      basis: "Deemed acceptance date on record",
      value: formatDate(subtractDaysIso(r.dueDate, r.deadlineDays)),
    });
    steps.push({
      n: "2",
      label: "MSME payment deadline",
      basis: deadlineBasis(r.deadlineDays, config),
      value: formatDate(r.dueDate),
    });
  }
  steps.push({
    n: "3",
    label: r.daysRemaining !== null && r.daysRemaining < 0 ? "Overdue" : "Time to deadline",
    basis: "Deadline compared to today",
    value: daysLabel(r.daysRemaining),
  });
  if (r.taxDeductionAtRisk > 0) {
    steps.push({
      n: "+",
      label: "Lost income-tax deduction",
      basis: `§43B(h): the expense is disallowed until paid, taxed at ${config.assumedMarginalTaxRatePercent}%`,
      value: formatINR(r.taxDeductionAtRisk),
      add: true,
    });
  }
  if (r.projectedInterestCost > 0) {
    steps.push({
      n: "+",
      label: "MSMED penalty interest",
      basis: `${config.msmedInterestMultiplier}× RBI bank rate (${config.rbiBankRatePercent}%), compounded monthly (MSMED Act s.16)`,
      value: formatINR(r.projectedInterestCost),
      add: true,
    });
  }
  return steps;
}

export function PaymentsTable({ risks, config }: { risks: RankedRisk[]; config: PaymentCfg }) {
  const [selected, setSelected] = useState<RankedRisk | null>(null);
  const [compact, setCompact] = useState(false);

  const rowPad = compact ? "py-2" : "py-3";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <h2 className="font-display text-[15px] font-semibold text-fg">Who to pay first</h2>
        <span className="text-xs text-muted">ranked by cost of delay</span>
        <button
          type="button"
          onClick={() => setCompact((c) => !c)}
          aria-pressed={compact}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {compact ? "Comfortable" : "Compact"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[11px] tracking-[0.02em] text-muted">
              <th className="w-11 px-4 py-2.5 font-semibold">#</th>
              <th className="px-4 py-2.5 font-semibold">Vendor</th>
              <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
              <th className="px-4 py-2.5 font-semibold">Deadline</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 text-right font-semibold">Cost of delay</th>
              <th className="w-10 px-4 py-2.5" aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {risks.map((r, i) => {
              const isSel = selected?.billId === r.billId;
              const danger = r.status === "breached" || r.status === "paid-late";
              return (
                <tr
                  key={r.billId}
                  onClick={() => setSelected(r)}
                  className={`cursor-pointer border-t border-border transition-colors ${
                    isSel ? "bg-accent-soft" : "hover:bg-surface-2"
                  }`}
                >
                  <td className={`px-4 ${rowPad}`}>
                    <span
                      className={`grid size-[22px] place-items-center rounded-md text-xs font-semibold tabular-nums ${
                        danger ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className={`px-4 ${rowPad} text-[13.5px] font-semibold text-fg`}>
                    {r.vendorName}
                  </td>
                  <td className={`tnum px-4 ${rowPad} text-right font-mono text-[13.5px] font-semibold text-fg`}>
                    {formatINR(r.amount)}
                  </td>
                  <td className={`px-4 ${rowPad}`}>
                    <div className="text-[13px] text-fg">
                      {r.dueDate ? formatDate(r.dueDate) : "—"}
                    </div>
                    <div className="text-[11.5px] text-muted">{daysLabel(r.daysRemaining)}</div>
                  </td>
                  <td className={`px-4 ${rowPad}`}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td className={`tnum px-4 ${rowPad} text-right font-mono text-[13.5px] font-semibold ${danger ? "text-danger" : "text-muted"}`}>
                    {r.totalCostOfDelay > 0 ? formatINR(r.totalCostOfDelay) : "—"}
                  </td>
                  <td className={`px-4 ${rowPad} text-right`}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(r);
                      }}
                      aria-label={`View how ${r.vendorName}'s number is computed`}
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
        subtitle={selected ? `${formatINR(selected.amount)} · bill ${selected.billId}` : undefined}
        footer="Deterministic computation. Every parameter is one a CA verifies in the sign-off checklist. Not tax advice."
      >
        {selected && (
          <>
            {selected.totalCostOfDelay > 0 ? (
              <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3.5">
                <p className="text-[11px] font-medium tracking-[0.08em] text-danger uppercase">
                  Cost of delay
                </p>
                <p className="tnum mt-1 font-mono text-3xl font-semibold text-danger">
                  {formatINR(selected.totalCostOfDelay)}
                </p>
                <p className="mt-1 text-[12.5px] text-muted">
                  Locked in for the year once the deadline is breached, whether or not it is later paid.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface-2 px-4 py-3.5">
                <p className="text-[11px] font-medium tracking-[0.08em] text-muted uppercase">
                  No money at risk yet
                </p>
                <p className="mt-1 text-[13px] text-fg">{daysLabel(selected.daysRemaining)} on this bill.</p>
              </div>
            )}

            <div>
              <p className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
                How this is computed
              </p>
              <div>
                {buildSteps(selected, config).map((s, i) => (
                  <div
                    key={i}
                    className="flex gap-3 border-b border-border py-2.5 last:border-b-0"
                  >
                    <span
                      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                        s.add ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted"
                      }`}
                    >
                      {s.n}
                    </span>
                    <span className="min-w-0">
                      <span className="text-[13px] font-semibold text-fg">{s.label}</span>
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">
                        {s.basis}
                      </span>
                    </span>
                    {s.value && (
                      <span
                        className={`tnum ml-auto shrink-0 pl-2 text-right font-mono text-[13.5px] font-semibold ${
                          s.add ? "text-danger" : "text-fg"
                        }`}
                      >
                        {s.value}
                      </span>
                    )}
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
