"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

const FOCUSABLE =
  'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

// Reusable right-side detail drawer: scrim, focus trap, Esc to close, and focus
// returned to whatever opened it. Motion is transform/opacity only (reduced-motion
// handled globally). Shared by every module's row → detail view.
export function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((n) => n.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-[rgba(16,24,40,0.32)] transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
        // When closed the panel is only slid off-screen, so without `inert` its
        // close button + links stay in the tab order and aria-hidden would wrap
        // focusable nodes (an ARIA violation). `inert` removes the whole closed
        // panel from focus + the accessibility tree.
        inert={!open}
        className={`fixed top-0 right-0 z-40 flex h-full w-[472px] max-w-[92vw] flex-col border-l border-border bg-surface shadow-[var(--shadow-pop)] transition-transform duration-[260ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="font-display text-[17px] font-semibold tracking-tight text-fg"
            >
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-muted">{subtitle}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="ml-auto grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-4" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="mt-auto border-t border-border px-5 py-3.5 text-[11.5px] text-faint">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}
