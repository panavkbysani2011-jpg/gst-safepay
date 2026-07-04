import type { Metadata } from "next";
import Link from "next/link";
import { NavIcon, type IconName } from "../_components/nav-config";

export const metadata: Metadata = {
  title: "GST SafePay — catch GST money leaks before they cost you",
  description:
    "A money-safety cockpit for Indian GST-registered businesses. Flags MSME 45-day, GST IMS, reverse-charge and GSTIN risks before they cost you — every figure traceable to a rule.",
};

const CATCHES: { icon: IconName; title: string; loss: string; body: string }[] = [
  {
    icon: "payments",
    title: "MSME 45-day payments",
    loss: "§43B(h) + MSMED interest",
    body: "Pay a registered MSME supplier late and you lose the income-tax deduction for the whole year, plus compound penalty interest. We rank who to pay first.",
  },
  {
    icon: "ims",
    title: "GST IMS deemed-accept",
    loss: "wrong ITC + s.50 interest",
    body: "Unactioned supplier invoices auto-accept into your GSTR-2B at the cutoff. If they're wrong, you carry ineligible ITC and s.50 interest.",
  },
  {
    icon: "rcm",
    title: "Reverse charge (Rule 47A)",
    loss: "s.122 penalty + s.50 interest",
    body: "Miss a self-invoice on an unregistered-supplier purchase, or pay the RCM cash tax late, and penalties stack up quietly.",
  },
  {
    icon: "vendors",
    title: "Invalid & stale GSTINs",
    loss: "blocked input-tax credit",
    body: "Claim ITC against a wrong or cancelled GSTIN and it can be reversed. We validate the format + checksum and flag re-checks.",
  },
  {
    icon: "compliance",
    title: "Filing calendar & evidence",
    loss: "late fees + audit gaps",
    body: "Track GST, TDS, PF, ROC and POSH deadlines with a proof-of-filing reference, so nothing slips and audits are painless.",
  },
];

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "1",
    title: "Import your data",
    body: "Export a CSV from Tally, Zoho or Excel — vendors, bills, GST invoices — or load realistic demo data in one click.",
  },
  {
    n: "2",
    title: "Preview, then confirm",
    body: "See exactly what will be saved — how many rows, which have errors — before anything touches your private database.",
  },
  {
    n: "3",
    title: "See the money at risk",
    body: "A deterministic tax-rule engine computes what could cost you, ranks it, and shows the working line by line.",
  },
];

function CockpitPreview() {
  return (
    <div className="animate-rise w-full rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-pop)]">
      <p className="text-[10.5px] font-semibold tracking-[0.14em] text-muted uppercase">
        Total money at risk
      </p>
      <p className="tnum mt-1 font-mono text-3xl font-semibold text-danger">₹2,50,847</p>
      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="bg-danger" style={{ width: "59%" }} />
        <div className="bg-warning" style={{ width: "36%" }} />
        <div className="bg-info" style={{ width: "5%" }} />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {[
          { name: "Bharath Steelworks", tag: "Payments", detail: "MSME deadline breached", amt: "₹96,140", tone: "text-danger", dot: "bg-danger" },
          { name: "Quicksale Traders", tag: "GST IMS", detail: "Auto-accepted past cutoff", amt: "₹90,843", tone: "text-danger", dot: "bg-danger" },
          { name: "Roadside Transport", tag: "Reverse charge", detail: "Self-invoice overdue", amt: "₹10,288", tone: "text-warning", dot: "bg-warning" },
        ].map((r) => (
          <div key={r.name} className="flex items-center gap-2.5 rounded-lg border border-border bg-canvas px-3 py-2">
            <span className={`size-2 shrink-0 rounded-full ${r.dot}`} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold text-fg">{r.name}</span>
              <span className="block text-[11px] text-muted">{r.tag} · {r.detail}</span>
            </span>
            <span className={`tnum shrink-0 font-mono text-[12.5px] font-semibold ${r.tone}`}>{r.amt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="animate-rise flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[12px] font-medium text-muted">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              For India&apos;s 14M GST-registered businesses
            </span>
            <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-[3.4rem]">
              Stop losing money to GST rules you didn&apos;t know you missed.
            </h1>
            <p className="max-w-xl text-[16px] leading-relaxed text-muted">
              GST SafePay reads your vendor and invoice data and flags exactly where
              the new MSME, IMS and reverse-charge rules are about to cost you — and
              tells you who to pay first. No jargon, no guesswork.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-accent px-5 py-3 text-[15px] font-semibold text-accent-fg transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas focus-visible:outline-none"
              >
                Get started free
              </Link>
              <a
                href="#how"
                className="rounded-xl border border-border-strong px-5 py-3 text-[15px] font-semibold text-fg transition-colors hover:bg-surface-2"
              >
                See how it works
              </a>
            </div>
            <p className="text-[12.5px] text-faint">
              Deterministic tax rules, not AI · Every figure CA-auditable · Your data stays private
            </p>
          </div>

          <CockpitPreview />
        </div>
      </section>

      {/* What it catches */}
      <section id="modules" className="scroll-mt-20 border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              Five ways Indian businesses quietly lose money
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Each one is a real rule with a real rupee cost. GST SafePay watches all
              five from a single upload of the data you already have.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATCHES.map((c) => (
              <div
                key={c.title}
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)] transition-colors hover:border-border-strong"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-text">
                  <NavIcon name={c.icon} />
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-[16px] font-semibold text-fg">{c.title}</h3>
                </div>
                <span className="inline-flex w-fit items-center rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
                  {c.loss}
                </span>
                <p className="text-[13.5px] leading-relaxed text-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              From a CSV to a clear plan in minutes
            </h2>
          </div>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex flex-col gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-accent text-[15px] font-bold text-accent-fg">
                  {s.n}
                </span>
                <h3 className="font-display text-[17px] font-semibold text-fg">{s.title}</h3>
                <p className="text-[14px] leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 rounded-2xl border border-border bg-surface-2 p-6">
            <h3 className="font-display text-[16px] font-semibold text-fg">Is an AI reading my books?</h3>
            <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-muted">
              No. Your data is analysed by fixed, published tax rules — not an AI that
              guesses. A money-safety tool has to be auditable, so every figure traces
              back to a rule and a legal section you (or your CA) can check. Your files
              are parsed and stored privately, never sold, and never used to train anything.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section>
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="flex flex-col items-start gap-5 rounded-3xl border border-accent/30 bg-accent-soft p-8 sm:p-12">
            <h2 className="max-w-2xl font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              See what you&apos;re about to lose — before you lose it.
            </h2>
            <p className="max-w-xl text-[15px] leading-relaxed text-muted">
              Load the demo in one click, or import your own vendors and bills. No card,
              no setup call.
            </p>
            <Link
              href="/login"
              className="rounded-xl bg-accent px-5 py-3 text-[15px] font-semibold text-accent-fg transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-accent-soft focus-visible:outline-none"
            >
              Get started free
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
