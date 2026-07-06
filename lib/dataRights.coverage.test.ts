import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// DPDP data-rights coverage guard.
//
// Every model that holds a tenant's data is keyed by `ownerId`. Both data-rights
// flows have to cover ALL of them, or we silently leak or retain personal data:
//   - deleteAccount() (right to erasure) must deleteMany each one
//   - GET /settings/export (right to access / portability) must read each one
//
// This test parses the Prisma schema for owner-scoped models and asserts both
// source files reference each one. Adding a new tenant table without wiring it
// into export + delete now fails here instead of shipping a compliance gap.

const root = process.cwd();
const schema = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");
const deleteSrc = readFileSync(join(root, "app", "account-actions.ts"), "utf8");
const exportSrc = readFileSync(
  join(root, "app", "(app)", "settings", "export", "route.ts"),
  "utf8"
);

/** Prisma models whose body declares an `ownerId` field — i.e. they hold tenant data. */
function ownerScopedModels(schemaText: string): string[] {
  const models: string[] = [];
  const re = /model\s+(\w+)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(schemaText)) !== null) {
    const [, name, body] = match;
    if (/\bownerId\b/.test(body)) models.push(name);
  }
  return models;
}

/** Prisma client accessor for a model, e.g. "BusinessProfile" -> "businessProfile". */
function accessor(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

const models = ownerScopedModels(schema);

describe("DPDP data-rights coverage", () => {
  it("finds the owner-scoped tenant models (including the latest additions)", () => {
    expect(models).toEqual(
      expect.arrayContaining([
        "Vendor",
        "Bill",
        "ImsInvoice",
        "RcmPurchase",
        "ComplianceDeadline",
        "RuleConfig",
        "BusinessProfile",
      ])
    );
  });

  it("excludes non-tenant tables (RateLimit is keyed by action:id, not ownerId)", () => {
    expect(models).not.toContain("RateLimit");
  });

  it.each(models)("deleteAccount() erases every %s row", (model) => {
    expect(deleteSrc).toMatch(new RegExp(`\\b${accessor(model)}\\.deleteMany\\b`));
  });

  it.each(models)("the data export reads %s", (model) => {
    expect(exportSrc).toMatch(
      new RegExp(`\\b${accessor(model)}\\.(findMany|findUnique)\\b`)
    );
  });
});
