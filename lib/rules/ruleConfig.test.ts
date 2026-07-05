import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULE_CONFIG,
  isDefaultRuleConfig,
  resolveRuleConfig,
  RuleConfigSchema,
} from "./ruleConfig";
import {
  DEFAULT_COMPLIANCE_CONFIG,
  DEFAULT_IMS_RULE_CONFIG,
  DEFAULT_PAYMENT_RULE_CONFIG,
  DEFAULT_RCM_RULE_CONFIG,
  DEFAULT_VENDOR_VERIFICATION_CONFIG,
} from "./types";

describe("DEFAULT_RULE_CONFIG", () => {
  it("matches the shipped per-module defaults exactly", () => {
    expect(DEFAULT_RULE_CONFIG.payment).toEqual(DEFAULT_PAYMENT_RULE_CONFIG);
    expect(DEFAULT_RULE_CONFIG.ims).toEqual(DEFAULT_IMS_RULE_CONFIG);
    expect(DEFAULT_RULE_CONFIG.rcm).toEqual(DEFAULT_RCM_RULE_CONFIG);
    expect(DEFAULT_RULE_CONFIG.vendor).toEqual(DEFAULT_VENDOR_VERIFICATION_CONFIG);
    expect(DEFAULT_RULE_CONFIG.compliance).toEqual(DEFAULT_COMPLIANCE_CONFIG);
  });
});

describe("resolveRuleConfig", () => {
  it("returns full defaults for null / empty", () => {
    expect(resolveRuleConfig(null)).toEqual(DEFAULT_RULE_CONFIG);
    expect(resolveRuleConfig({})).toEqual(DEFAULT_RULE_CONFIG);
  });

  it("merges a partial override over the defaults", () => {
    const cfg = resolveRuleConfig({ payment: { rbiBankRatePercent: 6.75 } });
    expect(cfg.payment.rbiBankRatePercent).toBe(6.75);
    // untouched fields keep their defaults
    expect(cfg.payment.statutoryMaxDaysWithAgreement).toBe(45);
    expect(cfg.rcm.selfInvoiceDays).toBe(30);
  });

  it("coerces numeric strings (form inputs)", () => {
    const cfg = resolveRuleConfig({ payment: { assumedMarginalTaxRatePercent: "30" } });
    expect(cfg.payment.assumedMarginalTaxRatePercent).toBe(30);
  });

  it("falls back to defaults on out-of-range / garbage input", () => {
    expect(resolveRuleConfig({ payment: { rbiBankRatePercent: 999 } })).toEqual(DEFAULT_RULE_CONFIG);
    expect(resolveRuleConfig("not-an-object")).toEqual(DEFAULT_RULE_CONFIG);
  });
});

describe("RuleConfigSchema (save-path validation)", () => {
  it("rejects an out-of-range value with an error (not a silent default)", () => {
    const r = RuleConfigSchema.safeParse({ payment: { rbiBankRatePercent: -1 } });
    expect(r.success).toBe(false);
  });

  it("rejects a non-integer day-of-month for the 2B cutoff", () => {
    const r = RuleConfigSchema.safeParse({ ims: { gstr2bCutoffDayOfNextMonth: 40 } });
    expect(r.success).toBe(false);
  });
});

describe("isDefaultRuleConfig", () => {
  it("is true for defaults, false once a value changes", () => {
    expect(isDefaultRuleConfig(DEFAULT_RULE_CONFIG)).toBe(true);
    expect(isDefaultRuleConfig(resolveRuleConfig({ vendor: { recheckCadenceDays: 90 } }))).toBe(false);
  });
});
