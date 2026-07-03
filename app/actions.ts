"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  parseBillsCsv,
  parseComplianceCsv,
  parseImsCsv,
  parseRcmCsv,
  parseVendorsCsv,
} from "@/lib/csv/parseCsv";
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

async function readUploadedFile(formData: FormData): Promise<string | null> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return null;
  return file.text();
}

export async function uploadVendorsCsv(
  _prev: UploadResult | null,
  formData: FormData
): Promise<UploadResult> {
  const user = await requireUser();
  const text = await readUploadedFile(formData);
  if (text === null) return EMPTY_FILE_RESULT;

  const { valid, errors } = parseVendorsCsv(text);
  for (const v of valid) {
    await db.vendor.upsert({
      where: { ownerId_id: { ownerId: user.id, id: v.id } },
      create: { ...v, ownerId: user.id },
      update: {
        name: v.name,
        gstin: v.gstin,
        gstinActive: v.gstinActive,
        udyamRegistered: v.udyamRegistered,
        udyamCategory: v.udyamCategory,
      },
    });
  }

  revalidatePath("/");
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
  const text = await readUploadedFile(formData);
  if (text === null) return EMPTY_FILE_RESULT;

  const { valid, errors } = parseBillsCsv(text);
  const knownVendorIds = new Set(
    (
      await db.vendor.findMany({
        where: { ownerId: user.id },
        select: { id: true },
      })
    ).map((v) => v.id)
  );

  let inserted = 0;
  const allErrors = [...errors];
  for (const b of valid) {
    if (!knownVendorIds.has(b.vendorId)) {
      allErrors.push({
        row: 0,
        message: `bill ${b.id}: unknown vendorId "${b.vendorId}" — upload that vendor first`,
      });
      continue;
    }
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
    inserted += 1;
  }

  revalidatePath("/");
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
  const text = await readUploadedFile(formData);
  if (text === null) return EMPTY_FILE_RESULT;

  const { valid, errors } = parseImsCsv(text);
  for (const inv of valid) {
    await db.imsInvoice.upsert({
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
    });
  }

  revalidatePath("/");
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
  const text = await readUploadedFile(formData);
  if (text === null) return EMPTY_FILE_RESULT;

  const { valid, errors } = parseRcmCsv(text);
  for (const p of valid) {
    await db.rcmPurchase.upsert({
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
    });
  }

  revalidatePath("/");
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
  const text = await readUploadedFile(formData);
  if (text === null) return EMPTY_FILE_RESULT;

  const { valid, errors } = parseComplianceCsv(text);
  for (const d of valid) {
    await db.complianceDeadline.upsert({
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
    });
  }

  revalidatePath("/");
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
  revalidatePath("/");
}

export async function clearData(): Promise<void> {
  const user = await requireUser();
  await db.bill.deleteMany({ where: { ownerId: user.id } });
  await db.vendor.deleteMany({ where: { ownerId: user.id } });
  await db.imsInvoice.deleteMany({ where: { ownerId: user.id } });
  await db.rcmPurchase.deleteMany({ where: { ownerId: user.id } });
  await db.complianceDeadline.deleteMany({ where: { ownerId: user.id } });
  revalidatePath("/");
}
