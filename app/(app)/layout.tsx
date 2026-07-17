import { requireUser } from "@/lib/auth";
import { AppSidebar } from "../_components/AppSidebar";
import { AppTopbar } from "../_components/AppTopbar";
import { ComplianceDisclaimer } from "../_components/ComplianceDisclaimer";
import { BUSINESS_TIME_ZONE, todayInBusinessZone } from "@/lib/businessDate";
import { DateRolloverRefresh } from "../_components/DateRolloverRefresh";

// Pinned to Indian statutory time. Without an explicit zone this formatted in
// the server's zone (UTC on Vercel), so the "as of" date shown to the user could
// disagree with the Indian day the rule engines actually computed against.
const asOfFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const email = user.email ?? "";
  const now = new Date();
  const asOf = asOfFormat.format(now);
  const asOfIso = todayInBusinessZone(now);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr] print:block">
      {/* Re-fetch when the Indian day rolls over, so an open tab's countdowns
          never freeze at the day it was opened. */}
      <DateRolloverRefresh renderedFor={asOfIso} />
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-fg"
      >
        Skip to content
      </a>

      <AppSidebar email={email} />

      <div className="flex min-h-screen flex-col">
        <AppTopbar email={email} asOf={asOf} />
        <main id="content" className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
        <footer className="border-t border-border px-4 py-5 sm:px-6">
          <div className="mx-auto w-full max-w-5xl">
            <ComplianceDisclaimer />
          </div>
        </footer>
      </div>
    </div>
  );
}
