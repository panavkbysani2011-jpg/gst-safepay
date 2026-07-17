import Link from "next/link";
import { ThemeToggle } from "@/app/_components/ThemeToggle";
import { FormSubmit } from "@/app/_components/FormSubmit";
import { requestPasswordReset } from "@/app/auth-actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center gap-7 px-6 py-16">
      <div className="flex items-center justify-between">
        <Link href="/login" className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-fg"
          >
            ₹
          </span>
          <span className="font-display text-lg font-semibold text-fg">GST SafePay</span>
        </Link>
        <ThemeToggle />
      </div>

      {sent ? (
        <div className="animate-rise flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
          <span className="grid size-10 place-items-center rounded-full bg-success-soft text-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
              <path d="M22 6l-10 7L2 6" />
              <rect x="2" y="4" width="20" height="16" rx="2" />
            </svg>
          </span>
          <h1 className="font-display text-xl font-semibold tracking-tight text-fg">Check your email</h1>
          <p className="text-sm leading-relaxed text-muted">
            If an account exists for that address, we&apos;ve sent a link to reset your
            password. It expires shortly, so use it soon. Don&apos;t forget to check spam.
          </p>
          <Link
            href="/login"
            className="mt-1 text-sm font-semibold text-accent-text transition-opacity hover:opacity-80"
          >
            ← Back to log in
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">
              Reset your password
            </h1>
            <p className="text-sm text-muted">
              Enter your account email and we&apos;ll send you a link to set a new password.
            </p>
          </div>

          <form
            action={requestPasswordReset}
            className="animate-rise flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]"
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@company.in"
                className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-fg placeholder:text-muted transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            </label>
            {error && (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
            )}
            <FormSubmit pendingLabel="Sending…">Send reset link</FormSubmit>
          </form>

          <p className="text-center text-sm text-muted">
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-accent-text hover:opacity-80">
              Log in
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
