import { describe, expect, it } from "vitest";
import {
  formatSignedPct,
  isPriceMismatch,
  packDeviationPct,
  perBaseUnit,
  priceMismatchWarnings,
  type PriceRowInput,
} from "./pricing-display";

describe("perBaseUnit", () => {
  it("divides and rounds half up", () => {
    expect(perBaseUnit(428500, 50)).toBe(8570);
    expect(perBaseUnit(42850, 5)).toBe(8570);
    expect(perBaseUnit(440000, 80)).toBe(5500);
    expect(perBaseUnit(12345, 2)).toBe(6173);
    expect(perBaseUnit(1, 2)).toBe(1);
    expect(perBaseUnit(0, 3)).toBe(0);
  });

  it("returns null for missing or invalid input", () => {
    expect(perBaseUnit(null, 5)).toBeNull();
    expect(perBaseUnit(1000, null)).toBeNull();
    expect(perBaseUnit(1000, 0)).toBeNull();
    expect(perBaseUnit(-5, 2)).toBeNull();
  });
});

describe("pack deviation", () => {
  it("SV465 Thùng 440.000 against 80 x 5.330 is +3,2%", () => {
    const dev = packDeviationPct(5330, 80, 440000);
    expect(dev).not.toBeNull();
    expect(dev!).toBeCloseTo(3.19, 2);
    expect(formatSignedPct(dev!)).toBe("+3,2%");
    expect(isPriceMismatch(5330, 80, 440000, 2.0)).toBe(true);
  });

  it("no mismatch when the pack price equals base x conversion", () => {
    expect(packDeviationPct(5330, 80, 426400)).toBe(0);
    expect(isPriceMismatch(5330, 80, 426400, 2.0)).toBe(false);
  });

  it("uses a strict > threshold", () => {
    // expected 50.000: 51.000 is exactly +2,0%
    expect(isPriceMismatch(5000, 10, 51000, 2.0)).toBe(false);
    expect(isPriceMismatch(5000, 10, 51001, 2.0)).toBe(true);
    expect(isPriceMismatch(5000, 10, 49000, 2.0)).toBe(false);
    expect(isPriceMismatch(5000, 10, 48999, 2.0)).toBe(true);
  });

  it("flags both directions", () => {
    expect(isPriceMismatch(5000, 10, 48750, 2.0)).toBe(true); // -2,5%
    expect(formatSignedPct(packDeviationPct(5000, 10, 48750)!)).toBe("-2,5%");
  });

  it("follows the configured threshold", () => {
    expect(isPriceMismatch(5330, 80, 440000, 5.0)).toBe(false);
    expect(isPriceMismatch(5330, 80, 440000, 3.1)).toBe(true);
  });

  it("is false when the base price is missing or zero", () => {
    expect(packDeviationPct(null, 80, 440000)).toBeNull();
    expect(packDeviationPct(0, 80, 440000)).toBeNull();
    expect(isPriceMismatch(0, 80, 440000, 2.0)).toBe(false);
    expect(isPriceMismatch(5330, 80, null, 2.0)).toBe(false);
  });
});

describe("formatSignedPct", () => {
  it("adds the sign and a decimal comma", () => {
    expect(formatSignedPct(3.1895)).toBe("+3,2%");
    expect(formatSignedPct(-2.5)).toBe("-2,5%");
    expect(formatSignedPct(0)).toBe("0,0%");
    expect(formatSignedPct(0.04)).toBe("0,0%");
  });
});

describe("priceMismatchWarnings", () => {
  const rows = (thung: number | null): PriceRowInput[] => [
    { unitName: "Gói", conversion: 1, price: 5330, isBase: true },
    { unitName: "Dây", conversion: 8, price: 42640, isBase: false },
    { unitName: "Thùng", conversion: 80, price: thung, isBase: false },
  ];

  it("reports the Thùng row with the expected message and index", () => {
    const warnings = priceMismatchWarnings(rows(440000), 2.0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].index).toBe(2);
    expect(warnings[0].message).toBe("Giá Thùng lệch +3,2% so với 80 × giá Gói");
    expect(warnings[0].expectedPrice).toBe(426400);
  });

  it("reports nothing once the price matches", () => {
    expect(priceMismatchWarnings(rows(426400), 2.0)).toEqual([]);
  });

  it("skips rows with no price and tables with no priced base", () => {
    expect(priceMismatchWarnings(rows(null), 2.0)).toEqual([]);
    const noBase: PriceRowInput[] = [{ unitName: "Gói", conversion: 1, price: null, isBase: true }, ...rows(440000).slice(1)];
    expect(priceMismatchWarnings(noBase, 2.0)).toEqual([]);
  });
});
