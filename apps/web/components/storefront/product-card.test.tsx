import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ProductCard as ProductCardData } from "@/lib/api/types";
import { ProductCard } from "./product-card";

function card(overrides: Partial<ProductCardData> = {}): ProductCardData {
  return {
    id: 1,
    slug: "long-den-trung-thu",
    name: "Lồng đèn Trung Thu",
    brand: null,
    imageUrl: null,
    specLine: null,
    fromPrice: 8570,
    fromUnitName: "Cái",
    hasMultipleUnits: false,
    units: [{ name: "Cái", priceVisible: true }],
    discontinued: false,
    ...overrides,
  };
}

describe("ProductCard", () => {
  it("shows the price and links the name to the product page", () => {
    const html = renderToStaticMarkup(<ProductCard card={card()} />);
    expect(html).toContain("8.570");
    expect(html).toContain('href="/san-pham/long-den-trung-thu"');
  });

  it("shows Liên hệ when there is no public price", () => {
    const html = renderToStaticMarkup(
      <ProductCard card={card({ fromPrice: null })} />,
    );
    expect(html).toContain(">Liên hệ báo giá<");
    expect(html).not.toContain("<b>Liên hệ");
  });

  it("has a contact button instead of a cart button", () => {
    const html = renderToStaticMarkup(
      <ProductCard card={card()} contactHref="https://zalo.me/0914794472" />,
    );
    expect(html).toContain('href="https://zalo.me/0914794472"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain("Liên hệ ngay");
    expect(html).not.toContain("Chọn mua");
  });

  it("falls back to the contact page in the same tab", () => {
    const html = renderToStaticMarkup(<ProductCard card={card()} />);
    expect(html).toContain('href="/lien-he"');
    expect(html).not.toContain('target="_blank"');
  });

  it("shows the image and the spec line when present", () => {
    const html = renderToStaticMarkup(
      <ProductCard
        card={card({
          imageUrl: "/uploads/images/a.jpg",
          specLine: "Nhiều mẫu",
        })}
      />,
    );
    expect(html).toContain("/_next/image?url=%2Fuploads%2Fimages%2Fa.jpg");
    expect(html).toContain("Nhiều mẫu");
  });
});

describe("ProductCard images", () => {
  it("shows a link to another site as it is, since the optimiser refuses unknown hosts", () => {
    const html = renderToStaticMarkup(
      <ProductCard card={card({ imageUrl: "https://example.com/a.jpg" })} />,
    );
    expect(html).toContain('src="https://example.com/a.jpg"');
    expect(html).not.toContain("/_next/image");
  });

  it("sends KiotViet photos through the optimiser", () => {
    const html = renderToStaticMarkup(
      <ProductCard
        card={card({
          imageUrl: "https://cdn2-retail-images.kiotviet.vn/x.jpg",
        })}
      />,
    );
    expect(html).toContain(
      "/_next/image?url=https%3A%2F%2Fcdn2-retail-images.kiotviet.vn%2Fx.jpg",
    );
  });
});

describe("ProductCard when discontinued", () => {
  it("says so instead of a price and has no contact button", () => {
    const html = renderToStaticMarkup(
      <ProductCard
        card={card({ discontinued: true })}
        contactHref="https://zalo.me/0914794472"
      />,
    );
    expect(html).toContain("Ngừng kinh doanh");
    expect(html).not.toContain("8.570");
    expect(html).not.toContain("Liên hệ ngay");
    expect(html).toContain('href="/san-pham/long-den-trung-thu"');
  });
});
