import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ProductCard as ProductCardData } from "@/lib/api/types";
import { ProductCard } from "./product-card";

function card(overrides: Partial<ProductCardData> = {}): ProductCardData {
  return {
    id: 1,
    slug: "giay-an-gau-truc",
    name: "Giấy ăn rút Sen Vàng khăn giấy lụa Gấu trúc",
    brand: { name: "Sen Vàng", slug: "sen-vang" },
    imageUrl: null,
    specLine: null,
    fromPrice: 8570,
    fromUnitName: "Gói",
    hasMultipleUnits: true,
    units: [
      { name: "Gói", priceVisible: true },
      { name: "Dây", priceVisible: true },
      { name: "Thùng", priceVisible: true },
    ],
    ...overrides,
  };
}

describe("ProductCard", () => {
  it("prefixes the base-unit price with Từ for multi-unit products", () => {
    const html = renderToStaticMarkup(<ProductCard card={card()} />);
    expect(html).toContain("Từ 8.570đ");
    expect(html).toContain("/ gói");
    expect(html).toContain("Chọn mua");
    expect(html).toContain('href="/san-pham/giay-an-gau-truc"');
  });

  it("drops Từ for single-unit products", () => {
    const html = renderToStaticMarkup(
      <ProductCard card={card({ fromPrice: 94440, fromUnitName: "Hộp", hasMultipleUnits: false, units: [{ name: "Hộp", priceVisible: true }] })} />,
    );
    expect(html).toContain("94.440đ");
    expect(html).not.toContain("Từ ");
  });

  it("labels hidden units as Liên hệ in the chips", () => {
    const html = renderToStaticMarkup(
      <ProductCard
        card={card({
          units: [
            { name: "Gói", priceVisible: true },
            { name: "Dây", priceVisible: false },
            { name: "Thùng", priceVisible: false },
          ],
        })}
      />,
    );
    expect(html).toContain("Dây: Liên hệ");
    expect(html).toContain("Thùng: Liên hệ");
    expect(html).toContain(">Gói<");
  });

  it("shows only Liên hệ when no unit has a visible price", () => {
    const html = renderToStaticMarkup(<ProductCard card={card({ fromPrice: null, units: [{ name: "Gói", priceVisible: false }] })} />);
    expect(html).toContain("<b>Liên hệ</b>");
    expect(html).not.toMatch(/\d\.\d{3}đ/);
  });

  it("renders a plain image when the product has one and a placeholder otherwise", () => {
    expect(renderToStaticMarkup(<ProductCard card={card({ imageUrl: "/uploads/a.jpg" })} />)).toContain('src="/uploads/a.jpg"');
    expect(renderToStaticMarkup(<ProductCard card={card()} />)).toContain("i-image");
  });
});
