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
import { DEMO_BILLS, DEMO_VENDORS } from "@/lib/rules/fixtures";
import { DEMO_IMS_ROWS } from "@/lib/rules/imsFixtures";
import { DEMO_RCM_ROWS } from "@/lib/rules/rcmFixtures";
import { DEMO_COMPLIANCE } from "@/lib/rules/complianceFixtures";

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
  const knownVendorIds = new Set(
    (
      await db.vendor.findMany({
        where: { ownerId: user.id },
        select: { id: true },
      })
    ).map((v) => v.id)
  );

  const allErrors = [...errors];
  // A bill's vendorId must exist — skip (and explain) orphans before writing.
  const writable = valid.filter((b) => {
    if (knownVendorIds.has(b.vendorId)) return true;
    allErrors.push({
      row: 0,
      message: `bill ${b.id}: unknown vendorId "${b.vendorId}". Upload that vendor first`,
    });
    return false;
  });

  await writeInBatches(
    writable.map((b) =>
      db.bill.upsert({
        where: { ownerId_id: { ownerId: user.id, id: b.id } },
        create: { ...b, ownerId: user.id },
        update: {
          vendorId: b.vendorId,
          invoiceAcceptanceDate: b.invoiceAcceptanceDate,
          amount: b.amount,
          hasWrittenAgreement: b.hasWrittenAgreement,
          agreedPaymentDays: b.agreedPaymentDays,
          paidDate: b.paidDate,
        },
      })
    )
  );
  const inserted = writable.length;

  revalidatePath("/", "layout");
  return {
    ok: allErrors.length === 0,
    message: `Imported ${inserted} bill(s)${
      allErrors.length ? `, skipped ${allErrors.length} row(s)` : ""
    }.`,
    inserted,
    errors: allErrors,
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

export async function seedDemoData(): Promise<void> {
  const user = await requireUser();
  for (const v of DEMO_VENDORS) {
    await db.vendor.upsert({
      where: { ownerId_id: { ownerId: user.id, id: v.id } },
      create: { ...v, ownerId: user.id },
      update: {
        name: v.name,
        gstin: v.gstin,
        gstinActive: v.gstinActive,
        udyamRegistered: v.udyamRegistered,
        udyamCategory: v.udyamCategory,
        lastVerifiedDate: v.lastVerifiedDate ?? null,
      },
    });
  }
  for (const b of DEMO_BILLS) {
    await db.bill.upsert({
      where: { ownerId_id: { ownerId: user.id, id: b.id } },
      create: { ...b, ownerId: user.id },
      update: {
        vendorId: b.vendorId,
        invoiceAcceptanceDate: b.invoiceAcceptanceDate,
        amount: b.amount,
        hasWrittenAgreement: b.hasWrittenAgreement,
        agreedPaymentDays: b.agreedPaymentDays,
        paidDate: b.paidDate,
      },
    });
  }
  for (const { invoice, vendorName } of DEMO_IMS_ROWS) {
    await db.imsInvoice.upsert({
      where: { ownerId_id: { ownerId: user.id, id: invoice.id } },
      create: { ...invoice, vendorName, ownerId: user.id },
      update: {
        vendorId: invoice.vendorId,
        vendorName,
        invoiceNo: invoice.invoiceNo,
        taxPeriod: invoice.taxPeriod,
        taxableValue: invoice.taxableValue,
        gstAmount: invoice.gstAmount,
        imsAction: invoice.imsAction,
        eligibility: invoice.eligibility,
      },
    });
  }
  for (const { purchase, vendorName } of DEMO_RCM_ROWS) {
    await db.rcmPurchase.upsert({
      where: { ownerId_id: { ownerId: user.id, id: purchase.id } },
      create: { ...purchase, vendorName, ownerId: user.id },
      update: {
        vendorId: purchase.vendorId,
        vendorName,
        supplierUnregistered: purchase.supplierUnregistered,
        supplyType: purchase.supplyType,
        supplyDate: purchase.supplyDate,
        rcmTaxAmount: purchase.rcmTaxAmount,
        selfInvoiceIssued: purchase.selfInvoiceIssued,
        rcmTaxPaidDate: purchase.rcmTaxPaidDate,
      },
    });
  }
  for (const c of DEMO_COMPLIANCE) {
    await db.complianceDeadline.upsert({
      where: { ownerId_id: { ownerId: user.id, id: c.id } },
      create: { ...c, ownerId: user.id },
      update: {
        name: c.name,
        authority: c.authority,
        period: c.period,
        dueDate: c.dueDate,
        filedDate: c.filedDate,
        proofRef: c.proofRef,
      },
    });
  }
  revalidatePath("/", "layout");
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
