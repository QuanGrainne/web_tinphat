import { describe, expect, it } from "vitest";
import {
  facebookHref,
  facebookLabel,
  formatPhone,
  isValidPhone,
  isWechatId,
  normalizePhone,
  telHref,
  whatsappHref,
  whatsappLabel,
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

  it("builds a WhatsApp link with the country code, or keeps a wa.me link", () => {
    expect(whatsappHref("0914 794 472")).toBe("https://wa.me/84914794472");
    expect(whatsappHref("+84 914 794 472")).toBe("https://wa.me/84914794472");
    expect(whatsappHref("+86 138 0013 8000")).toBe("https://wa.me/8613800138000");
    expect(whatsappHref("https://wa.me/84914794472")).toBe("https://wa.me/84914794472");
    expect(whatsappHref("https://wa.me.evil.example/1")).toBeNull();
    expect(whatsappHref("http://wa.me/84914794472")).toBeNull();
    expect(whatsappHref("")).toBeNull();
    expect(whatsappHref(null)).toBeNull();
    expect(whatsappLabel("0914794472")).toBe("+84 914 794 472");
    expect(whatsappLabel("+86 138 0013 8000")).toBe("+86 138 0013 8000");
    expect(whatsappLabel("https://wa.me/84914794472")).toBe("wa.me/84914794472");
  });

  it("accepts a WeChat ID or phone number and nothing else", () => {
    expect(isWechatId("tinphat_decor")).toBe(true);
    expect(isWechatId("Tp-2026")).toBe(true);
    expect(isWechatId("0914 794 472")).toBe(true);
    expect(isWechatId("+86 138 0013 8000")).toBe(true);
    expect(isWechatId("1abcdef")).toBe(false);
    expect(isWechatId("abc")).toBe(false);
    expect(isWechatId("<script>")).toBe(false);
  });
});
