import { describe, expect, it } from "vitest";
import type { PricedCart, PricedLine } from "@/lib/api/types";
import { diffPricedCarts } from "./price-diff";

const line = (skuId: number, unitPrice: number | null, extra: Partial<PricedLine> = {}): PricedLine => ({
  skuId,
  unavailable: false,
  code: `SKU${skuId}`,
  productName: `Hàng ${skuId}`,
  productSlug: `hang-${skuId}`,
  unitName: "Gói",
  conversion: 1,
  qty: 2,
  priceVisible: unitPrice !== null,
  orderable: unitPrice !== null,
  listPrice: unitPrice,
  unitPrice,
  lineTotal: unitPrice === null ? null : unitPrice * 2,
  ...extra,
});

const cart = (lines: PricedLine[]): PricedCart => {
  const subtotal = lines.reduce((s, l) => s + (l.lineTotal ?? 0), 0);
  return { lines, subtotal, discountTotal: 0, discountNote: null, total: subtotal, hasContactLines: lines.some((l) => !l.priceVisible) };
};

describe("diffPricedCarts", () => {
  it("reports a changed unit price with old and new values", () => {
    const diff = diffPricedCarts(cart([line(1, 10000), line(2, 5000)]), cart([line(1, 10500), line(2, 5000)]));
    expect(diff.changes).toEqual([{ skuId: 1, name: "Hàng 1", unitName: "Gói", kind: "price", from: 10000, to: 10500 }]);
    expect(diff.totalFrom).toBe(30000);
    expect(diff.totalTo).toBe(31000);
  });

  it("reports lines that are no longer sold or no longer orderable", () => {
    const prev = cart([line(1, 10000), line(2, 5000)]);
    const next = cart([
      line(1, null, { unavailable: true, productName: "", unitName: "", orderable: false }),
      line(2, null),
    ]);
    const diff = diffPricedCarts(prev, next);
    expect(diff.changes.map((c) => [c.skuId, c.kind, c.name])).toEqual([
      [1, "unavailable", "Hàng 1"],
      [2, "unorderable", "Hàng 2"],
    ]);
  });

  it("reports nothing when only the total moved without line changes, and copes with no previous cart", () => {
    const same = cart([line(1, 10000)]);
    expect(diffPricedCarts(same, cart([line(1, 10000)])).changes).toEqual([]);
    const first = diffPricedCarts(null, same);
    expect(first.changes).toEqual([]);
    expect(first.totalFrom).toBeNull();
  });
});
