"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "./AccountMenu";
import {
  IMPORT_ITEM,
  NAV_ITEMS,
  NavIcon,
  isNavActive,
} from "./nav-config";

export function AppSidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden border-r border-border bg-surface md:sticky md:top-0 md:flex md:h-screen md:flex-col md:gap-1 md:p-3">
      <div className="flex items-center gap-2.5 px-2 pt-1.5 pb-3.5">
        <span
          aria-hidden
          className="grid size-[30px] place-items-center rounded-[9px] bg-accent text-[15px] font-bold text-accent-fg"
        >
          ₹
        </span>
        <span className="font-display text-[15px] font-semibold tracking-tight text-fg">
          GST SafePay
        </span>
        <span className="rounded-[5px] border border-border px-1.5 py-px text-[9.5px] font-medium tracking-[0.14em] text-muted uppercase">
          Beta
        </span>
      </div>

      <p className="px-2.5 pt-2 pb-1.5 text-[10px] font-semibold tracking-[0.13em] text-muted uppercase">
        Cockpit
      </p>
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
                active
                  ? "bg-accent-soft font-semibold text-accent-text"
                  : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-1.5 my-2 h-px bg-border" />

      <Link
        href={IMPORT_ITEM.href}
        aria-current={isNavActive(pathname, IMPORT_ITEM.href) ? "page" : undefined}
        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
          isNavActive(pathname, IMPORT_ITEM.href)
            ? "bg-accent-soft font-semibold text-accent-text"
            : "text-muted hover:bg-surface-2 hover:text-fg"
        }`}
      >
        <NavIcon name={IMPORT_ITEM.icon} />
        {IMPORT_ITEM.label}
      </Link>

      <AccountMenu email={email} />
    </aside>
  );
}
