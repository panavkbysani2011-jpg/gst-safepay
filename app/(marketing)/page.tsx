import type { Metadata } from "next";
import Link from "next/link";
import { NavIcon, type IconName } from "../_components/nav-config";

export const metadata: Metadata = {
  title: "GST SafePay: catch GST money leaks before they cost you",
  description:
    "A money-safety cockpit for Indian GST-registered businesses. Flags MSME 45-day, GST IMS, reverse-charge and GSTIN risks before they cost you, with every figure traceable to a rule.",
};

const CATCHES: { icon: IconName; title: string; loss: string; body: string }[] = [
  {
    icon: "payments",
    title: "MSME 45-day payments",
    loss: "§43B(h) + MSMED interest",
    body: "Pay a registered MSME supplier late and you lose the income-tax deduction for the whole year, on top of compound penalty interest. SafePay ranks who to pay first.",
  },
  {
    icon: "ims",
    title: "GST IMS deemed-accept",
    loss: "wrong ITC + s.50 interest",
    body: "Supplier invoices you never action auto-accept into your GSTR-2B at the cutoff. If any are wrong, you carry ineligible credit and pay interest on it.",
  },
  {
    icon: "rcm",
    title: "Reverse charge (Rule 47A)",
    loss: "s.122 penalty + s.50 interest",
    body: "Miss a self-invoice on an unregistered-supplier purchase, or pay the reverse-charge tax late, and the penalties pile up without a word.",
  },
  {
    icon: "vendors",
    title: "Invalid & stale GSTINs",
    loss: "blocked input-tax credit",
    body: "Claim credit against a wrong or cancelled GSTIN and it can be reversed later. SafePay checks the format and checksum, and flags the ones due for a re-check.",
  },
  {
    icon: "compliance",
    title: "Filing calendar & evidence",
    loss: "late fees + audit gaps",
    body: "Keep GST, TDS, PF, ROC and POSH deadlines in one place, each with a proof-of-filing reference, so nothing slips and audits stay calm.",
  },
];

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "1",
    title: "Bring your data in",
    body: "Export a CSV from Tally, Zoho or Excel with your vendors, bills and GST invoices. Or load realistic demo data with one click.",
  },
  {
    n: "2",
    title: "Preview, then confirm",
    body: "You see exactly what will be saved, how many rows and which ones have errors, before anything touches your private database.",
  },
  {
    n: "3",
    title: "See the money at risk",
    body: "A fixed tax-rule engine works out what could cost you, ranks it by urgency, and shows the calculation line by line.",
  },
];

function CockpitPreview() {
  return (
    <div className="animate-rise w-full rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-pop)]">
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-semibold tracking-[0.14em] text-muted uppercase">
          Total money at risk
        </p>
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
          <span className="size-1.5 rounded-full bg-success" aria-hidden />
          live from your data
        </span>
      </div>
      <p className="tnum mt-1 font-mono text-3xl font-semibold text-danger">
        ₹2,50,847
      </p>
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
          <div
            key={r.name}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-canvas px-3 py-2 transition-colors hover:border-border-strong"
          >
            <span className={`size-2 shrink-0 rounded-full ${r.dot}`} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold text-fg">
                {r.name}
              </span>
              <span className="block text-[11px] text-muted">
                {r.tag} · {r.detail}
              </span>
            </span>
            <span className={`tnum shrink-0 font-mono text-[12.5px] font-semibold ${r.tone}`}>
              {r.amt}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10.5px] text-muted">
        Sample figures. Every number links back to the rule behind it.
      </p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background:radial-gradient(48rem_32rem_at_88%_-12%,var(--accent-soft),transparent_60%)]"
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="animate-rise flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[12px] font-medium text-muted">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              For India&apos;s 14M GST-registered businesses
            </span>
            <h1 className="font-display text-4xl leading-[1.06] font-semibold tracking-tight text-fg sm:text-5xl lg:text-[3.4rem]">
              Stop losing money to GST rules you didn&apos;t know you missed.
            </h1>
            <p className="max-w-xl text-[16px] leading-relaxed text-muted">
              GST SafePay reads your vendor and invoice data and shows exactly where
              the new MSME, IMS and reverse-charge rules are about to cost you. Then it
              tells you who to pay first. No jargon, no guesswork.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-accent px-5 py-3 text-[15px] font-semibold text-accent-fg shadow-sm transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas focus-visible:outline-none"
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
            <p className="text-[12.5px] text-muted">
              Fixed tax rules, not AI · Every figure a CA can audit · Your data stays private
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
              five from a single upload of the data you already keep.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATCHES.map((c) => (
              <div
                key={c.title}
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-pop)]"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-text transition-transform duration-200 group-hover:scale-105">
                  <NavIcon name={c.icon} />
                </span>
                <h3 className="font-display text-[16px] font-semibold text-fg">
                  {c.title}
                </h3>
                <span className="inline-flex w-fit items-center rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">
                  {c.loss}
                </span>
                <p className="text-[13.5px] leading-relaxed text-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              From your spreadsheet to a clear plan in minutes
            </h2>
          </div>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex flex-col gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-accent text-[15px] font-bold text-accent-fg">
                  {s.n}
                </span>
                <h3 className="font-display text-[17px] font-semibold text-fg">
                  {s.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 rounded-2xl border border-border bg-canvas p-6">
            <h3 className="font-display text-[16px] font-semibold text-fg">
              Is an AI reading my books?
            </h3>
            <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-muted">
              No. Your data is read by fixed, published tax rules, not an AI that
              guesses. A money-safety tool has to be auditable, so every figure traces
              back to a rule and a section of the law that you, or your CA, can check.
              Your files are parsed and stored privately. They are never sold, and never
              used to train anything.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section>
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-accent-soft p-8 sm:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -bottom-16 leading-none font-bold text-accent/10 select-none font-display text-[16rem]"
            >
              ₹
            </div>
            <div className="relative flex flex-col items-start gap-5">
              <h2 className="max-w-2xl font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
                See what you&apos;re about to lose, before you lose it.
              </h2>
              <p className="max-w-xl text-[15px] leading-relaxed text-muted">
                Load the demo with one click, or import your own vendors and bills. No
                card, no setup call.
              </p>
              <Link
                href="/login"
                className="rounded-xl bg-accent px-5 py-3 text-[15px] font-semibold text-accent-fg shadow-sm transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-accent-soft focus-visible:outline-none"
              >
                Get started free
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
