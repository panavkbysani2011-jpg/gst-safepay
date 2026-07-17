import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

// Public marketing/legal header. Logged-in users are redirected to /dashboard by
// the proxy, so the CTAs here always speak to a logged-out visitor.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-[9px] bg-accent text-[15px] font-bold text-accent-fg"
          >
            ₹
          </span>
          <span className="font-display text-[16px] font-semibold tracking-tight text-fg">
            GST SafePay
          </span>
          <span className="rounded-[5px] border border-border px-1.5 py-px text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase">
            Beta
          </span>
        </Link>

        <nav aria-label="Marketing" className="ml-auto hidden items-center gap-6 md:flex">
          <Link href="/#how" className="text-[13.5px] font-medium text-muted transition-colors hover:text-fg">
            How it works
          </Link>
          <Link href="/#modules" className="text-[13.5px] font-medium text-muted transition-colors hover:text-fg">
            What it catches
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2.5 md:ml-6">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-[13.5px] font-semibold text-fg transition-colors hover:bg-surface-2"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-accent px-3.5 py-2 text-[13.5px] font-semibold text-accent-fg transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
