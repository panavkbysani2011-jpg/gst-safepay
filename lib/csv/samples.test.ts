import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  parseBillsCsv,
  parseComplianceCsv,
  parseImsCsv,
  parseRcmCsv,
  parseVendorsCsv,
} from "./parseCsv";

// Proves the downloadable sample CSVs a new user gets on the Import page parse
// cleanly through the real parsers — so their first upload works, not "gets weird".
const dir = join(process.cwd(), "public", "samples");
const read = (f: string) => readFileSync(join(dir, f), "utf8");

describe("downloadable sample CSVs parse with zero errors", () => {
  it("vendors-sample.csv", () => {
    const { valid, errors } = parseVendorsCsv(read("vendors-sample.csv"));
    expect(errors).toEqual([]);
    expect(valid.length).toBeGreaterThan(0);
  });

  it("bills-sample.csv", () => {
    const { valid, errors } = parseBillsCsv(read("bills-sample.csv"));
    expect(errors).toEqual([]);
    expect(valid.length).toBeGreaterThan(0);
  });

  it("ims-sample.csv", () => {
    const { valid, errors } = parseImsCsv(read("ims-sample.csv"));
    expect(errors).toEqual([]);
    expect(valid.length).toBeGreaterThan(0);
  });

  it("rcm-sample.csv", () => {
    const { valid, errors } = parseRcmCsv(read("rcm-sample.csv"));
    expect(errors).toEqual([]);
    expect(valid.length).toBeGreaterThan(0);
  });

  it("compliance-sample.csv", () => {
    const { valid, errors } = parseComplianceCsv(read("compliance-sample.csv"));
    expect(errors).toEqual([]);
    expect(valid.length).toBeGreaterThan(0);
  });
});
