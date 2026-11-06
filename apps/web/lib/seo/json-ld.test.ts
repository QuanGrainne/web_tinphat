import { describe, expect, it } from "vitest";
import type { PublicProduct, PublicSettings, PublicSku } from "@/lib/api/types";
import { breadcrumbJsonLd, organizationJsonLd, productJsonLd, serializeJsonLd } from "./json-ld";

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

function product(skus: PublicSku[], overrides: Partial<PublicProduct> = {}): PublicProduct {
  return {
    id: 1,
    slug: "giay-an-gau-truc",
    name: "Giấy ăn Gấu trúc",
    status: "ACTIVE",
    brand: { name: "Sen Vàng", slug: "sen-vang" },
    category: { name: "Giấy", slug: "giay" },
    breadcrumb: [],
    imageUrl: null,
    galleryUrls: [],
    specLine: null,
    descriptionMd: null,
    baseCode: "SV320-3L-Gói",
    skus,
    related: [],
    seoTitle: null,
    seoDescription: null,
    ...overrides,
  };
}

describe("productJsonLd", () => {
  it("emits one offer per visible priced SKU using the effective price in VND", () => {
    const data = productJsonLd(
      product([
        sku({ id: 1 }),
        sku({
          id: 2,
          code: "SV320-3L-Thùng 50G",
          unitName: "Thùng",
          conversion: 50,
          isBase: false,
          price: 428500,
          effectivePrice: 400000,
          promoActive: true,
          promoPrice: 400000,
          promoTo: "2026-12-31",
        }),
        sku({ id: 3, code: "SV320-3L-Dây 5G", unitName: "Dây", conversion: 5, isBase: false, priceVisible: false, price: null, effectivePrice: null }),
      ]),
      "https://dna.example",
    );
    const offers = data.offers as { price: number; priceCurrency: string; priceValidUntil?: string }[];
    expect(data["@type"]).toBe("Product");
    expect(offers).toHaveLength(2);
    expect(offers.map((o) => o.price)).toEqual([8570, 400000]);
    expect(offers.every((o) => o.priceCurrency === "VND")).toBe(true);
    expect(offers[1].priceValidUntil).toBe("2026-12-31");
    expect(JSON.stringify(data)).not.toContain("428500");
  });

  it("has no offers when every SKU is Liên hệ", () => {
    const data = productJsonLd(
      product([sku({ priceVisible: false, price: null, effectivePrice: null, perBaseUnit: null })]),
      "https://dna.example",
    );
    expect(data).not.toHaveProperty("offers");
  });

  it("uses absolute urls for the page and a relative image", () => {
    const data = productJsonLd(product([sku({})], { imageUrl: "/uploads/a.jpg" }), "https://dna.example/");
    expect(data.url).toBe("https://dna.example/san-pham/giay-an-gau-truc");
    expect(data.image).toBe("https://dna.example/uploads/a.jpg");
  });
});

describe("serializeJsonLd", () => {
  it("escapes < so a name cannot close the script tag", () => {
    const text = serializeJsonLd(productJsonLd(product([sku({})], { name: "</script><b>x" }), "https://dna.example"));
    expect(text).not.toContain("<");
    expect(text).toContain("\\u003c/script>");
    expect(JSON.parse(text).name).toBe("</script><b>x");
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers the trail from 1 and makes links absolute", () => {
    const data = breadcrumbJsonLd(
      [
        { name: "Trang chủ", href: "/" },
        { name: "Giấy", href: "/danh-muc/giay" },
      ],
      "https://dna.example",
    );
    const items = data.itemListElement as { position: number; item: string }[];
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    expect(items[1].item).toBe("https://dna.example/danh-muc/giay");
  });
});

describe("organizationJsonLd", () => {
  it("carries the company facts from public settings", () => {
    const settings: PublicSettings = {
      company: { name: "CÔNG TY TNHH DNA HOÀNG NGUYÊN", taxCode: "5400533724", address: "Phú Thọ", warehouse: "Kho", phone: "0366 985 679", email: "a@b.vn" },
      hotline: "0366 985 679",
      zalo: null,
      trustStrip: [],
    };
    const data = organizationJsonLd(settings, "https://dna.example");
    expect(data["@type"]).toBe("Organization");
    expect(data.name).toBe("CÔNG TY TNHH DNA HOÀNG NGUYÊN");
    expect(data.taxID).toBe("5400533724");
  });
});
