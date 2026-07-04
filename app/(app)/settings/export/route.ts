import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /settings/export — DPDP data-access/portability: streams everything we hold
// for the signed-in account as a JSON download. Owner-scoped; auth-gated.
export async function GET() {
  const user = await requireUser();

  const [vendors, bills, imsInvoices, rcmPurchases, complianceDeadlines] =
    await Promise.all([
      db.vendor.findMany({ where: { ownerId: user.id }, orderBy: { id: "asc" } }),
      db.bill.findMany({ where: { ownerId: user.id }, orderBy: { id: "asc" } }),
      db.imsInvoice.findMany({ where: { ownerId: user.id }, orderBy: { id: "asc" } }),
      db.rcmPurchase.findMany({ where: { ownerId: user.id }, orderBy: { id: "asc" } }),
      db.complianceDeadline.findMany({ where: { ownerId: user.id }, orderBy: { id: "asc" } }),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email ?? null },
    counts: {
      vendors: vendors.length,
      bills: bills.length,
      imsInvoices: imsInvoices.length,
      rcmPurchases: rcmPurchases.length,
      complianceDeadlines: complianceDeadlines.length,
    },
    data: { vendors, bills, imsInvoices, rcmPurchases, complianceDeadlines },
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
