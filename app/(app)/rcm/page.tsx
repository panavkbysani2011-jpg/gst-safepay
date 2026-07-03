import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { RcmWatchPanel } from "@/app/_components/RcmWatchPanel";
import { EmptyState } from "@/app/_components/ui";

export default async function RcmPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);

  if (data.totalRcmPurchases === 0) {
    return (
      <EmptyState
        title="No reverse-charge purchases yet"
        actionHref="/import"
        actionLabel="Import RCM purchases"
      >
        Upload your reverse-charge purchases to watch self-invoice deadlines and
        cash-GST payments under Rule 47A.
      </EmptyState>
    );
  }

  return <RcmWatchPanel rows={data.rcmRows} asOf={data.rcmAsOf} />;
}
