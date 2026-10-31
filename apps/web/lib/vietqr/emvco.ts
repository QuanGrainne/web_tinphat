/**
 * VietQR (NAPAS 247, EMVCo merchant-presented) payload builder. Pure and dependency-free.
 * Layout: 00 01 | 01 11 (static) or 12 (amount) | 38 { 00 A000000727, 01 { 00 BIN, 01 account }, 02 QRIBFTTA } | 53 704 | 54 amount? | 58 VN | 62 { 08 content } | 63 CRC.
 */

export interface VietQrInput {
  /** Receiving bank BIN (6 digits). */
  bin: string;
  accountNo: string;
  /** Transfer content shown by the bank app: A-Z and 0-9 only, 1-25 chars (the order code). */
  content: string;
  /** Integer VND. Omit or pass null for a QR without a preset amount. */
  amount?: number | null;
}

const NAPAS_GUID = "A000000727";
const SERVICE_TO_ACCOUNT = "QRIBFTTA";
const CONTENT_PATTERN = /^[A-Z0-9]{1,25}$/;
const BIN_PATTERN = /^\d{6}$/;
const ACCOUNT_PATTERN = /^[0-9A-Za-z]{1,19}$/;
const MAX_AMOUNT_DIGITS = 13;

/** One EMVCo data object: id + 2-digit length + value. */
function tlv(id: string, value: string): string {
  if (value.length > 99) throw new Error(`VietQR: value of tag ${id} is too long`);
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) as 4 upper-case hex digits. */
export function crc16(data: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(data)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Builds the string to encode into the QR. Throws when an input cannot be represented. */
export function buildVietQrPayload(input: VietQrInput): string {
  const bin = input.bin.trim();
  const accountNo = input.accountNo.replace(/\s+/g, "");
  const { content } = input;
  const amount = input.amount ?? null;

  if (!BIN_PATTERN.test(bin)) throw new Error("VietQR: bank BIN must be 6 digits");
  if (!ACCOUNT_PATTERN.test(accountNo)) throw new Error("VietQR: invalid account number");
  if (!CONTENT_PATTERN.test(content)) throw new Error("VietQR: content must match ^[A-Z0-9]{1,25}$");
  if (amount !== null) {
    if (!Number.isSafeInteger(amount) || amount <= 0 || String(amount).length > MAX_AMOUNT_DIGITS) {
      throw new Error("VietQR: amount must be a positive integer VND");
    }
  }

  const consumer = tlv("01", tlv("00", bin) + tlv("01", accountNo));
  const body =
    tlv("00", "01") +
    tlv("01", amount === null ? "11" : "12") +
    tlv("38", tlv("00", NAPAS_GUID) + consumer + tlv("02", SERVICE_TO_ACCOUNT)) +
    tlv("53", "704") +
    (amount === null ? "" : tlv("54", String(amount))) +
    tlv("58", "VN") +
    tlv("62", tlv("08", content)) +
    "6304";
  return body + crc16(body);
}
