import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /settings/export — DPDP data-access/portability: streams everything we hold
// for the signed-in account as a JSON download. Owner-scoped; auth-gated.
export async function GET() {
  const user = await requireUser();

  const [
    vendors,
    bills,
    imsInvoices,
    rcmPurchases,
    complianceDeadlines,
    ruleConfig,
    businessProfile,
  ] = await Promise.all([
    db.vendor.findMany({ where: { ownerId: user.id }, orderBy: { id: "asc" } }),
    db.bill.findMany({ where: { ownerId: user.id }, orderBy: { id: "asc" } }),
    db.imsInvoice.findMany({ where: { ownerId: user.id }, orderBy: { id: "asc" } }),
    db.rcmPurchase.findMany({ where: { ownerId: user.id }, orderBy: { id: "asc" } }),
    db.complianceDeadline.findMany({ where: { ownerId: user.id }, orderBy: { id: "asc" } }),
    // CA rule overrides + business identity: one row per account (keyed by ownerId).
    db.ruleConfig.findUnique({ where: { ownerId: user.id } }),
    db.businessProfile.findUnique({ where: { ownerId: user.id } }),
  ]);

  // Money columns are Prisma Decimal; export them as JSON numbers (not the
  // Decimal object's string form) so the download keeps a stable numeric shape.
  const billsOut = bills.map((b) => ({ ...b, amount: b.amount.toNumber() }));
  const imsOut = imsInvoices.map((i) => ({
    ...i,
    taxableValue: i.taxableValue.toNumber(),
    gstAmount: i.gstAmount.toNumber(),
  }));
  const rcmOut = rcmPurchases.map((p) => ({
    ...p,
    rcmTaxAmount: p.rcmTaxAmount.toNumber(),
  }));

  const payload = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email ?? null },
    counts: {
      vendors: vendors.length,
      bills: bills.length,
      imsInvoices: imsInvoices.length,
      rcmPurchases: rcmPurchases.length,
      complianceDeadlines: complianceDeadlines.length,
      ruleConfig: ruleConfig ? 1 : 0,
      businessProfile: businessProfile ? 1 : 0,
    },
    data: {
      vendors,
      bills: billsOut,
      imsInvoices: imsOut,
      rcmPurchases: rcmOut,
      complianceDeadlines,
      ruleConfig,
      businessProfile,
    },
  };

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="gst-safepay-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
