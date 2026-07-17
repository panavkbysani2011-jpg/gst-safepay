import Link from "next/link";
import { formatINR } from "@/lib/format";
import type { NeedsActionItem, OverviewModel, OverviewTone } from "@/lib/data/overview";

const BAR_FILL: Record<OverviewTone, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
  neutral: "bg-border-strong",
};

const DOT: Record<OverviewTone, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
  neutral: "bg-faint",
};

const AMT_TEXT: Record<OverviewTone, string> = {
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
  neutral: "text-muted",
};

const MAX_QUEUE = 8;

function CompositionBar({ model }: { model: OverviewModel }) {
  const { totalAtRisk, composition } = model;

  return (
    <section className="animate-rise rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
      <p className="text-xs font-medium tracking-[0.12em] text-muted uppercase">
        Total money at risk
      </p>
      <p
        className={`tnum mt-1 font-mono text-4xl font-semibold ${
          totalAtRisk > 0 ? "text-danger" : "text-fg"
        }`}
      >
        {formatINR(totalAtRisk)}
      </p>

      {totalAtRisk > 0 ? (
        <>
          <p className="mt-1 text-sm text-muted">
            Lost deductions, penalty interest and reversible ITC across your modules.
          </p>
          <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
            {composition.map((s) => (
              <div
                key={s.key}
                className={BAR_FILL[s.tone]}
                style={{ width: `${(s.amount / totalAtRisk) * 100}%` }}
                title={`${s.label}: ${formatINR(s.amount)}`}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {composition.map((s) => (
              <li key={s.key}>
                <Link
                  href={s.href}
                  className="group inline-flex items-center gap-2 text-[12.5px] transition-opacity hover:opacity-80"
                >
                  <span className={`size-2 rounded-full ${DOT[s.tone]}`} aria-hidden />
                  <span className="text-muted group-hover:text-fg">{s.label}</span>
                  <span className={`tnum font-mono font-semibold ${AMT_TEXT[s.tone]}`}>
                    {formatINR(s.amount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">
          Nothing at risk right now. Every deadline is either met or comfortably ahead.
        </p>
      )}
    </section>
  );
}

function QueueRow({ item }: { item: NeedsActionItem }) {
  return (
    <li>
      <Link
        href={item.href}
        className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-2"
      >
        <span className={`size-2 shrink-0 rounded-full ${DOT[item.tone]}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[13.5px] font-semibold text-fg">{item.title}</span>
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium tracking-widest text-muted uppercase">
              {item.module}
            </span>
          </span>
          <span className="mt-0.5 block text-[12px] text-muted">{item.detail}</span>
        </span>
        {item.amount !== null && item.amount > 0 && (
          <span className={`tnum shrink-0 font-mono text-[13.5px] font-semibold ${AMT_TEXT[item.tone]}`}>
            {formatINR(item.amount)}
          </span>
        )}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-faint" aria-hidden>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}

export function OverviewBoard({ model }: { model: OverviewModel }) {
  const shown = model.needsAction.slice(0, MAX_QUEUE);
  const extra = model.needsAction.length - shown.length;

  return (
    <div className="flex flex-col gap-6">
      <CompositionBar model={model} />

      <section className="animate-rise overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <h2 className="font-display text-[15px] font-semibold text-fg">Needs action</h2>
          <span className="text-xs text-muted">
            {model.needsAction.length > 0
              ? "most urgent across every module"
              : "you're all caught up"}
          </span>
        </div>

        {shown.length > 0 ? (
          <ul>
            {shown.map((item) => (
              <QueueRow key={item.id} item={item} />
            ))}
            {extra > 0 && (
              <li className="px-4 py-2.5 text-center text-[12px] text-muted">
                +{extra} more across your modules
              </li>
            )}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-muted">
            No deadlines need attention today. New risks show up here the moment they appear.
          </p>
        )}
      </section>
    </div>
  );
}
