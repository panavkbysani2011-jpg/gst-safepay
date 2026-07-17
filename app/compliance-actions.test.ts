import { describe, it, expect, vi, beforeEach } from "vitest";

// Filing-status glue over the DB, plus storage cleanup on delete. Pinned because
// it moves what counts as an open obligation and must remove the proof blob when
// the row goes, never orphaning a file or leaking across owners.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
  retryPhrase: (n: number) => `${n} seconds`,
}));
vi.mock("@/lib/businessDate", () => ({ todayInBusinessZone: () => "2026-07-17" }));

const storageRemove = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    storage: { from: () => ({ remove: storageRemove }) },
  })),
}));
vi.mock("@/lib/db", () => ({
  db: {
    complianceDeadline: { update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
  },
}));

import {
  markComplianceFiled,
  markComplianceUnfiled,
  deleteComplianceDeadline,
} from "./compliance-actions";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

const mockRequireUser = vi.mocked(requireUser);
const mockRateLimit = vi.mocked(rateLimit);
const mockUpdate = vi.mocked(db.complianceDeadline.update);
const mockDelete = vi.mocked(db.complianceDeadline.delete);
const mockFindUnique = vi.mocked(db.complianceDeadline.findUnique);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "u1" } as Awaited<ReturnType<typeof requireUser>>);
  mockRateLimit.mockResolvedValue({ ok: true } as Awaited<ReturnType<typeof rateLimit>>);
});

describe("markComplianceFiled", () => {
  it("sets filedDate to today's business date, scoped to the owner", async () => {
    mockUpdate.mockResolvedValue({} as never);
    const r = await markComplianceFiled("d1");
    expect(r.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { ownerId_id: { ownerId: "u1", id: "d1" } },
      data: { filedDate: "2026-07-17" },
    });
  });

  it("stops on rate limit and never writes", async () => {
    mockRateLimit.mockResolvedValue({
      ok: false,
      retryAfterSeconds: 30,
    } as Awaited<ReturnType<typeof rateLimit>>);
    const r = await markComplianceFiled("d1");
    expect(r.ok).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("markComplianceUnfiled", () => {
  it("clears the filed date", async () => {
    mockUpdate.mockResolvedValue({} as never);
    const r = await markComplianceUnfiled("d1");
    expect(r.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { ownerId_id: { ownerId: "u1", id: "d1" } },
      data: { filedDate: null },
    });
  });
});

describe("deleteComplianceDeadline", () => {
  it("removes the stored proof file before deleting the row", async () => {
    mockFindUnique.mockResolvedValue({ proofFilePath: "u1/d1/proof.pdf" } as never);
    mockDelete.mockResolvedValue({} as never);
    const r = await deleteComplianceDeadline("d1");
    expect(r.ok).toBe(true);
    expect(storageRemove).toHaveBeenCalledWith(["u1/d1/proof.pdf"]);
    expect(mockDelete).toHaveBeenCalledWith({
      where: { ownerId_id: { ownerId: "u1", id: "d1" } },
    });
  });

  it("deletes a row with no proof without touching storage", async () => {
    mockFindUnique.mockResolvedValue({ proofFilePath: null } as never);
    mockDelete.mockResolvedValue({} as never);
    const r = await deleteComplianceDeadline("d1");
    expect(r.ok).toBe(true);
    expect(storageRemove).not.toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
  });

  it("refuses to delete a deadline that is not the caller's / does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);
    const r = await deleteComplianceDeadline("d1");
    expect(r.ok).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
    expect(storageRemove).not.toHaveBeenCalled();
  });
});
