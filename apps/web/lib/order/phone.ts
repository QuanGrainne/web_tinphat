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

const WHATSAPP_HOSTS = new Set([
  "wa.me",
  "api.whatsapp.com",
  "whatsapp.com",
  "www.whatsapp.com",
  "chat.whatsapp.com",
]);

/** A phone number as WhatsApp wants it: digits with the country code, a Vietnamese leading 0 becoming 84. */
function internationalDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return digits;
  return digits.startsWith("0") ? `84${digits.slice(1)}` : digits;
}

/**
 * WhatsApp chat link. The admin stores either a phone number (wa.me link built from it with the country code) or a
 * wa.me / whatsapp.com link (used as it is); null when empty or unusable.
 */
export function whatsappHref(raw: string | null): string | null {
  const value = (raw ?? "").trim();
  if (/^https?:\/\//i.test(value))
    return linkOn(value, WHATSAPP_HOSTS)?.toString() ?? null;
  const digits = internationalDigits(value);
  return digits.length >= 9 ? `https://wa.me/${digits}` : null;
}

/** What to show for the WhatsApp value: "+84 914 794 472" for a Vietnamese number, the number or link as typed otherwise. */
export function whatsappLabel(raw: string): string {
  const value = raw.trim();
  if (/^https?:\/\//i.test(value))
    return value.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  const n = normalizePhone(value);
  if (/^0\d{9}$/.test(n))
    return `+84 ${n.slice(1, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  return value;
}

/** WeChat's own rule for an ID: 6 to 20 characters, a letter first, then letters, digits, _ or -. */
const WECHAT_ID = /^[A-Za-z][A-Za-z0-9_-]{5,19}$/;

/** A WeChat ID, or the phone number the WeChat account was opened with (9 to 15 digits). */
export function isWechatId(raw: string): boolean {
  const value = raw.trim();
  const digits = value.replace(/\D/g, "").length;
  return (
    WECHAT_ID.test(value) ||
    (/^\+?[0-9 .\-()]+$/.test(value) && digits >= 9 && digits <= 15)
  );
}
