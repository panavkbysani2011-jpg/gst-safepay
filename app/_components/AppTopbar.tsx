"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import {
  IMPORT_ITEM,
  NAV_ITEMS,
  NavIcon,
  isNavActive,
  routeMetaFor,
} from "./nav-config";

export function AppTopbar({ email, asOf }: { email: string; asOf: string }) {
  const pathname = usePathname();
  const meta = routeMetaFor(pathname);
  const initial = (email.trim()[0] ?? "?").toUpperCase();
  const allItems = [...NAV_ITEMS, IMPORT_ITEM];

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
      {/* Mobile nav (native disclosure, no extra JS) */}
      <details className="group relative md:hidden">
        <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-lg border border-border text-muted [&::-webkit-details-marker]:hidden">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-5" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </summary>
        <div className="absolute top-[calc(100%+8px)] left-0 z-30 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-[var(--shadow-pop,var(--shadow))]">
          {allItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-accent-soft text-accent-text" : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </details>

      <div className="min-w-0">
        <h1 className="truncate font-display text-[17px] font-semibold tracking-tight text-fg sm:text-[19px]">
          {meta.title}
        </h1>
        {meta.subtitle && (
          <p className="hidden truncate text-[12.5px] text-muted sm:block">
            {meta.subtitle}
          </p>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
        <span className="hidden items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted sm:inline-flex">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-3.5" aria-hidden>
            <rect x="4" y="5" width="16" height="16" rx="2" />
            <path d="M4 9h16M8 3v4M16 3v4" strokeLinecap="round" />
          </svg>
          as of {asOf}
        </span>
        <ThemeToggle />
        <span
          aria-hidden
          className="grid size-[30px] place-items-center rounded-lg border border-border bg-surface-2 text-xs font-semibold text-muted"
          title={email}
        >
          {initial}
        </span>
      </div>
    </header>
  );
}
