import Link from "next/link";
import { ThemeToggle } from "@/app/_components/ThemeToggle";
import { FormSubmit } from "@/app/_components/FormSubmit";
import { updatePassword } from "@/app/auth-actions";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // The /auth/callback route exchanges the email code for a recovery session before
  // sending the user here, so a valid link means getUser() returns the account.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

      {!user ? (
        <div className="animate-rise flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
          <h1 className="font-display text-xl font-semibold tracking-tight text-fg">
            Link expired or invalid
          </h1>
          <p className="text-sm leading-relaxed text-muted">
            This password-reset link is no longer valid. Request a fresh one and use it
            straight away.
          </p>
          <Link
            href="/forgot-password"
            className="mt-1 text-sm font-semibold text-accent-text transition-opacity hover:opacity-80"
          >
            Request a new link →
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">
              Set a new password
            </h1>
            <p className="text-sm text-muted">
              Choose a new password for <span className="font-medium text-fg">{user.email}</span>.
            </p>
          </div>

          <form
            action={updatePassword}
            className="animate-rise flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]"
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
              New password
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-fg placeholder:text-muted transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
              Confirm password
              <input
                name="confirm"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-fg placeholder:text-muted transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
            )}

            <FormSubmit pendingLabel="Updating…">Update password</FormSubmit>
          </form>
        </>
      )}
    </div>
  );
}
