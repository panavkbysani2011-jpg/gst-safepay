import { login, signup } from "@/app/auth-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold text-slate-100">GST SafePay</h1>
          <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-medium tracking-widest text-slate-400 uppercase">
            Prototype
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Log in, or create an account, to track your payment deadlines.
        </p>
      </div>

      <form className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-[#0b0f18] p-6">
        <label className="flex flex-col gap-1.5 text-sm text-slate-300">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-lg border border-slate-700 bg-[#0f1420] px-3 py-2 text-slate-100 outline-none focus:border-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-slate-300">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            className="rounded-lg border border-slate-700 bg-[#0f1420] px-3 py-2 text-slate-100 outline-none focus:border-slate-500"
          />
        </label>

        {error && <p className="text-sm text-red-300">{error}</p>}
        {notice && <p className="text-sm text-emerald-300">{notice}</p>}

        <div className="mt-1 flex flex-col gap-2">
          <button
            type="submit"
            formAction={login}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-white"
          >
            Log in
          </button>
          <button
            type="submit"
            formAction={signup}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/60"
          >
            Create account
          </button>
        </div>
      </form>
    </div>
  );
}
