"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";
import type { ComplianceStatus, ComplianceSummary } from "@/lib/rules/types";
import { DetailDrawer } from "./DetailDrawer";
import { ComplianceProof } from "./ComplianceProof";
import { TONE_BADGE, type Tone } from "./tone";

export type ComplianceRowView = {
  deadlineId: string;
  name: string;
  authority: string;
  period: string;
  dueDate: string;
  proofRef: string | null;
  status: ComplianceStatus;
  daysToDue: number;
  hasEvidence: boolean;
  hasProofFile: boolean;
};

const STATUS: Record<ComplianceStatus, { label: string; tone: Tone }> = {
  filed: { label: "Filed", tone: "success" },
  overdue: { label: "Overdue", tone: "danger" },
  "due-soon": { label: "Due soon", tone: "warning" },
  upcoming: { label: "Upcoming", tone: "neutral" },
};

function dueLabel(daysToDue: number): string {
  if (daysToDue < 0) {
    const n = Math.abs(daysToDue);
    return `${n} ${n === 1 ? "day" : "days"} overdue`;
  }
  if (daysToDue === 0) return "due today";
  return `in ${daysToDue} ${daysToDue === 1 ? "day" : "days"}`;
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

function FileBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-accent-text"
      title="Proof file attached"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-hidden>
        <path d="M21 12.5 12.5 21a4 4 0 0 1-5.7-5.7l8-8a2.5 2.5 0 0 1 3.5 3.5l-8 8a1 1 0 0 1-1.4-1.4l7.3-7.3" />
      </svg>
      file
    </span>
  );
}

function EvidenceCell({ row }: { row: ComplianceRowView }) {
  const primary =
    row.status !== "filed" ? (
      <span className="text-[12px] text-faint">not filed</span>
    ) : row.hasEvidence ? (
      <span className="tnum font-mono text-[12px] text-success">{row.proofRef}</span>
    ) : (
      <span className="text-[12px] text-warning">no proof on file</span>
    );
  return (
    <span className="flex items-center gap-2">
      {primary}
      {row.hasProofFile && <FileBadge />}
    </span>
  );
}

export function ComplianceTable({
  rows,
  summary,
}: {
  rows: ComplianceRowView[];
  summary: ComplianceSummary;
}) {
  const [selected, setSelected] = useState<ComplianceRowView | null>(null);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-5 py-3.5">
        <h2 className="font-display text-[15px] font-semibold text-fg">
          Compliance calendar & evidence
        </h2>
        <span className="text-xs text-faint">filing deadlines with proof-of-filing</span>
        <div className="ml-auto flex items-center gap-3 text-[11.5px]">
          <span>
            <span className="tnum font-mono font-semibold text-danger">{summary.overdueCount}</span>{" "}
            <span className="text-faint">overdue</span>
          </span>
          <span>
            <span className="tnum font-mono font-semibold text-warning">
              {summary.evidenceGapCount}
            </span>{" "}
            <span className="text-faint">
              {summary.evidenceGapCount === 1 ? "evidence gap" : "evidence gaps"}
            </span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[11px] text-muted">
              <th className="px-4 py-2.5 font-semibold">Obligation</th>
              <th className="px-4 py-2.5 font-semibold">Period</th>
              <th className="px-4 py-2.5 font-semibold">Due</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Evidence</th>
              <th className="w-10 px-4 py-2.5" aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = STATUS[r.status];
              const isSel = selected?.deadlineId === r.deadlineId;
              return (
                <tr
                  key={r.deadlineId}
                  onClick={() => setSelected(r)}
                  className={`cursor-pointer border-t border-border transition-colors ${
                    isSel ? "bg-accent-soft" : "hover:bg-surface-2"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-fg">{r.name}</span>
                      <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium tracking-widest text-faint uppercase">
                        {r.authority}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-fg">{r.period}</td>
                  <td className="px-4 py-3">
                    <div className="text-[13px] text-fg">{formatDate(r.dueDate)}</div>
                    {r.status !== "filed" && (
                      <div className="text-[11.5px] text-faint">{dueLabel(r.daysToDue)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Chip tone={s.tone}>{s.label}</Chip>
                  </td>
                  <td className="px-4 py-3">
                    <EvidenceCell row={r} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(r);
                      }}
                      aria-label={`View ${r.name} filing detail`}
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
        title={selected?.name ?? ""}
        subtitle={selected ? `${selected.authority} · ${selected.period}` : undefined}
        footer="Deterministic against your filing calendar. Proof files are stored privately, so only you can open them. Not tax advice."
      >
        {selected && (
          <>
            <div className={`rounded-xl border px-4 py-3.5 ${
              selected.status === "overdue"
                ? "border-danger/30 bg-danger-soft"
                : selected.status === "due-soon"
                  ? "border-warning/30 bg-warning-soft"
                  : selected.status === "filed" && !selected.hasEvidence
                    ? "border-warning/30 bg-warning-soft"
                    : selected.status === "filed"
                      ? "border-success/30 bg-success-soft"
                      : "border-border bg-surface-2"
            }`}>
              <p className={`text-[11px] font-medium tracking-[0.08em] uppercase ${
                selected.status === "overdue"
                  ? "text-danger"
                  : selected.status === "due-soon" || (selected.status === "filed" && !selected.hasEvidence)
                    ? "text-warning"
                    : selected.status === "filed"
                      ? "text-success"
                      : "text-muted"
              }`}>
                {selected.status === "filed" && !selected.hasEvidence
                  ? "Filed, no proof on file"
                  : STATUS[selected.status].label}
              </p>
              <p className="mt-1 text-[13px] text-muted">
                {selected.status === "overdue"
                  ? `Missed by ${Math.abs(selected.daysToDue)} days. File as soon as possible to limit late fees and interest.`
                  : selected.status === "due-soon"
                    ? `Due ${dueLabel(selected.daysToDue)}. File before the deadline.`
                    : selected.status === "filed" && !selected.hasEvidence
                      ? "Filed, but no ARN or challan reference is stored, which leaves an audit gap. Add the proof reference."
                      : selected.status === "filed"
                        ? "Filed and a proof reference is on record."
                        : `Upcoming, due ${dueLabel(selected.daysToDue)}.`}
              </p>
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
                Detail
              </p>
              <div>
                {[
                  { n: "1", label: "Obligation", basis: `Filed with ${selected.authority}`, value: selected.name },
                  { n: "2", label: "Period", basis: "The tax/return period this covers", value: selected.period },
                  { n: "3", label: "Statutory due date", basis: "Deadline compared to today", value: `${formatDate(selected.dueDate)} (${dueLabel(selected.daysToDue)})` },
                  { n: "4", label: "Evidence", basis: "ARN / challan / acknowledgement reference on file", value: selected.hasEvidence && selected.proofRef ? selected.proofRef : "None" },
                ].map((s, i) => (
                  <div key={i} className="flex gap-3 border-b border-border py-2.5 last:border-b-0">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold text-muted">
                      {s.n}
                    </span>
                    <span className="min-w-0">
                      <span className="text-[13px] font-semibold text-fg">{s.label}</span>
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-faint">{s.basis}</span>
                    </span>
                    <span className="tnum ml-auto shrink-0 pl-2 text-right font-mono text-[13px] font-semibold text-fg">
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <ComplianceProof deadlineId={selected.deadlineId} hasFile={selected.hasProofFile} />
            </div>
          </>
        )}
      </DetailDrawer>
    </section>
  );
}
