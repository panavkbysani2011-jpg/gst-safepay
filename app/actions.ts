"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
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
  const text = await readUploadedFile(formData);
  if (text === null) return EMPTY_FILE_RESULT;

  const { valid, errors } = parseVendorsCsv(text);
  for (const vendor of valid) {
    await db.vendor.upsert({
      where: { id: vendor.id },
      create: vendor,
      update: vendor,
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
  const text = await readUploadedFile(formData);
  if (text === null) return EMPTY_FILE_RESULT;

  const { valid, errors } = parseBillsCsv(text);

  const knownVendorIds = new Set(
    (await db.vendor.findMany({ select: { id: true } })).map((v) => v.id)
  );

  let inserted = 0;
  const allErrors = [...errors];
  for (const bill of valid) {
    if (!knownVendorIds.has(bill.vendorId)) {
      allErrors.push({
        row: 0,
        message: `bill ${bill.id}: unknown vendorId "${bill.vendorId}" — upload that vendor first`,
      });
      continue;
    }
    await db.bill.upsert({
      where: { id: bill.id },
      create: bill,
      update: bill,
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
  for (const vendor of DEMO_VENDORS) {
    await db.vendor.upsert({
      where: { id: vendor.id },
      create: vendor,
      update: vendor,
    });
  }
  for (const bill of DEMO_BILLS) {
    await db.bill.upsert({
      where: { id: bill.id },
      create: bill,
      update: bill,
    });
  }
  revalidatePath("/");
}

export async function clearData(): Promise<void> {
  await db.bill.deleteMany();
  await db.vendor.deleteMany();
  revalidatePath("/");
}
