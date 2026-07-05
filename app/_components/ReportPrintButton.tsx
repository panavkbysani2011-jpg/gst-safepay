"use client";

// Screen-only trigger for the browser's print/PDF dialog. Marked data-no-print
// so it never appears in the printed report itself.
export function ReportPrintButton() {
  return (
    <button
      type="button"
      data-no-print
      onClick={() => window.print()}
      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg shadow-sm transition-[transform,filter] duration-150 hover:brightness-110 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none motion-reduce:transition-none"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
      </svg>
      Print / Save as PDF
    </button>
  );
}
