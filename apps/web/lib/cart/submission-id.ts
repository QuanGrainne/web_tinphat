/**
 * Idempotency key for quote/order submits. Created the first time a basket page asks for it and kept in
 * sessionStorage until the API answers 2xx, so a retry after a timeout or a double click re-sends the same id.
 */
export type SubmissionKind = "quote" | "order";

const KEY_PREFIX = "dna.submission.";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const memory = new Map<SubmissionKind, string>();

type CryptoLike = Pick<Crypto, "getRandomValues"> & { randomUUID?: () => string };

/** RFC 4122 v4. crypto.randomUUID only exists in secure contexts, so fall back to getRandomValues. */
export function uuidV4(source: CryptoLike | undefined = globalThis.crypto): string {
  if (typeof source?.randomUUID === "function") return source.randomUUID();
  const bytes = new Uint8Array(16);
  if (source) source.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function storage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function getSubmissionId(kind: SubmissionKind): string {
  const store = storage();
  try {
    const stored = store?.getItem(KEY_PREFIX + kind);
    if (stored && UUID_V4.test(stored)) return stored;
  } catch {
    // fall through to the in-memory id
  }
  const kept = memory.get(kind);
  if (kept && !store) return kept;
  const id = uuidV4();
  memory.set(kind, id);
  try {
    store?.setItem(KEY_PREFIX + kind, id);
  } catch {
    // sessionStorage blocked: the id still holds for this page view
  }
  return id;
}

/** Call after a 2xx so the next submit gets a fresh id. */
export function resetSubmissionId(kind: SubmissionKind): void {
  memory.delete(kind);
  try {
    storage()?.removeItem(KEY_PREFIX + kind);
  } catch {
    // nothing stored or storage blocked
  }
}
