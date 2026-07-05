// CA action report — pure grouping of the cross-module action queue.
//
// buildOverview() already produces a prioritised NeedsActionItem[] (sev 2 =
// urgent, sev 1 = due soon). The printable report just splits that queue into
// two sections; all the money math lives upstream in the deterministic engines.
import type { NeedsActionItem } from "@/lib/data/overview";

export interface GroupedActions {
  actNow: NeedsActionItem[];
  dueSoon: NeedsActionItem[];
  total: number;
}

export function groupActions(items: NeedsActionItem[]): GroupedActions {
  const actNow = items.filter((i) => i.sev >= 2);
  const dueSoon = items.filter((i) => i.sev === 1);
  return { actNow, dueSoon, total: actNow.length + dueSoon.length };
}
