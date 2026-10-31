import { describe, expect, it } from "vitest";
import { guessOrderCodes, isLinkAmountMismatch } from "./bank-link-form";
import { formatDateTime, formatPhone, moneyInputFormatter, moneyInputParser, telHref } from "./format";

describe("formatDateTime", () => {
  it("formats local time as dd/MM/yyyy HH:mm", () => {
    expect(formatDateTime("2026-10-29T17:40:00")).toBe("29/10/2026 17:40");
    expect(formatDateTime("2026-01-05T09:05:00")).toBe("05/01/2026 09:05");
  });

  it("keeps the shape for an ISO string with an offset", () => {
    expect(formatDateTime("2026-10-29T17:40:00+07:00")).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  it("shows a dash for empty or invalid input", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime("")).toBe("-");
    expect(formatDateTime("not a date")).toBe("-");
  });
});

describe("formatPhone", () => {
  it("groups ten digits as 0912 345 678", () => {
    expect(formatPhone("0912345678")).toBe("0912 345 678");
    expect(formatPhone("0912 345 678")).toBe("0912 345 678");
  });

  it("leaves other shapes as stored", () => {
    expect(formatPhone("+84912345678")).toBe("+84912345678");
    expect(formatPhone("02838123456")).toBe("02838123456");
  });

  it("builds a tel link without spaces", () => {
    expect(telHref("0912 345 678")).toBe("tel:0912345678");
    expect(telHref("+84 912 345 678")).toBe("tel:+84912345678");
  });
});

describe("money input helpers", () => {
  it("shows dots between thousands and parses them back", () => {
    expect(moneyInputFormatter(428500)).toBe("428.500");
    expect(moneyInputFormatter(undefined)).toBe("");
    expect(String(moneyInputParser("1.985.900"))).toBe("1985900");
    expect(String(moneyInputParser(undefined))).toBe("");
  });
});

describe("guessOrderCodes", () => {
  it("finds a code inside bank text", () => {
    expect(guessOrderCodes("MBVCB.123 CT DEN DNA7K2M9Q chuyen tien")).toEqual(["DNA7K2M9Q"]);
  });

  it("copes with spaces, hyphens, lower case and diacritics", () => {
    expect(guessOrderCodes("dna 7k2m-9q")).toEqual(["DNA7K2M9Q"]);
    expect(guessOrderCodes("Thanh toán đơn dna7k2m9q")).toEqual(["DNA7K2M9Q"]);
  });

  it("returns each distinct code once and nothing when there is none", () => {
    expect(guessOrderCodes("DNA7K2M9Q DNA7K2M9Q DNA3F8H2Z")).toEqual(["DNA7K2M9Q", "DNA3F8H2Z"]);
    expect(guessOrderCodes("chuyen khoan tien hang")).toEqual([]);
  });
});

describe("isLinkAmountMismatch", () => {
  it("needs a note only when marking paid with a different amount", () => {
    expect(isLinkAmountMismatch({ markPaid: true, txAmount: 100, orderTotal: 120 })).toBe(true);
    expect(isLinkAmountMismatch({ markPaid: true, txAmount: 120, orderTotal: 120 })).toBe(false);
    expect(isLinkAmountMismatch({ markPaid: false, txAmount: 100, orderTotal: 120 })).toBe(false);
    expect(isLinkAmountMismatch({ markPaid: true, txAmount: 100, orderTotal: null })).toBe(false);
  });
});
