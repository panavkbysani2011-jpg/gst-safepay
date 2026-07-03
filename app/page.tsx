import { ComplianceDisclaimer } from "./_components/ComplianceDisclaimer";
import { DataControls } from "./_components/DataControls";
import { MoneyAtRiskHero } from "./_components/MoneyAtRiskHero";
import { RiskActionList } from "./_components/RiskActionList";
import { ImsClosePanel } from "./_components/ImsClosePanel";
import { RcmWatchPanel } from "./_components/RcmWatchPanel";
import { VendorVerificationPanel } from "./_components/VendorVerificationPanel";
import { CompliancePanel } from "./_components/CompliancePanel";
import { ThemeToggle } from "./_components/ThemeToggle";
import { SectionHeading } from "./_components/ui";
import { getDashboardData } from "@/lib/data/dashboard";
import { requireUser } from "@/lib/auth";
import { signOut } from "./auth-actions";

export default async function Home() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const isEmpty = data.totalVendors === 0 && data.totalBills === 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-fg"
            >
              ₹
            </span>
            <h1 className="font-display text-lg font-semibold text-fg">
              GST SafePay
            </h1>
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium tracking-widest text-faint uppercase">
              Prototype
            </span>
          </div>
          <p className="text-sm text-muted">
            MSME payment-safety cockpit — as of {data.asOf}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="hidden text-xs text-muted sm:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Sign out
              </button>
            </form>
          </div>
          <p className="text-xs text-faint">
            {data.totalVendors} vendor(s) · {data.totalBills} bill(s) tracked
          </p>
        </div>
      </header>

      <ComplianceDisclaimer />

      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center">
          <p className="font-medium text-fg">No data yet.</p>
          <p className="mt-1 text-sm text-muted">
            Load the demo data to see how it works, or upload your own vendor and
            bill CSVs below.
          </p>
        </div>
      ) : (
        <>
          <MoneyAtRiskHero
            moneyAlreadyAtRisk={data.moneyAlreadyAtRisk}
            billsNeedingActionThisWeek={data.billsNeedingActionThisWeek}
          />
          <section className="flex flex-col gap-3">
            <SectionHeading>Who to pay first</SectionHeading>
            <RiskActionList risks={data.ranked} />
          </section>
        </>
      )}

      {data.totalVendors > 0 && (
        <VendorVerificationPanel
          rows={data.vendorVerifications}
          summary={data.vendorVerificationSummary}
          asOf={data.verifyAsOf}
        />
      )}

      {data.totalImsInvoices > 0 && (
        <ImsClosePanel rows={data.imsRows} asOf={data.imsAsOf} />
      )}

      {data.totalRcmPurchases > 0 && (
        <RcmWatchPanel rows={data.rcmRows} asOf={data.rcmAsOf} />
      )}

      {data.totalCompliance > 0 && (
        <CompliancePanel
          deadlines={data.complianceDeadlines}
          asOf={data.complianceAsOf}
        />
      )}

      <DataControls />
    </div>
  );
}
