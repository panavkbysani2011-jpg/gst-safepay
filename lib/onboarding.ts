// Onboarding "Get set up" checklist — pure state derivation.
//
// The Overview shows a non-blocking checklist for a fresh account. Each milestone
// is auto-checked from the data the account actually holds (counts already fetched
// for the dashboard), so it needs no separate progress tracking: import a vendor
// and its milestone ticks itself; the whole card auto-hides once all are done.

// Cookie the dismiss action sets and the Overview reads. Kept here (a plain
// module) rather than the "use server" actions file, which may only export
// async functions.
export const GETTING_STARTED_DISMISS_COOKIE = "gsp_gs_dismissed";

export interface GettingStartedCounts {
  vendors: number;
  bills: number;
  gstRecords: number; // IMS invoices + RCM purchases + compliance deadlines
}

export type GettingStartedKey = "vendors" | "bills" | "gst";

export interface GettingStartedStep {
  key: GettingStartedKey;
  title: string;
  help: string;
  actionHref: string; // where to go to complete the step
  actionLabel: string;
  viewHref: string; // the module to view once the step is done
  done: boolean;
}

export interface GettingStartedState {
  steps: GettingStartedStep[];
  completedCount: number;
  total: number;
  allDone: boolean;
}

// A count only "counts" when it is a real, positive number — guards against
// NaN/Infinity/negatives so a bad input can never falsely tick a milestone.
function hasData(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

export function getGettingStartedState(counts: GettingStartedCounts): GettingStartedState {
  const steps: GettingStartedStep[] = [
    {
      key: "vendors",
      title: "Add your vendors",
      help: "Validate GSTINs and set up who you buy from.",
      actionHref: "/import",
      actionLabel: "Import vendors",
      viewHref: "/vendors",
      done: hasData(counts.vendors),
    },
    {
      key: "bills",
      title: "Add bills — see who to pay first",
      help: "Track MSME 45-day deadlines and the real cost of paying late.",
      actionHref: "/import",
      actionLabel: "Import bills",
      viewHref: "/payments",
      done: hasData(counts.bills),
    },
    {
      key: "gst",
      title: "Add your GST records",
      help: "IMS deemed-accept, reverse-charge and filing deadlines.",
      actionHref: "/import",
      actionLabel: "Import GST records",
      viewHref: "/ims",
      done: hasData(counts.gstRecords),
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  return {
    steps,
    completedCount,
    total: steps.length,
    allDone: completedCount === steps.length,
  };
}
