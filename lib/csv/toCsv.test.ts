import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { fileToCsv, MAX_UPLOAD_BYTES } from "./toCsv";

function csvFile(name: string, text: string): File {
  return new File([text], name, { type: "text/csv" });
}

// Build a real .xlsx in memory from a grid of cells, so the test exercises the
// actual SheetJS read path rather than a mock.
function xlsxFile(name: string, rows: (string | number)[][]): File {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1");
  const bytes = XLSX.write(book, { type: "array", bookType: "xlsx" });
  return new File([bytes], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("fileToCsv", () => {
  it("passes CSV text through unchanged", async () => {
    const res = await fileToCsv(csvFile("v.csv", "id,name\nv1,Acme"));
    expect(res).toEqual({ ok: true, csv: "id,name\nv1,Acme" });
  });

  it("passes TSV text through (delimiter is auto-detected downstream)", async () => {
    const res = await fileToCsv(csvFile("v.tsv", "id\tname\nv1\tAcme"));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.csv).toBe("id\tname\nv1\tAcme");
  });

  it("converts an .xlsx workbook to CSV using the first sheet", async () => {
    const file = xlsxFile("vendors.xlsx", [
      ["id", "name", "gstin"],
      ["v1", "Acme", "29ABCDE1234F1Z5"],
    ]);
    const res = await fileToCsv(file);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.csv).toContain("id,name,gstin");
      expect(res.csv).toContain("v1,Acme,29ABCDE1234F1Z5");
    }
  });

  it("keeps a text-formatted date string intact through xlsx conversion", async () => {
    // A sheet that already holds "2026-06-15" as text must round-trip exactly,
    // so the downstream YYYY-MM-DD check accepts it.
    const file = xlsxFile("bills.xlsx", [
      ["id", "invoiceAcceptanceDate"],
      ["b1", "2026-06-15"],
    ]);
    const res = await fileToCsv(file);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.csv).toContain("b1,2026-06-15");
  });

  it("quotes cells containing commas so columns are not split", async () => {
    const file = xlsxFile("vendors.xlsx", [
      ["id", "name"],
      ["v1", "Acme, Inc"],
    ]);
    const res = await fileToCsv(file);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.csv).toContain('"Acme, Inc"');
  });

  it("rejects an empty file", async () => {
    const res = await fileToCsv(csvFile("v.csv", ""));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/empty/i);
  });

  it("rejects a file over the size limit", async () => {
    const big = "x".repeat(MAX_UPLOAD_BYTES + 1);
    const res = await fileToCsv(csvFile("v.csv", big));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/limit/i);
  });

  it("rejects an unsupported file type", async () => {
    const res = await fileToCsv(
      new File(["whatever"], "notes.pdf", { type: "application/pdf" })
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/unsupported/i);
  });
});
