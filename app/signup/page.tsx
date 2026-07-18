import Link from "next/link";
import { GoogleSignInButton } from "@/app/_components/GoogleSignInButton";
import { ThemeToggle } from "@/app/_components/ThemeToggle";
import { FormSubmit } from "@/app/_components/FormSubmit";
import { signInWithGoogle, signup } from "@/app/auth-actions";

const inputClasses =
  "rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-fg placeholder:text-muted transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
const labelClasses = "flex flex-col gap-1.5 text-sm font-medium text-fg";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // Only offer Google once the provider is actually enabled in Supabase, so a
  // click can never strand someone on Supabase's raw error page.
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-accent text-lg font-bold text-accent-fg">
              ₹
            </span>
            <span className="font-display text-lg font-semibold text-fg">GST SafePay</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] sm:p-7">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Start seeing what the GST rules are about to cost you.
          </p>

          {googleEnabled && (
            <>
              <form action={signInWithGoogle} className="mt-5">
                <GoogleSignInButton />
              </form>
              <div className="mt-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted">or use your email</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form action={signup} className="mt-5 flex flex-col gap-4">
            <label className={labelClasses}>
              Full name
              <input
                name="fullName"
                type="text"
                required
                maxLength={120}
                autoComplete="name"
                placeholder="Your name"
                className={inputClasses}
              />
            </label>

            <label className={labelClasses}>
              Username
              <span className="text-xs font-normal text-muted">
                Optional. A display name only, you still sign in with your email.
              </span>
              <input
                name="username"
                type="text"
                maxLength={40}
                autoComplete="username"
                placeholder="optional"
                className={inputClasses}
              />
            </label>

            <label className={labelClasses}>
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

            <label className={labelClasses}>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className={inputClasses}
              />
            </label>

            <label className={labelClasses}>
              Confirm password
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Type it again"
                className={inputClasses}
              />
            </label>

            {error && (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
            )}

            <FormSubmit pendingLabel="Creating your account…">Create account</FormSubmit>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-accent-text transition-opacity hover:opacity-80"
            >
              Log in
            </Link>
          </p>
        </div>

        <p className="mt-5 text-center text-xs text-muted">
          Beta. Not tax advice. Have your CA confirm the figures before you rely on them.
        </p>
      </div>
    </main>
  );
}
