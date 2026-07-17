"use client";

import { useState, useTransition } from "react";
import type {
  UdyamCategory,
  VendorVerificationStatus,
  VendorVerificationSummary,
} from "@/lib/rules/types";
import type { VendorCfg } from "@/lib/rules/ruleConfig";
import { DetailDrawer } from "./DetailDrawer";
import { VendorForm } from "./VendorForm";
import { deleteVendor } from "@/app/vendor-actions";
import { TONE_BADGE, type Tone } from "./tone";

export type VendorRowView = {
  vendorId: string;
  vendorName: string;
  gstin: string;
  status: VendorVerificationStatus;
  gstinValid: boolean;
  lastVerifiedDate: string | null;
  daysSinceVerified: number | null;
  gstinActive: boolean;
  udyamRegistered: boolean;
  udyamCategory: UdyamCategory | null;
};

const STATUS: Record<VendorVerificationStatus, { label: string; tone: Tone }> = {
  verified: { label: "Verified", tone: "success" },
  "recheck-due": { label: "Re-check due", tone: "warning" },
  "never-verified": { label: "Never verified", tone: "neutral" },
  "invalid-gstin": { label: "Invalid GSTIN", tone: "danger" },
};

const ADVICE: Record<VendorVerificationStatus, string> = {
  verified: "Checked recently and the GSTIN is well-formed, so nothing to do here.",
  "recheck-due":
    "It's been past the re-check window. Re-verify this GSTIN on the GST portal before your next ITC claim against it.",
  "never-verified":
    "This GSTIN has never been checked on the portal. Verify it once to confirm the supplier is active.",
  "invalid-gstin":
    "This GSTIN fails the format and checksum test. Fix it before claiming any input-tax credit against this vendor.",
};

function lastCheckedLabel(row: VendorRowView): string {
  if (row.lastVerifiedDate === null) return "Never checked";
  return `${row.daysSinceVerified}d ago`;
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

export function VendorsTable({
  rows,
  summary,
  config,
}: {
  rows: VendorRowView[];
  summary: VendorVerificationSummary;
  config: VendorCfg;
}) {
  const [selected, setSelected] = useState<VendorRowView | null>(null);
  const [formTarget, setFormTarget] = useState<VendorRowView | "new" | null>(null);
  const [armedDelete, setArmedDelete] = useState(false);
  const [busy, startTransition] = useTransition();
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Reset the delete confirmation whenever a different vendor is opened.
  // Adjusted during render rather than in an effect: an effect would leave one
  // frame where the drawer shows the NEW vendor while still armed to delete the
  // previous one, and cascades an extra render. This is React's documented
  // "adjusting state when a prop changes" pattern.
  const [prevSelected, setPrevSelected] = useState(selected);
  if (selected !== prevSelected) {
    setPrevSelected(selected);
    setArmedDelete(false);
    setActionMsg(null);
  }

  function handleDelete(row: VendorRowView) {
    setActionMsg(null);
    startTransition(async () => {
      const r = await deleteVendor(row.vendorId);
      if (r.ok) setSelected(null);
      else setActionMsg(r.message);
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-5 py-3.5">
        <h2 className="font-display text-[15px] font-semibold text-fg">Vendor GSTIN verification</h2>
        <span className="text-xs text-muted">format + checksum + re-check cadence</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-2 text-[11.5px]">
            <span className="tnum font-mono font-semibold text-warning">
              {summary.needsAttentionCount}
            </span>
            <span className="text-muted">of {summary.total} need attention</span>
          </span>
          <button
            type="button"
            onClick={() => setFormTarget("new")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-semibold text-accent-fg transition-[filter] duration-150 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-4" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add vendor
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[11px] text-muted">
              <th className="px-4 py-2.5 font-semibold">Vendor</th>
              <th className="px-4 py-2.5 font-semibold">GSTIN</th>
              <th className="px-4 py-2.5 font-semibold">Last checked</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="w-10 px-4 py-2.5" aria-label="Open" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = STATUS[r.status];
              const isSel = selected?.vendorId === r.vendorId;
              return (
                <tr
                  key={r.vendorId}
                  onClick={() => setSelected(r)}
                  className={`cursor-pointer border-t border-border transition-colors ${
                    isSel ? "bg-accent-soft" : "hover:bg-surface-2"
                  }`}
                >
                  <td className="px-4 py-3 text-[13.5px] font-semibold text-fg">{r.vendorName}</td>
                  <td
                    className={`tnum px-4 py-3 font-mono text-[12.5px] ${
                      r.gstinValid ? "text-muted" : "text-danger line-through"
                    }`}
                  >
                    {r.gstin}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-fg">{lastCheckedLabel(r)}</td>
                  <td className="px-4 py-3">
                    <Chip tone={s.tone}>{s.label}</Chip>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(r);
                      }}
                      aria-label={`View ${r.vendorName}'s verification detail`}
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
        subtitle={selected ? selected.gstin : undefined}
        footer="Offline format + official mod-36 checksum. Live portal status needs a paid API (deferred). Not tax advice."
      >
        {selected && (
          <>
            <div
              className={`rounded-xl border px-4 py-3.5 ${
                selected.status === "invalid-gstin"
                  ? "border-danger/30 bg-danger-soft"
                  : selected.status === "verified"
                    ? "border-success/30 bg-success-soft"
                    : "border-warning/30 bg-warning-soft"
              }`}
            >
              <p
                className={`text-[11px] font-medium tracking-[0.08em] uppercase ${
                  selected.status === "invalid-gstin"
                    ? "text-danger"
                    : selected.status === "verified"
                      ? "text-success"
                      : "text-warning"
                }`}
              >
                {STATUS[selected.status].label}
              </p>
              <p className="mt-1 text-[13px] text-muted">{ADVICE[selected.status]}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormTarget(selected);
                  setSelected(null);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3 text-[13px] font-medium text-fg transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Edit
              </button>
              {armedDelete ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleDelete(selected)}
                    disabled={busy}
                    className="inline-flex h-9 items-center rounded-lg bg-danger px-3 text-[13px] font-semibold text-white transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
                  >
                    {busy ? "Deleting…" : "Confirm delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setArmedDelete(false)}
                    className="inline-flex h-9 items-center rounded-lg border border-border-strong px-3 text-[13px] font-medium text-fg transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    Cancel
                  </button>
                  <span className="text-[11.5px] text-muted">
                    Also removes this vendor&apos;s bills.
                  </span>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setArmedDelete(true)}
                  className="inline-flex h-9 items-center rounded-lg border border-danger/50 px-3 text-[13px] font-medium text-danger transition-colors hover:bg-danger-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Delete
                </button>
              )}
              {actionMsg && <span className="text-[12px] text-danger">{actionMsg}</span>}
            </div>

            <div>
              <p className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
                What we checked
              </p>
              <div>
                {[
                  {
                    n: "1",
                    label: "GSTIN format & checksum",
                    basis: "15-char format + official mod-36 check digit",
                    value: selected.gstinValid ? "Valid" : "Invalid",
                    bad: !selected.gstinValid,
                  },
                  {
                    n: "2",
                    label: "Last re-checked",
                    basis: "Most recent GSTIN re-verification on record",
                    value: selected.lastVerifiedDate ?? "Never",
                  },
                  {
                    n: "3",
                    label: "Re-check cadence",
                    basis: `Re-verify at least every ${config.recheckCadenceDays} days`,
                    value:
                      selected.daysSinceVerified === null
                        ? "—"
                        : `${selected.daysSinceVerified}d since`,
                    bad: selected.status === "recheck-due",
                  },
                ].map((s, i) => (
                  <div key={i} className="flex gap-3 border-b border-border py-2.5 last:border-b-0">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold text-muted">
                      {s.n}
                    </span>
                    <span className="min-w-0">
                      <span className="text-[13px] font-semibold text-fg">{s.label}</span>
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">{s.basis}</span>
                    </span>
                    <span
                      className={`tnum ml-auto shrink-0 pl-2 text-right font-mono text-[13.5px] font-semibold ${
                        s.bad ? "text-danger" : "text-fg"
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

      <DetailDrawer
        open={formTarget !== null}
        onClose={() => setFormTarget(null)}
        title={formTarget === "new" ? "Add vendor" : "Edit vendor"}
        subtitle={
          formTarget && formTarget !== "new" ? formTarget.vendorName : undefined
        }
        footer="Saved to your account. GSTIN validity is shown after you save."
      >
        {formTarget !== null && (
          <VendorForm
            vendor={formTarget === "new" ? null : formTarget}
            onSaved={() => {
              setFormTarget(null);
              setSelected(null);
            }}
          />
        )}
      </DetailDrawer>
    </section>
  );
}
