"use client";

import Link from "next/link";
import { signOut } from "@/app/auth-actions";
import { NavIcon } from "./nav-config";

function friendlyName(email: string): string {
  const local = email.split("@")[0] ?? "";
  if (!local) return "Your account";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

// Sidebar profile card that opens an account menu (Settings + Sign out).
// Uses native <details> so it needs no click-outside JS and stays accessible.
export function AccountMenu({ email }: { email: string }) {
  const initial = (email.trim()[0] ?? "?").toUpperCase();
  return (
    <details className="group relative mt-auto">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl border border-border bg-surface p-2.5 transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-xs font-semibold text-muted"
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-fg">
            {friendlyName(email)}
          </span>
          <span className="block truncate text-[11px] text-faint">{email}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4 shrink-0 text-faint transition-transform group-open:rotate-180"
          aria-hidden
        >
          <path d="m6 15 6-6 6 6" />
        </svg>
      </summary>

      <div className="absolute bottom-[calc(100%+6px)] left-0 z-30 w-full overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-[var(--shadow-pop,var(--shadow))]">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <NavIcon name="settings" />
          Settings
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-danger-soft hover:text-danger focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-[18px] shrink-0"
              aria-hidden
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
