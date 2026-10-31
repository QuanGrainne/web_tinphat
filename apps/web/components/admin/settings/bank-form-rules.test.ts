import { describe, expect, it } from "vitest";
import {
  ACCOUNT_NO_PATTERN,
  BIN_PATTERN,
  isBankFormDirty,
  isBankFormField,
  normalizeAccountName,
  toBankUpdate,
} from "./bank-form-rules";

const saved = { bankName: "Vietcombank", bin: "970436", accountNo: "0123456789", accountName: "CONG TY TNHH DNA HOANG NGUYEN" };

describe("normalizeAccountName", () => {
  it("uppercases and strips Vietnamese diacritics", () => {
    expect(normalizeAccountName("Công ty TNHH Đầu tư Hoàng Nguyên")).toBe("CONG TY TNHH DAU TU HOANG NGUYEN");
    expect(normalizeAccountName("nguyễn văn a")).toBe("NGUYEN VAN A");
  });

  it("keeps already clean text", () => {
    expect(normalizeAccountName("NGUYEN VAN A")).toBe("NGUYEN VAN A");
    expect(normalizeAccountName("")).toBe("");
  });
});

describe("patterns", () => {
  it("accepts exactly six digits for the BIN", () => {
    expect(BIN_PATTERN.test("970436")).toBe(true);
    expect(BIN_PATTERN.test("97043")).toBe(false);
    expect(BIN_PATTERN.test("9704361")).toBe(false);
    expect(BIN_PATTERN.test("97043a")).toBe(false);
  });

  it("accepts 4 to 19 letters or digits for the account number", () => {
    expect(ACCOUNT_NO_PATTERN.test("0123456789")).toBe(true);
    expect(ACCOUNT_NO_PATTERN.test("123")).toBe(false);
    expect(ACCOUNT_NO_PATTERN.test("1".repeat(20))).toBe(false);
    expect(ACCOUNT_NO_PATTERN.test("0123 456 789")).toBe(false);
  });
});

describe("toBankUpdate", () => {
  it("trims text, normalises the holder name and keeps the password as typed", () => {
    expect(
      toBankUpdate({ bankName: " Vietcombank ", bin: " 970436 ", accountNo: " 0123456789 ", accountName: " Công ty DNA ", currentPassword: " pw " }),
    ).toEqual({ bankName: "Vietcombank", bin: "970436", accountNo: "0123456789", accountName: "CONG TY DNA", currentPassword: " pw " });
  });
});

describe("isBankFormDirty", () => {
  it("is false when nothing changed, even with different spacing", () => {
    expect(isBankFormDirty(saved, { ...saved, bankName: " Vietcombank " })).toBe(false);
  });

  it("is true when any bank field changed", () => {
    expect(isBankFormDirty(saved, { ...saved, accountNo: "9876543210" })).toBe(true);
    expect(isBankFormDirty(saved, { ...saved, bin: "970415" })).toBe(true);
  });

  it("ignores the password and treats no values as clean", () => {
    expect(isBankFormDirty(saved, { ...saved, currentPassword: "secret" })).toBe(false);
    expect(isBankFormDirty(saved, undefined)).toBe(false);
  });
});

describe("isBankFormField", () => {
  it("recognises the fields the server can report", () => {
    expect(isBankFormField("bin")).toBe(true);
    expect(isBankFormField("currentPassword")).toBe(true);
    expect(isBankFormField("other")).toBe(false);
  });
});
