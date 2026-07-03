import { requireUser } from "@/lib/auth";
import { AppSidebar } from "../_components/AppSidebar";
import { AppTopbar } from "../_components/AppTopbar";
import { ComplianceDisclaimer } from "../_components/ComplianceDisclaimer";

const asOfFormat = new Intl.DateTimeFormat("en-IN", {
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
  const asOf = asOfFormat.format(new Date());

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
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
