import Link from "next/link";
import { AuthButtons } from "@/app/_components/AuthButtons";
import { GoogleSignInButton } from "@/app/_components/GoogleSignInButton";
import { ThemeToggle } from "@/app/_components/ThemeToggle";
import { signInWithGoogle } from "@/app/auth-actions";

const TRUST_POINTS = [
  {
    title: "Built for the rules that actually bite",
    body: "The MSME 45-day payment law, the new IMS monthly close, and reverse-charge self-invoicing.",
  },
  {
    title: "Your numbers stay yours",
    body: "Every account is walled off from every other. Nobody else can see your data.",
  },
  {
    title: "Checked, then signed off",
    body: "Figures are matched to the Act and confirmed by a chartered accountant before you act on them.",
  },
];

const inputClasses =
  "rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-fg placeholder:text-faint transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  // Only show "Continue with Google" once the provider is actually enabled in
  // Supabase. Set NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true after wiring it up, so
  // clicking it can never strand a user on Supabase's raw error page.
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  return (
    <main className="min-h-screen w-full lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand + value panel — desktop only; mobile gets a compact header on the right column */}
      <section className="relative hidden overflow-hidden bg-accent px-10 py-12 text-accent-fg lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.15] [background:radial-gradient(55rem_38rem_at_82%_-8%,#fff,transparent_62%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-14 -bottom-28 leading-none font-bold text-white/[0.06] select-none font-display text-[20rem]"
        >
          ₹
        </div>

        <div className="relative flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-white/15 text-lg font-bold">
            ₹
          </span>
          <span className="font-display text-lg font-semibold">GST SafePay</span>
        </div>

        <div className="relative flex max-w-lg flex-col gap-6">
          <h1 className="font-display text-4xl leading-[1.08] font-semibold tracking-tight xl:text-[3.25rem]">
            The GST money you&rsquo;re about to lose.
            <span className="mt-1 block text-accent-fg/65">
              Caught while you can still fix it.
            </span>
          </h1>
          <p className="max-w-md text-[15px] leading-relaxed text-accent-fg/85">
            Drop in your vendors and bills. SafePay reads them against India&rsquo;s
            GST rules and shows the deadlines, penalties, and input-tax-credit
            that are genuinely at risk. You always know who to pay first, and
            nothing quietly slips.
          </p>
        </div>

        <ul className="relative flex flex-col gap-4">
          {TRUST_POINTS.map((point) => (
            <li key={point.title} className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/20 text-[11px] font-bold"
              >
                ✓
              </span>
              <span className="text-sm leading-snug text-accent-fg/80">
                <span className="font-medium text-accent-fg">
                  {point.title}.
                </span>{" "}
                {point.body}
              </span>
            </li>
          ))}
          <li className="mt-2 text-xs text-accent-fg/55">
            An early prototype. It runs on sample figures until your CA confirms
            the numbers.
          </li>
        </ul>
      </section>

      {/* Sign-in column */}
      <section className="flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:min-h-0">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 lg:invisible">
            <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-fg">
              ₹
            </span>
            <span className="font-display text-base font-semibold text-fg">
              GST SafePay
            </span>
          </span>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-7 py-10">
          <div className="animate-rise flex flex-col gap-1.5">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-fg">
              Welcome back
            </h2>
            <p className="text-sm text-muted">
              Log in to see where your money is at risk.
            </p>
          </div>

          {googleEnabled && (
            <>
              <form action={signInWithGoogle} className="animate-rise">
                <GoogleSignInButton />
              </form>

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-faint">or use your email</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form className="animate-rise flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@yourbusiness.in"
                className={inputClasses}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
              Password
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                placeholder="At least 6 characters"
                className={inputClasses}
              />
            </label>

            <Link
              href="/forgot-password"
              className="-mt-1.5 self-end text-xs font-medium text-accent-text transition-opacity hover:opacity-80"
            >
              Forgot your password?
            </Link>

            {error && (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
                {notice}
              </p>
            )}

            <AuthButtons />
          </form>

          <p className="text-center text-xs text-faint">
            Prototype. Sample data. Not tax advice.
          </p>
        </div>
      </section>
    </main>
  );
}
