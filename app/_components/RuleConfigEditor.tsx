"use client";

import { useActionState, useState, useTransition } from "react";
import {
  DEFAULT_RULE_CONFIG,
  RULE_CONFIG_GROUPS,
  type RuleConfig,
  type RuleField,
} from "@/lib/rules/ruleConfig";
import { saveRuleConfig, resetRuleConfig } from "@/app/config-actions";
import { FormSubmit } from "./FormSubmit";

type FlatValues = Record<string, string>;

function fieldName(f: RuleField): string {
  return `${f.group}.${f.key}`;
}

function flatten(cfg: RuleConfig): FlatValues {
  const out: FlatValues = {};
  for (const group of RULE_CONFIG_GROUPS) {
    const slice = cfg[group.key] as Record<string, number>;
    for (const field of group.fields) {
      out[fieldName(field)] = String(slice[field.key]);
    }
  }
  return out;
}

// Input hints per unit. The zod schema is the real gate; these only shape the UX.
function inputProps(unit: RuleField["unit"]): { step: string; min: number; max?: number } {
  switch (unit) {
    case "%":
      return { step: "0.1", min: 0, max: 100 };
    case "×":
      return { step: "0.1", min: 0 };
    case "₹":
      return { step: "100", min: 0 };
    case "day-of-month":
      return { step: "1", min: 1, max: 28 };
    default:
      return { step: "1", min: 0 };
  }
}

const UNIT_SUFFIX: Record<RuleField["unit"], string> = {
  days: "days",
  "day-of-month": "of next month",
  "%": "%",
  "×": "×",
  "₹": "₹",
};

export function RuleConfigEditor({
  config,
  isCustomised,
}: {
  config: RuleConfig;
  isCustomised: boolean;
}) {
  const defaults = flatten(DEFAULT_RULE_CONFIG);
  const [values, setValues] = useState<FlatValues>(() => flatten(config));
  const [state, formAction] = useActionState(saveRuleConfig, null);
  const [resetPending, startReset] = useTransition();

  const dirtyFromDefault = Object.keys(defaults).some((k) => values[k] !== defaults[k]);

  function setField(name: string, value: string): void {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleReset(): void {
    setValues(flatten(DEFAULT_RULE_CONFIG));
    startReset(async () => {
      await resetRuleConfig();
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${
            isCustomised
              ? "bg-accent-soft text-accent-text"
              : "bg-surface text-muted"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${isCustomised ? "bg-accent" : "bg-faint"}`}
            aria-hidden
          />
          {isCustomised ? "Customised for your firm" : "Using shipped legal defaults"}
        </span>
        <p className="text-[12.5px] text-muted">
          Every number below feeds the deterministic rule engines. A CA can correct
          any of them here, with no code change and no AI anywhere in the money math.
        </p>
      </div>

      {RULE_CONFIG_GROUPS.map((group) => (
        <section
          key={group.key}
          className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]"
        >
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="font-display text-[15px] font-semibold text-fg">{group.title}</h2>
            <p className="mt-0.5 text-[11.5px] text-muted">{group.legalBasis}</p>
          </div>
          <div className="divide-y divide-border">
            {group.fields.map((field) => {
              const name = fieldName(field);
              const props = inputProps(field.unit);
              const changed = values[name] !== defaults[name];
              return (
                <div
                  key={name}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <label htmlFor={name} className="min-w-0 sm:max-w-[62%]">
                    <span className="block text-[13.5px] font-semibold text-fg">
                      {field.label}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-muted">
                      {field.help}
                    </span>
                    {changed && (
                      <span className="mt-1 inline-block text-[11px] text-muted">
                        default: {defaults[name]}
                      </span>
                    )}
                  </label>
                  <div className="flex shrink-0 items-center gap-2">
                    <input
                      id={name}
                      name={name}
                      type="number"
                      inputMode="decimal"
                      step={props.step}
                      min={props.min}
                      max={props.max}
                      required
                      value={values[name] ?? ""}
                      onChange={(e) => setField(name, e.target.value)}
                      className={`tnum w-28 rounded-lg border bg-canvas px-3 py-2 text-right font-mono text-[14px] font-semibold text-fg transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                        changed ? "border-accent/50" : "border-border"
                      }`}
                    />
                    <span className="w-24 text-[11.5px] text-muted">
                      {UNIT_SUFFIX[field.unit]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-[var(--shadow)] backdrop-blur">
        <FormSubmit pendingLabel="Saving…">Save changes</FormSubmit>
        <button
          type="button"
          onClick={handleReset}
          disabled={resetPending || !dirtyFromDefault}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none disabled:opacity-50"
        >
          {resetPending ? "Resetting…" : "Reset to legal defaults"}
        </button>
        {state && (
          <p
            role="status"
            className={`text-[12.5px] font-medium ${
              state.ok ? "text-success" : "text-danger"
            }`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
