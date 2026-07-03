import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { MoneyAtRiskHero } from "@/app/_components/MoneyAtRiskHero";
import { PaymentsTable } from "@/app/_components/PaymentsTable";
import { EmptyState } from "@/app/_components/ui";

export default async function PaymentsPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);

  if (data.totalBills === 0) {
    return (
      <EmptyState
        title="No bills yet"
        actionHref="/import"
        actionLabel="Import bills"
      >
        Upload your vendor and bill CSVs to track MSME 45-day payment deadlines
        and see who to pay first.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <MoneyAtRiskHero
        moneyAlreadyAtRisk={data.moneyAlreadyAtRisk}
        billsNeedingActionThisWeek={data.billsNeedingActionThisWeek}
      />
      <PaymentsTable risks={data.ranked} />
    </div>
  );
}
