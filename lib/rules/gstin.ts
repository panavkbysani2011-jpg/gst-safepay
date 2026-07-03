// Offline GSTIN validation — format + the official mod-36 checksum.
// This proves a GSTIN is well-formed and internally consistent; it does NOT
// confirm the number is live/active on the GST portal (that needs a data source).
// VERIFY against the official spec before relying on it for real money decisions.

const CODE = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"; // base-36 alphabet

// 2 state digits · 5 PAN letters · 4 PAN digits · 1 PAN letter · 1 entity code · 'Z' · 1 checksum
const GSTIN_FORMAT = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Compute the 15th (checksum) character from the first 14 characters of a GSTIN. */
export function computeGstinChecksum(first14: string): string {
  let factor = 2;
  let sum = 0;
  for (let i = first14.length - 1; i >= 0; i--) {
    const codePoint = CODE.indexOf(first14[i]);
    if (codePoint < 0) return "?"; // non-base36 char → cannot compute
    let addend = factor * codePoint;
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / 36) + (addend % 36);
    sum += addend;
  }
  const remainder = sum % 36;
  const checkCodePoint = (36 - remainder) % 36;
  return CODE[checkCodePoint];
}

export function isValidGstin(gstin: string): boolean {
  if (!GSTIN_FORMAT.test(gstin)) return false;
  return computeGstinChecksum(gstin.slice(0, 14)) === gstin[14];
}
