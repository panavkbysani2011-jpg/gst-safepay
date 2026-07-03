import Link from "next/link";
import { AuthButtons } from "@/app/_components/AuthButtons";
import { ThemeToggle } from "@/app/_components/ThemeToggle";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center gap-7 px-6 py-16">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-fg"
          >
            ₹
          </span>
          <span className="font-display text-lg font-semibold text-fg">
            GST SafePay
          </span>
        </span>
        <ThemeToggle />
      </div>

      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">
          Welcome back
        </h1>
        <p className="text-sm text-muted">
          Log in, or create an account, to track your GST payment deadlines and
          money at risk.
        </p>
      </div>

      <form className="animate-rise flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.in"
            className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-fg placeholder:text-faint transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
            className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-fg placeholder:text-faint transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        </label>

        <Link
          href="/forgot-password"
          className="-mt-1.5 self-end text-xs font-medium text-accent-text transition-opacity hover:opacity-80"
        >
          Forgot password?
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
        Prototype · synthetic data · not tax advice
      </p>
    </div>
  );
}
