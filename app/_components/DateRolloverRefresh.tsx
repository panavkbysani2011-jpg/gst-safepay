"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { todayInBusinessZone } from "@/lib/businessDate";

/**
 * Keeps countdowns honest on a page that stays open.
 *
 * Every figure is computed server-side against the Indian day, so each page load
 * is already fresh. But a tab left open overnight (or a laptop reopened the next
 * morning) would keep showing yesterday's "due in 4 days" forever. This watches
 * for the Indian day rolling over and re-fetches the server components, so the
 * countdown moves with the real calendar rather than freezing at whatever it
 * said when the page was opened.
 *
 * Renders nothing.
 */
export function DateRolloverRefresh({ renderedFor }: { renderedFor: string }) {
  const router = useRouter();

  useEffect(() => {
    function refreshIfDayChanged() {
      if (todayInBusinessZone() !== renderedFor) router.refresh();
    }

    // A minute is plenty: the smallest unit any deadline is expressed in is a day.
    const timer = window.setInterval(refreshIfDayChanged, 60_000);
    // Catches the common case directly: the tab is revealed again the next day.
    document.addEventListener("visibilitychange", refreshIfDayChanged);
    window.addEventListener("focus", refreshIfDayChanged);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfDayChanged);
      window.removeEventListener("focus", refreshIfDayChanged);
    };
  }, [renderedFor, router]);

  return null;
}
