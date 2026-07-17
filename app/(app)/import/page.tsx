import { ImportPortal } from "@/app/_components/ImportPortal";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getImportProgress } from "@/lib/importStatus";

export default async function ImportPage() {
  const user = await requireUser();

  // Owner-scoped counts drive the setup progress, so each card can show what is
  // already in the account instead of five identical, memory-less dropzones.
  const [vendors, bills, ims, rcm, compliance] = await Promise.all([
    db.vendor.count({ where: { ownerId: user.id } }),
    db.bill.count({ where: { ownerId: user.id } }),
    db.imsInvoice.count({ where: { ownerId: user.id } }),
    db.rcmPurchase.count({ where: { ownerId: user.id } }),
    db.complianceDeadline.count({ where: { ownerId: user.id } }),
  ]);

  const progress = getImportProgress({ vendors, bills, ims, rcm, compliance });
  return <ImportPortal progress={progress} />;
}
