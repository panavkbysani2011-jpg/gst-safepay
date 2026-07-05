import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { buildOverview, type NeedsActionItem } from "@/lib/data/overview";
import { groupActions } from "@/lib/report";
import { formatINR } from "@/lib/format";
import { ReportPrintButton } from "@/app/_components/ReportPrintButton";
import { EmptyState } from "@/app/_components/ui";

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function ReportSection({
  title,
  items,
  tone,
  emptyNote,
}: {
  title: string;
  items: NeedsActionItem[];
  tone: "danger" | "warning";
  emptyNote: string;
}) {
  const dot = tone === "danger" ? "bg-danger" : "bg-warning";
  const amountColor = tone === "danger" ? "text-danger" : "text-fg";
  return (
    <section className="mt-6 break-inside-avoid">
      <div className="flex items-center gap-2">
        <span className={`inline-block size-2 rounded-full ${dot}`} aria-hidden />
        <h2 className="font-display text-[14px] font-semibold text-fg">{title}</h2>
        <span className="tnum font-mono text-[12px] text-muted">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-muted">{emptyNote}</p>
      ) : (
        <ol className="mt-2 flex flex-col">
          {items.map((it, i) => (
            <li
              key={it.id}
              className="flex items-baseline gap-3 border-b border-border py-2.5 break-inside-avoid last:border-b-0"
            >
              <span className="tnum w-5 shrink-0 text-right font-mono text-[12px] text-muted">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-[13.5px] font-semibold text-fg">{it.title}</span>
                <span className="ml-2 rounded border border-border px-1.5 py-px text-[10.5px] text-muted">
                  {it.module}
                </span>
                <span className="mt-0.5 block text-[12px] text-muted">{it.detail}</span>
              </span>
              {it.amount != null && it.amount > 0 && (
                <span className={`tnum shrink-0 font-mono text-[13px] font-semibold ${amountColor}`}>
                  {formatINR(it.amount)}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function ReportPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const overview = buildOverview(data);
  const { actNow, dueSoon, total } = groupActions(overview.needsAction);
  const generatedOn = dateFmt.format(new Date());

  if (!overview.hasAnyData) {
    return (
      <EmptyState title="Nothing to report yet" actionHref="/import" actionLabel="Import your data">
        Import your vendors, bills and GST records to generate a printable action
        report you can review or hand to your CA.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div data-no-print className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-md text-[13px] text-muted">
          A one-page summary to review or hand to your CA — print it or save as PDF.
        </p>
        <ReportPrintButton />
      </div>

      {/* The report sheet — forced light so it reads as a clean document in any
          theme and prints predictably. */}
      <div
        data-theme="light"
        className="rounded-2xl border border-border bg-surface p-6 text-fg shadow-[var(--shadow)] sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <h1 className="font-display text-lg font-semibold text-fg">GST money-safety report</h1>
            <p className="mt-0.5 text-[12.5px] text-muted">{user.email}</p>
          </div>
          <div className="text-right text-[12px] text-muted">
            <p>Generated {generatedOn}</p>
            <p className="text-muted">Prepared with GST SafePay</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
              Total money at risk
            </p>
            <p className="tnum mt-1 font-mono text-3xl font-semibold text-danger">
              {formatINR(overview.totalAtRisk)}
            </p>
          </div>
          <p className="text-[12.5px] text-muted">
            {total} action{total === 1 ? "" : "s"} to review
          </p>
        </div>

        {overview.composition.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[12.5px]">
            {overview.composition.map((c) => (
              <span key={c.key} className="text-muted">
                {c.label}:{" "}
                <span className="tnum font-mono font-semibold text-fg">{formatINR(c.amount)}</span>
              </span>
            ))}
          </div>
        )}

        <ReportSection title="Act now" items={actNow} tone="danger" emptyNote="Nothing urgent right now." />
        <ReportSection
          title="Due soon"
          items={dueSoon}
          tone="warning"
          emptyNote="Nothing falling due in the next few days."
        />

        <p className="mt-6 border-t border-border pt-4 text-[11px] leading-relaxed text-muted">
          Deterministic assessment against the tax rules configured for this account,
          as of {generatedOn}. Figures are estimates to help prioritise action — not
          tax advice or a filing. Verify with your chartered accountant before acting.
        </p>
      </div>
    </div>
  );
}
