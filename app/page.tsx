import { DemoDataBanner } from "./_components/DemoDataBanner";
import { MoneyAtRiskHero } from "./_components/MoneyAtRiskHero";
import { RiskActionList } from "./_components/RiskActionList";
import { assessPaymentRisk } from "@/lib/rules/paymentDeadline";
import { rankBillsByRisk } from "@/lib/rules/prioritize";
import { DEMO_BILLS, DEMO_VENDORS, TODAY } from "@/lib/rules/fixtures";
import { DEFAULT_PAYMENT_RULE_CONFIG } from "@/lib/rules/types";

export default function Home() {
  const vendorsById = new Map(DEMO_VENDORS.map((v) => [v.id, v]));

  const risks = DEMO_BILLS.map((bill) => {
    const vendor = vendorsById.get(bill.vendorId);
    if (!vendor) return null;
    const assessment = assessPaymentRisk(
      vendor,
      bill,
      TODAY,
      DEFAULT_PAYMENT_RULE_CONFIG
    );
    return { ...assessment, vendorName: vendor.name, amount: bill.amount };
  }).filter((r) => r !== null);

  const ranked = rankBillsByRisk(risks).map((r) => {
    const full = risks.find((x) => x.billId === r.billId);
    return { ...r, vendorName: full!.vendorName, amount: full!.amount };
  });

  const moneyAlreadyAtRisk = ranked
    .filter((r) => r.status === "breached" || r.status === "paid-late")
    .reduce((sum, r) => sum + r.totalCostOfDelay, 0);

  const billsNeedingActionThisWeek = ranked.filter(
    (r) => r.status === "due-soon"
  ).length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold text-slate-100">
            GST SafePay
          </h1>
          <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-medium tracking-widest text-slate-400 uppercase">
            Demo
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Money-safety cockpit — as of {TODAY}
        </p>
      </header>

      <DemoDataBanner />

      <MoneyAtRiskHero
        moneyAlreadyAtRisk={moneyAlreadyAtRisk}
        billsNeedingActionThisWeek={billsNeedingActionThisWeek}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-wide text-slate-300 uppercase">
          Who to pay first
        </h2>
        <RiskActionList risks={ranked} />
      </section>
    </div>
  );
}
