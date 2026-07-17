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
  db: { bill: { update: vi.fn(), delete: vi.fn() } },
}));

import { markBillPaid, markBillUnpaid, deleteBill } from "./bill-actions";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

const mockRequireUser = vi.mocked(requireUser);
const mockRateLimit = vi.mocked(rateLimit);
const mockUpdate = vi.mocked(db.bill.update);
const mockDelete = vi.mocked(db.bill.delete);

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
