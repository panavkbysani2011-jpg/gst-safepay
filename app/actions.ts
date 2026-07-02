"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseBillsCsv, parseVendorsCsv } from "@/lib/csv/parseCsv";
import { DEMO_BILLS, DEMO_VENDORS } from "@/lib/rules/fixtures";

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
  revalidatePath("/");
}

export async function clearData(): Promise<void> {
  const user = await requireUser();
  await db.bill.deleteMany({ where: { ownerId: user.id } });
  await db.vendor.deleteMany({ where: { ownerId: user.id } });
  revalidatePath("/");
}
