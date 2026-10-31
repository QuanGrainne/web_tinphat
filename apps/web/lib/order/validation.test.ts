import { describe, expect, it } from "vitest";
import { optional, validateCheckoutForm, validateQuoteForm } from "./validation";

const quote = { customerName: "Minh Châu", phone: "0912 345 678", email: "", company: "", taxCode: "", note: "" };
const checkout = { customerName: "Minh Châu", phone: "+84912345678", address: "12 Võ Thị Sáu", note: "" };

describe("validateQuoteForm", () => {
  it("accepts a minimal valid form", () => {
    expect(validateQuoteForm(quote)).toEqual({});
  });

  it("requires a name and a valid phone", () => {
    const errors = validateQuoteForm({ ...quote, customerName: "  ", phone: "12345" });
    expect(errors.customerName).toBe("Vui lòng nhập tên người liên hệ.");
    expect(errors.phone).toContain("chưa đúng");
    expect(validateQuoteForm({ ...quote, phone: "" }).phone).toBe("Vui lòng nhập số điện thoại.");
  });

  it("checks the email only when it is given", () => {
    expect(validateQuoteForm({ ...quote, email: "a@b.vn" })).toEqual({});
    expect(validateQuoteForm({ ...quote, email: "a@b" }).email).toBe("Email chưa đúng.");
  });
});

describe("validateCheckoutForm", () => {
  it("accepts a valid form", () => {
    expect(validateCheckoutForm(checkout)).toEqual({});
  });

  it("requires name, phone and address", () => {
    const errors = validateCheckoutForm({ customerName: "", phone: "", address: " ", note: "" });
    expect(Object.keys(errors).sort()).toEqual(["address", "customerName", "phone"]);
    expect(errors.address).toBe("Vui lòng nhập địa chỉ nhận hàng.");
  });
});

describe("optional", () => {
  it("drops blank values and trims the rest", () => {
    expect(optional("   ")).toBeUndefined();
    expect(optional(" abc ")).toBe("abc");
  });
});
