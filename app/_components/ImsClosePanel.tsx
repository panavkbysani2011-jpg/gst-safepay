import { formatINR } from "@/lib/format";
import { assessImsInvoice, summarizeImsClose } from "@/lib/rules/imsClose";
import { DEFAULT_IMS_RULE_CONFIG, type ImsStatus } from "@/lib/rules/types";
import type { DemoImsRow } from "@/lib/rules/imsFixtures";
import { PanelHeader, StatCard } from "./ui";
import { TONE_BADGE, TONE_CARD, type Tone } from "./tone";

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

const STATUS_TONE: Record<ImsStatus, Tone> = {
  accepted: "success",
  rejected: "neutral",
  pending: "neutral",
  "action-required": "warning",
  "deemed-accept-imminent": "warning",
  "auto-accepted-missed": "danger",
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
      <PanelHeader title="GST IMS monthly close" tag="Preview · synthetic data" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          eyebrow="Unverified ITC auto-flowing into GSTR-2B"
          tone="warning"
          value={formatINR(summary.totalItcAtRisk)}
        >
          {summary.actionRequiredCount} invoice(s) still need accept/reject
          {summary.nextCutoffDate
            ? ` before the next 2B cutoff on ${summary.nextCutoffDate}.`
            : "."}
        </StatCard>
        <StatCard
          eyebrow="Wrong-ITC interest exposure"
          tone="danger"
          value={formatINR(summary.totalInterestExposure)}
        >
          {summary.autoAcceptedMissedCount} invoice(s) already deemed-accepted
          past their cutoff — reversible ITC + GST s.50 interest if ineligible.
        </StatCard>
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map(({ invoice, vendorName }) => {
          const a = assessImsInvoice(invoice, asOf, DEFAULT_IMS_RULE_CONFIG);
          const tone = STATUS_TONE[a.status];
          return (
            <li
              key={invoice.id}
              className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors duration-150 hover:border-border-strong sm:flex-row sm:items-center sm:justify-between ${
                tone === "danger" || tone === "warning"
                  ? TONE_CARD[tone]
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-fg">{vendorName}</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide uppercase ${TONE_BADGE[tone]}`}
                  >
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
                <p className="text-sm text-muted">
                  {invoice.invoiceNo} · {invoice.taxPeriod} · GSTR-2B cutoff{" "}
                  {a.cutoffDate} ({cutoffLabel(a.daysToCutoff)})
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="tnum font-mono text-lg font-semibold text-fg">
                  {formatINR(invoice.gstAmount)}
                </p>
                <p className="text-xs text-faint">
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
