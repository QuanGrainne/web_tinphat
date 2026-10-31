/** Same normalisation the API applies to a typed order code: upper case, no spaces or hyphens, O -> 0, I/L -> 1. */
export function normalizeOrderCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
}

/** Order codes are DNA + 6 characters of the Crockford base32 alphabet. Expects an already normalised code. */
export function isOrderCode(code: string): boolean {
  return /^DNA[0-9A-HJKMNP-TV-Z]{6}$/.test(code);
}
