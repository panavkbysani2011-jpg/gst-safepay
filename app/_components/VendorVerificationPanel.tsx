import type {
  VendorVerificationStatus,
  VendorVerificationSummary,
} from "@/lib/rules/types";
import type { VendorVerificationRow } from "@/lib/data/dashboard";

type Props = {
  rows: VendorVerificationRow[];
  summary: VendorVerificationSummary;
  asOf: string;
};

const BADGE: Record<VendorVerificationStatus, { label: string; cls: string }> = {
  verified: {
    label: "Verified",
    cls: "bg-emerald-950 text-emerald-300 border-emerald-800",
  },
  "recheck-due": {
    label: "Re-check due",
    cls: "bg-amber-950 text-amber-300 border-amber-800",
  },
  "never-verified": {
    label: "Never verified",
    cls: "bg-slate-800 text-slate-300 border-slate-700",
  },
  "invalid-gstin": {
    label: "Invalid GSTIN",
    cls: "bg-red-950 text-red-300 border-red-800",
  },
};

function verifiedLabel(row: VendorVerificationRow): string {
  const { lastVerifiedDate, daysSinceVerified } = row.assessment;
  if (lastVerifiedDate === null) return "never checked";
  return `last checked ${lastVerifiedDate} (${daysSinceVerified}d ago)`;
}

export function VendorVerificationPanel({ rows, summary, asOf }: Props) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide text-slate-300 uppercase">
          Vendor GSTIN verification
        </h2>
        <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-medium tracking-widest text-slate-500 uppercase">
          As of {asOf}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-900/60 bg-gradient-to-br from-amber-950/50 to-[#0f1420] p-6">
          <p className="text-xs font-medium tracking-widest text-amber-300/80 uppercase">
            Vendors needing attention
          </p>
          <p className="mt-2 font-mono text-4xl font-semibold text-amber-200 tabular-nums">
            {summary.needsAttentionCount}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Invalid, never-checked, or overdue for re-verification (of{" "}
            {summary.total} vendors).
          </p>
        </div>
        <div className="rounded-2xl border border-red-900/60 bg-gradient-to-br from-red-950/60 to-[#0f1420] p-6">
          <p className="text-xs font-medium tracking-widest text-red-300/80 uppercase">
            Invalid GSTINs
          </p>
          <p className="mt-2 font-mono text-4xl font-semibold text-red-200 tabular-nums">
            {summary.invalidCount}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Fail format/checksum — fix before claiming input-tax-credit against
            them.
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map((row) => {
          const badge = BADGE[row.assessment.status];
          const alarmed =
            row.assessment.status === "invalid-gstin" ||
            row.assessment.status === "recheck-due";
          return (
            <li
              key={row.assessment.vendorId}
              className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                alarmed
                  ? "bg-red-500/[0.05] border-red-900/40"
                  : "border-slate-800 bg-[#0f1420]"
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-100">
                    {row.vendorName}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <p className="font-mono text-sm text-slate-400">{row.gstin}</p>
              </div>
              <p className="text-left text-xs text-slate-500 sm:text-right">
                {verifiedLabel(row)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
