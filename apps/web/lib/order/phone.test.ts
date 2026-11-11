import { describe, expect, it } from "vitest";
import {
  facebookHref,
  facebookLabel,
  formatPhone,
  isValidPhone,
  normalizePhone,
  telHref,
  zaloHref,
  zaloLabel,
} from "./phone";

describe("phone", () => {
  it("normalises +84 and 84 prefixes and separators to a leading 0", () => {
    expect(normalizePhone("0912 345 678")).toBe("0912345678");
    expect(normalizePhone("+84912345678")).toBe("0912345678");
    expect(normalizePhone("84 912.345.678")).toBe("0912345678");
  });

  it("accepts 10 and 11 digit numbers and rejects the rest", () => {
    expect(isValidPhone("0366 985 679")).toBe(true);
    expect(isValidPhone("+84 366 985 679")).toBe(true);
    expect(isValidPhone("01234567890")).toBe(true);
    expect(isValidPhone("091234567")).toBe(false);
    expect(isValidPhone("0912 345 678 9012")).toBe(false);
    expect(isValidPhone("09123abc78")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });

  it("formats for display and builds links", () => {
    expect(formatPhone("0366985679")).toBe("0366 985 679");
    expect(formatPhone("+84366985679")).toBe("0366 985 679");
    expect(formatPhone("1900 1234")).toBe("1900 1234");
    expect(telHref("0366 985 679")).toBe("tel:0366985679");
    expect(zaloHref("0366 985 679")).toBe("https://zalo.me/0366985679");
    expect(zaloHref("https://zalo.me/0366985679")).toBe(
      "https://zalo.me/0366985679",
    );
    expect(zaloHref(null)).toBeNull();
    expect(zaloHref("")).toBeNull();
  });

  it("keeps a zalo.me group link and refuses links elsewhere", () => {
    expect(zaloHref("https://zalo.me/g/tinphat")).toBe(
      "https://zalo.me/g/tinphat",
    );
    expect(zaloHref("https://evil.example/zalo.me")).toBeNull();
    expect(zaloHref("http://zalo.me/0366985679")).toBeNull();
    expect(zaloLabel("https://zalo.me/g/tinphat")).toBe("zalo.me/g/tinphat");
    expect(zaloLabel("0366985679")).toBe("0366 985 679");
  });

  it("accepts only https Facebook links", () => {
    expect(facebookHref("https://www.facebook.com/tinphatdecor")).toBe(
      "https://www.facebook.com/tinphatdecor",
    );
    expect(facebookHref("https://fb.me/tinphatdecor")).toBe(
      "https://fb.me/tinphatdecor",
    );
    expect(facebookHref("javascript:alert(1)")).toBeNull();
    expect(facebookHref("https://facebook.com.evil.example/x")).toBeNull();
    expect(facebookHref("https://www.facebook.com/")).toBeNull();
    expect(facebookHref(null)).toBeNull();
    expect(facebookLabel("https://www.facebook.com/tinphatdecor/")).toBe(
      "facebook.com/tinphatdecor",
    );
  });
});
