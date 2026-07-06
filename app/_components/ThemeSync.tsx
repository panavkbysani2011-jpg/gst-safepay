"use client";

import { useEffect } from "react";
import type { Theme } from "@/lib/theme";

// Applies the account's saved theme on a browser that has never chosen one
// (e.g. first sign-in on a new device). Returning browsers already show the
// right theme from localStorage via the no-flash <head> script, so this no-ops
// there — it never overrides a choice the user made in this browser.
export function ThemeSync({ serverTheme }: { serverTheme: Theme | null }) {
  useEffect(() => {
    if (!serverTheme) return;
    try {
      if (!localStorage.getItem("theme")) {
        document.documentElement.setAttribute("data-theme", serverTheme);
        localStorage.setItem("theme", serverTheme);
      }
    } catch {
      // localStorage blocked (private mode) — leave the current theme as-is.
    }
  }, [serverTheme]);

  return null;
}
