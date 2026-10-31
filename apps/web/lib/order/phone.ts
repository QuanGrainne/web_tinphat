/** Vietnamese phone helpers. The API normalises the same way (+84 / 84 -> 0, then ^0\d{9,10}$). */

const SEPARATORS = /[\s.\-()]/g;

/** Digits only, with a leading +84 or 84 turned into 0. Not validated. */
export function normalizePhone(raw: string): string {
  const compact = raw.replace(SEPARATORS, "");
  if (compact.startsWith("+84")) return `0${compact.slice(3)}`;
  if (compact.startsWith("84")) return `0${compact.slice(2)}`;
  return compact;
}

export function isValidPhone(raw: string): boolean {
  const compact = raw.replace(SEPARATORS, "");
  return /^\+?\d+$/.test(compact) && /^0\d{9,10}$/.test(normalizePhone(raw));
}

/** "0366985679" -> "0366 985 679"; anything unexpected is returned trimmed. */
export function formatPhone(raw: string): string {
  const n = normalizePhone(raw);
  if (/^0\d{9}$/.test(n)) return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  if (/^0\d{10}$/.test(n)) return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  return raw.trim();
}

/** tel: link for a number shown to the customer. */
export function telHref(raw: string): string {
  return `tel:${raw.replace(/[^\d+]/g, "")}`;
}

/** Zalo chat link built from the digits of the stored Zalo value; null when there are none. */
export function zaloHref(raw: string | null): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits ? `https://zalo.me/${digits}` : null;
}
