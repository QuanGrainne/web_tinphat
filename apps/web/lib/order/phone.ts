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
  if (/^0\d{9}$/.test(n))
    return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  if (/^0\d{10}$/.test(n))
    return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  return raw.trim();
}

/** tel: link for a number shown to the customer. */
export function telHref(raw: string): string {
  return `tel:${raw.replace(/[^\d+]/g, "")}`;
}

const ZALO_HOSTS = new Set(["zalo.me", "chat.zalo.me", "oa.zalo.me"]);
const FACEBOOK_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "fb.com",
  "www.fb.com",
  "fb.me",
  "m.me",
]);

/** The value as an https URL on one of the hosts, or null. */
function linkOn(raw: string, hosts: Set<string>): URL | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" &&
      hosts.has(url.hostname.toLowerCase()) &&
      url.pathname.length > 1
      ? url
      : null;
  } catch {
    return null;
  }
}

/**
 * Zalo chat link. The admin stores either a phone number (link built from its digits) or a zalo.me link (used as it
 * is, e.g. a group or official account); null when empty or unusable.
 */
export function zaloHref(raw: string | null): string | null {
  const value = (raw ?? "").trim();
  if (/^https?:\/\//i.test(value))
    return linkOn(value, ZALO_HOSTS)?.toString() ?? null;
  const digits = value.replace(/\D/g, "");
  return digits ? `https://zalo.me/${digits}` : null;
}

/** What to show for the Zalo value: the number, or "zalo.me/..." for a link. */
export function zaloLabel(raw: string): string {
  const value = raw.trim();
  if (/^https?:\/\//i.test(value))
    return value.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  return formatPhone(value);
}

/** The Facebook page link when it is an https link on Facebook; null otherwise. */
export function facebookHref(raw: string | null): string | null {
  return raw ? (linkOn(raw, FACEBOOK_HOSTS)?.toString() ?? null) : null;
}

/** "facebook.com/tinphatdecor" for display. */
export function facebookLabel(href: string): string {
  return href.replace(/^https?:\/\/(www\.|m\.|web\.)?/i, "").replace(/\/$/, "");
}
