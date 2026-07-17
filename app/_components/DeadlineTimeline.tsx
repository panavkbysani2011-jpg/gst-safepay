import Link from "next/link";
import { formatINR, formatDate } from "@/lib/format";
import type { DeadlineBucket, UpcomingDeadline } from "@/lib/data/deadlines";
import type { OverviewTone } from "@/lib/data/overview";

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

const COUNT_TEXT: Record<OverviewTone, string> = {
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
  neutral: "text-muted",
};

const MAX_UPCOMING = 5;

/** "in 4 days" / "today" / "5 days ago" — the countdown in words. */
function whenLabel(daysToDue: number): string {
  if (daysToDue < 0) {
    const late = Math.abs(daysToDue);
    return `${late} day${late === 1 ? "" : "s"} ago`;
  }
  if (daysToDue === 0) return "today";
  if (daysToDue === 1) return "tomorrow";
  return `in ${daysToDue} days`;
}

/**
 * When every open obligation actually lands. The prioritised queue answers "what
 * is worst"; this answers "what is next", and shows clustering (four things on
 * one Tuesday) that an ordered list cannot.
 */
export function DeadlineTimeline({
  buckets,
  deadlines,
}: {
  buckets: DeadlineBucket[];
  deadlines: UpcomingDeadline[];
}) {
  const totalCount = buckets.reduce((sum, b) => sum + b.count, 0);
  // Nothing open: say so plainly rather than drawing an empty chart.
  if (totalCount === 0) return null;

  const upcoming = deadlines.slice(0, MAX_UPCOMING);
  const remaining = deadlines.length - upcoming.length;

  return (
    <section className="animate-rise rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xs font-medium tracking-[0.12em] text-muted uppercase">
          What is due when
        </p>
        <p className="text-[12px] text-muted">
          {totalCount} open deadline{totalCount === 1 ? "" : "s"}
        </p>
      </div>

      {/* Distribution across the windows, sized by how many land in each.
          Hidden from screen readers: the list below states the same numbers. */}
      <div
        aria-hidden
        className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
      >
        {buckets
          .filter((b) => b.count > 0)
          .map((b) => (
            <div
              key={b.key}
              className={BAR_FILL[b.tone]}
              style={{ width: `${(b.count / totalCount) * 100}%` }}
              title={`${b.label}: ${b.count}`}
            />
          ))}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        {buckets.map((b) => (
          <div key={b.key}>
            <dt className="flex items-center gap-1.5 text-[12px] text-muted">
              <span className={`size-2 rounded-full ${DOT[b.tone]}`} aria-hidden />
              {b.label}
            </dt>
            <dd
              className={`tnum mt-1 font-mono text-2xl font-semibold ${
                b.count > 0 ? COUNT_TEXT[b.tone] : "text-muted"
              }`}
            >
              {b.count}
            </dd>
            <dd className="tnum font-mono text-[12px] text-muted">
              {b.amount > 0 ? formatINR(b.amount) : ""}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-[12px] font-medium text-muted">Next up</p>
        <ul className="mt-2 flex flex-col">
          {upcoming.map((d) => (
            <li key={d.id}>
              <Link
                href={d.href}
                className="group flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-surface-2"
              >
                <span className="tnum min-w-[5.5rem] font-mono text-[12px] text-muted">
                  {formatDate(d.dueDate)}
                </span>
                <span
                  className={`text-[12px] font-medium ${
                    d.daysToDue < 0 ? "text-danger" : "text-muted"
                  }`}
                >
                  {whenLabel(d.daysToDue)}
                </span>
                <span className="truncate text-[13px] text-fg group-hover:underline">
                  {d.title}
                </span>
                <span className="text-[12px] text-muted">{d.what}</span>
                {d.amount !== null && d.amount > 0 && (
                  <span className="tnum ml-auto font-mono text-[12.5px] font-semibold text-fg">
                    {formatINR(d.amount)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
        {remaining > 0 && (
          <p className="mt-2 px-2 text-[12px] text-muted">
            and {remaining} more further out
          </p>
        )}
      </div>
    </section>
  );
}
