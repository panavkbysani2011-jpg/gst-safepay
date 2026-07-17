import Link from "next/link";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { buildOverview } from "@/lib/data/overview";
import { getGettingStartedState, GETTING_STARTED_DISMISS_COOKIE } from "@/lib/onboarding";
import { GettingStarted } from "@/app/_components/GettingStarted";
import { OverviewBoard } from "@/app/_components/OverviewBoard";
import { EmptyState, SectionHeading } from "@/app/_components/ui";

export default async function OverviewPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const overview = buildOverview(data);

  const gettingStarted = getGettingStartedState({
    vendors: data.totalVendors,
    bills: data.totalBills,
    gstRecords: data.totalImsInvoices + data.totalRcmPurchases + data.totalCompliance,
  });
  const dismissed =
    (await cookies()).get(GETTING_STARTED_DISMISS_COOKIE)?.value === "1";
  const showGettingStarted = !gettingStarted.allDone && !dismissed;

  if (!overview.hasAnyData) {
    // Cold account: the checklist is the primary content. If it was dismissed
    // with no data yet, fall back to the minimal empty state.
    if (showGettingStarted) {
      return (
        <div className="flex flex-col gap-8">
          <GettingStarted state={gettingStarted} />
        </div>
      );
    }
    return (
      <EmptyState
        title="No data yet"
        actionHref="/import"
        actionLabel="Import your data"
      >
        Load the demo data or upload your vendor and bill CSVs to see the money
        at risk across every module.
      </EmptyState>
    );
  }

  const modules = [
    { label: "Payments", href: "/payments", count: data.totalBills, unit: "bills" },
    { label: "GST IMS", href: "/ims", count: data.totalImsInvoices, unit: "invoices" },
    { label: "Reverse charge", href: "/rcm", count: data.totalRcmPurchases, unit: "purchases" },
    { label: "Vendors", href: "/vendors", count: data.totalVendors, unit: "vendors" },
    { label: "Compliance", href: "/compliance", count: data.totalCompliance, unit: "deadlines" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {showGettingStarted && <GettingStarted state={gettingStarted} />}
      <OverviewBoard model={overview} />

      <section className="flex flex-col gap-3">
        <SectionHeading>Modules</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {modules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
            >
              <p className="text-sm font-semibold text-fg">{m.label}</p>
              <p className="tnum mt-1 font-mono text-xl font-semibold text-fg">{m.count}</p>
              <p className="text-xs text-muted">{m.unit}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
