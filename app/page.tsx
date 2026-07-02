import { ComplianceDisclaimer } from "./_components/ComplianceDisclaimer";
import { DataControls } from "./_components/DataControls";
import { MoneyAtRiskHero } from "./_components/MoneyAtRiskHero";
import { RiskActionList } from "./_components/RiskActionList";
import { getDashboardData } from "@/lib/data/dashboard";
import { requireUser } from "@/lib/auth";
import { signOut } from "./auth-actions";

export default async function Home() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const isEmpty = data.totalVendors === 0 && data.totalBills === 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-semibold text-slate-100">GST SafePay</h1>
            <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-medium tracking-widest text-slate-400 uppercase">
              Prototype
            </span>
          </div>
          <p className="text-sm text-slate-400">
            MSME payment-safety cockpit — as of {data.asOf}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800/60"
              >
                Sign out
              </button>
            </form>
          </div>
          <p className="text-xs text-slate-500">
            {data.totalVendors} vendor(s) · {data.totalBills} bill(s) tracked
          </p>
        </div>
      </header>

      <ComplianceDisclaimer />

      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-[#0b0f18] p-10 text-center">
          <p className="text-slate-300">No data yet.</p>
          <p className="mt-1 text-sm text-slate-500">
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
            <h2 className="text-sm font-medium tracking-wide text-slate-300 uppercase">
              Who to pay first
            </h2>
            <RiskActionList risks={data.ranked} />
          </section>
        </>
      )}

      <DataControls />
    </div>
  );
}
