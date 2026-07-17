import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
  retryPhrase: (n: number) => `${n} seconds`,
}));
vi.mock("@/lib/db", () => ({
  db: { imsInvoice: { update: vi.fn(), delete: vi.fn() } },
}));

import { setImsAction, deleteImsInvoice, type ImsChoice } from "./ims-actions";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

const mockRequireUser = vi.mocked(requireUser);
const mockRateLimit = vi.mocked(rateLimit);
const mockUpdate = vi.mocked(db.imsInvoice.update);
const mockDelete = vi.mocked(db.imsInvoice.delete);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "u1" } as Awaited<ReturnType<typeof requireUser>>);
  mockRateLimit.mockResolvedValue({ ok: true } as Awaited<ReturnType<typeof rateLimit>>);
});

describe("setImsAction", () => {
  it("records accept, scoped to the owner", async () => {
    mockUpdate.mockResolvedValue({} as never);
    const r = await setImsAction("i1", "accept");
    expect(r.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { ownerId_id: { ownerId: "u1", id: "i1" } },
      data: { imsAction: "accept" },
    });
  });

  it("records reject", async () => {
    mockUpdate.mockResolvedValue({} as never);
    await setImsAction("i1", "reject");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { ownerId_id: { ownerId: "u1", id: "i1" } },
      data: { imsAction: "reject" },
    });
  });

  it("rejects an unknown action without touching the DB", async () => {
    const r = await setImsAction("i1", "explode" as ImsChoice);
    expect(r.ok).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("stops on rate limit", async () => {
    mockRateLimit.mockResolvedValue({
      ok: false,
      retryAfterSeconds: 30,
    } as Awaited<ReturnType<typeof rateLimit>>);
    const r = await setImsAction("i1", "accept");
    expect(r.ok).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("deleteImsInvoice", () => {
  it("deletes, scoped to the owner", async () => {
    mockDelete.mockResolvedValue({} as never);
    const r = await deleteImsInvoice("i1");
    expect(r.ok).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({
      where: { ownerId_id: { ownerId: "u1", id: "i1" } },
    });
  });

  it("reports a friendly error when the invoice is already gone", async () => {
    mockDelete.mockRejectedValue(new Error("not found"));
    const r = await deleteImsInvoice("i1");
    expect(r).toEqual({ ok: false, message: "That invoice no longer exists." });
  });
});
