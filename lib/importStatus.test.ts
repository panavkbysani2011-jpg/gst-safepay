import { describe, it, expect } from "vitest";
import { getImportProgress, IMPORT_KINDS, type ImportCounts } from "./importStatus";

const EMPTY: ImportCounts = { vendors: 0, bills: 0, ims: 0, rcm: 0, compliance: 0 };

describe("getImportProgress", () => {
  it("reports nothing added for a fresh account", () => {
    const p = getImportProgress(EMPTY);
    expect(p.addedCount).toBe(0);
    expect(p.total).toBe(5);
    expect(p.fraction).toBe(0);
    expect(p.allDone).toBe(false);
    expect(p.byKind.vendors.isAdded).toBe(false);
  });

  it("counts each data type that has rows, and keeps the number", () => {
    const p = getImportProgress({ ...EMPTY, vendors: 12, bills: 40 });
    expect(p.addedCount).toBe(2);
    expect(p.fraction).toBeCloseTo(2 / 5);
    expect(p.byKind.vendors).toEqual({ kind: "vendors", count: 12, isAdded: true });
    expect(p.byKind.ims.isAdded).toBe(false);
  });

  it("reports allDone only when every type has data", () => {
    const p = getImportProgress({ vendors: 1, bills: 1, ims: 1, rcm: 1, compliance: 1 });
    expect(p.allDone).toBe(true);
    expect(p.fraction).toBe(1);
  });

  it("covers every import kind", () => {
    const p = getImportProgress(EMPTY);
    expect(Object.keys(p.byKind).sort()).toEqual([...IMPORT_KINDS].sort());
  });

  it("never lets a bad count falsely tick a card", () => {
    const p = getImportProgress({
      ...EMPTY,
      vendors: Number.NaN,
      bills: -5,
      ims: Number.POSITIVE_INFINITY,
    });
    expect(p.addedCount).toBe(0);
    expect(p.byKind.vendors.count).toBe(0);
    expect(p.byKind.bills.count).toBe(0);
    expect(p.byKind.ims.count).toBe(0);
  });
});
