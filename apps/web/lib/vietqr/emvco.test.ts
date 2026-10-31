import { describe, expect, it } from "vitest";
import { buildVietQrPayload, crc16 } from "./emvco";

interface Tlv {
  id: string;
  value: string;
}

/** Splits an EMVCo string into id/value pairs and fails when any declared length is wrong. */
function parseTlv(input: string): Tlv[] {
  const out: Tlv[] = [];
  let i = 0;
  while (i < input.length) {
    const id = input.slice(i, i + 2);
    const lenText = input.slice(i + 2, i + 4);
    expect(lenText).toMatch(/^\d{2}$/);
    const len = Number(lenText);
    const value = input.slice(i + 4, i + 4 + len);
    expect(value).toHaveLength(len);
    out.push({ id, value });
    i += 4 + len;
  }
  expect(i).toBe(input.length);
  return out;
}

const field = (items: Tlv[], id: string) => items.find((t) => t.id === id)?.value;

const base = { bin: "970436", accountNo: "0123456789", content: "DNA7K2M9Q" };

describe("crc16", () => {
  it("matches the CRC-16/CCITT-FALSE check value", () => {
    expect(crc16("123456789")).toBe("29B1");
  });

  it("pads to four upper-case hex digits", () => {
    expect(crc16("")).toBe("FFFF");
    expect(crc16("A")).toMatch(/^[0-9A-F]{4}$/);
  });
});

describe("buildVietQrPayload", () => {
  it("builds the dynamic payload (amount present) byte for byte", () => {
    expect(buildVietQrPayload({ ...base, amount: 1182680 })).toBe(
      "00020101021238540010A00000072701240006970436011001234567890208QRIBFTTA5303704540711826805802VN62130809DNA7K2M9Q630473F7",
    );
  });

  it("builds the static payload (no amount) byte for byte", () => {
    expect(buildVietQrPayload(base)).toBe(
      "00020101021138540010A00000072701240006970436011001234567890208QRIBFTTA53037045802VN62130809DNA7K2M9Q63049A01",
    );
  });

  it("declares a correct length for every data object, nested ones included", () => {
    const top = parseTlv(buildVietQrPayload({ ...base, amount: 30000 }));
    expect(top.map((t) => t.id)).toEqual(["00", "01", "38", "53", "54", "58", "62", "63"]);
    const merchant = parseTlv(field(top, "38") as string);
    expect(merchant.map((t) => t.id)).toEqual(["00", "01", "02"]);
    const consumer = parseTlv(field(merchant, "01") as string);
    expect(consumer.map((t) => t.id)).toEqual(["00", "01"]);
    expect(parseTlv(field(top, "62") as string)).toEqual([{ id: "08", value: "DNA7K2M9Q" }]);
  });

  it("puts the BIN and the account number in the nested consumer tags", () => {
    const top = parseTlv(buildVietQrPayload({ ...base, amount: 1000 }));
    const merchant = parseTlv(field(top, "38") as string);
    expect(field(merchant, "00")).toBe("A000000727");
    expect(field(merchant, "02")).toBe("QRIBFTTA");
    const consumer = parseTlv(field(merchant, "01") as string);
    expect(field(consumer, "00")).toBe("970436");
    expect(field(consumer, "01")).toBe("0123456789");
  });

  it("omits tag 54 and marks the QR static when no amount is given", () => {
    for (const amount of [undefined, null]) {
      const top = parseTlv(buildVietQrPayload({ ...base, amount }));
      expect(field(top, "01")).toBe("11");
      expect(field(top, "54")).toBeUndefined();
    }
  });

  it("adds tag 54 and marks the QR dynamic when an amount is given", () => {
    const top = parseTlv(buildVietQrPayload({ ...base, amount: 428500 }));
    expect(field(top, "01")).toBe("12");
    expect(field(top, "54")).toBe("428500");
    expect(field(top, "53")).toBe("704");
    expect(field(top, "58")).toBe("VN");
  });

  it("ends with the CRC of everything before it, including the 6304 header", () => {
    const payload = buildVietQrPayload({ ...base, amount: 99000 });
    const head = payload.slice(0, -4);
    expect(head.endsWith("6304")).toBe(true);
    expect(payload.slice(-4)).toBe(crc16(head));
  });

  it("ignores spaces typed inside the account number", () => {
    expect(buildVietQrPayload({ ...base, accountNo: "0123 456 789", amount: 1000 })).toBe(
      buildVietQrPayload({ ...base, amount: 1000 }),
    );
  });

  it("rejects content with diacritics, lower case, spaces, symbols, empty or longer than 25", () => {
    for (const content of ["ĐƠN7K2M9Q", "dna7k2m9q", "DNA 7K2M9Q", "DNA-7K2M9Q", "", "A".repeat(26)]) {
      expect(() => buildVietQrPayload({ ...base, content })).toThrow();
    }
    expect(() => buildVietQrPayload({ ...base, content: "A".repeat(25) })).not.toThrow();
  });

  it("rejects amounts that are not positive integers", () => {
    for (const amount of [0, -5, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 10 ** 13]) {
      expect(() => buildVietQrPayload({ ...base, amount })).toThrow();
    }
  });

  it("rejects an invalid BIN or account number", () => {
    expect(() => buildVietQrPayload({ ...base, bin: "9704" })).toThrow();
    expect(() => buildVietQrPayload({ ...base, bin: "97O436" })).toThrow();
    expect(() => buildVietQrPayload({ ...base, accountNo: "" })).toThrow();
    expect(() => buildVietQrPayload({ ...base, accountNo: "12-34" })).toThrow();
    expect(() => buildVietQrPayload({ ...base, accountNo: "1".repeat(20) })).toThrow();
  });
});
