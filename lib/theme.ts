// Colour theme — the three the app ships. Shared by the theme toggle, the
// no-flash <head> script's contract, and the per-account persistence layer.
export type Theme = "light" | "dark" | "paper";

export const THEMES: readonly Theme[] = ["light", "dark", "paper"];

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "paper";
}

/** Narrow untrusted input (form field, DB row, cookie) to a Theme or null. */
export function normalizeTheme(value: unknown): Theme | null {
  return isTheme(value) ? value : null;
}
