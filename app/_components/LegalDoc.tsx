import type { ReactNode } from "react";

// Shared prose shell for the policy pages, so Privacy/Terms/etc. read consistently.
export function LegalDoc({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <p className="text-[12px] font-semibold tracking-[0.14em] text-accent-text uppercase">Legal</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg">{title}</h1>
      <p className="mt-2 text-[13px] text-muted">Last updated {updated}</p>
      {intro && <p className="mt-6 text-[15px] leading-relaxed text-muted">{intro}</p>}

      <div className="mt-8 flex flex-col gap-7">{children}</div>

      <div className="mt-10 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-[13px] text-fg">
        <span className="font-semibold text-warning">Beta notice.</span> GST SafePay is in
        beta. These policies describe how the product is designed to operate; please have
        them reviewed by a qualified professional before relying on the service for a live
        business.
      </div>
    </article>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-[18px] font-semibold text-fg">{heading}</h2>
      <div className="flex flex-col gap-2.5 text-[14.5px] leading-relaxed text-muted [&_a]:font-medium [&_a]:text-accent-text hover:[&_a]:opacity-80 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-fg [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
