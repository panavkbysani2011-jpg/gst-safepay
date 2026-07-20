import { describe, it, expect } from "vitest";
import { dedupeById, duplicateNote } from "./dedupeById";

describe("dedupeById", () => {
  it("leaves distinct rows untouched", () => {
    const rows = [{ id: "a", v: 1 }, { id: "b", v: 2 }, { id: "c", v: 3 }];
    const out = dedupeById(rows);
    expect(out.rows).toHaveLength(3);
    expect(out.duplicateCount).toBe(0);
  });

  it("collapses duplicate ids and counts the drops (the 10-rows-9-vendors case)", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ id: `v${i}`, v: i }));
    rows[9].id = "v0"; // a tenth row reusing the first id
    const out = dedupeById(rows);
    expect(out.rows).toHaveLength(9);
    expect(out.duplicateCount).toBe(1);
  });

  it("keeps the LAST occurrence, matching the upsert", () => {
    const rows = [{ id: "x", v: "first" }, { id: "x", v: "second" }];
    const out = dedupeById(rows);
    expect(out.rows).toEqual([{ id: "x", v: "second" }]);
    expect(out.duplicateCount).toBe(1);
  });

  it("counts every drop when an id appears three times", () => {
    const rows = [{ id: "x", v: 1 }, { id: "x", v: 2 }, { id: "x", v: 3 }];
    const out = dedupeById(rows);
    expect(out.rows).toHaveLength(1);
    expect(out.duplicateCount).toBe(2);
  });

  it("handles an empty file", () => {
    expect(dedupeById([])).toEqual({ rows: [], duplicateCount: 0 });
  });
});

describe("duplicateNote", () => {
  it("says nothing when nothing merged", () => {
    expect(duplicateNote(0)).toBe("");
  });

  it("uses the singular for one", () => {
    expect(duplicateNote(1)).toBe(" 1 row shared an id with another and was merged, keeping the last.");
  });

  it("uses the plural for many", () => {
    expect(duplicateNote(3)).toBe(" 3 rows shared an id with another and were merged, keeping the last.");
  });
});
