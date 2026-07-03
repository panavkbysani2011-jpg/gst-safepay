import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { buildOverview } from "@/lib/data/overview";
import { OverviewBoard } from "@/app/_components/OverviewBoard";
import { EmptyState, SectionHeading } from "@/app/_components/ui";

export default async function OverviewPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const overview = buildOverview(data);

  if (!overview.hasAnyData) {
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
              <p className="text-xs text-faint">{m.unit}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
