const DEFAULT_AFTER_LOGIN = "/admin/products";

/** `next` after login: only same-origin admin paths (never the login page itself); anything else falls back to the product list. */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_AFTER_LOGIN;
  if (!/^\/admin(?:[/?#]|$)/.test(raw)) return DEFAULT_AFTER_LOGIN;
  if (/[\\\u0000-\u001f]/.test(raw)) return DEFAULT_AFTER_LOGIN;
  if (/^\/admin\/login(?:[/?#]|$)/.test(raw)) return DEFAULT_AFTER_LOGIN;
  return raw;
}
