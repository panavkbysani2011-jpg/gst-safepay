"use client";

import { useId, useState } from "react";
import { glossaryEntry } from "@/lib/glossary";

/**
 * A jargon term with a plain-English explanation one hover or tap away.
 *
 * The real term stays on screen (a CA needs "GSTR-2B", and the precise words are
 * part of the tool's credibility); this only adds the explanation the business
 * owner needs. Hover covers desktop, tap covers mobile where hover does not
 * exist, and it is a real button so keyboard and screen-reader users get it too.
 */
export function Term({
  name,
  children,
}: {
  /** Key into the glossary, e.g. "itc". */
  name: string;
  /** Optional label override; defaults to the glossary's own wording. */
  children?: React.ReactNode;
}) {
  const entry = glossaryEntry(name);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const id = useId();

  // Unknown key: render the label plainly rather than breaking the page.
  if (!entry) return <>{children ?? name}</>;

  const open = hovered || pinned;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setPinned((p) => !p)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setPinned(false);
            setHovered(false);
          }
        }}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        className="cursor-help underline decoration-dotted decoration-from-font underline-offset-[3px] transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {children ?? entry.term}
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          // Drops DOWN, not up: these sit in card headers whose section is
          // `overflow-hidden`, which would clip a tooltip rendered above them.
          className="animate-rise absolute top-full left-0 z-50 mt-2 block w-64 rounded-lg border border-border bg-surface p-3 text-left shadow-[var(--shadow)]"
        >
          <span className="block text-[12px] font-semibold text-fg">{entry.term}</span>
          <span className="mt-1 block text-[12px] leading-snug font-normal text-muted">
            {entry.plain}
          </span>
        </span>
      )}
    </span>
  );
}
