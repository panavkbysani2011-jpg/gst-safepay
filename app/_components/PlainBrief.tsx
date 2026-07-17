// Server component. Renders the optional plain-language brief, or nothing.
//
// Streamed behind Suspense so the dashboard never waits on an external endpoint:
// the numbers paint immediately and this fills in late, or never. If the model is
// slow, down, or writes a figure that fails the guard, the page is simply the
// page. Nothing here is load-bearing.
import { generateBrief, buildBriefFacts } from "@/lib/ai/brief";
import type { OverviewModel } from "@/lib/data/overview";
import type { DeadlineBucket, UpcomingDeadline } from "@/lib/data/deadlines";

export function BriefSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="h-3 w-28 animate-pulse rounded bg-surface-2" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-surface-2" />
      <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-surface-2" />
    </div>
  );
}

export async function PlainBrief({
  overview,
  buckets,
  deadlines,
}: {
  overview: OverviewModel;
  buckets: DeadlineBucket[];
  deadlines: UpcomingDeadline[];
}) {
  const { facts, names } = buildBriefFacts(overview, buckets, deadlines);
  const brief = await generateBrief(facts, names);
  if (brief === null) return null;

  return (
    <section className="animate-rise rounded-2xl border border-border bg-surface p-5">
      <p className="text-xs font-medium tracking-[0.12em] text-muted uppercase">
        In plain English
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-fg">{brief}</p>
      <p className="mt-3 text-[12px] text-muted">
        Written by AI from the figures above. The figures themselves are
        calculated by the rule engine, not by the AI, and it cannot show a number
        that was not calculated. Wording may still be imperfect, so check
        anything you act on.
      </p>
    </section>
  );
}
