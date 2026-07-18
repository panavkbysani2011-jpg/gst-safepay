import { describe, it, expect, vi, beforeEach } from "vitest";

// The action is thin glue over the DB, but it moves money-relevant state, so the
// wiring is worth pinning: right owner scope, right field, right business date,
// and no DB write when the rate-limit or a missing id should stop it.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
  retryPhrase: (n: number) => `${n} seconds`,
}));
vi.mock("@/lib/businessDate", () => ({ todayInBusinessZone: () => "2026-07-17" }));
vi.mock("@/lib/db", () => ({
  db: {
    bill: { update: vi.fn(), delete: vi.fn(), upsert: vi.fn() },
    vendor: { findUnique: vi.fn() },
  },
}));

import { markBillPaid, markBillUnpaid, deleteBill, saveBill } from "./bill-actions";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

const mockRequireUser = vi.mocked(requireUser);
const mockRateLimit = vi.mocked(rateLimit);
const mockUpdate = vi.mocked(db.bill.update);
const mockDelete = vi.mocked(db.bill.delete);
const mockUpsert = vi.mocked(db.bill.upsert);
const mockVendorFind = vi.mocked(db.vendor.findUnique);

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated as u1, under the rate limit.
  mockRequireUser.mockResolvedValue({ id: "u1" } as Awaited<ReturnType<typeof requireUser>>);
  mockRateLimit.mockResolvedValue({ ok: true } as Awaited<ReturnType<typeof rateLimit>>);
});

describe("markBillPaid", () => {
  it("sets paidDate to today's business date, scoped to the owner", async () => {
    mockUpdate.mockResolvedValue({} as never);
    const r = await markBillPaid("b1");
    expect(r.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { ownerId_id: { ownerId: "u1", id: "b1" } },
      data: { paidDate: "2026-07-17" },
    });
  });

  it("reports a friendly error when the bill is gone, without throwing", async () => {
    mockUpdate.mockRejectedValue(new Error("record not found"));
    const r = await markBillPaid("missing");
    expect(r).toEqual({ ok: false, message: "That bill no longer exists." });
  });

  it("refuses an empty id and never touches the DB", async () => {
    const r = await markBillPaid("");
    expect(r.ok).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("stops on rate limit and never touches the DB", async () => {
    mockRateLimit.mockResolvedValue({
      ok: false,
      retryAfterSeconds: 30,
    } as Awaited<ReturnType<typeof rateLimit>>);
    const r = await markBillPaid("b1");
    expect(r.ok).toBe(false);
    expect(r.message).toContain("Too many");
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("markBillUnpaid", () => {
  it("clears the paid date", async () => {
    mockUpdate.mockResolvedValue({} as never);
    const r = await markBillUnpaid("b1");
    expect(r.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { ownerId_id: { ownerId: "u1", id: "b1" } },
      data: { paidDate: null },
    });
  });
});

describe("deleteBill", () => {
  it("deletes the bill, scoped to the owner", async () => {
    mockDelete.mockResolvedValue({} as never);
    const r = await deleteBill("b1");
    expect(r.ok).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({
      where: { ownerId_id: { ownerId: "u1", id: "b1" } },
    });
  });

  it("reports a friendly error when the bill is already gone", async () => {
    mockDelete.mockRejectedValue(new Error("record not found"));
    const r = await deleteBill("b1");
    expect(r).toEqual({ ok: false, message: "That bill no longer exists." });
  });
});

function billForm(over: Record<string, string> = {}): FormData {
  const fd = new FormData();
  const base: Record<string, string> = {
    vendorId: "v1",
    invoiceAcceptanceDate: "2026-06-15",
    amount: "100000",
    hasWrittenAgreement: "on",
    ...over,
  };
  for (const [k, v] of Object.entries(base)) fd.set(k, v);
  return fd;
}

describe("saveBill", () => {
  it("creates a bill scoped to the owner", async () => {
    mockVendorFind.mockResolvedValue({ id: "v1" } as never);
    mockUpsert.mockResolvedValue({} as never);
    const r = await saveBill(null, billForm());
    expect(r.ok).toBe(true);
    const arg = mockUpsert.mock.calls[0][0] as {
      where: { ownerId_id: { ownerId: string } };
      update: { amount: number; invoiceAcceptanceDate: string };
    };
    expect(arg.where.ownerId_id.ownerId).toBe("u1");
    expect(arg.update.amount).toBe(100000);
    expect(arg.update.invoiceAcceptanceDate).toBe("2026-06-15");
  });

  it("REFUSES a supplier that is not the caller's, and writes nothing", async () => {
    mockVendorFind.mockResolvedValue(null);
    const r = await saveBill(null, billForm({ vendorId: "someone-elses-vendor" }));
    expect(r.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rejects an invalid form without touching the DB", async () => {
    mockVendorFind.mockResolvedValue({ id: "v1" } as never);
    const r = await saveBill(null, billForm({ amount: "" }));
    expect(r.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rejects a paid date before the bill date", async () => {
    mockVendorFind.mockResolvedValue({ id: "v1" } as never);
    const r = await saveBill(null, billForm({ paidDate: "2026-01-01" }));
    expect(r.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
