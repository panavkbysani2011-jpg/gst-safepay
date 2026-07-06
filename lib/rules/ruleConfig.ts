// Per-account rule configuration — the "CA-config editor" backbone.
//
// Every module's money math is driven by a small set of tax parameters that a
// chartered accountant must verify/correct (rates, day thresholds, penalties).
// Historically these were the hardcoded DEFAULT_*_CONFIG constants. This module
// lets a CA store per-account overrides that flow into the rule engines, WITHOUT
// a code change. Stored as a validated JSON blob per owner; resolved (defaults +
// overrides) on read. With no overrides saved, the resolved config equals the
// shipped defaults, so behaviour is unchanged until a CA edits a value.
import { z } from "zod";
import {
  DEFAULT_COMPLIANCE_CONFIG,
  DEFAULT_IMS_RULE_CONFIG,
  DEFAULT_PAYMENT_RULE_CONFIG,
  DEFAULT_RCM_RULE_CONFIG,
  DEFAULT_VENDOR_VERIFICATION_CONFIG,
  type ComplianceRuleConfig,
  type ImsRuleConfig,
  type PaymentRuleConfig,
  type RcmRuleConfig,
  type VendorVerificationConfig,
} from "./types";

const days = (d: number) => z.coerce.number().int().min(0).max(3650).default(d);
const dayOfMonth = (d: number) => z.coerce.number().int().min(1).max(28).default(d);
const percent = (d: number) => z.coerce.number().min(0).max(100).default(d);
const multiplier = (d: number) => z.coerce.number().min(0).max(20).default(d);
const money = (d: number) => z.coerce.number().min(0).max(100_000_000).default(d);

export const RuleConfigSchema = z
  .object({
    payment: z
      .object({
        statutoryMaxDaysWithAgreement: days(45),
        statutoryMaxDaysWithoutAgreement: days(15),
        rbiBankRatePercent: percent(6.5),
        msmedInterestMultiplier: multiplier(3),
        assumedMarginalTaxRatePercent: percent(25),
      })
      .default(DEFAULT_PAYMENT_RULE_CONFIG),
    ims: z
      .object({
        gstr2bCutoffDayOfNextMonth: dayOfMonth(14),
        dueSoonWindowDays: days(3),
        wrongItcInterestRatePercent: percent(18),
      })
      .default(DEFAULT_IMS_RULE_CONFIG),
    rcm: z
      .object({
        selfInvoiceDays: days(30),
        timeOfSupplyDaysGoods: days(30),
        timeOfSupplyDaysServices: days(60),
        gstr3bDueDayOfNextMonth: dayOfMonth(20),
        latePaymentInterestRatePercent: percent(18),
        lateSelfInvoicePenalty: money(10000),
        dueSoonWindowDays: days(7),
      })
      .default(DEFAULT_RCM_RULE_CONFIG),
    vendor: z
      .object({
        recheckCadenceDays: days(180),
      })
      .default(DEFAULT_VENDOR_VERIFICATION_CONFIG),
    compliance: z
      .object({
        dueSoonWindowDays: days(7),
      })
      .default(DEFAULT_COMPLIANCE_CONFIG),
  });

export type RuleConfig = z.infer<typeof RuleConfigSchema>;

// z.infer produces the exact per-module shapes, so each slice is assignable to
// the engine config interfaces. These assignments are compile-time proof of that.
export type PaymentCfg = RuleConfig["payment"] & PaymentRuleConfig;
export type ImsCfg = RuleConfig["ims"] & ImsRuleConfig;
export type RcmCfg = RuleConfig["rcm"] & RcmRuleConfig;
export type VendorCfg = RuleConfig["vendor"] & VendorVerificationConfig;
export type ComplianceCfg = RuleConfig["compliance"] & ComplianceRuleConfig;

/** The shipped defaults, as a fully-resolved bundle. */
export const DEFAULT_RULE_CONFIG: RuleConfig = RuleConfigSchema.parse({});

/**
 * Resolve stored overrides (possibly partial, possibly null) into a complete
 * config bundle. Unknown/invalid input falls back to defaults — a bad row must
 * never break the money math.
 */
export function resolveRuleConfig(stored: unknown): RuleConfig {
  const parsed = RuleConfigSchema.safeParse(stored ?? {});
  return parsed.success ? parsed.data : DEFAULT_RULE_CONFIG;
}

/** True if the resolved config still equals the shipped defaults (nothing customised). */
export function isDefaultRuleConfig(cfg: RuleConfig): boolean {
  return JSON.stringify(cfg) === JSON.stringify(DEFAULT_RULE_CONFIG);
}

// --- Editor metadata: what each parameter means + its legal basis -----------

export type RuleUnit = "days" | "day-of-month" | "%" | "×" | "₹";

export interface RuleField {
  group: keyof RuleConfig;
  key: string;
  label: string;
  help: string;
  unit: RuleUnit;
}

export interface RuleGroup {
  key: keyof RuleConfig;
  title: string;
  legalBasis: string;
  fields: RuleField[];
}

export const RULE_CONFIG_GROUPS: RuleGroup[] = [
  {
    key: "payment",
    title: "MSME payments (§43B(h) + MSMED Act)",
    legalBasis: "Income-tax §43B(h); MSMED Act 2006 §15–16.",
    fields: [
      { group: "payment", key: "statutoryMaxDaysWithAgreement", label: "Max days (written agreement)", help: "Longest payment term allowed to a micro/small supplier when a written agreement exists.", unit: "days" },
      { group: "payment", key: "statutoryMaxDaysWithoutAgreement", label: "Max days (no agreement)", help: "Deadline when there is no written agreement.", unit: "days" },
      { group: "payment", key: "rbiBankRatePercent", label: "RBI bank rate", help: "RBI notified bank rate; MSMED interest is a multiple of this.", unit: "%" },
      { group: "payment", key: "msmedInterestMultiplier", label: "MSMED interest multiplier", help: "Interest = this multiple × the RBI bank rate (compounded monthly).", unit: "×" },
      { group: "payment", key: "assumedMarginalTaxRatePercent", label: "Marginal tax rate", help: "Used to size the lost-deduction cost when a bill is disallowed.", unit: "%" },
    ],
  },
  {
    key: "ims",
    title: "GST IMS (Invoice Management System)",
    legalBasis: "GST GSTR-2B generation; GST §50 interest.",
    fields: [
      { group: "ims", key: "gstr2bCutoffDayOfNextMonth", label: "GSTR-2B cutoff day", help: "Day of the following month when unactioned invoices are deemed accepted into 2B.", unit: "day-of-month" },
      { group: "ims", key: "dueSoonWindowDays", label: "Due-soon warning window", help: "Warn this many days before the cutoff.", unit: "days" },
      { group: "ims", key: "wrongItcInterestRatePercent", label: "Wrong-ITC interest rate", help: "GST §50 interest on wrongly-availed input-tax-credit.", unit: "%" },
    ],
  },
  {
    key: "rcm",
    title: "Reverse charge (RCM, Rule 47A)",
    legalBasis: "GST Rule 47A; §12(3)/§13(3) time of supply; §50 interest; §122 penalty.",
    fields: [
      { group: "rcm", key: "selfInvoiceDays", label: "Self-invoice window", help: "Days to issue a self-invoice for an unregistered supplier (Rule 47A).", unit: "days" },
      { group: "rcm", key: "timeOfSupplyDaysGoods", label: "Time of supply (goods)", help: "Time-of-supply cap for goods (§12(3)).", unit: "days" },
      { group: "rcm", key: "timeOfSupplyDaysServices", label: "Time of supply (services)", help: "Time-of-supply cap for services (§13(3)).", unit: "days" },
      { group: "rcm", key: "gstr3bDueDayOfNextMonth", label: "GSTR-3B due day", help: "Day of the next month the RCM cash tax is due.", unit: "day-of-month" },
      { group: "rcm", key: "latePaymentInterestRatePercent", label: "Late-payment interest", help: "GST §50 interest on late RCM tax.", unit: "%" },
      { group: "rcm", key: "lateSelfInvoicePenalty", label: "Missed self-invoice penalty", help: "§122 penalty for a missed self-invoice (flat default).", unit: "₹" },
      { group: "rcm", key: "dueSoonWindowDays", label: "Due-soon warning window", help: "Warn this many days before an RCM deadline.", unit: "days" },
    ],
  },
  {
    key: "vendor",
    title: "Vendor GSTIN verification",
    legalBasis: "Operational cadence — CA to set per firm policy.",
    fields: [
      { group: "vendor", key: "recheckCadenceDays", label: "Re-check cadence", help: "Re-verify each vendor's GSTIN/Udyam at least this often.", unit: "days" },
    ],
  },
  {
    key: "compliance",
    title: "Compliance calendar",
    legalBasis: "Operational — warning lead time only.",
    fields: [
      { group: "compliance", key: "dueSoonWindowDays", label: "Due-soon warning window", help: "Flag a filing as due-soon this many days before its deadline.", unit: "days" },
    ],
  },
];
