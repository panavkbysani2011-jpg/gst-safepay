// Shared semantic status tones → token classes, so every module colours status
// consistently (and calmly — muted, theme-aware, never a harsh raw red).
export type Tone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";

export const TONE_BADGE: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-border",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  info: "bg-info-soft text-info border-transparent",
  accent: "bg-accent-soft text-accent-text border-transparent",
};

export const TONE_CARD: Record<Tone, string> = {
  neutral: "border-border bg-surface",
  success: "border-success/30 bg-success-soft",
  warning: "border-warning/30 bg-warning-soft",
  danger: "border-danger/30 bg-danger-soft",
  info: "border-info/30 bg-info-soft",
  accent: "border-accent/30 bg-accent-soft",
};

export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-muted",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  accent: "text-accent-text",
};
