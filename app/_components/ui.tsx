import type { ReactNode } from "react";
import { TONE_TEXT, type Tone } from "./tone";

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface shadow-[var(--shadow)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
      {children}
    </h2>
  );
}

export function PanelHeader({ title, tag }: { title: string; tag: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <SectionHeading>{title}</SectionHeading>
      <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium tracking-widest text-faint uppercase">
        {tag}
      </span>
    </div>
  );
}

export function StatCard({
  eyebrow,
  tone,
  value,
  children,
}: {
  eyebrow: string;
  tone: Tone;
  value: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="animate-rise rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
      <p
        className={`text-xs font-medium tracking-[0.12em] uppercase ${TONE_TEXT[tone]}`}
      >
        {eyebrow}
      </p>
      <p className={`tnum mt-2 font-mono text-4xl font-semibold ${TONE_TEXT[tone]}`}>
        {value}
      </p>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </div>
  );
}
