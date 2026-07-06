"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "paper";

const OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: "light",
    label: "Light theme",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
        <circle cx="12" cy="12" r="4" />
        <path strokeLinecap="round" d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark theme",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    ),
  },
  {
    value: "paper",
    label: "Paper theme",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
        <path strokeLinejoin="round" d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
        <path strokeLinecap="round" d="M14 3v5h5M8.5 13h7M8.5 16.5h7" />
      </svg>
    ),
  },
];

// `onPersist` is passed only in authenticated contexts (the app topbar) to save
// the choice to the account; public pages render the toggle without it.
export function ThemeToggle({ onPersist }: { onPersist?: (theme: Theme) => void }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" || current === "paper" ? current : "light");
  }, []);

  function apply(next: Theme) {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage unavailable (private mode) — theme still applies for this page.
    }
    setTheme(next);
    onPersist?.(next);
  }

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => apply(opt.value)}
            aria-label={opt.label}
            aria-pressed={active}
            title={opt.label}
            className={`flex size-7 items-center justify-center rounded-md transition-colors duration-150 ${
              active
                ? "bg-accent-soft text-accent-text"
                : "text-faint hover:bg-surface-2 hover:text-muted"
            }`}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  );
}
