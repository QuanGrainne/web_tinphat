import { normalizeOrderCode } from "./order-code";

/**
 * The phone used for an order is kept in sessionStorage (this tab only) so the order page can look the order up
 * without asking again. The address is never stored. Newest entries win; at most MAX_ENTRIES are kept.
 */
export const LAST_ORDER_KEY = "dna.orders";
const MAX_ENTRIES = 5;

type Entries = [code: string, phone: string][];

function storage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Mirror used only when sessionStorage cannot be read, so the order page still works within one page view. */
let memory: Entries = [];

function read(): Entries {
  let raw: string | null;
  try {
    const store = storage();
    if (!store) return memory;
    raw = store.getItem(LAST_ORDER_KEY);
  } catch {
    return memory;
  }
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is [string, string] => Array.isArray(e) && typeof e[0] === "string" && typeof e[1] === "string",
    );
  } catch {
    return [];
  }
}

function write(entries: Entries): void {
  memory = entries.slice(-MAX_ENTRIES);
  try {
    storage()?.setItem(LAST_ORDER_KEY, JSON.stringify(memory));
  } catch {
    // storage full or blocked: the in-memory copy still serves this page view
  }
}

export function rememberOrder(code: string, phone: string): void {
  const key = normalizeOrderCode(code);
  write([...read().filter(([c]) => c !== key), [key, phone.trim()]]);
}

/** Phone stored for this order code, or null when this tab does not know it. */
export function recallPhone(code: string): string | null {
  const key = normalizeOrderCode(code);
  return read().find(([c]) => c === key)?.[1] ?? null;
}

export function forgetOrder(code: string): void {
  const key = normalizeOrderCode(code);
  write(read().filter(([c]) => c !== key));
}
