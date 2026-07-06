"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit, retryPhrase } from "@/lib/rate-limit";
import { RULE_CONFIG_GROUPS, RuleConfigSchema } from "@/lib/rules/ruleConfig";

export interface SaveConfigResult {
  ok: boolean;
  message: string;
}

// Rebuild the nested { group: { field: value } } shape the schema expects from
// the flat "group.field" form fields, then validate + coerce via zod. Every
// value is untrusted form input, so the schema is the single source of truth for
// ranges and types — a rejected value never reaches the database.
export async function saveRuleConfig(
  _prev: SaveConfigResult | null,
  formData: FormData
): Promise<SaveConfigResult> {
  const user = await requireUser();

  const limited = await rateLimit(`config:${user.id}`, 30, 600);
  if (!limited.ok) {
    return {
      ok: false,
      message: `Too many changes. Try again in ${retryPhrase(limited.retryAfterSeconds)}.`,
    };
  }

  const raw: Record<string, Record<string, unknown>> = {};
  for (const group of RULE_CONFIG_GROUPS) {
    const fields: Record<string, unknown> = {};
    for (const field of group.fields) {
      fields[field.key] = formData.get(`${group.key}.${field.key}`);
    }
    raw[group.key] = fields;
  }

  const parsed = RuleConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join(" · ") || "a field";
    return { ok: false, message: `Check ${where}: ${issue?.message ?? "invalid value"}.` };
  }

  await db.ruleConfig.upsert({
    where: { ownerId: user.id },
    create: { ownerId: user.id, values: parsed.data as Prisma.InputJsonValue },
    update: { values: parsed.data as Prisma.InputJsonValue },
  });

  // Every module reads the resolved config, so refresh the whole shell.
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. These parameters now drive every calculation." };
}

// Revert to the shipped legal defaults by removing the stored overrides. With no
// row present, resolveRuleConfig() returns the defaults, so the money math is
// unchanged from a fresh account.
export async function resetRuleConfig(): Promise<void> {
  const user = await requireUser();
  await db.ruleConfig.deleteMany({ where: { ownerId: user.id } });
  revalidatePath("/", "layout");
}
