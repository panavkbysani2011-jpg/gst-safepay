import type {
  VendorVerificationStatus,
  VendorVerificationSummary,
} from "@/lib/rules/types";
import type { VendorVerificationRow } from "@/lib/data/dashboard";
import { PanelHeader, StatCard } from "./ui";
import { TONE_BADGE, TONE_CARD, type Tone } from "./tone";

type Props = {
  rows: VendorVerificationRow[];
  summary: VendorVerificationSummary;
  asOf: string;
};

const STATUS: Record<
  VendorVerificationStatus,
  { label: string; tone: Tone }
> = {
  verified: { label: "Verified", tone: "success" },
  "recheck-due": { label: "Re-check due", tone: "warning" },
  "never-verified": { label: "Never verified", tone: "neutral" },
  "invalid-gstin": { label: "Invalid GSTIN", tone: "danger" },
};

function verifiedLabel(row: VendorVerificationRow): string {
  const { lastVerifiedDate, daysSinceVerified } = row.assessment;
  if (lastVerifiedDate === null) return "never checked";
  return `last checked ${lastVerifiedDate} (${daysSinceVerified}d ago)`;
}

export function VendorVerificationPanel({ rows, summary, asOf }: Props) {
  return (
    <section className="flex flex-col gap-3">
      <PanelHeader title="Vendor GSTIN verification" tag={`As of ${asOf}`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          eyebrow="Vendors needing attention"
          tone="warning"
          value={summary.needsAttentionCount}
        >
          Invalid, never-checked, or overdue for re-verification (of{" "}
          {summary.total} vendors).
        </StatCard>
        <StatCard
          eyebrow="Invalid GSTINs"
          tone="danger"
          value={summary.invalidCount}
        >
          Fail format/checksum — fix before claiming input-tax-credit against
          them.
        </StatCard>
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map((row) => {
          const s = STATUS[row.assessment.status];
          return (
            <li
              key={row.assessment.vendorId}
              className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors duration-150 hover:border-border-strong sm:flex-row sm:items-center sm:justify-between ${
                s.tone === "danger" || s.tone === "warning"
                  ? TONE_CARD[s.tone]
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-fg">{row.vendorName}</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${TONE_BADGE[s.tone]}`}
                  >
                    {s.label}
                  </span>
                </div>
                <p className="tnum font-mono text-sm text-muted">{row.gstin}</p>
              </div>
              <p className="text-left text-xs text-faint sm:text-right">
                {verifiedLabel(row)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
