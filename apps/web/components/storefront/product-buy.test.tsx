import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublicSku } from "@/lib/api/types";
import { ProductBuy } from "./product-buy";

function sku(overrides: Partial<PublicSku>): PublicSku {
  return {
    id: 1,
    code: "SV320-3L-Gói",
    unitName: "Gói",
    conversion: 1,
    isBase: true,
    priceVisible: true,
    price: 8570,
    effectivePrice: 8570,
    promoActive: false,
    promoPrice: null,
    promoTo: null,
    perBaseUnit: 8570,
    saving: { kind: "NONE", pct: null },
    ...overrides,
  };
}

const brand = { name: "Sen Vàng", slug: "sen-vang" };

describe("ProductBuy (first render)", () => {
  it("selects the base unit and shows one tile per visible SKU with its price", () => {
    const html = renderToStaticMarkup(
      <ProductBuy
        brand={brand}
        skus={[
          sku({}),
          sku({ id: 2, code: "SV320-3L-Dây 5G", unitName: "Dây", conversion: 5, isBase: false, price: 42850, effectivePrice: 42850, perBaseUnit: 8570 }),
          sku({ id: 3, code: "SV320-3L-Thùng 50G", unitName: "Thùng", conversion: 50, isBase: false, price: 428500, effectivePrice: 428500, perBaseUnit: 8570 }),
        ]}
      />,
    );
    expect(html.match(/role="radio"/g)).toHaveLength(3);
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("SV320-3L-Gói");
    expect(html).toContain("8.570đ");
    expect(html).toContain("Giá đã gồm VAT");
    expect(html).toContain("50 gói");
    expect(html).toContain("428.500đ");
    expect(html).toContain("Thêm báo giá");
    expect(html).toContain("Thêm vào giỏ");
    expect(html).not.toContain("disabled");
  });

  it("shows the saving badge of the selected unit", () => {
    const html = renderToStaticMarkup(
      <ProductBuy
        brand={null}
        skus={[sku({ saving: { kind: "PERCENT", pct: 1.9 } })]}
      />,
    );
    expect(html).toContain("Tiết kiệm 1,9%");
  });

  it("shows the regular price struck through with a Sale badge only while the promo is active", () => {
    const promo = renderToStaticMarkup(
      <ProductBuy brand={null} skus={[sku({ price: 10000, effectivePrice: 8000, promoActive: true, promoPrice: 8000, promoTo: "2026-12-31" })]} />,
    );
    expect(promo).toContain('class="was"');
    expect(promo).toContain("10.000đ");
    expect(promo).toContain("8.000đ");
    expect(promo).toContain("Sale");
    const plain = renderToStaticMarkup(<ProductBuy brand={null} skus={[sku({})]} />);
    expect(plain).not.toContain("Sale");
    expect(plain).not.toContain('class="was"');
  });

  it("prints no number for a hidden-price SKU and disables the order button", () => {
    // Even if a price slipped through, a SKU with priceVisible=false must never render it.
    const html = renderToStaticMarkup(
      <ProductBuy
        brand={brand}
        skus={[sku({ id: 9, code: "SV465-4L- T80", unitName: "Thùng", conversion: 80, isBase: false, priceVisible: false, price: 987654, effectivePrice: 987654, perBaseUnit: 12345, saving: { kind: "PERCENT", pct: 5 } })]}
      />,
    );
    expect(html).toContain("Liên hệ");
    expect(html).not.toContain("987.654");
    expect(html).not.toContain("987654");
    expect(html).not.toContain("12.345");
    expect(html).not.toContain("Tiết kiệm");
    expect(html).not.toContain("80 gói");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Thêm vào giỏ<\/button>/);
  });

  it("falls back to Liên hệ when no SKU is visible", () => {
    const html = renderToStaticMarkup(<ProductBuy brand={brand} skus={[]} />);
    expect(html).toContain("Liên hệ");
    expect(html).not.toContain("Thêm vào giỏ");
  });
});
