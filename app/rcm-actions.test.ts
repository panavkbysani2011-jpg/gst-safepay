import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
  retryPhrase: (n: number) => `${n} seconds`,
}));
vi.mock("@/lib/businessDate", () => ({ todayInBusinessZone: () => "2026-07-17" }));
vi.mock("@/lib/db", () => ({
  db: { rcmPurchase: { update: vi.fn(), delete: vi.fn() } },
}));

import { setRcmSelfInvoice, setRcmTaxPaid, deleteRcmPurchase } from "./rcm-actions";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

const mockRequireUser = vi.mocked(requireUser);
const mockRateLimit = vi.mocked(rateLimit);
const mockUpdate = vi.mocked(db.rcmPurchase.update);
const mockDelete = vi.mocked(db.rcmPurchase.delete);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "u1" } as Awaited<ReturnType<typeof requireUser>>);
  mockRateLimit.mockResolvedValue({ ok: true } as Awaited<ReturnType<typeof rateLimit>>);
  mockUpdate.mockResolvedValue({} as never);
  mockDelete.mockResolvedValue({} as never);
});

describe("setRcmSelfInvoice", () => {
  it("marks the self-invoice issued", async () => {
    const r = await setRcmSelfInvoice("p1", true);
    expect(r.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { ownerId_id: { ownerId: "u1", id: "p1" } },
      data: { selfInvoiceIssued: true },
    });
  });

  it("marks it not issued (undo)", async () => {
    await setRcmSelfInvoice("p1", false);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { ownerId_id: { ownerId: "u1", id: "p1" } },
      data: { selfInvoiceIssued: false },
    });
  });
});

describe("setRcmTaxPaid", () => {
  it("stamps today's business date when paid", async () => {
    await setRcmTaxPaid("p1", true);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { ownerId_id: { ownerId: "u1", id: "p1" } },
      data: { rcmTaxPaidDate: "2026-07-17" },
    });
  });

  it("clears the date when unpaid", async () => {
    await setRcmTaxPaid("p1", false);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { ownerId_id: { ownerId: "u1", id: "p1" } },
      data: { rcmTaxPaidDate: null },
    });
  });

  it("stops on rate limit and never writes", async () => {
    mockRateLimit.mockResolvedValue({
      ok: false,
      retryAfterSeconds: 30,
    } as Awaited<ReturnType<typeof rateLimit>>);
    const r = await setRcmTaxPaid("p1", true);
    expect(r.ok).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("deleteRcmPurchase", () => {
  it("deletes, scoped to the owner", async () => {
    const r = await deleteRcmPurchase("p1");
    expect(r.ok).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({
      where: { ownerId_id: { ownerId: "u1", id: "p1" } },
    });
  });

  it("refuses an empty id and never touches the DB", async () => {
    const r = await deleteRcmPurchase("");
    expect(r.ok).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
