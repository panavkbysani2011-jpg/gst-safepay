// Links imported bills to vendors the way real purchase registers are actually
// written. Previously a bill's vendor reference had to be an EXACT match for the
// id of a vendor uploaded earlier — but real exports carry a supplier *name*
// ("ABBOT CCD") or a GSTIN, not an id from a separate file. Every unmatched row
// was silently skipped, so uploading bills first (the natural instinct) produced
// an empty dashboard and looked like the tool was broken.
//
// Now a reference resolves by id, then GSTIN, then name; anything still unknown
// becomes a new vendor seeded from the row, so no bill is ever dropped just
// because its supplier hasn't been set up yet. Auto-created vendors start
// un-verified (blank GSTIN unless the file supplied one, MSME unknown) — the
// user completes them in the vendors screen, which is honest: the tool cannot
// know a supplier's Udyam status, and the 45-day rule only applies once it does.
//
// Pure + isomorphic so the same plan can drive a preview and the server write.

export interface ExistingVendor {
  id: string;
  name: string;
  gstin: string;
}

/** A vendor to create because nothing matched the row's reference. */
export interface VendorSeed {
  id: string;
  name: string;
  gstin: string;
}

/** The vendor-identifying fields a bill row can carry. */
export interface BillVendorRef {
  vendorId: string;
  vendorName?: string | null;
  vendorGstin?: string | null;
}

export type MatchedBy = "id" | "gstin" | "name" | "created";

export interface LinkPlan {
  /** Raw reference from the file -> the vendor id the bill should point at. */
  resolved: Map<string, string>;
  /** How each reference was resolved (for reporting/preview). */
  matchedBy: Map<string, MatchedBy>;
  /** Vendors that must be created before the bills are written. */
  toCreate: VendorSeed[];
}

/** Loose GSTIN shape (15 chars, 2 digits + 10 PAN + 3). Format only — the
 *  checksum is the verification module's job, and a wrong checksum should still
 *  match an existing vendor carrying the same string. */
const GSTIN_SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/i;

function looksLikeGstin(value: string): boolean {
  return GSTIN_SHAPE.test(value.trim());
}

/** Case/format-insensitive key for comparing names. */
function nameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function gstinKey(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Decide, for every distinct vendor reference in the rows, which vendor id it
 * should map to — matching existing vendors first, and seeding new ones for
 * whatever is left. Later rows referencing the same unknown supplier reuse the
 * same seed, so one new vendor is created per distinct supplier.
 */
export function planVendorLinks(
  rows: BillVendorRef[],
  existing: ExistingVendor[]
): LinkPlan {
  const byId = new Map(existing.map((v) => [v.id, v]));
  const byIdLower = new Map(existing.map((v) => [v.id.trim().toLowerCase(), v]));
  const byGstin = new Map(
    existing.filter((v) => v.gstin.trim() !== "").map((v) => [gstinKey(v.gstin), v])
  );
  const byName = new Map(existing.map((v) => [nameKey(v.name), v]));

  const resolved = new Map<string, string>();
  const matchedBy = new Map<string, MatchedBy>();
  const toCreate: VendorSeed[] = [];
  const seeded = new Map<string, VendorSeed>();

  for (const row of rows) {
    const ref = (row.vendorId ?? "").trim();
    if (ref === "" || resolved.has(ref)) continue;

    const refName = (row.vendorName ?? "").trim();
    const refGstin = (row.vendorGstin ?? "").trim();

    // 1. Exact id — preserves files that already use our own ids.
    const exact = byId.get(ref);
    if (exact) {
      resolved.set(ref, exact.id);
      matchedBy.set(ref, "id");
      continue;
    }
    const caseless = byIdLower.get(ref.toLowerCase());
    if (caseless) {
      resolved.set(ref, caseless.id);
      matchedBy.set(ref, "id");
      continue;
    }

    // 2. GSTIN — the strongest real-world identifier. Use the row's own GSTIN
    //    column if it was mapped, else the reference itself when it is one.
    const gstinCandidate = refGstin !== "" ? refGstin : looksLikeGstin(ref) ? ref : "";
    if (gstinCandidate !== "") {
      const byGst = byGstin.get(gstinKey(gstinCandidate));
      if (byGst) {
        resolved.set(ref, byGst.id);
        matchedBy.set(ref, "gstin");
        continue;
      }
    }

    // 3. Name — what most purchase registers actually carry.
    const nameCandidate = refName !== "" ? refName : ref;
    const byNm = byName.get(nameKey(nameCandidate));
    if (byNm) {
      resolved.set(ref, byNm.id);
      matchedBy.set(ref, "name");
      continue;
    }

    // 4. Nothing matched: seed a new vendor keyed by the reference itself, so a
    //    re-upload of the same file matches it by id next time.
    const existingSeed = seeded.get(ref);
    if (existingSeed) {
      resolved.set(ref, existingSeed.id);
      matchedBy.set(ref, "created");
      continue;
    }
    const seed: VendorSeed = {
      id: ref,
      name: refName !== "" ? refName : ref,
      gstin: refGstin !== "" ? refGstin : looksLikeGstin(ref) ? ref : "",
    };
    seeded.set(ref, seed);
    toCreate.push(seed);
    resolved.set(ref, seed.id);
    matchedBy.set(ref, "created");
  }

  return { resolved, matchedBy, toCreate };
}
