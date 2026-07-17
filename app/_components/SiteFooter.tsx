import Link from "next/link";

const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/security", label: "Security" },
  { href: "/refund", label: "Refund" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className="grid size-7 place-items-center rounded-lg bg-accent text-[13px] font-bold text-accent-fg"
              >
                ₹
              </span>
              <span className="font-display text-[15px] font-semibold text-fg">GST SafePay</span>
            </span>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              A money-safety cockpit for Indian GST-registered businesses. Catches
              MSME 45-day, GST IMS, reverse-charge and GSTIN risks before they cost
              you, with every figure traceable to a rule.
            </p>
          </div>

          <nav aria-label="Legal" className="flex flex-col gap-2.5">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">Legal</p>
            {LEGAL.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[13px] text-muted transition-colors hover:text-fg"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            In beta. Not tax advice. Tax-rule parameters must be verified by a
            chartered accountant before real use.
          </p>
          <p>© 2026 GST SafePay · Made in India</p>
        </div>
      </div>
    </footer>
  );
}
