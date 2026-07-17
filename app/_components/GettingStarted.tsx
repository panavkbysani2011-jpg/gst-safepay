"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { dismissGettingStarted } from "@/app/onboarding-actions";
import type { GettingStartedState, GettingStartedStep } from "@/lib/onboarding";

// Time the exit animation before the dismiss action unmounts the card.
const EXIT_MS = 260;

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}


function MilestoneRow({
  step,
  index,
  mounted,
}: {
  step: GettingStartedStep;
  index: number;
  mounted: boolean;
}) {
  return (
    <li
      style={{ transitionDelay: mounted ? `${120 + index * 70}ms` : "0ms" }}
      className={`flex items-center gap-3 rounded-xl border border-border bg-canvas/40 px-3.5 py-3 transition-[opacity,transform] duration-500 ease-out will-change-transform motion-reduce:transition-none ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      }`}
    >
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold transition-transform duration-500 motion-reduce:transition-none ${
          step.done
            ? "bg-success-soft text-success"
            : "border border-border-strong text-muted"
        } ${mounted ? "scale-100" : "scale-75"}`}
        aria-hidden
      >
        {step.done ? <CheckIcon /> : index + 1}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-fg">{step.title}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-muted">{step.help}</span>
      </span>

      {step.done ? (
        <Link
          href={step.viewHref}
          aria-label={`View ${step.title}`}
          className="shrink-0 rounded-md px-1.5 py-1 text-[12px] font-medium text-muted transition-colors hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          View
        </Link>
      ) : (
        <Link
          href={step.actionHref}
          className="group inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[12.5px] font-semibold text-accent-text transition-colors hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {step.actionLabel}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      )}
    </li>
  );
}

export function GettingStarted({ state }: { state: GettingStartedState }) {
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [dismissPending, startDismiss] = useTransition();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  const busy = dismissPending || leaving;
  const fraction = state.total > 0 ? state.completedCount / state.total : 0;
  const pct = Math.round(fraction * 100);

  function handleDismiss() {
    if (busy) return;
    setLeaving(true);
    window.setTimeout(() => {
      startDismiss(async () => {
        await dismissGettingStarted();
      });
    }, EXIT_MS);
  }


  return (
    <section
      aria-label="Get set up"
      className={`relative overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)] transition-[opacity,transform] duration-300 ease-out will-change-transform motion-reduce:transition-none ${
        mounted && !leaving ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${leaving ? "!opacity-0 -translate-y-1 scale-[0.99]" : ""}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-12 size-44 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <path d="M22 4 12 14.01l-3-3" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-fg">Get set up in 3 steps</h2>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
              GST SafePay catches money lost to three timing traps: MSME 45-day
              payments, GST IMS deemed-accept, and reverse charge. Add your data to
              see your exposure.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={busy}
            aria-label="Dismiss the setup checklist"
            className="ml-auto grid size-8 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="font-medium text-muted">
              {state.completedCount} of {state.total} done
            </span>
            <span className="tnum font-mono text-muted">{pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full origin-left rounded-full bg-accent transition-transform duration-700 ease-out motion-reduce:transition-none"
              style={{ transform: `scaleX(${mounted ? fraction : 0})` }}
            />
          </div>
        </div>

        <ol className="flex flex-col gap-2.5">
          {state.steps.map((step, i) => (
            <MilestoneRow key={step.key} step={step} index={i} mounted={mounted} />
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Link
            href="/import"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg shadow-sm transition-[transform,filter] duration-150 hover:brightness-110 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none motion-reduce:transition-none"
          >
            Import my data
          </Link>
          <span className="ml-auto text-[11.5px] text-muted">
            Any layout works. Start with bills to see money at risk fastest.
          </span>
        </div>
      </div>
    </section>
  );
}
