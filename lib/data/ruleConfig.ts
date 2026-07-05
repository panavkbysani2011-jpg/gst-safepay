import { cache } from "react";
import { db } from "@/lib/db";
import { resolveRuleConfig, type RuleConfig } from "@/lib/rules/ruleConfig";

/**
 * The owner's resolved rule config = shipped defaults + any CA overrides saved
 * in the RuleConfig table. Memoised per request via React `cache`, so the many
 * callers (dashboard data, each module page, the editor) share one DB read.
 * A missing or malformed row resolves to the shipped defaults — never throws.
 */
export const getRuleConfig = cache(
  async (ownerId: string): Promise<RuleConfig> => {
    const row = await db.ruleConfig.findUnique({ where: { ownerId } });
    return resolveRuleConfig(row?.values ?? null);
  }
);
