"use server";

import { revalidatePath } from "next/cache";
import type { PrismaPromise } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { rateLimit, retryPhrase } from "@/lib/rate-limit";
import {
  parseBillsCsv,
  parseComplianceCsv,
  parseImsCsv,
  parseRcmCsv,
  parseVendorsCsv,
} from "@/lib/csv/parseCsv";
import { fileToCsv } from "@/lib/csv/toCsv";
import { planVendorLinks } from "@/lib/csv/vendorLink";

export interface UploadResult {
  ok: boolean;
  message: string;
  inserted: number;
  errors: { row: number; message: string }[];
}

const EMPTY_FILE_RESULT: UploadResult = {
  ok: false,
  message: "No file selected.",
  inserted: 0,
  errors: [],
};

function fileErrorResult(message: string): UploadResult {
  return { ok: false, message, inserted: 0, errors: [] };
}

// Reads the upload and normalizes it to CSV text (CSV/TSV/Excel/ODS), enforcing
// the size cap and format allowlist. Returns null only when no file was sent.
async function readUploadedFile(
  formData: FormData
): Promise<{ ok: true; csv: string } | { ok: false; message: string } | null> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  return fileToCsv(file);
}

// Writes rows in transactional batches instead of one round-trip per row, so a
// full 5000-row import is a handful of round-trips, not thousands (which would
// blow the serverless time limit). Upsert semantics are unchanged.
const DB_BATCH_SIZE = 100;

async function writeInBatches(
  operations: PrismaPromise<unknown>[]
): Promise<void> {
  for (let i = 0; i < operations.length; i += DB_BATCH_SIZE) {
    await db.$transaction(operations.slice(i, i + DB_BATCH_SIZE));
  }
}

// Per-user upload throttle — uploads write to the DB, so cap abuse/DoS while
// staying generous for real use. Returns a result to short-circuit with, or null.
async function uploadRateLimited(userId: string): Promise<UploadResult | null> {
  const limited = await rateLimit(`upload:${userId}`, 30, 600);
  if (limited.ok) return null;
  return {
    ok: false,
    message: `Too many uploads. Try again in ${retryPhrase(limited.retryAfterSeconds)}.`,
    inserted: 0,
    errors: [],
  };
}

export async function uploadVendorsCsv(
  _prev: UploadResult | null,
  formData: FormData
): Promise<UploadResult> {
  const user = await requireUser();
  const limited = await uploadRateLimited(user.id);
  if (limited) return limited;
  const read = await readUploadedFile(formData);
  if (read === null) return EMPTY_FILE_RESULT;
  if (!read.ok) return fileErrorResult(read.message);

  const { valid, errors } = parseVendorsCsv(read.csv);
  await writeInBatches(
    valid.map((v) =>
      db.vendor.upsert({
        where: { ownerId_id: { ownerId: user.id, id: v.id } },
        create: { ...v, ownerId: user.id },
        update: {
          name: v.name,
          gstin: v.gstin,
          gstinActive: v.gstinActive,
          udyamRegistered: v.udyamRegistered,
          udyamCategory: v.udyamCategory,
        },
      })
    )
  );

  revalidatePath("/", "layout");
  return {
    ok: errors.length === 0,
    message: `Imported ${valid.length} vendor(s)${
      errors.length ? `, skipped ${errors.length} invalid row(s)` : ""
    }.`,
    inserted: valid.length,
    errors,
  };
}

export async function uploadBillsCsv(
  _prev: UploadResult | null,
  formData: FormData
): Promise<UploadResult> {
  const user = await requireUser();
  const limited = await uploadRateLimited(user.id);
  if (limited) return limited;
  const read = await readUploadedFile(formData);
  if (read === null) return EMPTY_FILE_RESULT;
  if (!read.ok) return fileErrorResult(read.message);

  const { valid, errors } = parseBillsCsv(read.csv);

  // Link each row to a vendor by id, GSTIN or name, seeding any supplier we've
  // never seen. Real purchase registers name their supplier rather than quoting
  // one of our ids, so no bill is dropped just because setup came in a
  // different order.
  const existingVendors = await db.vendor.findMany({
    where: { ownerId: user.id },
    select: { id: true, name: true, gstin: true },
  });
  const plan = planVendorLinks(valid, existingVendors);

  // Seeded vendors must exist before the bills that reference them. `update: {}`
  // so a concurrent/duplicate run never clobbers a vendor the user has since
  // completed. They start un-verified: we cannot know a supplier's GSTIN or
  // Udyam status, and the 45-day rule only applies once that is filled in.
  if (plan.toCreate.length > 0) {
    await writeInBatches(
      plan.toCreate.map((v) =>
        db.vendor.upsert({
          where: { ownerId_id: { ownerId: user.id, id: v.id } },
          create: {
            ownerId: user.id,
            id: v.id,
            name: v.name,
            gstin: v.gstin,
            gstinActive: true,
            udyamRegistered: false,
            udyamCategory: null,
          },
          update: {},
        })
      )
    );
  }

  await writeInBatches(
    valid.map((b) => {
      // Resolved for every non-blank ref (matched or seeded); fall back to the
      // raw ref so a row can never silently point nowhere.
      const vendorId = plan.resolved.get(b.vendorId.trim()) ?? b.vendorId;
      // Build explicitly: vendorName/vendorGstin are transient link hints, not
      // columns on Bill.
      const fields = {
        vendorId,
        invoiceAcceptanceDate: b.invoiceAcceptanceDate,
        amount: b.amount,
        hasWrittenAgreement: b.hasWrittenAgreement,
        agreedPaymentDays: b.agreedPaymentDays,
        paidDate: b.paidDate,
      };
      return db.bill.upsert({
        where: { ownerId_id: { ownerId: user.id, id: b.id } },
        create: { ownerId: user.id, id: b.id, ...fields },
        update: fields,
      });
    })
  );
  const inserted = valid.length;
  const createdVendors = plan.toCreate.length;

  revalidatePath("/", "layout");
  return {
    ok: errors.length === 0,
    message: `Imported ${inserted} bill(s)${
      createdVendors
        ? `, and added ${createdVendors} new vendor(s). Set their GSTIN and MSME status on the Vendors page so the 45-day rule can apply`
        : ""
    }${errors.length ? `, skipped ${errors.length} invalid row(s)` : ""}.`,
    inserted,
    errors,
  };
}

export async function uploadImsCsv(
  _prev: UploadResult | null,
  formData: FormData
): Promise<UploadResult> {
  const user = await requireUser();
  const limited = await uploadRateLimited(user.id);
  if (limited) return limited;
  const read = await readUploadedFile(formData);
  if (read === null) return EMPTY_FILE_RESULT;
  if (!read.ok) return fileErrorResult(read.message);

  const { valid, errors } = parseImsCsv(read.csv);
  await writeInBatches(
    valid.map((inv) =>
      db.imsInvoice.upsert({
        where: { ownerId_id: { ownerId: user.id, id: inv.id } },
        create: { ...inv, ownerId: user.id },
        update: {
          vendorId: inv.vendorId,
          vendorName: inv.vendorName,
          invoiceNo: inv.invoiceNo,
          taxPeriod: inv.taxPeriod,
          taxableValue: inv.taxableValue,
          gstAmount: inv.gstAmount,
          imsAction: inv.imsAction,
          eligibility: inv.eligibility,
        },
      })
    )
  );

  revalidatePath("/", "layout");
  return {
    ok: errors.length === 0,
    message: `Imported ${valid.length} IMS invoice(s)${
      errors.length ? `, skipped ${errors.length} invalid row(s)` : ""
    }.`,
    inserted: valid.length,
    errors,
  };
}

export async function uploadRcmCsv(
  _prev: UploadResult | null,
  formData: FormData
): Promise<UploadResult> {
  const user = await requireUser();
  const limited = await uploadRateLimited(user.id);
  if (limited) return limited;
  const read = await readUploadedFile(formData);
  if (read === null) return EMPTY_FILE_RESULT;
  if (!read.ok) return fileErrorResult(read.message);

  const { valid, errors } = parseRcmCsv(read.csv);
  await writeInBatches(
    valid.map((p) =>
      db.rcmPurchase.upsert({
        where: { ownerId_id: { ownerId: user.id, id: p.id } },
        create: { ...p, ownerId: user.id },
        update: {
          vendorId: p.vendorId,
          vendorName: p.vendorName,
          supplierUnregistered: p.supplierUnregistered,
          supplyType: p.supplyType,
          supplyDate: p.supplyDate,
          rcmTaxAmount: p.rcmTaxAmount,
          selfInvoiceIssued: p.selfInvoiceIssued,
          rcmTaxPaidDate: p.rcmTaxPaidDate,
        },
      })
    )
  );

  revalidatePath("/", "layout");
  return {
    ok: errors.length === 0,
    message: `Imported ${valid.length} RCM purchase(s)${
      errors.length ? `, skipped ${errors.length} invalid row(s)` : ""
    }.`,
    inserted: valid.length,
    errors,
  };
}

export async function uploadComplianceCsv(
  _prev: UploadResult | null,
  formData: FormData
): Promise<UploadResult> {
  const user = await requireUser();
  const limited = await uploadRateLimited(user.id);
  if (limited) return limited;
  const read = await readUploadedFile(formData);
  if (read === null) return EMPTY_FILE_RESULT;
  if (!read.ok) return fileErrorResult(read.message);

  const { valid, errors } = parseComplianceCsv(read.csv);
  await writeInBatches(
    valid.map((d) =>
      db.complianceDeadline.upsert({
        where: { ownerId_id: { ownerId: user.id, id: d.id } },
        create: { ...d, ownerId: user.id },
        update: {
          name: d.name,
          authority: d.authority,
          period: d.period,
          dueDate: d.dueDate,
          filedDate: d.filedDate,
          proofRef: d.proofRef,
        },
      })
    )
  );

  revalidatePath("/", "layout");
  return {
    ok: errors.length === 0,
    message: `Imported ${valid.length} compliance deadline(s)${
      errors.length ? `, skipped ${errors.length} invalid row(s)` : ""
    }.`,
    inserted: valid.length,
    errors,
  };
}

export async function clearData(): Promise<void> {
  const user = await requireUser();
  await db.bill.deleteMany({ where: { ownerId: user.id } });
  await db.vendor.deleteMany({ where: { ownerId: user.id } });
  await db.imsInvoice.deleteMany({ where: { ownerId: user.id } });
  await db.rcmPurchase.deleteMany({ where: { ownerId: user.id } });
  await db.complianceDeadline.deleteMany({ where: { ownerId: user.id } });
  revalidatePath("/", "layout");
}
