import { describe, expect, it } from "vitest";
import { isOrderCode, normalizeOrderCode } from "./order-code";

describe("order code", () => {
  it("normalises typed codes", () => {
    expect(normalizeOrderCode("dna 7k2m-9q")).toBe("DNA7K2M9Q");
    expect(normalizeOrderCode(" DNA7K2MOQ ")).toBe("DNA7K2M0Q");
    expect(normalizeOrderCode("dnai1l")).toBe("DNA111");
  });

  it("recognises the order code format", () => {
    expect(isOrderCode("DNA7K2M9Q")).toBe(true);
    expect(isOrderCode("DNA7K2M9")).toBe(false);
    expect(isOrderCode("DNA7K2M9QQ")).toBe(false);
    expect(isOrderCode("BG7K2M9Q")).toBe(false);
    expect(isOrderCode("DNA7K2MUQ")).toBe(false);
    expect(isOrderCode(normalizeOrderCode("dna 7k2m-9q"))).toBe(true);
  });
});
